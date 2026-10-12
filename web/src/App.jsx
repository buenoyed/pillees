import { useEffect, useMemo, useState } from "react";
import HeroPillee from "./HeroPillee";
import Intro from "./Intro";
import {
  DOCS,
  POOL_STRATEGIES,
  SEED_BOTS,
  SEED_EDGES,
  SEED_FEED,
  SEED_WATCHES,
  STRATEGIES,
  strategyName,
} from "./data";
import { BotMark, Pnl, RoutePath, StrategyPill } from "./components";

const NAV = [
  { id: "board", label: "Board", icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
  { id: "capsules", label: "Capsules", icon: "M5.5 2h5a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 2 10.5v-5A3.5 3.5 0 0 1 5.5 2zM2 8h12" },
  { id: "pools", label: "Pools", icon: "M8 1.8C10.4 5 12.6 7.4 12.6 10a4.6 4.6 0 0 1-9.2 0C3.4 7.4 5.6 5 8 1.8z" },
  { id: "protocol", label: "Protocol", icon: "M3.5 1.8h6l3 3v9.4h-9zM9.5 1.8v3h3M5.5 8.5h5M5.5 11h5" },
];

function useView() {
  const read = () => {
    const id = window.location.hash.replace("#", "");
    return NAV.some((item) => item.id === id) || id === "new" ? id : "board";
  };
  const [view, setView] = useState(read);
  useEffect(() => {
    const onHash = () => setView(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return view;
}

export default function App() {
  const view = useView();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bots, setBots] = useState(SEED_BOTS);
  const [feed, setFeed] = useState(SEED_FEED);
  const [watches, setWatches] = useState(SEED_WATCHES);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [introStage, setIntroStage] = useState("waiting");

  const selected = bots.find((bot) => bot.id === selectedId) || null;

  useEffect(() => {
    const titles = {
      board: "Board",
      capsules: "Capsules",
      pools: "Pools",
      protocol: "Protocol",
      new: "New capsule",
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
    window.location.hash = id;
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
      token: draft.token,
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

  function addWatch(draft) {
    const watch = {
      id: `watch-${Date.now()}`,
      name: draft.name.trim(),
      ticker: draft.ticker.trim().toUpperCase(),
      quote: draft.quote.trim() || "SOL",
      strategy: draft.strategy,
      band: String(draft.band),
      status: "Preview",
    };
    setWatches((current) => [watch, ...current]);
    setToast(`${watch.ticker} is on the preview list. Nothing was launched.`);
  }

  return (
    <>
      {showIntro && <Intro onStage={setIntroStage} onDone={() => setShowIntro(false)} />}
      <div className={showIntro ? `shell ${introStage}` : "shell live"}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="nav">
        <a className="brand" href="#board" onClick={() => setMenuOpen(false)}>
          <img src="/pillee.png" alt="" width="42" height="48" />
          <span>Pillees</span>
        </a>
        <nav id="primary-nav" className={menuOpen ? "links open" : "links"} aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={view === item.id ? "page" : undefined}
            >
              <svg className="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </a>
          ))}
          <a className="btn btn-primary nav-cta" href="#new">
            New capsule
          </a>
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
        {view === "pools" && <Pools watches={watches} onCreate={addWatch} />}
        {view === "protocol" && <Protocol />}
        {view === "new" && <Create onCreate={addBot} />}
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
  const items = ["SOL → MOSS → PILL", "fees once per route", "no middle token account", "SOL → ZEST → CAPS", "synthetic migration handoff", "SOL → DRIP → PILL", "one slippage check"];
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
          <a className="btn btn-primary" href="#new">
            Spin up a capsule
          </a>
          <a className="btn btn-ghost" href="#protocol">
            How the route works
          </a>
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
    <section className="split" aria-label="Two launchpads">
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
          <li>Optionally attach a coin whose fees refill trading or pay holders.</li>
        </ol>
        <a className="text-link" href="#new">
          Build one on the preview
        </a>
      </article>
      <article className="split-card">
        <p className="eyebrow">02 · Liquidity</p>
        <h2>Launch a coin. Pillees minds the book.</h2>
        <p>
          The pools launchpad is for coins you launch, with a strategy that shifts
          liquidity as the market moves. Pump’s synthetic migration lets the final
          bonding-curve buy continue into the reserves the AMM pool would open with,
          without the old cap on that buy. That handoff is useful. It does not
          rebalance liquidity by itself.
        </p>
        <ol className="steps">
          <li>Pair with SOL or with another pump coin.</li>
          <li>Pick depth bands, a migration handoff, or a spread dampener.</li>
          <li>Pillees watches the curve, the completing buy, and the pool after migrate.</li>
        </ol>
        <a className="text-link" href="#pools">
          Open the pools desk
        </a>
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
          Spread hunters, migration watches, and fee recyclers share one board.
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
          {bot.token && (
            <div>
              <dt>Coin</dt>
              <dd>{bot.token}</dd>
            </div>
          )}
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
    token: "No coin",
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

        <fieldset>
          <legend>Optional coin</legend>
          <div className="choice-grid three">
            {[
              ["No coin", "The capsule only trades. No extra mint."],
              ["Sweep into the bot", "Creator fees on your coin can be swept back in as trading inventory."],
              ["Holder rewards", "The creator fee is set aside for holders, the way Pump holder-rewards coins work."],
            ].map(([token, blurb]) => (
              <label key={token} className={form.token === token ? "choice on" : "choice"}>
                <input
                  type="radio"
                  name="token"
                  checked={form.token === token}
                  onChange={() => set("token", token)}
                />
                <strong>{token}</strong>
                <span>{blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Add to preview board
          </button>
          <a className="btn btn-ghost" href="#board">
            Back to board
          </a>
        </div>
      </form>
    </section>
  );
}

function Pools({ watches, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    ticker: "",
    quote: "SOL",
    strategy: "handoff",
    band: "10",
  });
  const [errors, setErrors] = useState({});

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Name the coin.";
    if (!/^[a-zA-Z0-9]{2,8}$/.test(form.ticker.trim())) next.ticker = "Ticker should be 2–8 letters or numbers.";
    if (!form.quote.trim()) next.quote = "Say what it is paired with.";
    const band = Number(form.band);
    if (!Number.isFinite(band) || band <= 0 || band > 40) next.band = "Use a band between 1 and 40.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onCreate(form);
    setForm({ name: "", ticker: "", quote: "SOL", strategy: form.strategy, band: form.band });
  }

  return (
    <section className="page">
      <header className="page-head">
        <p className="eyebrow">Liquidity launchpad</p>
        <h1>Launch the coin. Keep a strategy on the liquidity.</h1>
        <p>
          Pillees is built around Pump’s migration path. A completing buy can now
          keep going: it takes the curve’s remaining tokens, then buys against the
          reserves that would be deposited into the PumpSwap pool. The pool opens
          later where that buy stopped. Your strategy can follow that moment. The
          migration itself does not rebalance anything.
        </p>
      </header>

      <div className="pools-layout">
        <form className="form" onSubmit={submit} noValidate>
          <label>
            Coin name
            <input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Green Dose" />
            {errors.name && <small className="err">{errors.name}</small>}
          </label>
          <div className="form-row">
            <label>
              Ticker
              <input value={form.ticker} onChange={(event) => set("ticker", event.target.value)} placeholder="DOSE" />
              {errors.ticker && <small className="err">{errors.ticker}</small>}
            </label>
            <label>
              Quote
              <input value={form.quote} onChange={(event) => set("quote", event.target.value)} placeholder="SOL or a pump coin" />
              {errors.quote && <small className="err">{errors.quote}</small>}
            </label>
          </div>
          <fieldset>
            <legend>Strategy</legend>
            <div className="choice-grid">
              {POOL_STRATEGIES.map((item) => (
                <label key={item.id} className={form.strategy === item.id ? "choice on" : "choice"}>
                  <input
                    type="radio"
                    name="pool-strategy"
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
            Band (%)
            <input inputMode="decimal" value={form.band} onChange={(event) => set("band", event.target.value)} />
            {errors.band && <small className="err">{errors.band}</small>}
          </label>
          <button className="btn btn-primary" type="submit">
            Add liquidity watch
          </button>
          <p className="fine">
            Preview list only. Pairing a new coin with an existing pump coin is a real
            Pump creation path (<a href={DOCS.quoteMint}>create with a pump-coin quote</a>),
            and this page does not submit it.
          </p>
        </form>

        <div>
          <h2 className="subhead">Watches</h2>
          <ul className="watch-list">
            {watches.map((watch) => (
              <li key={watch.id}>
                <article>
                  <header>
                    <strong>{watch.ticker}</strong>
                    <span>{watch.status}</span>
                  </header>
                  <p>{watch.name}</p>
                  <dl>
                    <div>
                      <dt>Quote</dt>
                      <dd>{watch.quote}</dd>
                    </div>
                    <div>
                      <dt>Strategy</dt>
                      <dd>{strategyName(watch.strategy)}</dd>
                    </div>
                    <div>
                      <dt>Band</dt>
                      <dd>{watch.band}%</dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
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
          <li>Pool hops have to be pump pools from migration. Mayhem-mode pools and mayhem curves are not supported.</li>
          <li>Sixteen fixed accounts, then five accounts per hop. Two or three hops fit a legacy transaction. Four or more need an address lookup table.</li>
          <li>Each hop is roughly 30k to 50k compute units, so the compute budget has to be set on purpose.</li>
        </ul>
        <p>
          On a buy, the protocol fee lands on the first hop. On a sell, it lands on the
          last hop. The creator fee — or holder-rewards fee — and, on a pool, the LP fee,
          land once on the coin at the far end. Hops in the middle charge nothing. A
          one-hop route costs the same as a normal PumpSwap v2 or bonding-curve v3 trade.
        </p>
        <p>
          <a href={DOCS.multiHop}>Multi-hop swap docs</a>
          {" · "}
          <a href={DOCS.tradeV3}>Bonding curve trades v3</a>
        </p>
      </article>

      <article className="doc-block" id="migration">
        <h2>Synthetic migration</h2>
        <p>
          The last buy on a bonding curve no longer has a max size. With <code>buy_v3</code>,{" "}
          <code>buy_exact_quote_in_v3</code>, and a bonding-curve hop inside{" "}
          <code>multi_hop_swap</code>, a buy that asks for more than the curve has left
          does not fail. It takes what is left at the curve price, completes the curve,
          and buys the rest from the tokens that would have gone into the PumpSwap pool,
          at the price that pool would charge.
        </p>
        <ol className="steps tall">
          <li>Curve part. Remaining tokens, normal curve price. The curve is complete.</li>
          <li>Pool part. The rest is priced on the reserves migration would deposit, with PumpSwap’s constant product. For a SOL pair, the migration fee comes off the raised SOL first.</li>
          <li>Later, migration creates the pool with the reserves that buy left behind. The pool opens where the buy stopped.</li>
        </ol>
        <ul className="rules">
          <li>Only the buy that crosses the limit gets this. After it, buys and sells on the curve fail until migration.</li>
          <li>Older buy instructions do not do this. Mayhem coins do not get a synthetic migration.</li>
          <li>On a multi-hop curve hop, the hop spends the rest of its input on the pool part.</li>
          <li>Both parts use the bonding-curve fee schedule, not the pool’s fees.</li>
        </ul>
        <p className="callout">
          Synthetic migration is a pricing path for the last buy. It does not rebalance
          a pool, move LP, or run a strategy. The Pillees pools desk can watch that
          handoff and then apply the band you configured. Those are different jobs.
        </p>
        <p>
          <a href={DOCS.synthetic}>Synthetic migration docs</a>
        </p>
      </article>

      <article className="doc-block" id="coins">
        <h2>Coins, quotes, and fees</h2>
        <p>
          <code>create_v2</code> can pair a new coin with an existing pump coin. That
          pair is why a route is SOL → A → B instead of a single SOL hop. Holder-rewards
          coins send the creator fee to holders through Pump, instead of a creator wallet.
          New cashback coins are rejected. Fees on the newer trades stay on the curve or
          in the pool until someone calls the permissionless sweep instructions.
        </p>
        <ul className="link-list">
          <li><a href={DOCS.quoteMint}>Creating a coin paired with a pump coin</a></li>
          <li><a href={DOCS.holderRewards}>Holder rewards coins</a></li>
          <li><a href={DOCS.sweeps}>Fee sweeps</a></li>
          <li><a href={DOCS.repo}>Pump public docs repository</a></li>
        </ul>
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
          <p>Arbitrage capsules and liquidity watches for Pump coins.</p>
        </div>
      </div>
      <div className="foot-links">
        <a href="#protocol">Protocol</a>
        <a href={DOCS.repo}>Pump docs</a>
        <a href={DOCS.multiHop}>multi_hop_swap</a>
        <a href={DOCS.synthetic}>Synthetic migration</a>
      </div>
      <p className="fine">
        Independent interface. Not affiliated with Pump.fun. Trading can lose money.
        Numbers on the board are samples. This site does not custody keys or submit transactions.
      </p>
    </footer>
  );
}
