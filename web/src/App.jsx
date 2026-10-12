import { useEffect, useState } from "react";
import HeroPillee from "./HeroPillee";
import Intro from "./Intro";
import { COIN, DOCS, SOCIALS } from "./data";
import { PumpDocs, RunLocally, Sdk } from "./devpages";
import { Link, PATH, isHome, useView } from "./router";

const NAV = [
  { id: "home", label: "Home", icon: "M2.5 7.5 8 2.5l5.5 5v6h-4v-4h-3v4h-4z" },
  { id: "protocol", label: "The update", icon: "M3.5 1.8h6l3 3v9.4h-9zM9.5 1.8v3h3M5.5 8.5h5M5.5 11h5" },
  { id: "docs", label: "Pump docs", icon: "M2.5 3h4a2 2 0 0 1 1.5.7A2 2 0 0 1 9.5 3h4v10h-4a1.5 1.5 0 0 0-1.5 1.2A1.5 1.5 0 0 0 6.5 13h-4zM8 3.7v10.5" },
  { id: "sdk", label: "SDK", icon: "M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4M9.2 2.5 6.8 13.5" },
  { id: "run", label: "Run locally", icon: "M2 3h12v10H2zM4.5 6.5 6.5 8l-2 1.5M8 10h3.5" },
];

const TITLES = {
  home: "Arbitrage bots on Pump's multi-hop swap",
  protocol: "The multi-hop update",
  docs: "Pump docs",
  sdk: "SDK",
  run: "Run locally",
};

const X = SOCIALS.find((item) => item.id === "x");

export default function App() {
  const view = useView();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(isHome);
  const [introStage, setIntroStage] = useState("waiting");

  useEffect(() => {
    document.title = `Pillees — ${TITLES[view] || TITLES.home}`;
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [view]);

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
              <Link key={item.id} to={PATH[item.id]} aria-current={view === item.id ? "page" : undefined}>
                <svg className="nav-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            ))}
            {COIN.pump ? (
              <a className="btn btn-primary nav-cta" href={COIN.pump}>
                Buy ${COIN.ticker}
              </a>
            ) : X ? (
              <a className="btn btn-primary nav-cta" href={X.url}>
                Follow on X
              </a>
            ) : (
              <Link className="btn btn-primary nav-cta" to="/docs">
                Read Pump’s doc
              </Link>
            )}
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
          <main id="content">
            {view === "home" && <Home />}
            {view === "protocol" && <Protocol />}
            {view === "sdk" && <Sdk />}
            {view === "docs" && <PumpDocs />}
            {view === "run" && <RunLocally />}
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}

function CopyCA() {
  const [copied, setCopied] = useState(false);
  if (!COIN.ca) {
    return (
      <p className="ca ca-empty">
        <span>${COIN.ticker}</span>
        <code>CA drops here at launch</code>
      </p>
    );
  }
  return (
    <p className="ca">
      <span>${COIN.ticker}</span>
      <code>{COIN.ca}</code>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(COIN.ca).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          })
        }
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}

function Socials() {
  if (!SOCIALS.length) return null;
  return (
    <div className="socials">
      {SOCIALS.map((item) => (
        <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
          {item.label}
        </a>
      ))}
    </div>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <WhatShipped />
      <HowItWorks />
      <Route />
      <Coin />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Pump’s new multi-hop swap</p>
        <h1>Arbitrage bots for Pump’s multi-hop swap.</h1>
        <p className="lede">
          Pump just shipped <code>multi_hop_swap</code>: one instruction that trades
          through several coins in a row, like SOL → MOSS → PILL. Pillees bots use it
          to catch price gaps between Pump and other pools, and close them for profit.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#how">
            How it works
          </a>
          <Link className="btn btn-ghost" to="/docs">
            Read Pump’s doc
          </Link>
        </div>
        <CopyCA />
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
          <i>pool</i>
          <span>MOSS</span>
          <i>curve</i>
          <span>PILL</span>
        </div>
      </div>
    </section>
  );
}

function WhatShipped() {
  return (
    <section className="home-block" aria-labelledby="shipped">
      <p className="eyebrow">The update</p>
      <h2 id="shipped">What Pump shipped</h2>
      <p className="home-lede">
        Lots of Pump coins are now paired with another Pump coin instead of SOL. Buying
        one used to take two trades. Now it is one.
      </p>
      <div className="compare">
        <div>
          <h3>Before</h3>
          <ul>
            <li>Two trades: SOL → MOSS, then MOSS → PILL</li>
            <li>MOSS lands in your wallet in between</li>
            <li>Fees on both trades</li>
            <li>Two chances for the price to slip</li>
          </ul>
        </div>
        <div className="after">
          <h3>With multi_hop_swap</h3>
          <ul>
            <li>One instruction: SOL → MOSS → PILL</li>
            <li>MOSS never touches your wallet</li>
            <li>Fees once for the whole route</li>
            <li>One slippage check, on what you get at the end</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ["Watch", "The bot watches the price of a coin on Pump and in an outside pool, all the time."],
  ["Spot the gap", "When the same coin is cheaper in one place than the other, after every fee, that is the gap."],
  ["Buy cheap, sell high", "It buys where it is cheap and sells where it is expensive. The Pump side is one multi_hop_swap."],
  ["Keep the difference", "The gap is the profit. Fees charged once per route are what make small gaps worth taking."],
];

function HowItWorks() {
  return (
    <section className="home-block" id="how" aria-labelledby="how-title">
      <p className="eyebrow">How it works</p>
      <h2 id="how-title">What a Pillees bot does</h2>
      <ol className="flow">
        {STEPS.map(([title, text], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const HOPS = [
  { from: "SOL", to: "MOSS", venue: "MOSS pool", fee: "Protocol fee is paid here, once" },
  { from: "MOSS", to: "PILL", venue: "PILL curve", fee: "Creator fee is paid here, once" },
];

function Route() {
  return (
    <section className="home-block" aria-labelledby="route-title">
      <p className="eyebrow">One route</p>
      <h2 id="route-title">Buying PILL with SOL, in one go</h2>
      <p className="home-lede">
        PILL is paired with MOSS, and MOSS is paired with SOL. The bot sends one
        instruction that walks the whole path.
      </p>
      <ol className="hops">
        {HOPS.map((hop, index) => (
          <li key={hop.venue}>
            <span className="hop-n">Hop {index + 1}</span>
            <strong>
              {hop.from} → {hop.to}
            </strong>
            <span>{hop.venue}</span>
            <small>{hop.fee}</small>
          </li>
        ))}
      </ol>
      <p className="callout">
        MOSS only exists inside the route. It never lands in the wallet, so there is no
        extra account to open and nothing to clean up.
      </p>
    </section>
  );
}

function Coin() {
  return (
    <section className="home-block coin-block" aria-labelledby="coin-title">
      <div>
        <p className="eyebrow">The coin</p>
        <h2 id="coin-title">${COIN.ticker}</h2>
        <p className="home-lede">
          The official {COIN.name} coin. This is the only contract address. Anything
          else is not us.
        </p>
        <CopyCA />
        <div className="hero-actions">
          {COIN.pump && (
            <a className="btn btn-primary" href={COIN.pump}>
              Buy on pump.fun
            </a>
          )}
          {COIN.chart && (
            <a className="btn btn-ghost" href={COIN.chart}>
              Chart
            </a>
          )}
        </div>
        <Socials />
      </div>
      <img src="/pillee.png" alt="" width="180" height="206" />
    </section>
  );
}

function Protocol() {
  return (
    <section className="page protocol">
      <header className="page-head">
        <p className="eyebrow">The update, in detail</p>
        <h1>How multi_hop_swap works.</h1>
        <p>
          The rules every Pillees route follows, from Pump’s docs in{" "}
          <a href={DOCS.repo}>pump-fun/pump-public-docs</a>. If this page and the chain
          ever disagree, the chain wins.
        </p>
      </header>

      <article className="doc-block">
        <h2>The idea</h2>
        <p>
          <code>multi_hop_swap</code> is one PumpSwap instruction that trades through
          two or more pools and bonding curves in a row. It exists for coins paired
          with another Pump coin. If coin B is quoted in Pump coin A, and A is quoted
          in SOL, buying B used to mean two trades and a token account for A. Now it
          is SOL → A → B in one instruction. Selling is the reverse.
        </p>
      </article>

      <article className="doc-block">
        <h2>The rules</h2>
        <ul className="rules">
          <li>Exact in. <code>min_amount_out</code> is checked once and has to be above zero.</li>
          <li>One direction. Every hop is a buy, or every hop is a sell.</li>
          <li>The hops have to chain. The coin out of one hop goes into the next.</li>
          <li>Pool hops have to be Pump pools. Mayhem-mode pools and curves are not supported.</li>
          <li>Sixteen fixed accounts, then five per hop. Up to three hops fit a normal transaction.</li>
          <li>Each hop costs roughly 30k to 50k compute units.</li>
        </ul>
      </article>

      <article className="doc-block">
        <h2>The fees</h2>
        <p>
          On a buy, the protocol fee lands on the first hop. On a sell, it lands on the
          last hop. The creator fee and, on a pool, the LP fee land once, on the coin at
          the far end. Hops in the middle charge nothing.
        </p>
        <p>
          <Link to="/docs">Read Pump’s full doc</Link>
          {" · "}
          <a href={DOCS.multiHop}>on GitHub</a>
        </p>
      </article>

      <article className="doc-block">
        <h2>Pump’s SDKs</h2>
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
          <p>Arbitrage bots built on Pump’s multi_hop_swap.</p>
        </div>
      </div>
      <div className="foot-links">
        <Link to="/protocol">The update</Link>
        <Link to="/docs">Pump docs</Link>
        <Link to="/sdk">SDK</Link>
        <Link to="/run">Run locally</Link>
        {SOCIALS.map((item) => (
          <a key={item.id} href={item.url}>
            {item.label}
          </a>
        ))}
      </div>
      <p className="fine">Independent project. Not affiliated with Pump.fun. Trading can lose money.</p>
    </footer>
  );
}
