# Pillees site

The site at [pillees.fun](https://pillees.fun). React 19 and Vite 7.

```bash
# from the repo root
npm install
npm run dev       # http://localhost:5173
npm run build     # web/dist
npm run preview
```

## Pages

| Path | |
| --- | --- |
| `/` | Board: top capsules, route tape, open edges. The intro plays only here, on first load. |
| `/capsules` | Browse capsules, with a detail drawer |
| `/new` | Build a capsule on the preview board |
| `/pools` | The liquidity launchpad |
| `/protocol` | How the multi-hop route and its fees work |
| `/sdk` | SDK docs and a playground running `@pillees/sdk` in the browser |
| `/docs` | Pump's `MULTI_HOP_SWAP.md`, fetched live from pump-public-docs and rendered |
| `/run` | Commands to run everything locally |

Old `/#capsules` style links redirect to the path. Routing is client side, so hosting needs a fallback to `index.html`: `vercel.json` covers Vercel and `public/_redirects` covers Netlify and Cloudflare Pages. Set the project root to `web`.

## Intro and mascot

The intro is a pixel-art animation: the Pillee walks a cliff, leaps, parachutes onto the page and becomes the homepage mascot. It starts with an Enter button so the synthesized sound can play, has mute and skip, Escape skips, and reduced motion gets a short static version. All sound is Web Audio, no files. The mascot is drawn on a canvas from sprite parts in `public/intro/`.

## Layout

```
public/          pillee.png, intro sprite parts, SPA redirects
src/
  main.jsx       entry
  router.jsx     path routing, Link, legacy hash redirect
  App.jsx        shell, nav, board, capsules, pools, protocol, create
  devpages.jsx   SDK, Pump docs and Run locally pages
  Intro.jsx      cliff / skydive / parachute intro
  HeroPillee.jsx live homepage mascot
  pillee.js      character rig shared with the videos
  sound.js       Web Audio effects
  data.js        illustrative capsules, routes and pools
  styles.css
```
