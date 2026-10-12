import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Activity kinds that are money moving in or out by the owner, not performance.
export const FLOW_KINDS = ["deposit", "withdraw"];

const BOT_FIELDS = ["id", "name", "owner", "wallet", "secret", "logo", "status", "maxSize", "dailyLimit", "minEdgeBps", "balance", "lastSig", "createdAt"];

export async function openStore() {
  return process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();
}

/* ------------------------------- Postgres ------------------------------- */

async function pgStore(url) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 5, ssl: /sslmode=require|proxy\.rlwy\.net/.test(url) ? { rejectUnauthorized: false } : undefined });
  await pool.query(`
    create table if not exists bots (
      id text primary key,
      name text not null,
      owner text not null,
      wallet text not null unique,
      secret text not null,
      logo text,
      status text not null default 'running',
      max_size double precision not null,
      daily_limit double precision not null,
      min_edge_bps integer not null,
      balance bigint not null default 0,
      last_sig text,
      created_at timestamptz not null default now()
    );
    create unique index if not exists bots_name_lower on bots (lower(name));
    create table if not exists coins (
      mint text primary key,
      bot_id text not null unique references bots(id),
      name text not null,
      ticker text not null,
      description text,
      image text,
      signature text,
      created_at timestamptz not null default now()
    );
    alter table coins add column if not exists twitter text;
    alter table coins add column if not exists telegram text;
    create table if not exists activity (
      bot_id text not null references bots(id),
      signature text not null,
      kind text not null,
      delta bigint,
      time timestamptz not null default now(),
      primary key (bot_id, signature)
    );
    create index if not exists activity_bot_time on activity (bot_id, time desc);
    alter table activity add column if not exists size bigint;
  `);

  const bot = (row) =>
    row && {
      id: row.id,
      name: row.name,
      owner: row.owner,
      wallet: row.wallet,
      secret: row.secret,
      logo: row.logo,
      status: row.status,
      maxSize: row.max_size,
      dailyLimit: row.daily_limit,
      minEdgeBps: row.min_edge_bps,
      balance: Number(row.balance),
      lastSig: row.last_sig,
      createdAt: row.created_at.toISOString(),
    };
  const coin = (row) =>
    row && {
      mint: row.mint,
      botId: row.bot_id,
      name: row.name,
      ticker: row.ticker,
      description: row.description,
      image: row.image,
      twitter: row.twitter,
      telegram: row.telegram,
      signature: row.signature,
      createdAt: row.created_at.toISOString(),
    };
  const act = (row) => ({ signature: row.signature, kind: row.kind, delta: row.delta == null ? null : Number(row.delta), time: row.time.toISOString() });

  return {
    async nameTaken(name) {
      const { rows } = await pool.query("select 1 from bots where lower(name) = lower($1)", [name]);
      return rows.length > 0;
    },
    async createBot(b) {
      await pool.query(
        "insert into bots (id, name, owner, wallet, secret, logo, status, max_size, daily_limit, min_edge_bps) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [b.id, b.name, b.owner, b.wallet, b.secret, b.logo, b.status, b.maxSize, b.dailyLimit, b.minEdgeBps],
      );
      return this.getBot(b.id);
    },
    async getBot(id) {
      const { rows } = await pool.query("select * from bots where id = $1", [id]);
      return bot(rows[0]);
    },
    async listBots() {
      const { rows } = await pool.query("select * from bots order by created_at desc");
      return rows.map(bot);
    },
    async updateBot(id, patch) {
      const cols = { status: "status", balance: "balance", lastSig: "last_sig" };
      const keys = Object.keys(patch).filter((k) => cols[k]);
      if (!keys.length) return;
      await pool.query(`update bots set ${keys.map((k, i) => `${cols[k]} = $${i + 2}`).join(", ")} where id = $1`, [id, ...keys.map((k) => patch[k])]);
    },
    async createCoin(c) {
      await pool.query(
        "insert into coins (mint, bot_id, name, ticker, description, image, twitter, telegram, signature) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [c.mint, c.botId, c.name, c.ticker, c.description, c.image, c.twitter, c.telegram, c.signature],
      );
    },
    async listCoins() {
      const { rows } = await pool.query("select * from coins order by created_at desc");
      return rows.map(coin);
    },
    async coinForBot(botId) {
      const { rows } = await pool.query("select * from coins where bot_id = $1", [botId]);
      return coin(rows[0]);
    },
    async getCoin(mint) {
      const { rows } = await pool.query("select * from coins where mint = $1", [mint]);
      return coin(rows[0]);
    },
    async recordActivity(botId, a) {
      await pool.query(
        `insert into activity (bot_id, signature, kind, delta, time, size) values ($1,$2,$3,$4,$5,$6)
         on conflict (bot_id, signature) do update set delta = coalesce(excluded.delta, activity.delta), time = excluded.time, size = coalesce(excluded.size, activity.size),
           kind = case when activity.delta is null then activity.kind else excluded.kind end`,
        [botId, a.signature, a.kind, a.delta, a.time || new Date().toISOString(), a.size ?? null],
      );
    },
    async activityKind(botId, signature) {
      const { rows } = await pool.query("select kind from activity where bot_id = $1 and signature = $2", [botId, signature]);
      return rows[0]?.kind ?? null;
    },
    async listActivity(botId, limit = 50) {
      const { rows } = await pool.query("select * from activity where bot_id = $1 order by time desc limit $2", [botId, limit]);
      return rows.map(act);
    },
    async spentSince(botId, sinceIso) {
      const { rows } = await pool.query("select coalesce(sum(size), 0) as spent from activity where bot_id = $1 and time >= $2", [botId, sinceIso]);
      return Number(rows[0].spent);
    },
    // One server trades at a time. The lock lives as long as this connection.
    async lead() {
      const client = await pool.connect();
      const { rows } = await client.query("select pg_try_advisory_lock(7263541) as ok");
      if (rows[0].ok) {
        client.on("error", () => process.exit(1));
        return true;
      }
      client.release();
      return false;
    },
    async totals(sinceIso) {
      const { rows } = await pool.query(
        `select bot_id,
           coalesce(sum(delta) filter (where kind <> all($2)), 0) as profit,
           coalesce(sum(delta) filter (where kind = 'fee'), 0) as fees,
           count(*) filter (where kind = 'trade') as trades
         from activity where delta is not null and time >= $1 group by bot_id`,
        [sinceIso, FLOW_KINDS],
      );
      return Object.fromEntries(rows.map((r) => [r.bot_id, { profit: Number(r.profit), fees: Number(r.fees), trades: Number(r.trades) }]));
    },
  };
}

/* --------------------------------- File --------------------------------- */

function fileStore() {
  const dir = process.env.DATA_DIR || fileURLToPath(new URL("../.data/", import.meta.url));
  const file = `${dir}/db.json`;
  mkdirSync(dir, { recursive: true });
  const db = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { bots: [], coins: [], activity: [] };
  const save = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(db));
    renameSync(`${file}.tmp`, file);
  };
  const pick = (b) => Object.fromEntries(BOT_FIELDS.map((k) => [k, b[k]]));

  return {
    async nameTaken(name) {
      return db.bots.some((b) => b.name.toLowerCase() === name.toLowerCase());
    },
    async createBot(b) {
      db.bots.push(pick({ ...b, balance: 0, lastSig: null, createdAt: new Date().toISOString() }));
      save();
      return this.getBot(b.id);
    },
    async getBot(id) {
      const b = db.bots.find((x) => x.id === id);
      return b ? { ...b } : null;
    },
    async listBots() {
      return [...db.bots].reverse().map((b) => ({ ...b }));
    },
    async updateBot(id, patch) {
      const b = db.bots.find((x) => x.id === id);
      if (!b) return;
      for (const k of ["status", "balance", "lastSig"]) if (k in patch) b[k] = patch[k];
      save();
    },
    async createCoin(c) {
      db.coins.push({ ...c, createdAt: new Date().toISOString() });
      save();
    },
    async listCoins() {
      return [...db.coins].reverse();
    },
    async coinForBot(botId) {
      return db.coins.find((c) => c.botId === botId) || null;
    },
    async getCoin(mint) {
      return db.coins.find((c) => c.mint === mint) || null;
    },
    async recordActivity(botId, a) {
      const existing = db.activity.find((x) => x.botId === botId && x.signature === a.signature);
      if (existing) {
        if (existing.delta == null && a.delta != null) existing.delta = a.delta;
        else if (a.delta != null) existing.kind = a.kind;
        if (a.size != null) existing.size = a.size;
        existing.time = a.time || existing.time;
      } else {
        db.activity.push({ botId, signature: a.signature, kind: a.kind, delta: a.delta ?? null, size: a.size ?? null, time: a.time || new Date().toISOString() });
      }
      save();
    },
    async activityKind(botId, signature) {
      return db.activity.find((x) => x.botId === botId && x.signature === signature)?.kind ?? null;
    },
    async listActivity(botId, limit = 50) {
      return db.activity
        .filter((x) => x.botId === botId)
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, limit)
        .map(({ botId: _, size: __, ...rest }) => rest);
    },
    async spentSince(botId, sinceIso) {
      return db.activity.filter((x) => x.botId === botId && x.time >= sinceIso).reduce((sum, x) => sum + (x.size || 0), 0);
    },
    async lead() {
      return true;
    },
    async totals(sinceIso) {
      const out = {};
      for (const a of db.activity) {
        if (a.delta == null || a.time < sinceIso) continue;
        const t = (out[a.botId] ??= { profit: 0, fees: 0, trades: 0 });
        if (!FLOW_KINDS.includes(a.kind)) t.profit += a.delta;
        if (a.kind === "fee") t.fees += a.delta;
        if (a.kind === "trade") t.trades += 1;
      }
      return out;
    },
  };
}
