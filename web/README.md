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
| `/` | Home: Pump's multi-hop update, how a Pillees bot uses it, one example route, and the coin. The intro plays only here, on first load. |
| `/protocol` | The update in detail: rules, fees, Pump's SDKs |
| `/docs` | Pump's `MULTI_HOP_SWAP.md`, fetched live from pump-public-docs (its synthetic migration section is left out) |
| `/sdk` | `@pillees/sdk` docs |
| `/run` | Commands to run everything locally |

The coin contract address and socials come from the root `.env` (see `.env.example`). Empty values are hidden.

Old `/#protocol` style links redirect to the path. Routing is client side, so hosting needs a fallback to `index.html`: `vercel.json` covers Vercel and `public/_redirects` covers Netlify and Cloudflare Pages. Set the project root to `web`.

## Intro and mascot

The intro is a pixel-art animation: the Pillee walks a cliff, leaps, parachutes onto the page and becomes the homepage mascot. It starts with an Enter button so the synthesized sound can play, has mute and skip, Escape skips, and reduced motion gets a short static version. All sound is Web Audio, no files. The mascot is drawn on a canvas from sprite parts in `public/intro/`.

## Layout

```
public/          pillee.png, intro sprite parts, SPA redirects
src/
  main.jsx       entry
  router.jsx     path routing, Link, legacy hash redirect
  App.jsx        shell, nav, home, the update page
  devpages.jsx   SDK, Pump docs and Run locally pages
  Intro.jsx      cliff / skydive / parachute intro
  HeroPillee.jsx live homepage mascot
  pillee.js      character rig shared with the videos
  sound.js       Web Audio effects
  data.js        coin, socials and doc links, read from .env
  styles.css
```
