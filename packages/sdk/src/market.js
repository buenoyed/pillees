import { applyQuote } from "./route.js";
import { toUnits } from "./units.js";

// Illustrative fee schedules. Real rates are read from the pool, curve, and fee config.
export const SAMPLE_FEES = {
  pool: { protocolBps: 5, lpBps: 20, creatorBps: 5 },
  curve: { protocolBps: 95, creatorBps: 30 },
  external: { lpBps: 25 },
};

const sol = (v) => toUnits(v, 9);
const tok = (v) => toUnits(v, 6);

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * An offline market for trying capsules: pump coins paired with other pump coins, plus an
 * outside pool for the far coin so a spread can open and close. Nothing here is chain data.
 */
export function mockMarket({ seed = 7, shock = 0.025, drift = 0.004 } = {}) {
  const rand = seeded(seed);
  const venues = [
    { id: "moss-pool", kind: "pool", base: "MOSS", quote: "SOL", baseReserve: tok(800_000_000), quoteReserve: sol(120), fees: SAMPLE_FEES.pool },
    { id: "pill-curve", kind: "curve", base: "PILL", quote: "MOSS", baseReserve: tok(900_000_000), quoteReserve: tok(240_000_000), fees: SAMPLE_FEES.curve },
    { id: "zest-pool", kind: "pool", base: "ZEST", quote: "SOL", baseReserve: tok(500_000_000), quoteReserve: sol(90), fees: SAMPLE_FEES.pool },
    { id: "caps-curve", kind: "curve", base: "CAPS", quote: "ZEST", baseReserve: tok(950_000_000), quoteReserve: tok(160_000_000), fees: SAMPLE_FEES.curve },
  ];
  const price = (id) => Number(venues.find((v) => v.id === id).quoteReserve) / Number(venues.find((v) => v.id === id).baseReserve);
  const outside = (id, base, sourcePrice, depth) => ({
    id,
    kind: "external",
    base,
    quote: "SOL",
    baseReserve: BigInt(Math.round(depth / sourcePrice)),
    quoteReserve: BigInt(Math.round(depth)),
    fees: SAMPLE_FEES.external,
  });
  venues.push(outside("pill-outside", "PILL", price("pill-curve") * price("moss-pool"), 60e9));
  venues.push(outside("caps-outside", "CAPS", price("caps-curve") * price("zest-pool"), 40e9));

  const nudge = (venue, factor) => {
    venue.quoteReserve = BigInt(Math.max(1, Math.round(Number(venue.quoteReserve) * factor)));
  };

  return {
    venues: () => venues.map((v) => ({ ...v })),
    // Random walk on the outside pools, with the odd large trade.
    tick() {
      for (const v of venues) {
        if (v.kind !== "external") continue;
        const big = rand() < 0.18 ? (rand() - 0.5) * 2 * shock : 0;
        nudge(v, 1 + (rand() - 0.5) * 2 * drift + big);
      }
    },
    // Moves reserves as if these quoted routes had filled.
    apply(routes) {
      for (const { route, quote } of routes) {
        const moved = applyQuote(route, quote);
        moved.hops.forEach((hop) => Object.assign(venues.find((v) => v.id === hop.id), { baseReserve: hop.baseReserve, quoteReserve: hop.quoteReserve }));
      }
    },
  };
}
