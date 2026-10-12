import { ACCOUNTS_PER_HOP, BPS, COMPUTE_BASE, COMPUTE_PER_HOP, COMPUTE_VOLUME_ACCUMULATOR, ERRORS, FIXED_ACCOUNTS, MAX_LEGACY_HOPS } from "./constants.js";

/**
 * A hop is one pool or bonding curve:
 *   { kind: "pool" | "curve", base, quote, baseReserve, quoteReserve,
 *     fees: { protocolBps, creatorBps, lpBps }, mayhem?, accounts? }
 * Reserves are bigints in base units. For a curve they are the virtual reserves.
 * A route is { input, output?, hops }.
 */

export class RouteError extends Error {
  constructor(errors) {
    super(errors.map((e) => `${e.name}: ${e.message}`).join("; "));
    this.name = "RouteError";
    this.errors = errors;
  }
}

const issue = (code, hop, message) => ({ code, name: ERRORS[code] ?? "InvalidRoute", hop, message });
const ceilDiv = (a, b) => (a + b - 1n) / b;
const swapOut = (amountIn, reserveIn, reserveOut) => (amountIn * reserveOut) / (reserveIn + amountIn);

export function computeUnits(hops, { newUser = false } = {}) {
  return COMPUTE_BASE + hops * COMPUTE_PER_HOP + (newUser ? COMPUTE_VOLUME_ACCUMULATOR : 0);
}

// Checks a route against the multi_hop_swap rules without pricing it.
export function planRoute(route) {
  const errors = [];
  const hops = route.hops ?? [];
  if (!hops.length) errors.push(issue(0, null, "a route needs at least one hop"));
  const external = hops.some((hop) => hop.kind === "external");
  if (external && hops.length > 1) errors.push(issue(0, null, "an outside venue can only be traded on its own, not as a multi_hop_swap hop"));
  let holding = route.input;
  const steps = hops.map((hop, index) => {
    if (hop.mayhem) {
      errors.push(issue(hop.kind === "pool" ? 6080 : 6108, index, `${hop.base}/${hop.quote} is a mayhem-mode ${hop.kind}`));
    }
    const side = holding === hop.quote ? "buy" : holding === hop.base ? "sell" : null;
    if (!side) errors.push(issue(6084, index, `holding ${holding}, but hop ${index + 1} trades ${hop.base}/${hop.quote}`));
    const step = { index, kind: hop.kind, side, mintIn: holding, mintOut: side === "buy" ? hop.base : side === "sell" ? hop.quote : null };
    if (step.mintOut) holding = step.mintOut;
    return step;
  });
  const sides = new Set(steps.map((s) => s.side).filter(Boolean));
  if (sides.size > 1) errors.push(issue(6086, null, "every hop must be a buy, or every hop must be a sell"));
  if (route.output && errors.every((e) => e.code !== 6084) && holding !== route.output) {
    errors.push(issue(6084, hops.length - 1, `route ends in ${holding}, not ${route.output}`));
  }
  return {
    ok: errors.length === 0,
    errors,
    side: sides.size === 1 ? [...sides][0] : null,
    steps,
    path: [route.input, ...steps.map((s) => s.mintOut ?? "?")],
    output: holding,
    multiHop: !external,
    accounts: FIXED_ACCOUNTS + ACCOUNTS_PER_HOP * hops.length,
    legacy: hops.length <= MAX_LEGACY_HOPS,
    computeUnits: computeUnits(hops.length, { newUser: true }),
  };
}

function priceHop(hop, side, amount, feeBps) {
  const parts = Object.entries(feeBps).filter(([, bps]) => bps > 0);
  const total = BigInt(parts.reduce((sum, [, bps]) => sum + bps, 0));
  let fee;
  let amountIn;
  let amountOut;
  let after;
  if (side === "buy") {
    fee = ceilDiv(amount * total, BPS);
    amountIn = amount - fee;
    amountOut = swapOut(amountIn, hop.quoteReserve, hop.baseReserve);
    after = { baseReserve: hop.baseReserve - amountOut, quoteReserve: hop.quoteReserve + amountIn };
  } else {
    const gross = swapOut(amount, hop.baseReserve, hop.quoteReserve);
    fee = ceilDiv(gross * total, BPS);
    amountIn = amount;
    amountOut = gross - fee;
    after = { baseReserve: hop.baseReserve + amount, quoteReserve: hop.quoteReserve - gross };
  }
  const split = {};
  for (const [name, bps] of parts) split[name] = total ? (fee * BigInt(bps)) / total : 0n;
  return { fee, split, amountIn, amountOut, after };
}

/**
 * Prices a route the way multi_hop_swap charges it: the protocol fee once on the hop that
 * trades the user's currency, creator (and LP) fees once on the hop at the far end, and
 * nothing in between. Fees are taken in each hop's quote mint.
 */
export function quoteRoute(route, amountIn, { perHopFees = false } = {}) {
  const plan = planRoute(route);
  if (!plan.ok) throw new RouteError(plan.errors);
  if (amountIn <= 0n) throw new RangeError("amountIn must be greater than 0");
  const n = route.hops.length;
  const userHop = plan.side === "buy" ? 0 : n - 1;
  const farHop = plan.side === "buy" ? n - 1 : 0;
  let amount = amountIn;
  const steps = route.hops.map((hop, i) => {
    const fees = hop.fees ?? {};
    const charge = {
      protocol: perHopFees || i === userHop ? fees.protocolBps ?? 0 : 0,
      creator: perHopFees || i === farHop ? fees.creatorBps ?? 0 : 0,
      lp: hop.kind !== "curve" && (perHopFees || i === farHop) ? fees.lpBps ?? 0 : 0,
    };
    const priced = priceHop(hop, plan.side, amount, charge);
    const step = { ...plan.steps[i], amountIn: amount, amountOut: priced.amountOut, fee: priced.fee, feeMint: hop.quote, fees: priced.split, after: priced.after };
    amount = priced.amountOut;
    return step;
  });
  const feesByMint = {};
  for (const s of steps) if (s.fee > 0n) feesByMint[s.feeMint] = (feesByMint[s.feeMint] ?? 0n) + s.fee;
  return { ...plan, amountIn, amountOut: amount, steps, feesByMint };
}

// The same route as separate one-hop trades, each paying its own fees.
export const quoteSeparateTrades = (route, amountIn) => quoteRoute(route, amountIn, { perHopFees: true });

export function minAmountOut(amountOut, slippageBps) {
  const min = (amountOut * (BPS - BigInt(slippageBps))) / BPS;
  if (min <= 0n) throw new RangeError("min_amount_out must be greater than 0");
  return min;
}

// Returns the hops with reserves moved as if the quote had filled.
export function applyQuote(route, quote) {
  return { ...route, hops: route.hops.map((hop, i) => ({ ...hop, ...quote.steps[i].after })) };
}

// Builds a route by picking, for each pair in `path`, the first venue that trades it.
export function resolveRoute(path, venues) {
  const hops = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]];
    const hop = venues.find((v) => (v.base === a && v.quote === b) || (v.base === b && v.quote === a));
    if (!hop) throw new RouteError([issue(6084, i, `no pool or curve trades ${a}/${b}`)]);
    hops.push(hop);
  }
  return { input: path[0], output: path[path.length - 1], hops };
}

// Spot price of the base mint in the quote mint, before fees.
export const spotPrice = (hop) => Number(hop.quoteReserve) / Number(hop.baseReserve);
