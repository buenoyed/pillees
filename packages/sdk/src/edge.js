import { BPS } from "./constants.js";
import { quoteRoute, resolveRoute } from "./route.js";

// Buy along one route, sell the result back along another, and measure what is left.
export function roundTrip({ buy, sell, amountIn }) {
  const first = quoteRoute(buy, amountIn);
  const second = quoteRoute(sell, first.amountOut);
  const profit = second.amountOut - amountIn;
  return {
    amountIn,
    amountOut: second.amountOut,
    profit,
    edgeBps: Number((profit * BPS) / amountIn),
    legs: [first, second],
  };
}

export const sizeLadder = (max, steps = 8) => Array.from({ length: steps }, (_, i) => (max * BigInt(i + 1)) / BigInt(steps));

// Tries both directions between two paths that start and end on the same mints.
export function findEdge({ paths: [a, b], venues, maxSize, steps = 8, minEdgeBps = 0 }) {
  const reverse = (p) => [...p].reverse();
  const options = [
    { buy: resolveRoute(a, venues), sell: resolveRoute(reverse(b), venues), label: `${a.join(" → ")} | ${reverse(b).join(" → ")}` },
    { buy: resolveRoute(b, venues), sell: resolveRoute(reverse(a), venues), label: `${b.join(" → ")} | ${reverse(a).join(" → ")}` },
  ];
  let best = null;
  for (const option of options) {
    for (const amountIn of sizeLadder(maxSize, steps)) {
      const trip = roundTrip({ ...option, amountIn });
      if (!best || trip.profit > best.profit) best = { ...trip, ...option };
    }
  }
  return { ...best, fire: best.profit > 0n && best.edgeBps >= minEdgeBps };
}
