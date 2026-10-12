import { useState } from "react";
import { ago, api, fmtSol, fmtUsd, readImage, solscan, useApi } from "./api";
import { SITE } from "./data";
import { GlobeIcon, TelegramIcon, XIcon } from "./icons";
import { Link, navigate } from "./router";
import { ConnectButton, short, useWallet } from "./wallet";

export const RANGES = ["24H", "7D", "30D", "ALL"];

function Copy({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="mini"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        })
      }
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function Logo({ src, name, size = 40 }) {
  return <img className="logo" src={src} alt={name ? `${name} logo` : ""} width={size} height={size} loading="lazy" />;
}

function Status({ status }) {
  return <span className={`status ${status}`}>{status === "running" ? "Running" : "Stopped"}</span>;
}

function Range({ value, onChange }) {
  return (
    <div className="seg" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r} type="button" aria-pressed={value === r} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}

function Empty({ children }) {
  return <div className="empty-card">{children}</div>;
}

/* ------------------------------ Leaderboard ------------------------------ */

export function BotTable({ bots, limit }) {
  const rows = limit ? bots.slice(0, limit) : bots;
  if (!rows.length) {
    return (
      <Empty>
        No bots yet. <Link to="/launch">Launch the first one.</Link>
      </Empty>
    );
  }
  return (
    <div className="table-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Bot</th>
            <th className="num">Profit</th>
            <th className="num hide-sm">Creator fees</th>
            <th className="num hide-sm">Balance</th>
            <th className="hide-sm">Coin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((bot, index) => (
            <tr key={bot.id} onClick={() => navigate(`/bots/${bot.id}`)}>
              <td className="rank">{index + 1}</td>
              <td>
                <Link className="bot-cell" to={`/bots/${bot.id}`} onClick={(e) => e.stopPropagation()}>
                  <Logo src={bot.logo} name={bot.name} size={36} />
                  <span>
                    <strong>{bot.name}</strong>
                    <small>
                      <Status status={bot.status} /> {short(bot.wallet)}
                    </small>
                  </span>
                </Link>
              </td>
              <td className={`num pnl ${bot.stats.profit > 0 ? "up" : bot.stats.profit < 0 ? "down" : ""}`}>{fmtSol(bot.stats.profit, true)} SOL</td>
              <td className="num hide-sm">{fmtSol(bot.stats.fees)} SOL</td>
              <td className="num hide-sm">{fmtSol(bot.balance)} SOL</td>
              <td className="hide-sm">{bot.coin ? `$${bot.coin.ticker}` : <span className="dim">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Leaderboard() {
  const [range, setRange] = useState("7D");
  const { data, error, loading } = useApi(`/bots?range=${range}`, 30_000);
  return (
    <section className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h1>Most profitable bots.</h1>
          <p>Profit is read from each bot’s wallet on chain. Deposits and withdrawals do not count, only what the bot made.</p>
        </div>
        <Range value={range} onChange={setRange} />
      </header>
      {error && <p className="form-error">{error}</p>}
      {loading && !data ? <div className="skeleton tall" /> : <BotTable bots={data?.bots ?? []} />}
    </section>
  );
}

/* -------------------------------- Markets -------------------------------- */

export function CoinGrid({ coins, limit }) {
  const rows = limit ? coins.slice(0, limit) : coins;
  if (!rows.length) {
    return (
      <Empty>
        No coins yet. Launch a bot, then launch its coin from the bot page.
      </Empty>
    );
  }
  return (
    <ul className="coin-grid">
      {rows.map((coin) => (
        <li key={coin.mint}>
          <Link className="coin-card" to={`/bots/${coin.botId}`}>
            <Logo src={coin.image} name={coin.name} size={56} />
            <span className="coin-copy">
              <strong>{coin.name}</strong>
              <span>${coin.ticker}</span>
              <small>for {coin.botName}</small>
            </span>
            <span className="coin-meta">
              <b>{fmtUsd(coin.marketCap)}</b>
              <small>MC · {ago(coin.createdAt)}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Markets() {
  const { data, error, loading } = useApi("/coins", 30_000);
  return (
    <section className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">Markets</p>
          <h1>Bot coins.</h1>
          <p>Every coin here was launched by a Pillees bot on pump.fun. Its creator fees go straight to that bot’s wallet.</p>
        </div>
        <Link className="btn btn-primary" to="/launch">
          Launch a bot
        </Link>
      </header>
      {error && <p className="form-error">{error}</p>}
      {loading && !data ? <div className="skeleton tall" /> : <CoinGrid coins={data?.coins ?? []} />}
    </section>
  );
}

/* --------------------------------- Launch -------------------------------- */

function ImagePick({ value, onChange, label }) {
  const [error, setError] = useState("");
  return (
    <label className="image-pick">
      {value ? <img src={value} alt="" /> : <span>+</span>}
      <span className="image-copy">
        <strong>{label}</strong>
        <small>{error || "PNG, JPG, WEBP or GIF, under 400 KB. Square looks best."}</small>
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          readImage(file)
            .then((url) => {
              setError("");
              onChange(url);
            })
            .catch((e) => setError(e.message));
        }}
      />
    </label>
  );
}

export function Launch() {
  const { address, sign } = useWallet();
  const [form, setForm] = useState({ name: "", maxSize: "0.5", dailyLimit: "5", minEdgeBps: "40" });
  const [logo, setLogo] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (!logo) return setState({ busy: false, error: "Pick a logo for the bot." });
    setState({ busy: true, error: "" });
    try {
      const fields = { name: form.name.trim(), maxSize: Number(form.maxSize), dailyLimit: Number(form.dailyLimit), minEdgeBps: Number(form.minEdgeBps) };
      const auth = await sign("create", "bot", fields);
      const bot = await api("/bots", { fields, auth, logo });
      navigate(`/bots/${bot.id}/coin`);
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  }

  return (
    <section className="page narrow">
      <header className="page-head">
        <p className="eyebrow">Launch</p>
        <h1>Launch an arbitrage bot.</h1>
        <p>
          Your bot gets its own Solana wallet. You fund it, and you can stop it or withdraw
          its SOL any time by signing with the wallet you connect now. The wallet’s private
          key stays encrypted on the server. Nobody sees it, including you. Next, you launch
          its coin, and the coin’s creator fees go to the bot.
        </p>
      </header>
      <Steps at={0} />

      {!address ? (
        <div className="connect-card">
          <p>Connect the wallet that will own this bot. Only it can stop the bot or withdraw.</p>
          <ConnectButton className="btn btn-primary" />
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <ImagePick value={logo} onChange={setLogo} label="Bot logo" />
          <label>
            Name
            <input value={form.name} onChange={set("name")} maxLength={20} placeholder="Hopscotch" required />
          </label>
          <div className="form-row three">
            <label>
              Max trade (SOL)
              <input inputMode="decimal" value={form.maxSize} onChange={set("maxSize")} />
            </label>
            <label>
              Daily limit (SOL)
              <input inputMode="decimal" value={form.dailyLimit} onChange={set("dailyLimit")} />
            </label>
            <label>
              Min edge (bps)
              <input inputMode="numeric" value={form.minEdgeBps} onChange={set("minEdgeBps")} />
            </label>
          </div>
          <p className="hint">
            The bot only trades when a price gap beats every fee by at least the minimum edge
            (40 bps is 0.4%). It never spends more than the max per trade or the daily limit.
          </p>
          {state.error && <p className="form-error">{state.error}</p>}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={state.busy}>
              {state.busy ? "Check your wallet…" : "Sign and launch"}
            </button>
            <span className="dim">Owner: {short(address)}. Signing is free.</span>
          </div>
        </form>
      )}
    </section>
  );
}

/* ---------------------------------- Bot ---------------------------------- */

const KIND = { deposit: "Deposit", withdraw: "Withdraw", fee: "Creator fees", launch: "Coin launch", trade: "Trade" };

const LAUNCH_COST = 0.025;
const DEV_BUYS = ["0", "0.1", "0.25", "0.5", "1"];

function Steps({ at }) {
  const steps = ["Launch the bot", "Fund it", "Launch its coin"];
  return (
    <ol className="stepper">
      {steps.map((label, index) => (
        <li key={label} className={index < at ? "done" : index === at ? "on" : ""}>
          <span>{index < at ? "✓" : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

const siteLabel = (id) => `${SITE.replace(/^https?:\/\//, "")}/bots/${id}`;

function CoinSocials({ coin }) {
  return (
    <p className="coin-socials">
      {coin.twitter && (
        <a href={coin.twitter} aria-label="X" title="X">
          <XIcon />
        </a>
      )}
      {coin.telegram && (
        <a href={coin.telegram} aria-label="Telegram" title="Telegram">
          <TelegramIcon />
        </a>
      )}
      <a href={coin.website} aria-label="Website" title={coin.website}>
        <GlobeIcon />
      </a>
    </p>
  );
}

export function LaunchCoinPage({ id }) {
  const { address, sign } = useWallet();
  const { data: bot, error, loading } = useApi(`/bots/${id}?range=ALL`, 8_000);
  const [form, setForm] = useState({ name: "", ticker: "", description: "", twitter: "", telegram: "", devBuy: "0" });
  const [image, setImage] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  if (loading && !bot) return <section className="page"><div className="skeleton tall" /></section>;
  if (error && !bot) {
    return (
      <section className="page">
        <Empty>
          {error} <Link to="/launch">Launch a bot first.</Link>
        </Empty>
      </section>
    );
  }
  if (bot.coin) {
    return (
      <section className="page narrow">
        <Steps at={3} />
        <div className="connect-card">
          <p>
            {bot.name} already has its coin, <strong>${bot.coin.ticker}</strong>. Its creator fees go to the bot.
          </p>
          <div className="form-actions">
            <Link className="btn btn-primary" to={`/bots/${bot.id}`}>
              Open {bot.name}
            </Link>
            <a className="btn btn-ghost" href={`https://pump.fun/coin/${bot.coin.mint}`}>
              View on pump.fun
            </a>
          </div>
        </div>
      </section>
    );
  }

  const owner = address && address === bot.owner;
  const devBuy = Number(form.devBuy) || 0;
  const need = devBuy + LAUNCH_COST;
  const short_ = bot.balance < need;
  const preview = {
    name: form.name.trim() || bot.name,
    ticker: form.ticker.trim().toUpperCase() || "TICKER",
    description: form.description.trim() || `${bot.name} is an arbitrage bot on Pillees. Creator fees from this coin fund its trading.`,
    image: image || bot.logo,
    twitter: form.twitter.trim(),
    telegram: form.telegram.trim(),
    website: `${SITE}/bots/${bot.id}`,
  };

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      const fields = {
        name: form.name.trim(),
        ticker: form.ticker.trim().toUpperCase(),
        description: form.description.trim(),
        twitter: form.twitter.trim(),
        telegram: form.telegram.trim(),
        devBuy,
      };
      const auth = await sign("launch", bot.id, fields);
      await api(`/bots/${bot.id}/coin`, { fields, auth, image: image || undefined });
      navigate(`/bots/${bot.id}`);
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  }

  return (
    <section className="page launch-coin">
      <header className="page-head">
        <p className="eyebrow">Launch a coin</p>
        <h1>A coin for {bot.name}. Fees go to the bot.</h1>
        <p>
          The coin launches on pump.fun with {bot.name}’s wallet as creator. Every trade of it pays
          creator fees into the bot, and the bot trades with them.
        </p>
      </header>
      <Steps at={short_ ? 1 : 2} />

      {!owner ? (
        <div className="connect-card">
          <p>Only the wallet that launched {bot.name} can launch its coin.{address ? ` You are connected as ${short(address)}.` : ""}</p>
          {!address && <ConnectButton className="btn btn-primary" />}
        </div>
      ) : (
        <div className="launch-grid">
          <form className="form" onSubmit={submit}>
            <fieldset>
              <legend>Coin</legend>
              <ImagePick value={image || bot.logo} onChange={setImage} label="Coin image (defaults to the bot logo)" />
              <div className="form-row">
                <label>
                  Name
                  <input value={form.name} onChange={set("name")} maxLength={32} placeholder={bot.name} required />
                </label>
                <label>
                  Ticker
                  <input value={form.ticker} onChange={set("ticker")} maxLength={10} placeholder="HOP" required />
                </label>
              </div>
              <label>
                Description
                <textarea rows={4} value={form.description} onChange={set("description")} maxLength={500} placeholder={preview.description} />
              </label>
            </fieldset>

            <fieldset>
              <legend>Socials</legend>
              <div className="form-row">
                <label>
                  X <span className="opt">optional</span>
                  <input value={form.twitter} onChange={set("twitter")} placeholder="https://x.com/yourbot" inputMode="url" />
                </label>
                <label>
                  Telegram <span className="opt">optional</span>
                  <input value={form.telegram} onChange={set("telegram")} placeholder="https://t.me/yourbot" inputMode="url" />
                </label>
              </div>
              <label>
                Website
                <input value={siteLabel(bot.id)} readOnly />
              </label>
              <p className="hint">The coin’s website is always {bot.name}’s page here, so holders can track the bot.</p>
            </fieldset>

            <fieldset>
              <legend>Dev buy</legend>
              <div className="chips">
                {DEV_BUYS.map((amount) => (
                  <button key={amount} type="button" aria-pressed={form.devBuy === amount} onClick={() => setForm((f) => ({ ...f, devBuy: amount }))}>
                    {amount === "0" ? "None" : `${amount} SOL`}
                  </button>
                ))}
                <input aria-label="Custom dev buy in SOL" inputMode="decimal" value={form.devBuy} onChange={set("devBuy")} />
              </div>
              <p className="hint">The first buy, made by the bot at launch. The tokens stay in the bot’s wallet. Up to 5 SOL.</p>
            </fieldset>

            <fieldset>
              <legend>Creator fees</legend>
              <div className="fee-route">
                <span>pump.fun creator fees</span>
                <i aria-hidden="true">→</i>
                <span>
                  <Logo src={bot.logo} name={bot.name} size={22} /> {bot.name} <code>{short(bot.wallet)}</code>
                </span>
              </div>
              <p className="hint">A running bot claims them every 15 minutes and adds them to its trading balance. You can also claim from the bot page.</p>
            </fieldset>

            {state.error && <p className="form-error">{state.error}</p>}
            <button className="btn btn-primary btn-big" type="submit" disabled={state.busy || short_}>
              {state.busy ? "Launching…" : short_ ? `Fund the bot with ${need.toFixed(3)} SOL first` : `Sign and launch $${preview.ticker}`}
            </button>
          </form>

          <aside className="launch-side">
            <div className="preview">
              <p className="eyebrow">Preview</p>
              <div className="preview-top">
                <Logo src={preview.image} name={preview.name} size={72} />
                <div>
                  <strong>{preview.name}</strong>
                  <span>${preview.ticker}</span>
                  <small>for {bot.name}</small>
                </div>
              </div>
              <p className="preview-desc">{preview.description}</p>
              <CoinSocials coin={preview} />
            </div>

            <div className="cost">
              <p className="eyebrow">Paid by the bot</p>
              <dl>
                <div>
                  <dt>Dev buy</dt>
                  <dd>{devBuy.toFixed(3)} SOL</dd>
                </div>
                <div>
                  <dt>Launch costs, about</dt>
                  <dd>{LAUNCH_COST.toFixed(3)} SOL</dd>
                </div>
                <div className="total">
                  <dt>Needed</dt>
                  <dd>{need.toFixed(3)} SOL</dd>
                </div>
                <div>
                  <dt>Bot balance</dt>
                  <dd className={short_ ? "down" : "up"}>{fmtSol(bot.balance)} SOL</dd>
                </div>
              </dl>
            </div>

            {short_ && (
              <div className="fund">
                <h3>Fund {bot.name}</h3>
                <p className="hint">Send at least {(need - bot.balance).toFixed(3)} SOL to the bot wallet. This page updates on its own.</p>
                <div className="wallet-card">
                  <code>{bot.wallet}</code>
                  <Copy text={bot.wallet} />
                </div>
              </div>
            )}
            <Link className="text-link" to={`/bots/${bot.id}`}>
              Skip for now, open {bot.name} →
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

function OwnerPanel({ bot, onChange }) {
  const { sign } = useWallet();
  const [amount, setAmount] = useState("");
  const [state, setState] = useState({ busy: "", error: "", note: "" });

  async function act(action, path, fields) {
    setState({ busy: action, error: "", note: "" });
    try {
      const auth = await sign(action, bot.id, fields);
      const result = await api(`/bots/${bot.id}/${path}`, { fields, auth });
      const note =
        action === "withdraw" ? `Sent ${fmtSol(result.amount)} SOL to your wallet.` : action === "claim" ? "Creator fees claimed." : `Bot ${fields.status === "running" ? "started" : "stopped"}.`;
      setState({ busy: "", error: "", note });
      setAmount("");
      onChange();
    } catch (error) {
      setState({ busy: "", error: error.message, note: "" });
    }
  }

  const next = bot.status === "running" ? "stopped" : "running";
  return (
    <div className="owner">
      <h3>Owner controls</h3>
      <div className="owner-row">
        <button className={bot.status === "running" ? "btn btn-ghost" : "btn btn-primary"} type="button" disabled={!!state.busy} onClick={() => act("status", "status", { status: next })}>
          {state.busy === "status" ? "Sign…" : bot.status === "running" ? "Stop bot" : "Start bot"}
        </button>
        {bot.coin && (
          <button className="btn btn-ghost" type="button" disabled={!!state.busy} onClick={() => act("claim", "claim", {})}>
            {state.busy === "claim" ? "Claiming…" : "Claim fees now"}
          </button>
        )}
      </div>
      <form
        className="withdraw"
        onSubmit={(event) => {
          event.preventDefault();
          act("withdraw", "withdraw", { amount: amount.trim() || "max" });
        }}
      >
        <label>
          Withdraw SOL to {short(bot.owner)}
          <input inputMode="decimal" placeholder="Leave empty for everything" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!!state.busy || bot.balance <= 0}>
          {state.busy === "withdraw" ? "Sending…" : amount.trim() ? "Withdraw" : "Withdraw all"}
        </button>
      </form>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.note && <p className="form-note">{state.note}</p>}
    </div>
  );
}

export function BotPage({ id }) {
  const [range, setRange] = useState("ALL");
  const { data: bot, error, loading, reload } = useApi(`/bots/${id}?range=${range}`, 20_000);
  const { address } = useWallet();

  if (loading && !bot) return <section className="page"><div className="skeleton tall" /></section>;
  if (error && !bot) {
    return (
      <section className="page">
        <Empty>
          {error} <Link to="/leaderboard">Back to the leaderboard.</Link>
        </Empty>
      </section>
    );
  }

  const owner = address && address === bot.owner;
  return (
    <section className="page bot-page">
      <header className="bot-head">
        <Logo src={bot.logo} name={bot.name} size={88} />
        <div>
          <p className="eyebrow">Arbitrage bot</p>
          <h1>{bot.name}</h1>
          <p className="bot-sub">
            <Status status={bot.status} /> Launched {ago(bot.createdAt)} by{" "}
            <a href={solscan("account", bot.owner)}>{short(bot.owner)}</a>
          </p>
        </div>
      </header>

      <div className="wallet-card">
        <span>Bot wallet</span>
        <code>{bot.wallet}</code>
        <Copy text={bot.wallet} />
        <a className="mini" href={solscan("account", bot.wallet)}>
          Solscan
        </a>
      </div>

      <div className="stat-head">
        <h2>Performance</h2>
        <Range value={range} onChange={setRange} />
      </div>
      <dl className="stats-grid">
        <div>
          <dt>Profit</dt>
          <dd className={bot.stats.profit > 0 ? "up" : bot.stats.profit < 0 ? "down" : ""}>{fmtSol(bot.stats.profit, true)} SOL</dd>
        </div>
        <div>
          <dt>Creator fees</dt>
          <dd>{fmtSol(bot.stats.fees)} SOL</dd>
        </div>
        <div>
          <dt>Balance</dt>
          <dd>{fmtSol(bot.balance)} SOL</dd>
        </div>
        <div>
          <dt>Trades</dt>
          <dd>{bot.stats.trades}</dd>
        </div>
      </dl>
      <p className="hint">
        Limits: {bot.maxSize} SOL per trade, {bot.dailyLimit} SOL a day, minimum edge {bot.minEdgeBps} bps.
        The multi-hop trading engine is rolling out to bots; until it reaches this one, a running
        bot collects its coin’s creator fees and holds them as trading balance.
      </p>

      <div className="bot-cols">
        <div>
          <h2>Coin</h2>
          {bot.coin ? (
            <div className="coin-panel">
              <Logo src={bot.coin.image} name={bot.coin.name} size={64} />
              <div>
                <strong>
                  {bot.coin.name} <span>${bot.coin.ticker}</span>
                </strong>
                <p className="ca-line">
                  <code>{bot.coin.mint}</code>
                  <Copy text={bot.coin.mint} />
                </p>
                <p className="coin-links">
                  <a href={`https://pump.fun/coin/${bot.coin.mint}`}>pump.fun</a>
                  <a href={`https://dexscreener.com/solana/${bot.coin.mint}`}>Chart</a>
                  <span>MC {fmtUsd(bot.coin.marketCap)}</span>
                </p>
                <CoinSocials coin={bot.coin} />
                <p className="hint">Creator fees from every trade go to this bot’s wallet.</p>
              </div>
            </div>
          ) : owner ? (
            <div className="connect-card">
              <p>Give {bot.name} a pump.fun coin. Its creator fees go straight to the bot and become trading balance.</p>
              <Link className="btn btn-primary" to={`/bots/${bot.id}/coin`}>
                Launch its coin
              </Link>
            </div>
          ) : (
            <Empty>This bot has no coin yet.</Empty>
          )}

          {owner && (
            <>
              <div className="fund">
                <h3>Fund the bot</h3>
                <p className="hint">Send SOL from any wallet to the bot wallet above. It shows here within a minute.</p>
              </div>
              <OwnerPanel bot={bot} onChange={reload} />
            </>
          )}
          {!owner && address == null && (
            <p className="hint">
              Own this bot? <ConnectButton className="text-btn" /> with the owner wallet.
            </p>
          )}
        </div>

        <div>
          <h2>Activity</h2>
          {bot.activity.length ? (
            <ul className="activity">
              {bot.activity.map((a) => (
                <li key={a.signature}>
                  <span className={`kind ${a.kind}`}>{KIND[a.kind] || a.kind}</span>
                  <span className={a.delta > 0 ? "up" : a.delta < 0 ? "down" : ""}>{a.delta == null ? "pending" : `${fmtSol(a.delta / 1e9, true)} SOL`}</span>
                  <a href={solscan("tx", a.signature)}>{ago(a.time)}</a>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No activity yet. Every transaction of the bot wallet shows here.</Empty>
          )}
        </div>
      </div>
    </section>
  );
}
