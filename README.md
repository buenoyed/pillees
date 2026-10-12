# Pillees

Capsules that hunt the spread on Pump.

A capsule is a small arbitrage bot. It watches a pump coin on two venues: a pump route that clears in one PumpSwap [`multi_hop_swap`](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/MULTI_HOP_SWAP.md), and an outside pool. When the price gap beats every fee, it buys on the cheap side and sells on the other.

On [pillees.fun](https://pillees.fun) anyone can launch a bot, give it a logo and a pump.fun coin, and track it on a public leaderboard. Each bot has its own wallet. The coin is launched with the bot as creator, so its creator fees flow into the bot. The owner proves ownership by signing with their wallet and can stop the bot or withdraw its SOL at any time. The private key stays encrypted on the server.

This repo is the tech behind it:

| Package | What it is |
| --- | --- |
| [`@pillees/sdk`](packages/sdk) | Route rules, quotes with fees once per route, the account layout, instruction data, an edge finder and the capsule loop. No dependencies. |
| [`pillees`](packages/cli) | A terminal tool built on the SDK: quote routes, list accounts, scan for edges, dry run a capsule. |
| [`server`](server) | The pillees.fun backend: the live trading engine, bot wallets, wallet-signed owner actions, coin launches through PumpPortal, creator-fee claims, on-chain profit tracking. Also serves the site. |
| [`web`](web) | The site: launch, leaderboard, markets, bot pages, docs, and Pump's doc embedded. |
| [`video`](video) | Remotion sources for the promo and teaser. |

> The SDK and CLI run on a seeded sample market and never send a transaction. Live trading happens in the server's engine. Trading can lose money.

## The live engine

[`server/src/engine.js`](server/src/engine.js) trades for every running bot:

1. **Find coins.** Every 15 minutes it picks up to 40 pump coins that have a PumpSwap pool against SOL and a pool on another exchange, each with $20k+ liquidity (from DexScreener, plus every bot's coin).
2. **Probe.** One coin at a time (about 10 seconds each, Jupiter is rate limited), it prices a 0.05 SOL round trip for the next coin through Jupiter, both ways: buy on PumpSwap and sell elsewhere, or the reverse.
3. **Size.** If a probe comes back ahead, each running bot gets `min(max trade, daily limit left, balance − 0.01 SOL reserve)`, re-priced at that size and a third of it.
4. **Floor.** It only goes ahead if the result beats `SOL in + network fee + priority fee + rent + SOL in × min edge`. That floor becomes the sell leg's minimum out.
5. **One transaction.** Both swaps go into one versioned transaction with lookup tables. If the sell would miss the floor, the whole transaction fails and the bot keeps its SOL.
6. **Simulate, send, record.** Nothing is sent unless simulation passes. The trade size is stored for the daily limit, and the tracker fills in the real result from the chain.

Only one server instance trades: it takes a Postgres advisory lock first. `ENGINE=off` turns trading off. `GET /api/engine` shows what it is watching and its best recent gap. The full write-up is at [pillees.fun/docs](https://pillees.fun/docs#engine).

## Run it

Needs Node 18+ (20+ recommended) and git.

```bash
git clone https://github.com/buenoyed/pillees
cd pillees
npm install

npm run pillees -- quote SOL MOSS PILL --in 1    # quote a 2-hop buy
npm test                                         # SDK, CLI and server tests
npm run dev:server                               # API on http://localhost:8080 (needs BOT_KEY_SECRET in .env)
npm run dev                                      # the site, http://localhost:5173
```

Without `DATABASE_URL` the server keeps its data in `server/.data/db.json`. In production, `npm run build && npm start` serves the built site and the API from one process.

## Config

Copy `.env.example` to `.env` at the repo root and fill it in. It holds the official coin (name, ticker, contract address), the socials, and the server settings (RPC, database, key secret). `VITE_` values are built into the public site; the rest never leave the server. On Railway, set the same names under the `pillees` service variables.

## The CLI

```bash
npm run pillees -- quote SOL MOSS PILL --in 1 --slippage 50
npm run pillees -- accounts SOL MOSS PILL        # the 26 accounts, in order
npm run pillees -- venues                        # the sample market
npm run pillees -- scan --ticks 20               # watch for edges
npm run pillees -- init capsule.json             # write a capsule config
npm run pillees -- run capsule.json --ticks 30   # dry run it
```

Every command takes `--json` and `--seed`. For a global `pillees` command run `cd packages/cli && npm link`.

```
SOL → MOSS → PILL  buy · 2 hops

hop  venue            in                 out                  fee
1    pool MOSS/SOL    1 SOL              6608291.7698 MOSS    0.0005 SOL (protocol)
2    curve PILL/MOSS  6608291.7698 MOSS  24046624.23883 PILL  19824.87531 MOSS (creator)

  out          24046624.23883 PILL
  min out      23926391.117635 PILL at 50 bps
  vs 2 trades  +280602.213757 PILL kept by charging fees once per route
  accounts     26 (16 fixed + 5 × 2)
  compute      ~145,000 CU incl. first-trade volume accumulator
```

## The SDK

```js
import { defineCapsule, findEdge, mockMarket, quoteRoute, resolveRoute, runCapsule, toUnits } from "@pillees/sdk";

const market = mockMarket({ seed: 7 });

const quote = quoteRoute(resolveRoute(["SOL", "MOSS", "PILL"], market.venues()), toUnits("1", 9));
console.log(quote.amountOut, quote.accounts, quote.computeUnits);

const paths = [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]];
const trip = findEdge({ paths, venues: market.venues(), maxSize: toUnits("1", 9), minEdgeBps: 40 });

const capsule = defineCapsule({ name: "spread-hunter", paths, maxSize: "0.5", dailyLimit: "5" });
for await (const event of runCapsule(capsule, { market, ticks: 20 })) console.log(event);
```

Full API in [packages/sdk/README.md](packages/sdk/README.md).

## How a capsule works

1. **Watch.** Each tick it reads venue reserves (the sample market here, your RPC live).
2. **Price both ways.** `findEdge` prices the pump route and the outside venue in both directions, across a ladder of sizes, after every fee.
3. **Check limits.** Minimum edge, cooldown and a daily spend limit.
4. **Plan the legs.** The pump leg is one `multi_hop_swap` with its accounts, data and a single `min_amount_out`. The outside leg is a plain swap.
5. **Execute.** The default executor is a dry run. Pass your own to sign and send.

### Why `multi_hop_swap`

From Pump's [doc](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/MULTI_HOP_SWAP.md), which the SDK follows:

- Fees are charged once per route: protocol fee on the hop that trades your currency, creator and LP fees on the far end, nothing in the middle.
- The middle coin never lands in your wallet, so no token account for it.
- One slippage check, on the final amount. `min_amount_out` must be above zero.
- Every hop is a buy or every hop is a sell (6086), hops must chain (6084), mayhem pools and curves are rejected (6080, 6108).
- 16 fixed accounts plus 5 per hop. Up to 3 hops fit a legacy transaction; 4+ need a lookup table.

## Repo layout

```
packages/
  sdk/     @pillees/sdk
  cli/     pillees
server/    API, bot wallets, tracker; serves web/dist
web/       the site (Vite + React)
video/     Remotion promo and teaser (own npm install)
```

## License

MIT. Independent project, not affiliated with Pump.fun.
