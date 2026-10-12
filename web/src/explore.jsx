import { useEffect, useMemo, useRef, useState } from "react";
import { api, fmtSol, solscan, useApi } from "./api";
import { Count } from "./motion";
import { BotTable, CoinGrid, Logo } from "./platform";
import { Link, navigate } from "./router";
import { short, useWallet } from "./wallet";

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function Avatar({ address, size = 40 }) {
  const h = hash(address || "");
  const a = h % 360;
  const b = (a + 40 + ((h >> 9) % 80)) % 360;
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${a} 70% 62%), hsl(${b} 65% 38%))` }}
    />
  );
}

/* --------------------------------- Search -------------------------------- */

export function Search() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [data, setData] = useState(null);
  const box = useRef(null);
  const input = useRef(null);
  const fetching = useRef(false);

  useEffect(() => {
    const key = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    const away = (event) => !box.current?.contains(event.target) && setOpen(false);
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, []);

  function load() {
    setOpen(true);
    if (data || fetching.current) return;
    fetching.current = true;
    Promise.all([api("/bots?range=ALL"), api("/coins")])
      .then(([b, c]) => setData({ bots: b.bots, coins: c.coins }))
      .catch(() => setData({ bots: [], coins: [] }));
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    if (ADDRESS.test(query.trim())) out.push({ key: "p", to: `/profile/${query.trim()}`, title: short(query.trim()), sub: "Profile" });
    for (const bot of data?.bots ?? []) {
      if (bot.name.toLowerCase().includes(q) || bot.wallet.toLowerCase() === q) out.push({ key: bot.id, to: `/bots/${bot.id}`, title: bot.name, sub: "Bot", logo: bot.logo });
    }
    for (const coin of data?.coins ?? []) {
      if (coin.name.toLowerCase().includes(q) || coin.ticker.toLowerCase().includes(q) || coin.mint.toLowerCase() === q)
        out.push({ key: coin.mint, to: `/bots/${coin.botId}`, title: `${coin.name} $${coin.ticker}`, sub: `Coin · ${coin.botName}`, logo: coin.image });
    }
    return out.slice(0, 8);
  }, [query, data]);

  function go(result) {
    if (!result) return;
    navigate(result.to);
    setQuery("");
    setOpen(false);
    input.current?.blur();
  }

  return (
    <div className="search" ref={box}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5 14 14" />
      </svg>
      <input
        ref={input}
        value={query}
        placeholder="Search bots, coins or wallets"
        aria-label="Search"
        onFocus={load}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
          load();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, results.length - 1));
          else if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter") go(results[index]);
          else if (e.key === "Escape") input.current?.blur();
          else return;
          e.preventDefault();
        }}
      />
      <kbd>⌘K</kbd>
      {open && query.trim() && (
        <ul className="search-pop" role="listbox">
          {results.length ? (
            results.map((r, i) => (
              <li key={r.key} role="option" aria-selected={i === index}>
                <button type="button" onMouseEnter={() => setIndex(i)} onClick={() => go(r)}>
                  {r.logo ? <Logo src={r.logo} size={28} /> : <Avatar address={query.trim()} size={28} />}
                  <span>
                    <strong>{r.title}</strong>
                    <small>{r.sub}</small>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="search-empty">{data ? "Nothing found." : "Loading…"}</li>
          )}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Profile -------------------------------- */

export function Profile({ address }) {
  const { address: me } = useWallet();
  const [tab, setTab] = useState("bots");
  const { data, loading } = useApi(`/bots?range=ALL&owner=${address}`, 30_000);
  const bots = data?.bots ?? [];
  const coins = bots.filter((b) => b.coin).map((b) => ({ ...b.coin, botName: b.name }));
  const total = (key) => bots.reduce((sum, b) => sum + b.stats[key], 0);
  const mine = me === address;
  const [copied, setCopied] = useState(false);

  return (
    <section className="page profile">
      <header className="profile-head">
        <Avatar address={address} size={84} />
        <div>
          <h1>{mine ? "Your profile" : short(address)}</h1>
          <p className="profile-addr">
            <code>{address}</code>
            <button
              type="button"
              className="mini"
              onClick={() =>
                navigator.clipboard?.writeText(address).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                })
              }
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a className="mini" href={solscan("account", address)}>
              Solscan
            </a>
          </p>
        </div>
        {mine && (
          <Link className="btn btn-primary profile-cta" to="/launch">
            Create a bot
          </Link>
        )}
      </header>

      <dl className="stats-grid">
        <div>
          <dt>Bots</dt>
          <dd>
            <Count value={bots.length} />
          </dd>
        </div>
        <div>
          <dt>Total profit</dt>
          <dd className={total("profit") > 0 ? "up" : total("profit") < 0 ? "down" : ""}>
            <Count value={total("profit")} format={(n) => `${fmtSol(n, true)} SOL`} />
          </dd>
        </div>
        <div>
          <dt>Creator fees</dt>
          <dd>
            <Count value={total("fees")} format={(n) => `${fmtSol(n)} SOL`} />
          </dd>
        </div>
        <div>
          <dt>Coins launched</dt>
          <dd>
            <Count value={coins.length} />
          </dd>
        </div>
      </dl>

      <div className="tabs" role="tablist">
        {[
          ["bots", `Bots (${bots.length})`],
          ["coins", `Coins (${coins.length})`],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="view" key={tab}>
        {loading && !data ? (
          <div className="skeleton tall" />
        ) : tab === "bots" ? (
          bots.length ? (
            <BotTable bots={bots} />
          ) : (
            <div className="empty-card">
              {mine ? (
                <>
                  You have no bots yet. <Link to="/launch">Create your first one.</Link>
                </>
              ) : (
                "This wallet has no bots."
              )}
            </div>
          )
        ) : (
          <CoinGrid coins={coins} />
        )}
      </div>
    </section>
  );
}
