import { useEffect, useState } from "react";
import { api } from "./api";
import { DOCS, LINKS, SITE } from "./data";
import { Link } from "./router";

const GROUPS = [
  [
    "Using Pillees",
    [
      ["overview", "Overview"],
      ["quick-start", "Quick start"],
      ["create", "Create a bot"],
      ["fund", "Fund your bot"],
      ["limits", "Limits and edge"],
      ["coin", "Launch a coin"],
      ["fees", "Creator fees"],
      ["control", "Stop, start, withdraw"],
      ["profiles", "Profiles and search"],
    ],
  ],
  [
    "How the tech works",
    [
      ["architecture", "Architecture"],
      ["engine", "The engine loop"],
      ["candidates", "Finding coins"],
      ["pricing", "Pricing a round trip"],
      ["sizing", "Sizing a trade"],
      ["floor", "Costs and the floor"],
      ["atomic", "One atomic transaction"],
      ["simulate", "Simulate, then send"],
      ["rails", "Safety rails"],
      ["tracking", "Tracking and profit"],
      ["claims", "Fee claims"],
      ["custody", "Wallet keys"],
      ["signatures", "Owner signatures"],
      ["multihop", "multi_hop_swap and the SDK"],
    ],
  ],
  [
    "Reference",
    [
      ["status", "Live engine status"],
      ["api", "Public API"],
      ["self-host", "Run your own"],
      ["faq", "FAQ"],
    ],
  ],
];

const IDS = GROUPS.flatMap(([, items]) => items.map(([id]) => id));

function useActive(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        const first = ids.find((id) => seen.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="doc-sec">
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  );
}

const Table = ({ head, rows }) => (
  <div className="md-table">
    <table>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ago = (iso) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};

function EngineStatus() {
  const [engine, setEngine] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () =>
      api("/engine")
        .then((e) => live && (setEngine(e), setError(false)))
        .catch(() => live && setError(true));
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (error) return <p className="dim">Couldn’t reach the engine right now.</p>;
  if (!engine) return <p className="dim">Loading…</p>;
  if (!engine.leading) return <p className="dim">Another server instance holds the trading lock right now, so this one has no live numbers. Check back in a minute.</p>;
  return (
    <div className="engine-live">
      <p className="engine-head">
        <span className={`dot ${engine.on ? "on" : ""}`} /> {engine.on ? "Engine running" : "Engine off"}
        <small>last scan {ago(engine.lastScan)} · {engine.scans.toLocaleString()} scans since restart</small>
      </p>
      <dl>
        <div>
          <dt>Watching</dt>
          <dd>{engine.candidates.length ? engine.candidates.join(", ") : "Finding coins…"}</dd>
        </div>
        <div>
          <dt>Best recent gap</dt>
          <dd>
            {engine.best ? (
              <>
                {engine.best.coin}: <strong className={engine.best.edgeBps > 0 ? "up" : undefined}>{engine.best.edgeBps} bps</strong> via {engine.best.route}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Last trade</dt>
          <dd>
            {engine.lastTrade ? (
              <>
                {engine.lastTrade.bot}, {engine.lastTrade.size} SOL through {engine.lastTrade.coin},{" "}
                <a href={`https://solscan.io/tx/${engine.lastTrade.signature}`}>{ago(engine.lastTrade.time)}</a>
              </>
            ) : (
              "None since the last restart"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function PilleesDocs() {
  const active = useActive(IDS);
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);
  const host = SITE.replace(/^https?:\/\//, "");

  return (
    <section className="page docs-page">
      <header className="page-head">
        <h1>Pillees docs</h1>
        <p>How to create, fund and run a bot, launch its coin and get your SOL back, and exactly how the engine trades.</p>
      </header>

      <div className="docs-embed">
        <aside className="docs-toc">
          <nav aria-label="Doc sections">
            {GROUPS.map(([group, items]) => (
              <div key={group} className="toc-group">
                <p className="eyebrow">{group}</p>
                {items.map(([id, label]) => (
                  <a key={id} href={`#${id}`} className={active === id ? "on" : undefined}>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="docs-src">
            <Link to="/pump">Pump’s multi_hop_swap doc</Link>
            <Link to="/sdk">SDK</Link>
            <a href={LINKS.github}>GitHub</a>
          </div>
        </aside>

        <article className="md">
          <div className="md-body">
            <Section id="overview" title="Overview">
              <p>
                Pillees lets anyone create their own arbitrage bot on Solana. Each bot gets its own public wallet.
                You fund it, and the Pillees engine trades price gaps for it: the same coin priced differently on
                PumpSwap and on another exchange. Everything a bot does is on chain and on the leaderboard.
              </p>
              <p>
                There is also a launchpad side, and it is optional. You can launch a pump.fun coin for your bot. The
                bot is the coin’s creator, so trading in the coin pays creator fees into the bot’s wallet, which become
                more balance to trade with.
              </p>
            </Section>

            <Section id="quick-start" title="Quick start">
              <ol>
                <li>Install Phantom or Solflare and click <strong>Connect wallet</strong>, top right.</li>
                <li>Go to <Link to="/launch">Create a bot</Link>. Pick a name and a logo, keep the default limits, and sign.</li>
                <li>Send SOL to the bot wallet shown on the next page. The engine starts looking for trades for it right away.</li>
                <li>Optional: launch its coin with a name, ticker, image, socials and a dev buy.</li>
                <li>Track it on its page, your <strong>Profile</strong>, and the <Link to="/leaderboard">Leaderboard</Link>.</li>
              </ol>
              <p>Signing a message is free. Pillees never asks your wallet to approve a transaction.</p>
            </Section>

            <Section id="create" title="Create a bot">
              <p>A bot has a name, a logo and three limits. The wallet you connect when creating it becomes its owner.</p>
              <ul>
                <li><strong>Name:</strong> 2 to 20 letters, numbers, spaces, <code>-</code> or <code>_</code>. Names are unique.</li>
                <li><strong>Logo:</strong> PNG, JPG, WEBP or GIF, under 400 KB. Square looks best.</li>
                <li><strong>Limits:</strong> max trade, daily limit and minimum edge. See <a href="#limits">Limits and edge</a>.</li>
              </ul>
              <p>One wallet can own up to 5 bots.</p>
            </Section>

            <Section id="fund" title="Fund your bot">
              <p>
                Send SOL from any wallet or exchange to the bot’s wallet address. You can copy it from the bot page. The
                balance updates within a minute. Funding counts as a deposit, so it never shows up as profit.
              </p>
              <p>
                The engine always leaves 0.01 SOL in the wallet for network fees, so fund a bot with more than that.
                A bot with 0.2 SOL or more can take meaningful trades.
              </p>
            </Section>

            <Section id="limits" title="Limits and edge">
              <Table
                head={["Setting", "What it does", "Default"]}
                rows={[
                  ["Max trade", "The most SOL the bot puts into one trade.", "0.5 SOL"],
                  ["Daily limit", "The most SOL it trades in any rolling 24 hours, across all trades.", "5 SOL"],
                  ["Min edge", "How much a trade has to make, after every fee, before the bot takes it. 100 bps is 1%.", "40 bps"],
                ]}
              />
              <p>
                A higher edge means fewer, safer trades. A lower edge means more trades on thinner gaps. The edge is
                written into the transaction itself, so a trade that would make less than this simply fails on chain.
                See <a href="#floor">Costs and the floor</a>.
              </p>
            </Section>

            <Section id="coin" title="Launch a coin">
              <p>Once a bot exists, its owner can launch one pump.fun coin for it from the bot page.</p>
              <ul>
                <li><strong>Image, name, ticker, description:</strong> the image defaults to the bot logo. Ticker is 2 to 10 letters or numbers.</li>
                <li><strong>Socials:</strong> your own X (<code>https://x.com/…</code>) and Telegram (<code>https://t.me/…</code>), both optional.</li>
                <li><strong>Website:</strong> always the bot’s page, <code>{host}/bots/&lt;id&gt;</code>, so holders can follow the bot.</li>
                <li><strong>Dev buy:</strong> 0 to 5 SOL. The bot makes this first buy at launch and keeps the tokens.</li>
              </ul>
              <p>
                The bot’s wallet pays for the launch: the dev buy plus about 0.025 SOL in launch costs. The metadata goes
                to pump.fun’s IPFS, and the create transaction comes from PumpPortal with the bot as signer and creator.
              </p>
            </Section>

            <Section id="fees" title="Creator fees">
              <p>
                Because the bot’s wallet created the coin, pump.fun pays the coin’s creator fees into a creator vault
                owned by the bot. A running bot claims them every 15 minutes once there is at least 0.002 SOL to claim.
                The owner can also press <strong>Claim fees now</strong> on the bot page. Claimed fees show up as
                “Creator fees” in the bot’s stats and count as profit.
              </p>
            </Section>

            <Section id="control" title="Stop, start, withdraw">
              <p>Only the owner wallet sees these controls on the bot page. Each one asks you to sign a short message.</p>
              <ul>
                <li><strong>Stop / Start:</strong> a stopped bot doesn’t trade or claim fees until you start it again. The engine checks the status before every trade.</li>
                <li><strong>Withdraw:</strong> sends SOL from the bot to the owner wallet. Leave the amount empty to withdraw everything.</li>
              </ul>
              <p>Withdrawals can only ever go to the owner wallet. The server has no code path that sends a bot’s SOL anywhere else.</p>
            </Section>

            <Section id="profiles" title="Profiles and search">
              <p>
                Every wallet has a profile at <code>{host}/profile/&lt;address&gt;</code> with its bots, their total profit
                and fees, and the coins it launched. Search, at the top of every page or with <kbd>⌘K</kbd>, finds bots,
                coins by name or ticker, and profiles by address.
              </p>
            </Section>

            <Section id="architecture" title="Architecture">
              <p>Pillees is one Node server and one Postgres database. The server does four jobs:</p>
              <Table
                head={["Part", "What it does", "Talks to"]}
                rows={[
                  ["Web + API", "Serves this site and the JSON API. Checks owner signatures.", "Postgres"],
                  ["Engine", "Looks for gaps, sizes trades, builds, simulates and sends them.", "Jupiter, DexScreener, Solana RPC"],
                  ["Tracker", "Reads every bot wallet’s history, sorts each transaction, and updates balances.", "Solana RPC"],
                  ["Claimer", "Claims creator fees for bots that have a coin.", "PumpPortal, Solana RPC"],
                ]}
              />
              <p>
                Postgres stores bots, encrypted keys, coins and activity. Nothing about a bot’s money lives only in the
                database: balances and profit are always rebuilt from the chain.
              </p>
            </Section>

            <Section id="engine" title="The engine loop">
              <p>The engine runs one loop for every bot at once:</p>
              <ol>
                <li>Every 15 minutes, refresh the list of coins worth watching.</li>
                <li>Take the next coin and price a 0.05 SOL round trip in both directions. Each coin takes about 10 seconds, because Jupiter quotes are rate limited.</li>
                <li>If either direction comes back with more SOL than it started with, check each running bot.</li>
                <li>For each bot, size the trade to its limits and balance, then re-price at that size.</li>
                <li>If the trade clears every cost plus the bot’s minimum edge, build it, simulate it, and send it.</li>
              </ol>
              <p>
                Most of the time step 3 fails. Busy coins are watched by many traders, and gaps that beat every fee are
                rare and close fast. You can watch the engine do this in <a href="#status">Live engine status</a>.
              </p>
            </Section>

            <Section id="candidates" title="Finding coins">
              <p>
                A gap needs a coin that trades in two places. The engine collects pump coins from DexScreener (PumpSwap
                pairs and boosted tokens) plus every Pillees bot’s coin. It then keeps the ones that have:
              </p>
              <ul>
                <li>a PumpSwap pool against SOL, and</li>
                <li>at least one pool on another exchange (Raydium, Meteora, Orca and others),</li>
                <li>each with at least $20k of liquidity.</li>
              </ul>
              <p>It watches up to 40 of these, deepest first. A bot coin still on its bonding curve has only one market, so it can’t be arbitraged until it graduates to PumpSwap and gets a second pool.</p>
            </Section>

            <Section id="pricing" title="Pricing a round trip">
              <p>A round trip starts in SOL and ends in SOL. For each coin the engine prices two directions using Jupiter’s quote API, with the exchanges pinned on each side:</p>
              <Table
                head={["Direction", "Buy the coin on", "Sell it on"]}
                rows={[
                  ["pump-first", "PumpSwap only", "Anything except Pump"],
                  ["pump-last", "Anything except Pump", "PumpSwap only"],
                ]}
              />
              <p>
                The sell quote uses exactly the amount of coin the buy quote returns. If the sell gives back more SOL than
                the buy put in, there is a gap. Quotes come from the pools’ live reserves and include every swap fee, so a
                positive result is already after pool fees.
              </p>
            </Section>

            <Section id="sizing" title="Sizing a trade">
              <p>For each bot the engine works out how much it may use right now:</p>
              <pre>
                <code>{`room = min(
  max trade,
  daily limit − SOL traded in the last 24 hours,
  balance − 0.01 SOL reserve − token account rent (if needed)
)`}</code>
              </pre>
              <p>
                Bigger trades move the price more, so a gap that pays at a small size can vanish at a large one. The
                engine prices both <code>room</code> and <code>room ÷ 3</code> and keeps whichever makes more SOL.
              </p>
            </Section>

            <Section id="floor" title="Costs and the floor">
              <p>Before a trade counts as profitable it has to cover:</p>
              <Table
                head={["Cost", "Amount"]}
                rows={[
                  ["Network fee", "0.000005 SOL"],
                  ["Priority fee", "0.000016 SOL (800k compute units at 20,000 micro-lamports)"],
                  ["Token account rent", "about 0.0021 SOL, the first time a bot holds a given coin"],
                ]}
              />
              <p>From that the engine sets a floor, the least SOL the trade must return:</p>
              <pre>
                <code>{`floor = SOL in + costs + SOL in × min edge ÷ 10,000`}</code>
              </pre>
              <p>
                The floor goes into the sell swap as its minimum output. If the sell would return less than the floor
                when the transaction runs, the program rejects it and the whole transaction is undone. Prices moving
                between the quote and the block can make a trade fail, but they can’t make it lose SOL beyond the network fee.
              </p>
            </Section>

            <Section id="atomic" title="One atomic transaction">
              <p>Both swaps go into a single Solana transaction, in this order:</p>
              <ol>
                <li>Compute budget: unit limit and priority fee.</li>
                <li>Buy setup: create the wrapped SOL and coin token accounts if missing, wrap the SOL.</li>
                <li>Buy swap, with exactly the quoted SOL in.</li>
                <li>Sell setup.</li>
                <li>Sell swap: the exact coin amount from the buy, with the floor as its minimum out.</li>
                <li>Cleanup: close wrapped SOL back into plain SOL.</li>
              </ol>
              <p>
                Solana runs a transaction all or nothing. If the buy fills for less than quoted, the sell can’t find the
                coins it needs and fails. If the sell misses the floor, it fails. Either way the bot ends up where it
                started, minus the network fee. Address lookup tables keep the transaction under Solana’s 1,232 byte limit.
                Routes that don’t fit are skipped.
              </p>
            </Section>

            <Section id="simulate" title="Simulate, then send">
              <p>
                Before sending, the engine runs the signed transaction through the RPC’s <code>simulateTransaction</code>.
                If the simulation fails for any reason, nothing is sent and that coin is paused for a minute. Only a
                transaction that passes simulation is sent, then confirmed. The engine records its size straight away
                so the daily limit is right. The tracker fills in the real SOL result from the chain a minute later.
              </p>
            </Section>

            <Section id="rails" title="Safety rails">
              <ul>
                <li><strong>Atomic:</strong> both legs or neither, with the floor enforced on chain.</li>
                <li><strong>Simulated first:</strong> failing trades are never sent.</li>
                <li><strong>Limits:</strong> max trade and rolling 24-hour limit per bot, checked before every trade.</li>
                <li><strong>Reserve:</strong> 0.01 SOL always stays in the wallet for fees and withdrawals.</li>
                <li><strong>Cooldowns:</strong> a bot waits 30 seconds after a trade. A coin that fails is skipped for a minute.</li>
                <li><strong>One engine:</strong> the server takes a Postgres advisory lock before trading. A second copy of the server serves the site but never trades, so trades can’t double up.</li>
                <li><strong>Kill switch:</strong> setting <code>ENGINE=off</code> stops all trading. Tracking, fee claims and withdrawals keep working.</li>
              </ul>
            </Section>

            <Section id="tracking" title="Tracking and profit">
              <p>
                Every minute the tracker reads each bot wallet’s new transactions from the chain and works out how much SOL
                the wallet gained or lost in each one. It then sorts it:
              </p>
              <Table
                head={["Kind", "Rule", "Counts as profit"]}
                rows={[
                  ["Deposit", "Only plain SOL transfers into the wallet", "No"],
                  ["Withdraw", "Only plain SOL transfers out of the wallet", "No"],
                  ["Creator fees", "A fee claim the server sent", "Yes"],
                  ["Trade", "Everything else, including launch costs and network fees", "Yes"],
                ]}
              />
              <p>
                Profit is the sum of creator fees and trades. The leaderboard ranks bots by it over 24H, 7D, 30D or all
                time. Since it comes from SOL balance changes, tokens a bot still holds (like its dev buy) aren’t counted
                until they are sold.
              </p>
            </Section>

            <Section id="claims" title="Fee claims">
              <p>
                pump.fun keeps creator fees in a vault account derived from the creator’s address (seed{" "}
                <code>creator-vault</code> on the pump program). Every 15 minutes the server checks each running bot’s
                vault. If more than 0.002 SOL sits above the rent minimum, it asks PumpPortal for a{" "}
                <code>collectCreatorFee</code> transaction, signs it with the bot key, and sends it.
              </p>
            </Section>

            <Section id="custody" title="Wallet keys">
              <ul>
                <li>Each bot’s keypair is generated on the server when the bot is created.</li>
                <li>
                  The secret key is encrypted with AES-256-GCM using a 32-byte server secret (<code>BOT_KEY_SECRET</code>) and a
                  fresh random IV per key. The database stores <code>iv.tag.ciphertext</code>. The tag means a changed or
                  wrong-secret ciphertext fails to open rather than giving a wrong key.
                </li>
                <li>The key is decrypted in memory only to sign the bot’s own trades, claims, launches and withdrawals. No endpoint returns it.</li>
                <li>Because the server holds the encrypted key, you are trusting Pillees with the SOL in your bot. Only fund what you are comfortable with.</li>
              </ul>
            </Section>

            <Section id="signatures" title="Owner signatures">
              <p>Every owner action is a message signed by your wallet. The message is plain text:</p>
              <pre>
                <code>{`Pillees
withdraw <bot id>
{"amount":"max"}
1760262000000`}</code>
              </pre>
              <p>The server checks four things before acting:</p>
              <ol>
                <li>The signature is a valid ed25519 signature by the wallet that owns the bot.</li>
                <li>The action, bot and fields match the request exactly, so a signature for one thing can’t be reused for another.</li>
                <li>The timestamp is less than 5 minutes old.</li>
                <li>The signature hasn’t been used before.</li>
              </ol>
            </Section>

            <Section id="multihop" title="multi_hop_swap and the SDK">
              <p>
                Pump’s <Link to="/pump">multi_hop_swap</Link> walks a route through several Pump pools and curves in one
                instruction and charges the protocol and creator fees once per route instead of once per hop. On the
                PumpSwap side, Jupiter routes through Pump pools the same way, so a coin paired with another Pump coin can
                still be bought straight from SOL.
              </p>
              <p>
                The open source <Link to="/sdk">SDK</Link> holds the same maths offline: route checks, fee placement, the
                <code>multi_hop_swap</code> account list and instruction data, and a sample market to test strategies on.
                It never sends a transaction. The live engine runs on the server.
              </p>
            </Section>

            <Section id="status" title="Live engine status">
              <p>Straight from the running server. Refreshes every 10 seconds.</p>
              <EngineStatus />
            </Section>

            <Section id="api" title="Public API">
              <p>Read endpoints are public JSON, no key needed.</p>
              <Table
                head={["Endpoint", "Returns"]}
                rows={[
                  [<code key="a">GET /api/bots?range=7D</code>, <>All bots, sorted by profit. <code>range</code> is 24H, 7D, 30D or ALL. Add <code>&amp;owner=&lt;address&gt;</code> for one wallet’s bots.</>],
                  [<code key="b">GET /api/bots/&lt;id&gt;</code>, "One bot with its stats, coin and the last 50 transactions."],
                  [<code key="c">GET /api/coins</code>, "Every bot coin with its market cap."],
                  [<code key="d">GET /api/engine</code>, "What the engine is watching, its best recent gap and its last trade."],
                ]}
              />
              <pre>
                <code>{`curl ${SITE}/api/engine`}</code>
              </pre>
            </Section>

            <Section id="self-host" title="Run your own">
              <p>The whole platform is open source. To run it yourself:</p>
              <pre>
                <code>{`git clone ${LINKS.github}
cd pillees && npm install
touch .env                  # set BOT_KEY_SECRET and RPC_URL
npm run build -w @pillees/web
npm start                   # http://localhost:8080`}</code>
              </pre>
              <Table
                head={["Variable", "What it is"]}
                rows={[
                  [<code key="a">BOT_KEY_SECRET</code>, "64 hex characters that encrypt bot keys. Back it up: lose it and bot wallets can’t be opened."],
                  [<code key="b">RPC_URL</code>, "A Solana mainnet RPC. The public one works but is slow and rate limited."],
                  [<code key="c">DATABASE_URL</code>, "Postgres. Leave it empty locally to use a file in server/.data."],
                  [<code key="d">ENGINE</code>, <>Set to <code>off</code> to stop trading.</>],
                ]}
              />
            </Section>

            <Section id="faq" title="FAQ">
              <h3>Will my bot make money?</h3>
              <p>
                Maybe not. Arbitrage on busy coins is competitive, and most of the time no gap beats the fees. Your bot
                only trades when one does, and the floor stops trades that would lose SOL. A bot that never finds a gap
                just keeps its balance (and any creator fees).
              </p>
              <h3>Can I get the bot’s private key?</h3>
              <p>No. That is what keeps the owner-only rules enforceable. You can always withdraw everything instead.</p>
              <h3>What happens if I lose access to my wallet?</h3>
              <p>Only the owner wallet can withdraw, so keep your seed phrase safe. Ownership can’t be moved to another wallet.</p>
              <h3>Can a bot have more than one coin?</h3>
              <p>No, one coin per bot. Create another bot for another coin.</p>
              <h3>Is this affiliated with Pump.fun?</h3>
              <p>
                No. Pillees is independent and builds on Pump’s public programs and <a href={DOCS.repo}>docs</a>. Trading can lose money.
              </p>
            </Section>
          </div>
        </article>
      </div>
    </section>
  );
}
