import { useEffect, useState } from "react";
import { DOCS, LINKS, SITE } from "./data";
import { Link } from "./router";

const SECTIONS = [
  ["overview", "Overview"],
  ["quick-start", "Quick start"],
  ["create", "Create a bot"],
  ["fund", "Fund your bot"],
  ["limits", "Limits and edge"],
  ["coin", "Launch a coin"],
  ["fees", "Creator fees"],
  ["control", "Stop, start, withdraw"],
  ["custody", "Custody and safety"],
  ["profit", "How profit is counted"],
  ["profiles", "Profiles and search"],
  ["status", "What runs today"],
  ["api", "Public API"],
  ["faq", "FAQ"],
];

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

const IDS = SECTIONS.map(([id]) => id);

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
        <p>Everything about creating, funding and running a bot, launching its coin, and getting your SOL back out.</p>
      </header>

      <div className="docs-embed">
        <aside className="docs-toc">
          <p className="eyebrow">On this page</p>
          <nav aria-label="Doc sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={active === id ? "on" : undefined}>
                {label}
              </a>
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
                Pillees lets anyone create their own arbitrage bot on Solana. Each bot gets its own
                public wallet. You fund it, it trades price gaps through Pump’s{" "}
                <code>multi_hop_swap</code>, and everything it does is visible on chain and on the
                leaderboard.
              </p>
              <p>
                There is also a launchpad side, and it is optional. You can launch a pump.fun coin for
                your bot. The bot is the coin’s creator, so every trade of the coin pays creator fees
                into the bot’s wallet, which become more balance to trade with.
              </p>
            </Section>

            <Section id="quick-start" title="Quick start">
              <ol>
                <li>Install Phantom or Solflare and click <strong>Connect wallet</strong>, top right.</li>
                <li>Go to <Link to="/launch">Create a bot</Link>. Pick a name and a logo, keep the default limits, and sign.</li>
                <li>Send SOL to the bot wallet shown on the next page.</li>
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
                Send SOL from any wallet or exchange to the bot’s wallet address. You can copy it from the
                bot page. The balance updates within a minute. Funding counts as a deposit, so it never shows
                up as profit.
              </p>
              <p>Every bot wallet is a normal Solana account. You can watch it on Solscan at any time.</p>
            </Section>

            <Section id="limits" title="Limits and edge">
              <div className="md-table">
              <table>
                <thead>
                  <tr>
                    <th>Setting</th>
                    <th>What it does</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Max trade</td>
                    <td>The most SOL the bot puts into a single trade.</td>
                    <td>0.5 SOL</td>
                  </tr>
                  <tr>
                    <td>Daily limit</td>
                    <td>The most SOL it trades in a day, across all trades.</td>
                    <td>5 SOL</td>
                  </tr>
                  <tr>
                    <td>Min edge</td>
                    <td>How much a price gap has to beat every fee by before it trades. 100 bps is 1%.</td>
                    <td>40 bps</td>
                  </tr>
                </tbody>
              </table>
              </div>
              <p>A higher edge means fewer, safer trades. A lower edge means more trades on thinner gaps.</p>
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
                The bot’s wallet pays for the launch: the dev buy plus about 0.025 SOL in launch costs. Fund
                the bot first. The launch button stays locked until the balance is enough.
              </p>
            </Section>

            <Section id="fees" title="Creator fees">
              <p>
                The coin is created with the bot’s wallet as creator, so pump.fun pays the coin’s creator fees
                to the bot. A running bot claims them every 15 minutes, once there is at least 0.002 SOL to
                claim. The owner can also press <strong>Claim fees now</strong> on the bot page.
              </p>
              <p>Claimed fees show up as “Creator fees” in the bot’s activity and stats.</p>
            </Section>

            <Section id="control" title="Stop, start, withdraw">
              <p>Only the owner wallet sees these controls on the bot page. Each one asks you to sign a short message.</p>
              <ul>
                <li><strong>Stop / Start:</strong> a stopped bot does nothing, including claiming fees, until you start it again.</li>
                <li><strong>Withdraw:</strong> sends SOL from the bot to the owner wallet. Leave the amount empty to withdraw everything.</li>
              </ul>
              <p>Withdrawals can only ever go to the owner wallet. Nobody can send a bot’s SOL anywhere else.</p>
            </Section>

            <Section id="custody" title="Custody and safety">
              <ul>
                <li>The bot wallet’s private key is generated on the Pillees server and stored encrypted (AES-256-GCM). Nobody sees it, including you.</li>
                <li>You prove you own a bot by signing a message with your wallet. Each signature names the exact action, is valid for 5 minutes and can only be used once.</li>
                <li>Because the server holds the encrypted key, you are trusting Pillees with the SOL in your bot. Only fund what you are comfortable with, and withdraw what you don’t need.</li>
              </ul>
            </Section>

            <Section id="profit" title="How profit is counted">
              <p>
                Profit comes straight from the bot wallet’s on-chain history. Every transaction is sorted into one of
                four kinds:
              </p>
              <ul>
                <li><strong>Deposit:</strong> SOL sent in. Not profit.</li>
                <li><strong>Withdraw:</strong> SOL sent out to the owner. Not a loss.</li>
                <li><strong>Creator fees:</strong> fees claimed from the bot’s coin.</li>
                <li><strong>Trade:</strong> everything else, including launch costs and network fees.</li>
              </ul>
              <p>Profit is fees plus trades. The leaderboard ranks bots by it over 24H, 7D, 30D or all time.</p>
            </Section>

            <Section id="profiles" title="Profiles and search">
              <p>
                Every wallet has a profile at <code>{host}/profile/&lt;address&gt;</code> with its bots, their total
                profit and fees, and the coins it launched. Yours is under <strong>Profile</strong> in the sidebar or the wallet menu.
              </p>
              <p>Search, at the top of every page or with <kbd>⌘K</kbd>, finds bots, coins by name or ticker, and profiles by address.</p>
            </Section>

            <Section id="status" title="What runs today">
              <p>
                Bots, wallets, funding, coin launches, creator-fee claims, withdrawals, profiles and the leaderboard are
                all live. The multi-hop trading engine is rolling out to bots. Until it reaches a bot, a running bot
                collects its coin’s creator fees and holds them as trading balance.
              </p>
              <p>
                The route maths the engine uses is open source in the <Link to="/sdk">SDK</Link>, built on Pump’s{" "}
                <Link to="/pump">multi_hop_swap doc</Link>.
              </p>
            </Section>

            <Section id="api" title="Public API">
              <p>Read endpoints are public JSON, no key needed.</p>
              <div className="md-table">
              <table>
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Returns</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>GET /api/bots?range=7D</code></td>
                    <td>All bots, sorted by profit. <code>range</code> is 24H, 7D, 30D or ALL. Add <code>&amp;owner=&lt;address&gt;</code> for one wallet’s bots.</td>
                  </tr>
                  <tr>
                    <td><code>GET /api/bots/&lt;id&gt;</code></td>
                    <td>One bot with its stats, coin and the last 50 transactions.</td>
                  </tr>
                  <tr>
                    <td><code>GET /api/coins</code></td>
                    <td>Every bot coin with its market cap.</td>
                  </tr>
                </tbody>
              </table>
              </div>
              <pre>
                <code>{`curl ${SITE}/api/bots?range=ALL`}</code>
              </pre>
            </Section>

            <Section id="faq" title="FAQ">
              <h3>Can I get the bot’s private key?</h3>
              <p>No. That is what keeps the owner-only rules enforceable. You can always withdraw everything instead.</p>
              <h3>What happens if I lose access to my wallet?</h3>
              <p>Only the owner wallet can withdraw, so keep your seed phrase safe. Ownership cannot be moved to another wallet.</p>
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
