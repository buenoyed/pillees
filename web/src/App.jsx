import { useEffect, useMemo, useState } from "react";
import HeroPillee from "./HeroPillee";
import Intro from "./Intro";
import {
  DOCS,
  SEED_BOTS,
  SEED_EDGES,
  SEED_FEED,
  STRATEGIES,
  strategyName,
} from "./data";
import { BotMark, Pnl, RoutePath, StrategyPill } from "./components";
import { PumpDocs, RunLocally, Sdk } from "./devpages";
import { Link, PATH, isHome, navigate, useView } from "./router";

const NAV = [
  { id: "board", label: "Board", icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
  { id: "capsules", label: "Capsules", icon: "M5.5 2h5a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 2 10.5v-5A3.5 3.5 0 0 1 5.5 2zM2 8h12" },
  { id: "protocol", label: "Protocol", icon: "M3.5 1.8h6l3 3v9.4h-9zM9.5 1.8v3h3M5.5 8.5h5M5.5 11h5" },
  { id: "sdk", label: "SDK", icon: "M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4M9.2 2.5 6.8 13.5" },
  { id: "docs", label: "Pump docs", icon: "M2.5 3h4a2 2 0 0 1 1.5.7A2 2 0 0 1 9.5 3h4v10h-4a1.5 1.5 0 0 0-1.5 1.2A1.5 1.5 0 0 0 6.5 13h-4zM8 3.7v10.5" },
  { id: "run", label: "Run locally", icon: "M2 3h12v10H2zM4.5 6.5 6.5 8l-2 1.5M8 10h3.5" },
];

export default function App() {
  const view = useView();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bots, setBots] = useState(SEED_BOTS);
  const [feed, setFeed] = useState(SEED_FEED);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");
  const [showIntro, setShowIntro] = useState(isHome);
  const [introStage, setIntroStage] = useState("waiting");

  const selected = bots.find((bot) => bot.id === selectedId) || null;

  useEffect(() => {
    const titles = {
      board: "Board",
      capsules: "Capsules",
      protocol: "Protocol",
      new: "New capsule",
      sdk: "SDK",
      docs: "Pump docs",
      run: "Run locally",
    };
    document.title = `Pillees — ${titles[view] || "Board"}`;
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedId ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedId]);

  function go(id) {
    navigate(PATH[id]);
  }

  function addBot(draft) {
    const bot = {
      id: `local-${Date.now()}`,
      name: draft.name.trim(),
      strategy: draft.strategy,
      hops: String(draft.hops),
      venues: draft.venues,
      direction: draft.direction,
      note: draft.instructions.trim() || strategyName(draft.strategy),
      pnl: { "24H": 0, "7D": 0, "30D": 0 },
      fills: 0,
      hit: "—",
      fresh: true,
    };
    setBots((current) => [bot, ...current]);
    setFeed((current) => [
      {
        id: `local-feed-${Date.now()}`,
        kind: "note",
        bot: bot.name,
        time: "now",
        edge: null,
        size: null,
        hops: [],
        text: `${bot.name} is on the preview board. No wallet was created and nothing was sent.`,
      },
      ...current,
    ]);
    setSelectedId(bot.id);
    setToast(`${bot.name} is on the preview board.`);
    go("board");
  }

  return (
    <>
      {showIntro && <Intro onStage={setIntroStage} onDone={() => setShowIntro(false)} />}
      <div className={showIntro ? `shell ${introStage}` : "shell live"}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="nav">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src="/pillee.png" alt="" width="42" height="48" />
          <span>Pillees</span>
        </Link>
        <nav id="primary-nav" className={menuOpen ? "links open" : "links"} aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.id}
              to={PATH[item.id]}
              aria-current={view === item.id ? "page" : undefined}
            >
              <svg className="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
          <Link className="btn btn-primary nav-cta" to="/new">
            New capsule
          </Link>
        </nav>
        <button
          className="menu"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>
      <div className="page">
      <Ticker />

      <main id="content">
        {view === "board" && (
          <Board
            bots={bots}
            feed={feed}
            onOpen={setSelectedId}
          />
        )}
        {view === "capsules" && (
          <Capsules bots={bots} onOpen={setSelectedId} />
        )}
        {view === "protocol" && <Protocol />}
        {view === "new" && <Create onCreate={addBot} />}
        {view === "sdk" && <Sdk />}
        {view === "docs" && <PumpDocs />}
        {view === "run" && <RunLocally />}
      </main>

      <Footer />
      </div>

      {selected && (
        <CapsuleDrawer bot={selected} feed={feed} onClose={() => setSelectedId(null)} />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      </div>
    </>
  );
}

function Ticker() {
  const items = ["SOL → MOSS → PILL", "fees once per route", "no middle token account", "SOL → ZEST → CAPS", "SOL → DRIP → PILL", "one slippage check"];
  const loop = [...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {loop.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function Board({ bots, feed, onOpen }) {
  const [range, setRange] = useState("24H");
  const [tab, setTab] = useState("route");
  const [sort, setSort] = useState("edge");

  const ranked = useMemo(() => {
    return [...bots].sort((a, b) => {
    if (Boolean(a.fresh) !== Boolean(b.fresh)) return a.fresh ? -1 : 1;
    return b.pnl[range] - a.pnl[range];
  });
  }, [bots, range]);

  const tape = feed.filter((item) => (tab === "all" ? true : item.kind === tab));

  const edges = useMemo(() => {
    const copy = [...SEED_EDGES];
    copy.sort((a, b) => (sort === "size" ? b.size - a.size : b.edge - a.edge));
    return copy;
  }, [sort]);

  return (
    <>
      <Hero />
      <section className="board-wrap" aria-label="Preview board">
        <div className="board-label">
          <span className="eyebrow">Preview board</span>
          <p>Illustrative capsules, routes, and edges. Not live chain data, and not a promise of profit.</p>
        </div>
        <div className="board">
          <section className="panel" aria-labelledby="top-capsules">
            <header className="panel-head">
              <h2 id="top-capsules">Top capsules</h2>
              <div className="seg" role="group" aria-label="Profit window">
                {["24H", "7D", "30D"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={range === item}
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </header>
            <div className="panel-body">
              <ol className="rank" key={range}>
                {ranked.map((bot, index) => (
                  <li key={bot.id}>
                    <button type="button" className="rank-row" onClick={() => onOpen(bot.id)}>
                      <span className="rank-n">{index + 1}</span>
                      <BotMark name={bot.name} />
                      <span className="rank-copy">
                        <strong>
                          {bot.name}
                          {bot.fresh && <em> new</em>}
                        </strong>
                        <span>{strategyName(bot.strategy)}</span>
                      </span>
                      <Pnl value={bot.pnl[range]} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="panel" aria-labelledby="tape-title">
            <header className="panel-head">
              <h2 id="tape-title">Route tape</h2>
              <div className="seg" role="group" aria-label="Tape filter">
                {[
                  ["route", "Routes"],
                  ["fill", "Fills"],
                  ["note", "Notes"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>
            <div className="panel-body">
              {tape.length === 0 && <p className="empty">Nothing on this tab yet.</p>}
              <ul className="tape" key={tab}>
                {tape.map((item) => (
                  <li key={item.id}>
                    <article className="tape-card">
                      <header>
                        <button type="button" onClick={() => {
                          const match = bots.find((bot) => bot.name === item.bot);
                          if (match) onOpen(match.id);
                        }}>
                          {item.bot}
                        </button>
                        <time>{item.time}</time>
                      </header>
                      {item.hops.length > 0 && <RoutePath hops={item.hops} />}
                      <p>{item.text}</p>
                      <footer>
                        {item.edge != null && (
                          <span className={item.edge >= 0 ? "up" : "down"}>
                            {item.edge > 0 ? "+" : ""}
                            {item.edge} bps
                          </span>
                        )}
                        {item.size && <span>{item.size}</span>}
                        <span className="kind">{item.kind}</span>
                      </footer>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel" aria-labelledby="edges-title">
            <header className="panel-head">
              <h2 id="edges-title">Open edges</h2>
              <div className="seg" role="group" aria-label="Sort edges">
                <button type="button" aria-pressed={sort === "edge"} onClick={() => setSort("edge")}>
                  Edge
                </button>
                <button type="button" aria-pressed={sort === "size"} onClick={() => setSort("size")}>
                  Size
                </button>
              </div>
            </header>
            <div className="panel-body">
              <ul className="edges">
                {edges.map((edge) => (
                  <li key={edge.id}>
                    <div>
                      <strong>{edge.path.join(" → ")}</strong>
                      <span>{edge.venues}</span>
                    </div>
                    <div className="edge-nums">
                      <b className="up">+{edge.edge} bps</b>
                      <span>{edge.size.toFixed(1)} SOL</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </section>
      <ProductSplit />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">PumpSwap · multi_hop_swap</p>
        <h1>Capsules that hunt the spread.</h1>
        <p className="lede">
          Pillees launches autonomous arbitrage bots with a fresh wallet you control,
          a strategy you write, and an optional coin. They look for price gaps between
          Pump coins and clear the route with one multi-hop swap.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/new">
            Spin up a capsule
          </Link>
          <Link className="btn btn-ghost" to="/protocol">
            How the route works
          </Link>
        </div>
        <ul className="stats">
          <li>
            <strong>Once</strong>
            <span>Fees per route, not per hop</span>
          </li>
          <li>
            <strong>None</strong>
            <span>No token account for the middle coin</span>
          </li>
          <li>
            <strong>One</strong>
            <span>Slippage check, on the final amount</span>
          </li>
        </ul>
      </div>
      <div className="hero-art">
        <div className="tilt">
          <HeroPillee />
          <div className="orbit" aria-hidden="true">
            <span style={{ "--i": 0 }}>SOL</span>
            <span style={{ "--i": 1 }}>MOSS</span>
            <span style={{ "--i": 2 }}>PILL</span>
          </div>
        </div>
        <div className="route-float" aria-hidden="true">
          <span>SOL</span>
          <i>curve</i>
          <span>MOSS</span>
          <i>pool</i>
          <span>PILL</span>
        </div>
      </div>
    </section>
  );
}

function ProductSplit() {
  return (
    <section className="split" aria-label="Capsules and the SDK">
      <article className="split-card">
        <p className="eyebrow">01 · Arbitrage</p>
        <h2>A launchpad for your own bot.</h2>
        <p>
          Each capsule gets its own wallet, a direction, a hop cap, and spend limits.
          Routes have to be all buys or all sells. The middle coin never has to land
          in the wallet. Pump charges the protocol fee on the hop that touches your
          currency, and the creator or LP fee on the coin at the far end.
        </p>
        <ol className="steps">
          <li>Name the capsule and pick a strategy.</li>
          <li>Set size, daily spend, and whether hops are curves, pools, or both.</li>
          <li>Pick the pump route and the outside pool it compares against.</li>
        </ol>
        <Link className="text-link" to="/new">
          Build one on the preview
        </Link>
      </article>
      <article className="split-card">
        <p className="eyebrow">02 · Build</p>
        <h2>Run the same tech yourself.</h2>
        <p>
          The route math is open source. The SDK quotes a multi-hop route with fees
          once per route, lists the accounts, builds the instruction data, and finds
          the edge against an outside pool. The CLI does the same from a terminal.
        </p>
        <ol className="steps">
          <li>Clone the repo and install.</li>
          <li>Quote a route or dry run a capsule from the CLI.</li>
          <li>Plug in your own executor when you want it to trade.</li>
        </ol>
        <Link className="text-link" to="/sdk">
          Open the SDK
        </Link>
      </article>
    </section>
  );
}

function Capsules({ bots, onOpen }) {
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState("all");
  const shown = bots.filter((bot) => {
    const matchesName = bot.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStrategy = strategy === "all" || bot.strategy === strategy;
    return matchesName && matchesStrategy;
  });

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">Capsules</p>
        <h1>Every bot is its own wallet and its own rules.</h1>
        <p>
          Spread hunters and size ladders share one board.
          Open a capsule to read the route it is built for.
        </p>
      </header>
      <div className="filters">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name"
          />
        </label>
        <div className="seg" role="group" aria-label="Strategy filter">
          <button type="button" aria-pressed={strategy === "all"} onClick={() => setStrategy("all")}>
            All
          </button>
          {STRATEGIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={strategy === item.id}
              onClick={() => setStrategy(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="empty">No capsule matches that filter.</p>}
      <ul className="card-grid">
        {shown.map((bot) => (
          <li key={bot.id}>
            <button type="button" className="bot-card" onClick={() => onOpen(bot.id)}>
              <span className="bot-card-top">
                <BotMark name={bot.name} />
                <span>
                  <strong>{bot.name}</strong>
                  <StrategyPill id={bot.strategy} />
                </span>
              </span>
              <p>{bot.note}</p>
              <dl>
                <div>
                  <dt>24H</dt>
                  <dd><Pnl value={bot.pnl["24H"]} /></dd>
                </div>
                <div>
                  <dt>Hops</dt>
                  <dd>{bot.hops}</dd>
                </div>
                <div>
                  <dt>Side</dt>
                  <dd>{bot.direction}</dd>
                </div>
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CapsuleDrawer({ bot, feed, onClose }) {
  const items = feed.filter((item) => item.bot === bot.name);
  return (
    <div className="drawer-root">
      <button className="backdrop" type="button" aria-label="Close capsule" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <BotMark name={bot.name} />
          <div>
            <p className="eyebrow">{bot.fresh ? "Preview capsule" : "Sample capsule"}</p>
            <h2 id="drawer-title">{bot.name}</h2>
          </div>
          <button type="button" className="icon-x" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <StrategyPill id={bot.strategy} />
        <p className="drawer-note">{bot.note}</p>
        <dl className="spec">
          <div>
            <dt>Direction</dt>
            <dd>{bot.direction}</dd>
          </div>
          <div>
            <dt>Hops</dt>
            <dd>{bot.hops}</dd>
          </div>
          <div>
            <dt>Venues</dt>
            <dd>{bot.venues}</dd>
          </div>
          <div>
            <dt>Fills</dt>
            <dd>{bot.fills}</dd>
          </div>
          <div>
            <dt>Hit rate</dt>
            <dd>{bot.hit}</dd>
          </div>
        </dl>
        <div className="pnl-row">
          {["24H", "7D", "30D"].map((range) => (
            <div key={range}>
              <span>{range}</span>
              <Pnl value={bot.pnl[range]} />
            </div>
          ))}
        </div>
        <h3>On the tape</h3>
        {items.length === 0 && <p className="empty">No tape entries for this name yet.</p>}
        <ul className="tape compact">
          {items.map((item) => (
            <li key={item.id}>
              <article className="tape-card">
                {item.hops.length > 0 && <RoutePath hops={item.hops} />}
                <p>{item.text}</p>
              </article>
            </li>
          ))}
        </ul>
        <p className="fine">
          Preview only. Pillees does not create a key, hold funds, or submit this capsule on-chain from this page.
        </p>
      </aside>
    </div>
  );
}

function Create({ onCreate }) {
  const [form, setForm] = useState({
    name: "",
    strategy: "spread",
    instructions: "",
    position: "0.5",
    daily: "2",
    hops: "2",
    venues: "Curves and pools",
    direction: "Buys",
  });
  const [errors, setErrors] = useState({});

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const next = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 16) next.name = "Use 2 to 16 characters.";
    if (form.strategy === "custom" && form.instructions.trim().length < 8) {
      next.instructions = "Write a short instruction, at least a sentence.";
    }
    const position = Number(form.position);
    const daily = Number(form.daily);
    if (!Number.isFinite(position) || position <= 0) next.position = "Position has to be above zero.";
    if (!Number.isFinite(daily) || daily < position) next.daily = "Daily spend should cover at least one position.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onCreate({ ...form, name });
  }

  return (
    <section className="page narrow">
      <header className="page-head">
        <p className="eyebrow">New capsule</p>
        <h1>Give it a name, a side, and a ceiling.</h1>
        <p>
          This form stays in the browser. It adds a capsule to the preview board.
          It does not generate a key or send a transaction.
        </p>
      </header>
      <form className="form" onSubmit={submit} noValidate>
        <label>
          Capsule name
          <input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={16}
            placeholder="Hopscotch"
            autoComplete="off"
          />
          {errors.name && <small className="err">{errors.name}</small>}
        </label>

        <fieldset>
          <legend>Strategy</legend>
          <div className="choice-grid">
            {STRATEGIES.map((item) => (
              <label key={item.id} className={form.strategy === item.id ? "choice on" : "choice"}>
                <input
                  type="radio"
                  name="strategy"
                  checked={form.strategy === item.id}
                  onChange={() => set("strategy", item.id)}
                />
                <strong>{item.name}</strong>
                <span>{item.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Instructions
          <textarea
            rows={4}
            value={form.instructions}
            onChange={(event) => set("instructions", event.target.value)}
            placeholder="Buy routes only. Minimum edge 40 bps. Skip mayhem coins."
          />
          {errors.instructions && <small className="err">{errors.instructions}</small>}
        </label>

        <div className="form-row">
          <label>
            Max position (SOL)
            <input
              inputMode="decimal"
              value={form.position}
              onChange={(event) => set("position", event.target.value)}
            />
            {errors.position && <small className="err">{errors.position}</small>}
          </label>
          <label>
            Daily spend (SOL)
            <input
              inputMode="decimal"
              value={form.daily}
              onChange={(event) => set("daily", event.target.value)}
            />
            {errors.daily && <small className="err">{errors.daily}</small>}
          </label>
        </div>

        <fieldset>
          <legend>Route shape</legend>
          <p className="hint">
            A route is exact-in. Two or three hops fit a normal transaction. Four or more
            need a v0 transaction and an address lookup table. Every hop has to be a buy,
            or every hop a sell.
          </p>
          <div className="form-row">
            <div className="seg" role="group" aria-label="Hop count">
              {["2", "3"].map((hops) => (
                <button
                  key={hops}
                  type="button"
                  aria-pressed={form.hops === hops}
                  onClick={() => set("hops", hops)}
                >
                  {hops} hops
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Direction">
              {["Buys", "Sells"].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  aria-pressed={form.direction === direction}
                  onClick={() => set("direction", direction)}
                >
                  {direction}
                </button>
              ))}
            </div>
          </div>
          <div className="seg wrap" role="group" aria-label="Venues">
            {["Curves and pools", "Curves only", "Pools only"].map((venues) => (
              <button
                key={venues}
                type="button"
                aria-pressed={form.venues === venues}
                onClick={() => set("venues", venues)}
              >
                {venues}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Add to preview board
          </button>
          <Link className="btn btn-ghost" to="/">
            Back to board
          </Link>
        </div>
      </form>
    </section>
  );
}

function Protocol() {
  return (
    <section className="page protocol">
      <header className="page-head">
        <p className="eyebrow">From the Pump docs</p>
        <h1>What the capsules are actually calling.</h1>
        <p>
          Pillees sits on public Pump and PumpSwap instructions. The notes below follow
          the docs in{" "}
          <a href={DOCS.repo}>pump-fun/pump-public-docs</a>. Behavior on-chain wins if
          this page and the repo ever disagree.
        </p>
      </header>

      <article className="doc-block" id="multihop">
        <h2>Multi-hop swap</h2>
        <p>
          <code>multi_hop_swap</code> is one PumpSwap instruction that trades through
          two or more pools and bonding curves in a row. It exists for coins paired
          with another pump coin. If coin B is quoted in pump coin A, and A is quoted
          in SOL, buying B used to mean two trades and a token account for A. Now it
          is SOL → A → B in one instruction. Selling is the reverse.
        </p>
        <div className="compare">
          <div>
            <h3>Before</h3>
            <ul>
              <li>A trade for each hop</li>
              <li>A token account for the middle coin</li>
              <li>PumpSwap fees on every hop</li>
              <li>A slippage check on each trade</li>
            </ul>
          </div>
          <div>
            <h3>multi_hop_swap</h3>
            <ul>
              <li>One instruction for the whole route</li>
              <li>The middle coin never touches the wallet</li>
              <li>Fees once per route</li>
              <li>One slippage check, on the final amount</li>
            </ul>
          </div>
        </div>
        <ul className="rules">
          <li>Exact in. <code>min_amount_out</code> is checked once and has to be above zero.</li>
          <li>One direction. Mixing a buy hop with a sell hop fails.</li>
          <li>The hops have to chain. The coin out of one hop is a mint of the next.</li>
          <li>Pool hops have to be pump pools. Mayhem-mode pools and mayhem curves are not supported.</li>
          <li>Sixteen fixed accounts, then five accounts per hop. Two or three hops fit a legacy transaction. Four or more need an address lookup table.</li>
          <li>Each hop is roughly 30k to 50k compute units, so the compute budget has to be set on purpose.</li>
        </ul>
        <p>
          On a buy, the protocol fee lands on the first hop. On a sell, it lands on the
          last hop. The creator fee and, on a pool, the LP fee,
          land once on the coin at the far end. Hops in the middle charge nothing. A
          one-hop route costs the same as a normal single trade.
        </p>
        <p>
          <Link to="/docs">Pump’s multi-hop doc, embedded</Link>
          {" · "}
          <a href={DOCS.multiHop}>on GitHub</a>
        </p>
      </article>

      <article className="doc-block">
        <h2>SDKs the route builders use</h2>
        <ul className="link-list">
          <li>
            <a href={DOCS.swapSdk}>@pump-fun/pump-swap-sdk 2.1.0</a>
            <span>Pool hops, <code>multiHopSwapQuote</code>, and the swap instruction.</span>
          </li>
          <li>
            <a href={DOCS.pumpSdk}>@pump-fun/pump-sdk 4.0.0</a>
            <span>Route resolution, a simulated amount out, and SOL wrapping around the swap.</span>
          </li>
          <li>
            <a href={DOCS.rustSdk}>pump-rust-client 0.4.0</a>
            <span>Pool or curve hops, a quote, and a compute-unit hint.</span>
          </li>
        </ul>
      </article>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div>
        <img src="/pillee.png" alt="" width="36" height="42" />
        <div>
          <strong>Pillees</strong>
          <p>Arbitrage capsules for Pump coins, built on multi_hop_swap.</p>
        </div>
      </div>
      <div className="foot-links">
        <Link to="/protocol">Protocol</Link>
        <Link to="/sdk">SDK</Link>
        <Link to="/docs">Pump docs</Link>
        <Link to="/run">Run locally</Link>
        <a href={DOCS.pillees}>GitHub</a>
      </div>
      <p className="fine">
        Independent interface. Not affiliated with Pump.fun. Trading can lose money.
        Numbers on the board are samples. This site does not custody keys or submit transactions.
      </p>
    </footer>
  );
}
