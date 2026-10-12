import { useEffect, useState } from "react";
import HeroPillee from "./HeroPillee";
import Intro from "./Intro";
import { useApi } from "./api";
import { COIN, DOCS, LINKS } from "./data";
import { PumpDocs, RunLocally, Sdk } from "./devpages";
import { PilleesDocs } from "./docs";
import { Profile, Search } from "./explore";
import { GitHubIcon, PumpIcon, XIcon } from "./icons";
import { BotPage, BotTable, CoinGrid, Launch, LaunchCoinPage, Leaderboard, Markets } from "./platform";
import { Link, PATH, isHome, navigate, useRoute } from "./router";
import { WalletMenu, useWallet } from "./wallet";

const ICONS = {
  home: "M2.5 7.5 8 2.5l5.5 5v6h-4v-4h-3v4h-4z",
  markets: "M2.5 13.5h11M4 11V7.5M7 11V4.5M10 11V6.5M13 11V3",
  leaderboard: "M5 2.5h6v4a3 3 0 0 1-6 0zM5 4H2.5a2.5 2.5 0 0 0 2.6 3M11 4h2.5a2.5 2.5 0 0 1-2.6 3M8 9.5v3M5.5 13.5h5",
  profile: "M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8zM2.75 13.75c.6-2.5 2.7-4 5.25-4s4.65 1.5 5.25 4",
  protocol: "M3.5 1.8h6l3 3v9.4h-9zM9.5 1.8v3h3M5.5 8.5h5M5.5 11h5",
  docs: "M2.5 3h4a2 2 0 0 1 1.5.7A2 2 0 0 1 9.5 3h4v10h-4a1.5 1.5 0 0 0-1.5 1.2A1.5 1.5 0 0 0 6.5 13h-4zM8 3.7v10.5",
  pump: "M3.6 12.4a2.6 2.6 0 0 1 0-3.7l5.1-5.1a2.6 2.6 0 0 1 3.7 3.7l-5.1 5.1a2.6 2.6 0 0 1-3.7 0zM6.15 6.15l3.7 3.7",
  sdk: "M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4M9.2 2.5 6.8 13.5",
};

const NAV = [
  { id: "home", label: "Home" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "markets", label: "Coins" },
  { id: "profile", label: "Profile" },
  { id: "protocol", label: "How it works" },
  { id: "docs", label: "Docs" },
  { id: "pump", label: "Pump docs" },
  { id: "sdk", label: "SDK" },
];

const SOCIALS = [
  LINKS.x && { id: "x", label: "X", url: LINKS.x, Icon: XIcon },
  { id: "github", label: "GitHub", url: LINKS.github, Icon: GitHubIcon },
  { id: "pump", label: "pump.fun", url: LINKS.pump, Icon: PumpIcon },
].filter(Boolean);

function NavIcon({ id }) {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path d={ICONS[id]} />
    </svg>
  );
}

function ProfileLink({ current, onDone }) {
  const { address, connect } = useWallet();
  const to = address ? `/profile/${address}` : "/profile";
  return (
    <a
      href={to}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        onDone();
        if (address) navigate(to);
        else connect().then((key) => key && navigate(`/profile/${key}`)).catch(() => {});
      }}
    >
      <NavIcon id="profile" />
      Profile
    </a>
  );
}

export default function App() {
  const route = useRoute();
  const view = route.view;
  const { address } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(isHome);
  const [introStage, setIntroStage] = useState("waiting");
  const close = () => setMenuOpen(false);

  useEffect(() => {
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
          <Link className="brand" to="/" onClick={close}>
            <img src="/pillee.png" alt="" width="32" height="36" />
            <span>Pillees</span>
          </Link>
          <nav id="primary-nav" className={menuOpen ? "links open" : "links"} aria-label="Primary">
            {NAV.map((item) =>
              item.id === "profile" ? (
                <ProfileLink key="profile" current={view === "profile" && route.id === address} onDone={close} />
              ) : (
                <Link key={item.id} to={PATH[item.id]} onClick={close} aria-current={view === item.id ? "page" : undefined}>
                  <NavIcon id={item.id} />
                  {item.label}
                </Link>
              ),
            )}
            <Link className="btn btn-primary side-cta" to="/launch" onClick={close}>
              Create a bot
            </Link>
          </nav>
          <div className="side-foot">
            {SOCIALS.map(({ id, label, url, Icon }) => (
              <a key={id} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                <Icon />
              </a>
            ))}
          </div>
          <div className="nav-mobile">
            <WalletMenu />
            <button
              className="menu"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d={menuOpen ? "M3.5 3.5l9 9M12.5 3.5l-9 9" : "M2.5 4.5h11M2.5 8h11M2.5 11.5h11"} />
              </svg>
            </button>
          </div>
        </header>
        <div className="page">
          <div className="topbar">
            <Search />
            <div className="topbar-right">
              <Link className="btn btn-ghost topbar-create" to="/launch">
                Create a bot
              </Link>
              <WalletMenu />
            </div>
          </div>
          <main id="content">
            <div className="view" key={`${view}:${route.id ?? ""}`}>
              {view === "home" && <Home />}
              {view === "markets" && <Markets />}
              {view === "leaderboard" && <Leaderboard />}
              {view === "launch" && <Launch />}
              {view === "bot" && <BotPage id={route.id} />}
              {view === "coin" && <LaunchCoinPage id={route.id} />}
              {view === "profile" && (route.id ? <Profile address={route.id} /> : <ConnectProfile />)}
              {view === "protocol" && <Protocol />}
              {view === "sdk" && <Sdk />}
              {view === "docs" && <PilleesDocs />}
              {view === "pump" && <PumpDocs />}
              {view === "run" && <RunLocally />}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}

function ConnectProfile() {
  const { address, connect } = useWallet();
  useEffect(() => {
    if (address) navigate(`/profile/${address}`);
  }, [address]);
  return (
    <section className="page narrow">
      <header className="page-head">
        <h1>Profile</h1>
        <p>Connect your wallet to see your bots, their profit and the coins you launched.</p>
      </header>
      <button className="btn btn-primary" type="button" onClick={() => connect().catch(() => {})}>
        Connect wallet
      </button>
    </section>
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
      <section className="home-block" aria-labelledby="top-bots">
        <div className="block-head">
          <h2 id="top-bots">Top bots</h2>
          <span className="dim">Last 7 days</span>
          <Link className="text-link" to="/leaderboard">
            View all
          </Link>
        </div>
        {bots.loading && !bots.data ? <div className="skeleton" /> : <BotTable bots={bots.data?.bots ?? []} limit={5} />}
      </section>
      <Steps />
      <section className="home-block" aria-labelledby="new-coins">
        <div className="block-head">
          <h2 id="new-coins">New bot coins</h2>
          <span className="dim">From the launchpad</span>
          <Link className="text-link" to="/markets">
            View all
          </Link>
        </div>
        {coins.loading && !coins.data ? <div className="skeleton" /> : <CoinGrid coins={coins.data?.coins ?? []} limit={6} />}
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
        <h1>Create your own arbitrage bot</h1>
        <p className="lede">
          Pick a name and a logo, set its limits, fund it. Your bot gets its own public wallet
          that anyone can track, and you control it with your wallet: stop it or withdraw any
          time. Want more? Launch a pump.fun coin for it, and the coin’s creator fees fund the bot.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/launch">
            Create your bot
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
        </div>
      </div>
    </section>
  );
}

const LAUNCH_STEPS = [
  ["Create your bot", "Connect your wallet, pick a name and a logo, set its limits. It gets its own Solana wallet."],
  ["Fund it", "Send it SOL. Its balance, profit and every transaction are public, and it shows up on the leaderboard."],
  ["Optional: launch its coin", "The launchpad side. Launch a pump.fun coin with the bot as creator, and every trade of it pays creator fees into the bot."],
];

function Steps() {
  return (
    <section className="home-block" aria-labelledby="steps-title">
      <p className="eyebrow">How it works</p>
      <h2 id="steps-title">Create, fund, and (if you want) launch a coin</h2>
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
          Create your bot
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
        How the bot trades it
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
        <h1>How it works</h1>
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
          <Link to="/pump">Read Pump’s full doc</Link>
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
          <p>Create your own arbitrage bot on Pump’s multi_hop_swap. Launch a coin for it if you want.</p>
        </div>
      </div>
      <div className="foot-links">
        <Link to="/launch">Create a bot</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/markets">Coins</Link>
        <Link to="/protocol">How it works</Link>
        <Link to="/docs">Docs</Link>
        <Link to="/pump">Pump docs</Link>
        <Link to="/sdk">SDK</Link>
        <Link to="/run">Run locally</Link>
      </div>
      <Socials labels={false} />
      <p className="fine">Independent project. Not affiliated with Pump.fun. Trading can lose money.</p>
    </footer>
  );
}
