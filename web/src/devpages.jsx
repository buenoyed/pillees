import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import {
  defineCapsule,
  findEdge,
  fromUnits,
  minAmountOut,
  mockMarket,
  multiHopSwapData,
  quoteRoute,
  quoteSeparateTrades,
  resolveRoute,
  runCapsule,
  toUnits,
} from "@pillees/sdk";
import { DOCS } from "./data";
import { Link } from "./router";

const REPO = DOCS.pillees;
const decimals = (mint) => (mint === "SOL" ? 9 : 6);
const amount = (units, mint) => `${trim(fromUnits(units, decimals(mint)))} ${mint}`;
const trim = (value) => {
  const [whole, frac = ""] = value.split(".");
  const n = Number(whole);
  const short = n >= 1000 ? "" : frac.slice(0, n >= 1 ? 4 : 6).replace(/0+$/, "");
  return `${n.toLocaleString("en-US")}${short ? `.${short}` : ""}`;
};
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function Code({ title, lang = "js", children }) {
  const text = children.trim();
  const copy = lang === "sh" ? text.split("\n").filter((line) => line && !line.startsWith("#")).join("\n") : text;
  return (
    <figure className="code">
      <figcaption>
        <span>{title || (lang === "sh" ? "terminal" : lang)}</span>
        <CopyButton text={copy} />
      </figcaption>
      <pre className={`lang-${lang}`}>
        {lang === "sh"
          ? text.split("\n").map((line, index) => (
              <span key={index} className={line.startsWith("#") ? "c" : line ? "cmd" : undefined}>
                {line}
                {"\n"}
              </span>
            ))
          : text}
      </pre>
    </figure>
  );
}

/* ---------------------------------- SDK ---------------------------------- */

const PRESETS = [
  { path: ["SOL", "MOSS", "PILL"], note: "buy · pool then curve" },
  { path: ["SOL", "ZEST", "CAPS"], note: "buy · pool then curve" },
  { path: ["PILL", "MOSS", "SOL"], note: "sell · curve then pool" },
  { path: ["SOL", "PILL"], note: "outside venue · one hop" },
];
const PAIRS = [
  [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]],
  [["SOL", "ZEST", "CAPS"], ["SOL", "CAPS"]],
];

function Playground() {
  const market = useRef(null);
  if (!market.current) market.current = mockMarket({ seed: 7, shock: 0.04 });
  const [version, setVersion] = useState(0);
  const [preset, setPreset] = useState(0);
  const [size, setSize] = useState("1");
  const [slippage, setSlippage] = useState(50);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  const path = PRESETS[preset].path;
  const result = useMemo(() => {
    try {
      const venues = market.current.venues();
      const route = resolveRoute(path, venues);
      const amountIn = toUnits(size || "0", decimals(path[0]));
      if (amountIn <= 0n) throw new Error("Enter an amount above zero.");
      const quote = quoteRoute(route, amountIn);
      const separate = quote.multiHop ? quoteSeparateTrades(route, amountIn) : null;
      const minOut = minAmountOut(quote.amountOut, slippage);
      const edges = PAIRS.map((paths) => findEdge({ paths, venues, maxSize: toUnits("1", 9), minEdgeBps: 30 }));
      return { quote, separate, minOut, data: quote.multiHop ? hex(multiHopSwapData(amountIn, minOut)) : null, edges };
    } catch (error) {
      return { error: error.message };
    }
  }, [path, size, slippage, version]);

  async function runDry() {
    setRunning(true);
    setLog([]);
    const capsule = defineCapsule({ name: "spread-hunter", paths: PAIRS[0], maxSize: "0.5", dailyLimit: "5", minEdgeBps: 40, cooldownTicks: 2 });
    const lines = [];
    for await (const event of runCapsule(capsule, { market: market.current, ticks: 16, intervalMs: 90 })) {
      lines.push(event);
      setLog([...lines]);
    }
    setVersion((v) => v + 1);
    setRunning(false);
  }

  return (
    <div className="playground">
      <div className="pg-controls">
        <div className="pg-field">
          <span>Route</span>
          <div className="seg wrap">
            {PRESETS.map((item, index) => (
              <button key={item.path.join()} type="button" aria-pressed={preset === index} onClick={() => setPreset(index)}>
                {item.path.join(" → ")}
              </button>
            ))}
          </div>
          <small>{PRESETS[preset].note}</small>
        </div>
        <label className="pg-field">
          <span>Amount in ({path[0]})</span>
          <input inputMode="decimal" value={size} onChange={(event) => setSize(event.target.value.replace(/[^\d.]/g, ""))} />
        </label>
        <div className="pg-field">
          <span>Slippage</span>
          <div className="seg">
            {[10, 50, 100].map((bps) => (
              <button key={bps} type="button" aria-pressed={slippage === bps} onClick={() => setSlippage(bps)}>
                {bps} bps
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => { market.current.tick(); setVersion((v) => v + 1); }}>
          Move the market
        </button>
      </div>

      {result.error ? (
        <p className="pg-error">{result.error}</p>
      ) : (
        <div className="pg-out">
          <table className="pg-table">
            <thead>
              <tr><th>Hop</th><th>In</th><th>Out</th><th>Fee</th></tr>
            </thead>
            <tbody>
              {result.quote.steps.map((step) => (
                <tr key={step.index}>
                  <td>{step.index + 1} · {step.side}</td>
                  <td>{amount(step.amountIn, step.mintIn)}</td>
                  <td>{amount(step.amountOut, step.mintOut)}</td>
                  <td>{step.fee > 0n ? `${amount(step.fee, step.feeMint)} (${Object.keys(step.fees).filter((k) => step.fees[k] > 0n).join(" + ")})` : "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="pg-facts">
            <div><dt>Out</dt><dd>{amount(result.quote.amountOut, result.quote.output)}</dd></div>
            <div><dt>min_amount_out</dt><dd>{amount(result.minOut, result.quote.output)}</dd></div>
            {result.separate && (
              <div>
                <dt>vs separate trades</dt>
                <dd className="up">+{amount(result.quote.amountOut - result.separate.amountOut, result.quote.output)}</dd>
              </div>
            )}
            <div><dt>Accounts</dt><dd>{result.quote.multiHop ? `${result.quote.accounts} (16 + 5 × ${result.quote.steps.length})` : "plain swap"}</dd></div>
            <div><dt>Compute</dt><dd>~{result.quote.computeUnits.toLocaleString("en-US")} CU</dd></div>
            <div><dt>Transaction</dt><dd>{result.quote.legacy ? "legacy fits" : "v0 + lookup table"}</dd></div>
          </dl>
          {result.data && (
            <p className="pg-data">
              <span>instruction data</span>
              <code>{result.data}</code>
            </p>
          )}
          <div className="pg-edges">
            {result.edges.map((trip) => (
              <p key={trip.label} className={trip.fire ? "fire" : undefined}>
                <strong>{trip.edgeBps > 0 ? "+" : ""}{trip.edgeBps} bps</strong>
                <span>{trip.label}</span>
                <small>{trip.fire ? `fire at ${amount(trip.amountIn, "SOL")}` : "below the 30 bps bar"}</small>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="pg-run">
        <button className="btn btn-primary" type="button" disabled={running} onClick={runDry}>
          {running ? "Running…" : "Run a capsule, dry"}
        </button>
        <span>16 ticks of <code>runCapsule</code> on the sample market. Nothing is signed or sent.</span>
      </div>
      {log.length > 0 && (
        <ol className="pg-log">
          {log.map((event, index) => (
            <li key={index} className={event.type}>
              <span>{String(event.tick).padStart(2, "0")}</span>
              <b>{event.type}</b>
              <span>{event.type === "idle" ? `best ${event.edgeBps} bps` : `${event.route} · ${event.edgeBps} bps`}</span>
              <span>{event.type === "fill" ? `+${event.profit} SOL on ${event.size}` : event.reason || ""}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const API = [
  ["resolveRoute(path, venues)", "Turn a mint path like SOL → MOSS → PILL into hops, picking the venue for each pair."],
  ["planRoute(route)", "Check the multi_hop_swap rules: one direction, hops that chain, no mayhem, outside venues only alone. Returns accounts, CU and whether legacy fits."],
  ["quoteRoute(route, amountIn)", "Constant-product quote per hop with fees charged once per route, the way the program does it."],
  ["quoteSeparateTrades(route, amountIn)", "Same route quoted as separate trades, so you can see what one instruction saves."],
  ["minAmountOut(out, bps)", "The single slippage floor. Always above zero, as the program requires."],
  ["multiHopAccounts(route, keys)", "The 16 fixed accounts and 5 per hop, in order, with seeds and writable flags."],
  ["multiHopSwapData(amountIn, minOut)", "The 24 bytes of instruction data: discriminator, then two u64s."],
  ["findEdge({ paths, venues, maxSize })", "Price a round trip both ways across a size ladder and return the best one."],
  ["defineCapsule(config) / runCapsule()", "A capsule config with limits, and an async loop that yields idle, skip, edge and fill events."],
  ["mockMarket({ seed })", "A seeded sample market of pools, curves and outside venues, for demos and tests."],
];

export function Sdk() {
  return (
    <section className="dev">
      <header className="page-head">
        <p className="eyebrow">@pillees/sdk · v0.1.0</p>
        <h1>The route math, as a library.</h1>
        <p>
          The same code the capsules use: <code>multi_hop_swap</code> rules, quotes with fees once per
          route, the account layout, instruction data and an edge finder. No dependencies. Runs in Node
          and the browser. The panel below runs it in this tab.
        </p>
      </header>

      <article className="dev-block">
        <h2>Try it</h2>
        <p>Sample market, made-up reserves. Change the route or size and the quote updates.</p>
        <Playground />
      </article>

      <article className="dev-block">
        <h2>Install</h2>
        <p>
          Not on npm yet. Use it from the repo with a link, or copy <code>packages/sdk</code> into your project.
        </p>
        <Code lang="sh">{`
git clone ${REPO}
cd pillees && npm install
cd packages/sdk && npm link
# then, in your own project
npm link @pillees/sdk
`}</Code>
      </article>

      <article className="dev-block">
        <h2>Quote a route</h2>
        <Code title="quote.js">{`
import { fromUnits, minAmountOut, mockMarket, quoteRoute, resolveRoute, toUnits } from "@pillees/sdk";

const market = mockMarket();
const route = resolveRoute(["SOL", "MOSS", "PILL"], market.venues());
const quote = quoteRoute(route, toUnits("1", 9));

console.log(fromUnits(quote.amountOut, 6), "PILL");
console.log(quote.accounts, "accounts,", quote.computeUnits, "CU");
console.log("min out", fromUnits(minAmountOut(quote.amountOut, 50), 6));
`}</Code>
      </article>

      <article className="dev-block">
        <h2>Find an edge, run a capsule</h2>
        <Code title="capsule.js">{`
import { defineCapsule, findEdge, mockMarket, runCapsule, toUnits } from "@pillees/sdk";

const market = mockMarket({ seed: 7 });
const paths = [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]];

const trip = findEdge({ paths, venues: market.venues(), maxSize: toUnits("1", 9), minEdgeBps: 40 });
console.log(trip.label, trip.edgeBps, "bps", trip.fire ? "fire" : "wait");

const capsule = defineCapsule({ name: "spread-hunter", paths, maxSize: "0.5", dailyLimit: "5" });
for await (const event of runCapsule(capsule, { market, ticks: 20 })) {
  console.log(event.tick, event.type, event.route, event.edgeBps);
}
`}</Code>
      </article>

      <article className="dev-block">
        <h2>Bring your own executor</h2>
        <p>
          By default capsules dry run. To trade for real, pass an executor. Each leg arrives with its
          quote, <code>min_amount_out</code> and, for multi-hop legs, the instruction data and account list.
          The sample market has no on-chain addresses, so for live use you build hops from real pool and
          curve accounts, and you sign with your own wallet and RPC.
        </p>
        <Code title="executor.js">{`
const executor = {
  async execute({ capsule, legs }) {
    for (const leg of legs) {
      // leg.multiHop: build a PumpSwap multi_hop_swap from leg.data + leg.accounts
      // otherwise: a plain swap on the outside venue for leg.amountIn, floor leg.minAmountOut
    }
    return { signatures: [] };
  },
};

for await (const event of runCapsule(capsule, { market, executor })) { /* ... */ }
`}</Code>
      </article>

      <article className="dev-block">
        <h2>API</h2>
        <ul className="api">
          {API.map(([name, text]) => (
            <li key={name}>
              <code>{name}</code>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="dev-more">
          Types ship in <code>index.d.ts</code>. Source and tests are in{" "}
          <a href={`${REPO}/tree/main/packages/sdk`}>packages/sdk</a>. Want to run it from a terminal? See{" "}
          <Link to="/run">Run locally</Link>.
        </p>
      </article>
    </section>
  );
}

/* ------------------------------- Pump docs ------------------------------- */

const DOC_PATH = "docs/instructions/MULTI_HOP_SWAP.md";
const RAW = `https://raw.githubusercontent.com/pump-fun/pump-public-docs/main/${DOC_PATH}`;
const BLOB = `https://github.com/pump-fun/pump-public-docs/blob/main/${DOC_PATH}`;
let docCache = null;

const slug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s/g, "-");

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
  },
});

function renderDoc(markdown) {
  const html = DOMPurify.sanitize(marked.parse(markdown));
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href.startsWith("#")) return;
    link.setAttribute("href", new URL(href, BLOB).href);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noreferrer");
  });
  template.content.querySelectorAll("img[src]").forEach((img) => {
    img.setAttribute("src", new URL(img.getAttribute("src"), RAW).href);
  });
  template.content.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "md-table";
    table.replaceWith(wrap);
    wrap.append(table);
  });
  const toc = Array.from(template.content.querySelectorAll("h2, h3"), (h) => ({ id: h.id, text: h.textContent, depth: h.tagName === "H3" ? 3 : 2 }));
  return { html: template.innerHTML, toc };
}

export function PumpDocs() {
  const [state, setState] = useState(docCache ? { status: "ready", ...docCache } : { status: "loading" });

  useEffect(() => {
    if (docCache) return undefined;
    let live = true;
    fetch(RAW)
      .then((response) => {
        if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
        return response.text();
      })
      .then((markdown) => {
        docCache = { ...renderDoc(markdown), fetched: new Date() };
        if (live) setState({ status: "ready", ...docCache });
      })
      .catch((error) => live && setState({ status: "error", message: error.message }));
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="dev">
      <header className="page-head">
        <p className="eyebrow">Pump docs · live embed</p>
        <h1>multi_hop_swap, straight from Pump.</h1>
        <p>
          This loads Pump’s own doc from{" "}
          <a href={DOCS.repo}>pump-fun/pump-public-docs</a> each time, so it is always the current
          version. It is the instruction every Pillees route clears with.
        </p>
      </header>

      <div className="docs-embed">
        <aside className="docs-toc">
          <p className="eyebrow">On this page</p>
          {state.status === "ready" ? (
            <nav aria-label="Doc sections">
              {state.toc.map((item) => (
                <a key={item.id} href={`#${item.id}`} className={item.depth === 3 ? "sub" : undefined}>
                  {item.text}
                </a>
              ))}
            </nav>
          ) : (
            <span className="dim">…</span>
          )}
          <div className="docs-src">
            <a href={BLOB}>Open on GitHub</a>
            <a href="https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump_amm.json">pump_amm IDL</a>
            <Link to="/sdk">Pillees SDK</Link>
          </div>
        </aside>

        <article className="md">
          <div className="md-bar">
            <span>pump-fun/pump-public-docs</span>
            <code>{DOC_PATH}</code>
            {state.status === "ready" && <small>fetched {state.fetched.toLocaleTimeString()}</small>}
          </div>
          {state.status === "loading" && (
            <div className="md-skeleton" aria-label="Loading">
              <i /><i /><i /><i /><i />
            </div>
          )}
          {state.status === "error" && (
            <p className="md-error">
              Could not load the doc ({state.message}). Read it on <a href={BLOB}>GitHub</a>.
            </p>
          )}
          {state.status === "ready" && <div className="md-body" dangerouslySetInnerHTML={{ __html: state.html }} />}
        </article>
      </div>
    </section>
  );
}

/* ------------------------------ Run locally ------------------------------ */

const SAMPLE_QUOTE = `
SOL → MOSS → PILL  buy · 2 hops

hop  venue            in                 out                  fee
1    pool MOSS/SOL    1 SOL              6608291.7698 MOSS    0.0005 SOL (protocol)
2    curve PILL/MOSS  6608291.7698 MOSS  24046624.23883 PILL  19824.87531 MOSS (creator)

  out          24046624.23883 PILL
  min out      23926391.117635 PILL at 50 bps
  vs 2 trades  +280602.213757 PILL kept by charging fees once per route
  accounts     26 (16 fixed + 5 × 2)
  compute      ~145,000 CU incl. first-trade volume accumulator
  data         2b644913e9f66f9400ca9a3b0000000043170bccc2150000
`;

const LAYOUT = `
pillees/
├─ packages/
│  ├─ sdk/        @pillees/sdk   route rules, quotes, accounts, edge finder, capsule loop
│  └─ cli/        pillees        the terminal tool, built on the SDK
├─ web/           this site (Vite + React), uses the SDK for the playground
└─ video/         Remotion sources for the promo and teaser
`;

const FLOW = [
  ["Watch", "Each tick the capsule reads venue reserves. In the CLI that is the sample market; live, it is your RPC."],
  ["Price both ways", "findEdge prices the pump route and the outside venue in both directions, across a ladder of sizes, after every fee."],
  ["Check the limits", "Below the minimum edge, inside the cooldown, or over the daily limit, it waits and says why."],
  ["Plan the legs", "One leg is a multi_hop_swap, built with its accounts, data and a single min_amount_out. The other is a plain swap."],
  ["Execute", "The executor gets the plan. The built-in one is a dry run that only updates the sample market."],
];

export function RunLocally() {
  return (
    <section className="dev">
      <header className="page-head">
        <p className="eyebrow">Run locally</p>
        <h1>Run Pillees on your machine.</h1>
        <p>
          Every command here works on a fresh clone: the CLI, the SDK tests, this website and the videos.
          You need Node 18 or newer (20+ is better) and git. Nothing here signs or sends a transaction.
        </p>
      </header>

      <article className="dev-block">
        <h2>1 · Get the code</h2>
        <Code lang="sh">{`
git clone ${REPO}
cd pillees
npm install
`}</Code>
      </article>

      <article className="dev-block">
        <h2>2 · Use the CLI</h2>
        <p>
          <code>npm run pillees --</code> runs the CLI from the repo. To get a global{" "}
          <code>pillees</code> command, run <code>cd packages/cli && npm link</code> once.
        </p>
        <Code lang="sh">{`
# quote a two-hop buy through one multi_hop_swap
npm run pillees -- quote SOL MOSS PILL --in 1 --slippage 50

# the 26 accounts that route needs, in order
npm run pillees -- accounts SOL MOSS PILL

# venues on the sample market, then watch for edges
npm run pillees -- venues
npm run pillees -- scan --ticks 20

# write a capsule config, edit it, dry run it
npm run pillees -- init capsule.json
npm run pillees -- run capsule.json --ticks 30

# every command takes --json and --seed
npm run pillees -- quote PILL MOSS SOL --in 500000 --json
`}</Code>
        <p>The quote command prints something like this:</p>
        <pre className="term">{SAMPLE_QUOTE.trim()}</pre>
      </article>

      <article className="dev-block">
        <h2>3 · Use the SDK in a script</h2>
        <p>
          Inside the repo the package resolves through npm workspaces, so any <code>.mjs</code> file can
          import it. Full API on the <Link to="/sdk">SDK page</Link>.
        </p>
        <Code title="try.mjs">{`
import { mockMarket, quoteRoute, resolveRoute, toUnits, fromUnits } from "@pillees/sdk";

const market = mockMarket();
const quote = quoteRoute(resolveRoute(["SOL", "ZEST", "CAPS"], market.venues()), toUnits("2", 9));
console.log(fromUnits(quote.amountOut, 6), "CAPS");
`}</Code>
        <Code lang="sh">{`
node try.mjs
`}</Code>
      </article>

      <article className="dev-block">
        <h2>4 · Tests</h2>
        <Code lang="sh">{`
# SDK route rules, fees, accounts, edge finder + CLI end to end
npm test
`}</Code>
      </article>

      <article className="dev-block">
        <h2>5 · This website</h2>
        <Code lang="sh">{`
npm run dev        # http://localhost:5173
npm run build      # static files in web/dist
npm run preview
`}</Code>
      </article>

      <article className="dev-block">
        <h2>6 · The videos</h2>
        <p>The video project has its own install. Renders land in <code>video/out</code>.</p>
        <Code lang="sh">{`
cd video
npm install
node scripts/music-teaser.mjs
COMP=Teaser node scripts/render.mjs
`}</Code>
      </article>

      <article className="dev-block">
        <h2>How it works</h2>
        <ol className="flow">
          {FLOW.map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p>
          Why the pump side is one instruction: <code>multi_hop_swap</code> charges fees once per route,
          checks slippage once, and never opens a token account for the middle coin. Pump’s doc is
          embedded on the <Link to="/docs">Pump docs page</Link>.
        </p>
      </article>

      <article className="dev-block">
        <h2>Repo layout</h2>
        <pre className="term">{LAYOUT.trim()}</pre>
      </article>
    </section>
  );
}
