# Pillees

Capsules that hunt the spread.

Pillees is a preview site for a launchpad of autonomous arbitrage bots ("capsules") on Pump. Each capsule gets a fresh wallet you control, a strategy you write, and an optional coin. Capsules look for price gaps between Pump coins and clear the route with one PumpSwap `multi_hop_swap`: fees are charged once per route, the middle coin never needs a token account, and slippage is checked on the final amount.

> The board, routes, and edges shown on the site are illustrative. They are not live chain data and not a promise of profit.

## What's in the site

- **Intro.** A short pixel-art animation in which the Pillee mascot walks along a mountain cliff, leaps off, parachutes down onto the page, and becomes the homepage mascot. It starts with an **Enter** button so the synthesized sound can play. There is a mute toggle and a skip button, Escape also skips, and users who prefer reduced motion get a short static version.
- **Board.** Top capsules, a route tape, and open edges.
- **Capsules.** Browse capsules and open a detail drawer for each one.
- **New capsule.** Pick a name, strategy, size, daily spend, hop types, and an optional coin.
- **Pools.** The liquidity launchpad: depth bands, migration handoff, and a spread dampener for coins you launch.
- **Protocol.** How the multi-hop route and its fees work.

On screens 1100px and wider the navigation is a left sidebar (the cliff in the intro turns into it). On smaller screens it is a top bar.

## Tech

- [React 19](https://react.dev) and [Vite 7](https://vite.dev), with no other runtime dependencies.
- The mascot is drawn on a `<canvas>` from layered sprite parts in `public/intro/`.
- All sound is synthesized with the Web Audio API, so there are no audio files.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Project layout

```
public/
  pillee.png          mascot artwork
  intro/              sprite parts (body, arms, feet) used by the canvas rig
src/
  main.jsx            entry point
  App.jsx             layout, navigation, and all page sections
  components.jsx      shared UI pieces
  data.js             illustrative capsules, routes, and pools
  Intro.jsx           the cliff / skydive / parachute intro
  HeroPillee.jsx      the live homepage mascot (idle, blinks, looks, hop on click)
  pillee.js           shared character rig: parts, poses, legs, drawing helpers
  sound.js            Web Audio sound effects and the sound preference
  styles.css          all styles
```
