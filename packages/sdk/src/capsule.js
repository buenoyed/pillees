import { multiHopAccounts, multiHopSwapData } from "./accounts.js";
import { findEdge } from "./edge.js";
import { minAmountOut } from "./route.js";
import { fromUnits, sol } from "./units.js";

export const STRATEGIES = ["spread"];

/**
 * A capsule is one bot: a wallet it trades from, two paths between the same coins, and
 * the limits it has to stay inside.
 */
export function defineCapsule(config) {
  const c = {
    name: config.name ?? "capsule",
    strategy: config.strategy ?? "spread",
    wallet: config.wallet ?? null,
    paths: config.paths,
    maxSize: config.maxSize ?? "0.5",
    dailyLimit: config.dailyLimit ?? "5",
    minEdgeBps: config.minEdgeBps ?? 40,
    slippageBps: config.slippageBps ?? 50,
    cooldownTicks: config.cooldownTicks ?? 1,
  };
  if (!STRATEGIES.includes(c.strategy)) throw new Error(`unknown strategy "${c.strategy}" (have: ${STRATEGIES.join(", ")})`);
  if (!Array.isArray(c.paths) || c.paths.length !== 2) throw new Error("paths must be two mint paths, e.g. [[\"SOL\",\"MOSS\",\"PILL\"],[\"SOL\",\"PILL\"]]");
  const [a, b] = c.paths;
  if (a[0] !== b[0] || a[a.length - 1] !== b[b.length - 1]) throw new Error("both paths must start and end on the same mints");
  return { ...c, maxSizeUnits: sol(c.maxSize), dailyLimitUnits: sol(c.dailyLimit) };
}

// Builds what a real executor needs for each leg: amounts, min out, and for pump legs the
// multi_hop_swap data and account layout.
export function planTrip(capsule, trip) {
  return trip.legs.map((quote, i) => {
    const route = i === 0 ? trip.buy : trip.sell;
    const min = minAmountOut(quote.amountOut, capsule.slippageBps);
    return {
      route,
      quote,
      amountIn: quote.amountIn,
      minAmountOut: min,
      multiHop: quote.multiHop,
      data: quote.multiHop ? multiHopSwapData(quote.amountIn, min) : null,
      accounts: quote.multiHop ? multiHopAccounts(route, { user: capsule.wallet }) : null,
    };
  });
}

// Records what it would have sent. Swap in your own executor to sign and submit.
export function dryRunExecutor() {
  const sent = [];
  return {
    sent,
    async execute(plan) {
      sent.push(plan);
      return { dryRun: true };
    },
  };
}

/**
 * Runs a capsule against a market. Yields an event per tick: "edge" when it would fire,
 * "fill" after the executor returns, "skip" with a reason, or "idle".
 */
export async function* runCapsule(capsule, { market, executor = dryRunExecutor(), ticks = Infinity, intervalMs = 0 }) {
  let spent = 0n;
  let cooldown = 0;
  for (let n = 1; n <= ticks; n++) {
    market.tick();
    const trip = findEdge({ paths: capsule.paths, venues: market.venues(), maxSize: capsule.maxSizeUnits, minEdgeBps: capsule.minEdgeBps });
    const base = { tick: n, route: trip.label, edgeBps: trip.edgeBps, size: fromUnits(trip.amountIn), profit: fromUnits(trip.profit) };
    if (cooldown > 0) {
      cooldown--;
      yield { type: "skip", reason: "cooldown", ...base };
    } else if (!trip.fire) {
      yield { type: "idle", ...base };
    } else if (spent + trip.amountIn > capsule.dailyLimitUnits) {
      yield { type: "skip", reason: "daily limit", ...base };
    } else {
      yield { type: "edge", ...base };
      const legs = planTrip(capsule, trip);
      const result = await executor.execute({ capsule: capsule.name, legs });
      if (result?.dryRun && market.apply) market.apply(legs.map(({ route, quote }) => ({ route, quote })));
      spent += trip.amountIn;
      cooldown = capsule.cooldownTicks;
      yield { type: "fill", ...base, spent: fromUnits(spent), result };
    }
    if (intervalMs) await new Promise((r) => setTimeout(r, intervalMs));
  }
}
