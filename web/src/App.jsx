import { useEffect, useState } from "react";
import HeroPillee from "./HeroPillee";
import Intro from "./Intro";
import { useApi } from "./api";
import { COIN, DOCS, LINKS } from "./data";
import { PumpDocs, RunLocally, Sdk } from "./devpages";
import { GitHubIcon, PumpIcon, XIcon } from "./icons";
import { BotPage, BotTable, CoinGrid, Launch, LaunchCoinPage, Leaderboard, Markets } from "./platform";
import { Link, PATH, isHome, useRoute } from "./router";
import { ConnectButton } from "./wallet";

const NAV = [
  { id: "home", label: "Home", icon: "M2.5 7.5 8 2.5l5.5 5v6h-4v-4h-3v4h-4z" },
  { id: "markets", label: "Markets", icon: "M2.5 13.5h11M4 11V7.5M7 11V4.5M10 11V6.5M13 11V3" },
  { id: "leaderboard", label: "Leaderboard", icon: "M5 2.5h6v4a3 3 0 0 1-6 0zM5 4H2.5a2.5 2.5 0 0 0 2.6 3M11 4h2.5a2.5 2.5 0 0 1-2.6 3M8 9.5v3M5.5 13.5h5" },
  { id: "launch", label: "Launch", icon: "M8 1.8c2.6 1.6 3.6 4.4 3 7.7H5c-.6-3.3.4-6.1 3-7.7zM5 9.5 3.2 12h2.4M11 9.5l1.8 2.5h-2.4M8 11.5v2.7" },
  { id: "protocol", label: "How it works", icon: "M3.5 1.8h6l3 3v9.4h-9zM9.5 1.8v3h3M5.5 8.5h5M5.5 11h5" },
  { id: "docs", label: "Pump docs", icon: "M2.5 3h4a2 2 0 0 1 1.5.7A2 2 0 0 1 9.5 3h4v10h-4a1.5 1.5 0 0 0-1.5 1.2A1.5 1.5 0 0 0 6.5 13h-4zM8 3.7v10.5" },
];

const TITLES = {
  home: "Arbitrage bots with their own coins",
  markets: "Markets",
  leaderboard: "Leaderboard",
  launch: "Launch a bot",
  bot: "Bot",
  coin: "Launch a coin",
  protocol: "How it works",
  docs: "Pump docs",
  sdk: "SDK",
  run: "Run locally",
};

const SOCIALS = [
  LINKS.x && { id: "x", label: "X", url: LINKS.x, Icon: XIcon },
  { id: "github", label: "GitHub", url: LINKS.github, Icon: GitHubIcon },
  { id: "pump", label: "pump.fun", url: LINKS.pump, Icon: PumpIcon },
].filter(Boolean);

export default function App() {
  const route = useRoute();
  const view = route.view;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(isHome);
  const [introStage, setIntroStage] = useState("waiting");

  useEffect(() => {
    document.title = `Pillees — ${TITLES[view] || TITLES.home}`;
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [view, route.id]);

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
            <ConnectButton className="btn btn-primary nav-cta" />
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
            {view === "markets" && <Markets />}
            {view === "leaderboard" && <Leaderboard />}
            {view === "launch" && <Launch />}
            {view === "bot" && <BotPage key={route.id} id={route.id} />}
            {view === "coin" && <LaunchCoinPage key={route.id} id={route.id} />}
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

function Socials({ labels = true }) {
  return (
    <div className="socials">
      {SOCIALS.map(({ id, label, url, Icon }) => (
        <a key={id} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label}>
          <Icon />
          {labels && <span>{label}</span>}
        </a>
      ))}
    </div>
  );
}

function Home() {
  const coins = useApi("/coins", 30_000);
  const bots = useApi("/bots?range=7D", 30_000);
  return (
    <>
      <Hero />
      <Steps />
      <section className="home-block" aria-labelledby="new-coins">
        <div className="block-head">
          <div>
            <p className="eyebrow">Just launched</p>
            <h2 id="new-coins">Bot coins</h2>
          </div>
          <Link className="text-link" to="/markets">
            All coins →
          </Link>
        </div>
        {coins.loading && !coins.data ? <div className="skeleton" /> : <CoinGrid coins={coins.data?.coins ?? []} limit={6} />}
      </section>
      <section className="home-block" aria-labelledby="top-bots">
        <div className="block-head">
          <div>
            <p className="eyebrow">Leaderboard · 7 days</p>
            <h2 id="top-bots">Top bots</h2>
          </div>
          <Link className="text-link" to="/leaderboard">
            Full leaderboard →
          </Link>
        </div>
        {bots.loading && !bots.data ? <div className="skeleton" /> : <BotTable bots={bots.data?.bots ?? []} limit={5} />}
      </section>
      <WhatShipped />
      <Coin />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Built on Pump’s multi-hop swap</p>
        <h1>Launch an arbitrage bot. Give it a coin.</h1>
        <p className="lede">
          Every Pillees bot has its own public wallet and its own pump.fun coin. The coin’s
          creator fees flow into the bot, so the more it trades, the more the bot has to
          arbitrage with. You own it with your wallet: stop it or withdraw any time.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/launch">
            Launch a bot
          </Link>
          <Link className="btn btn-ghost" to="/leaderboard">
            Leaderboard
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

const LAUNCH_STEPS = [
  ["Launch a bot", "Connect your wallet, pick a name and a logo, set its limits. It gets its own Solana wallet. Fund it with SOL."],
  ["Launch its coin", "From the bot page, launch a pump.fun coin with the bot as creator. One click, signed by you, paid by the bot."],
  ["Fees fund the bot", "Every trade of the coin pays creator fees to the bot. It collects them and adds them to its trading balance."],
];

function Steps() {
  return (
    <section className="home-block" aria-labelledby="steps-title">
      <p className="eyebrow">How it works</p>
      <h2 id="steps-title">Three steps</h2>
      <ol className="launch-steps">
        {LAUNCH_STEPS.map(([title, text], index) => (
          <li key={title}>
            <span>{index + 1}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <div className="hero-actions">
        <Link className="btn btn-primary" to="/launch">
          Launch a bot
        </Link>
        <Link className="btn btn-ghost" to="/protocol">
          What the bot trades
        </Link>
      </div>
    </section>
  );
}

function WhatShipped() {
  return (
    <section className="home-block" aria-labelledby="shipped">
      <p className="eyebrow">The update</p>
      <h2 id="shipped">Why multi-hop makes this work</h2>
      <p className="home-lede">
        Lots of Pump coins are paired with another Pump coin instead of SOL. Buying one used
        to take two trades. Pump’s <code>multi_hop_swap</code> makes it one, so small price
        gaps are finally worth taking.
      </p>
      <div className="compare">
        <div>
          <h3>Before</h3>
          <ul>
            <li>Two trades: SOL → MOSS, then MOSS → PILL</li>
            <li>Fees on both trades</li>
            <li>Two chances for the price to slip</li>
          </ul>
        </div>
        <div className="after">
          <h3>With multi_hop_swap</h3>
          <ul>
            <li>One instruction: SOL → MOSS → PILL</li>
            <li>Fees once for the whole route</li>
            <li>One slippage check, on what you get at the end</li>
          </ul>
        </div>
      </div>
      <Link className="text-link" to="/protocol">
        How the bot trades it →
      </Link>
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
          The official {COIN.name} coin. This is the only contract address. Anything else is not us.
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

const TRADE_STEPS = [
  ["Watch", "The bot watches the price of a coin on Pump and in an outside pool, all the time."],
  ["Spot the gap", "When the same coin is cheaper in one place than the other, after every fee, that is the gap."],
  ["Buy cheap, sell high", "It buys where it is cheap and sells where it is expensive. The Pump side is one multi_hop_swap."],
  ["Keep the difference", "The gap is the profit. It stays in the bot wallet, where anyone can check it."],
];

const HOPS = [
  { from: "SOL", to: "MOSS", venue: "MOSS pool", fee: "Protocol fee is paid here, once" },
  { from: "MOSS", to: "PILL", venue: "PILL curve", fee: "Creator fee is paid here, once" },
];

function Protocol() {
  return (
    <section className="page protocol">
      <header className="page-head">
        <p className="eyebrow">How it works</p>
        <h1>What a Pillees bot does.</h1>
        <p>
          Bots trade price gaps through Pump’s <code>multi_hop_swap</code>. The rules below come
          from Pump’s docs in <a href={DOCS.repo}>pump-fun/pump-public-docs</a>. If this page and
          the chain ever disagree, the chain wins.
        </p>
      </header>

      <article className="doc-block">
        <h2>The trade</h2>
        <ol className="flow">
          {TRADE_STEPS.map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="doc-block">
        <h2>Your bot, your wallet</h2>
        <ul className="rules">
          <li>Each bot has its own Solana wallet. Its address, balance and every transaction are public.</li>
          <li>The private key is encrypted on the Pillees server. Nobody sees it, including the owner.</li>
          <li>Only the owner wallet can start, stop or withdraw, by signing a message. Signing costs nothing.</li>
          <li>Withdrawals always go to the owner wallet, nowhere else.</li>
          <li>The bot’s coin is a normal pump.fun coin with the bot as creator. Its creator fees go to the bot.</li>
          <li>The multi-hop trading engine is rolling out to bots. Until it reaches a bot, that bot collects its coin’s creator fees.</li>
        </ul>
      </article>

      <article className="doc-block">
        <h2>One route</h2>
        <p>PILL is paired with MOSS, and MOSS is paired with SOL. One instruction walks the whole path.</p>
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
          On a buy, the protocol fee lands on the first hop. On a sell, it lands on the last hop.
          The creator fee and, on a pool, the LP fee land once, on the coin at the far end. Hops
          in the middle charge nothing.
        </p>
        <p>
          <Link to="/docs">Read Pump’s full doc</Link>
          {" · "}
          <a href={DOCS.multiHop}>on GitHub</a>
        </p>
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
          <p>Arbitrage bots with their own coins, on Pump’s multi_hop_swap.</p>
        </div>
      </div>
      <div className="foot-links">
        <Link to="/launch">Launch</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/markets">Markets</Link>
        <Link to="/protocol">How it works</Link>
        <Link to="/docs">Pump docs</Link>
        <Link to="/sdk">SDK</Link>
        <Link to="/run">Run locally</Link>
      </div>
      <Socials labels={false} />
      <p className="fine">Independent project. Not affiliated with Pump.fun. Trading can lose money.</p>
    </footer>
  );
}
