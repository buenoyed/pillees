# Pillees site

The site at [pillees.fun](https://pillees.fun). React 19 and Vite 7. The API lives in [`server`](../server), which also serves the built site in production.

```bash
# from the repo root
npm install
npm run dev:server   # API on :8080
npm run dev          # http://localhost:5173, proxies /api to :8080
npm run build        # web/dist
```

## Pages

| Path | |
| --- | --- |
| `/` | Launch a bot, the three steps, newest bot coins, top bots, why multi-hop, the coin. The intro plays only here, on first load. |
| `/launch` | Connect a wallet and launch a bot: logo, name, limits |
| `/bots/:id` | Public bot page: wallet, profit, coin, activity. The owner also gets start/stop, withdraw, launch coin and claim fees. |
| `/leaderboard` | Bots ranked by on-chain profit, 24H / 7D / 30D / ALL |
| `/markets` | Every bot coin with market cap |
| `/protocol` | How a bot trades, custody, and the multi-hop rules and fees |
| `/docs` | Pillees docs: bots, funding, limits, coin launch, creator fees, custody, profit, public API, FAQ |
| `/pump` | Pump's `MULTI_HOP_SWAP.md`, fetched live from pump-public-docs (its synthetic migration section is left out) |
| `/sdk` | `@pillees/sdk` docs |
| `/run` | Commands to run everything locally |

The coin contract address, X and GitHub links come from the root `.env` (see `.env.example`). The pump.fun link points at the coin once `VITE_COIN_CA` is set.

Old `/#protocol` style links redirect to the path.

## Intro and mascot

The intro is a pixel-art animation: the Pillee walks a cliff, leaps, parachutes onto the page and becomes the homepage mascot. It starts with an Enter button so the synthesized sound can play, has mute and skip, Escape skips, and reduced motion gets a short static version. All sound is Web Audio, no files. The mascot is drawn on a canvas from sprite parts in `public/intro/`.

## Layout

```
public/          pillee.png, intro sprite parts
src/
  main.jsx       entry
  router.jsx     path routing, Link, legacy hash redirect
  wallet.jsx     Phantom / Solflare connect and message signing
  api.js         fetch helpers and formatting
  App.jsx        shell, nav, home, how it works, footer
  platform.jsx   launch, leaderboard, markets, bot page
  icons.jsx      X, GitHub and pump.fun logos
  devpages.jsx   SDK, Pump docs and Run locally pages
  Intro.jsx      cliff / skydive / parachute intro
  HeroPillee.jsx live homepage mascot
  pillee.js      character rig shared with the videos
  sound.js       Web Audio effects
  data.js        coin and links, read from .env
  styles.css
```
