# @pillees/sdk

Route math for Pump arbitrage: PumpSwap `multi_hop_swap` rules, quotes with fees once per route, the account layout, instruction data, an edge finder and a capsule loop. No dependencies. Node 18+ and modern browsers.

Amounts are `bigint` base units. SOL has 9 decimals; the sample coins have 6.

## Install

Not on npm yet. From a clone of the repo:

```bash
cd packages/sdk && npm link
# in your project
npm link @pillees/sdk
```

## Routes

```js
import { minAmountOut, mockMarket, planRoute, quoteRoute, quoteSeparateTrades, resolveRoute, toUnits } from "@pillees/sdk";

const market = mockMarket();
const route = resolveRoute(["SOL", "MOSS", "PILL"], market.venues());

planRoute(route);
// { ok, errors, side: "buy", multiHop: true, accounts: 26, legacy: true, computeUnits: 145000, ... }

const quote = quoteRoute(route, toUnits("1", 9));
quote.steps;       // per hop: amountIn, amountOut, fee, feeMint, fees { protocol, creator, lp }
quote.amountOut;   // final amount
quoteSeparateTrades(route, toUnits("1", 9)).amountOut; // the same trip as separate swaps, for comparison
minAmountOut(quote.amountOut, 50); // 50 bps floor, always > 0
```

A hop is `{ kind: "pool" | "curve" | "external", base, quote, baseReserve, quoteReserve, fees?, mayhem?, accounts? }`. A route is `{ input, hops }`. `planRoute` reports Pump's errors: 6086 mixed direction, 6084 discontinuous path, 6080 mayhem pool, 6108 mayhem curve. An `external` hop is allowed only on its own, as a plain swap.

## Instruction

```js
import { multiHopAccounts, multiHopSwapData } from "@pillees/sdk";

multiHopAccounts(route, { user, userIn, userOut });
// 16 fixed + 5 per hop: { index, name, address | null, writable, signer, seeds?, note? }

multiHopSwapData(amountIn, minOut); // Uint8Array(24): discriminator + u64 amount_in + u64 min_amount_out
```

Addresses that depend on your pools and wallet come back as `null` with seeds or a note, so you can fill them in.

## Edges and capsules

```js
import { defineCapsule, dryRunExecutor, findEdge, runCapsule, toUnits } from "@pillees/sdk";

const paths = [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]];
const trip = findEdge({ paths, venues: market.venues(), maxSize: toUnits("1", 9), minEdgeBps: 40 });
// { label, edgeBps, amountIn, profit, fire, legs, buy, sell }

const capsule = defineCapsule({ name: "spread-hunter", paths, maxSize: "0.5", dailyLimit: "5", minEdgeBps: 40, slippageBps: 50, cooldownTicks: 1 });
for await (const event of runCapsule(capsule, { market, executor: dryRunExecutor(), ticks: 20, intervalMs: 0 })) {
  // event.type: "idle" | "skip" | "edge" | "fill"
}
```

An executor is `{ execute({ capsule, legs }) }`. Each leg has `route`, `quote`, `amountIn`, `minAmountOut`, and for multi-hop legs `data` and `accounts`. Build and sign the transaction there.

## API

| Export | |
| --- | --- |
| `resolveRoute(path, venues)` | Mint path to a route |
| `planRoute(route)` | Rule check, account count, CU, legacy fit |
| `quoteRoute(route, amountIn, { perHopFees })` | Quote with fees once per route |
| `quoteSeparateTrades(route, amountIn)` | Same route as separate trades |
| `minAmountOut(out, bps)` | Slippage floor |
| `applyQuote(route, quote)` | Route with post-trade reserves |
| `spotPrice(hop)`, `computeUnits(hops)` | Helpers |
| `multiHopAccounts(route, keys)` | Account list |
| `multiHopSwapData(amountIn, minOut)` | Instruction data |
| `roundTrip`, `sizeLadder`, `findEdge` | Edge finding |
| `defineCapsule`, `planTrip`, `runCapsule`, `dryRunExecutor` | Capsules |
| `mockMarket({ seed, shock, drift })`, `SAMPLE_FEES` | Sample market |
| `toUnits`, `fromUnits`, `sol` | Units |
| `PROGRAMS`, `ADDRESSES`, `ERRORS`, `MULTI_HOP_SWAP_DISCRIMINATOR`, ... | Constants |

Types are in `src/index.d.ts`. Tests: `npm test`.
