import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";
import { AuthError, verify } from "./auth.js";
import { checkSecret, openKeypair, sealKeypair } from "./keys.js";
import { marketData } from "./market.js";
import { balance, lamports, launchCoin, sol, uploadMetadata, withdraw } from "./solana.js";
import { openStore } from "./store.js";
import { claimNow, startTracker } from "./tracker.js";

const PORT = Number(process.env.PORT) || 8080;
const SITE = (process.env.VITE_SITE_URL || "https://pillees.fun").replace(/\/$/, "");
const STATIC = fileURLToPath(new URL("../../web/dist/", import.meta.url));
const MAX_BODY = 1_500_000;
const MAX_IMAGE = 400_000;
const MAX_BOTS_PER_OWNER = 5;
const LAUNCH_RESERVE = 0.025;
const RANGES = { "24H": 864e5, "7D": 6048e5, "30D": 2592e6, ALL: Infinity };

checkSecret();
const store = await openStore();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};

function parseImage(dataUrl, label) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match) fail(400, `${label} must be a PNG, JPG, WEBP or GIF.`);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_IMAGE) fail(400, `${label} must be under 400 KB.`);
  return { type: match[1], bytes, dataUrl };
}

const number = (value, min, max, label) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(400, `${label} must be between ${min} and ${max}.`);
  return n;
};

function socialUrl(value, host, label) {
  const text = String(value || "").trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    fail(400, `${label} must be a full https:// link.`);
  }
  if (url.protocol !== "https:" || !host.test(url.hostname.replace(/^www\./, "")) || text.length > 200) fail(400, `${label} doesn't look right.`);
  return url.toString();
}

async function publicBot(bot, totals = {}, coins = {}, market = {}) {
  const coin = coins[bot.id] ?? (await store.coinForBot(bot.id));
  return {
    id: bot.id,
    name: bot.name,
    logo: `/api/bots/${bot.id}/logo`,
    wallet: bot.wallet,
    owner: bot.owner,
    status: bot.status,
    maxSize: bot.maxSize,
    dailyLimit: bot.dailyLimit,
    minEdgeBps: bot.minEdgeBps,
    balance: sol(bot.balance),
    createdAt: bot.createdAt,
    stats: { profit: sol(totals.profit || 0), fees: sol(totals.fees || 0), trades: totals.trades || 0 },
    coin: coin && publicCoin(coin, market[coin.mint]),
  };
}

const publicCoin = (coin, market) => ({
  mint: coin.mint,
  botId: coin.botId,
  name: coin.name,
  ticker: coin.ticker,
  image: `/api/coins/${coin.mint}/image`,
  description: coin.description || "",
  twitter: coin.twitter || null,
  telegram: coin.telegram || null,
  website: `${SITE}/bots/${coin.botId}`,
  createdAt: coin.createdAt,
  marketCap: market?.marketCap ?? null,
});

const since = (range) => new Date(RANGES[range] === Infinity ? 0 : Date.now() - (RANGES[range] ?? RANGES["7D"])).toISOString();

const busy = new Set();
async function exclusive(id, fn) {
  if (busy.has(id)) fail(409, "This bot is already doing something. Wait a moment.");
  busy.add(id);
  try {
    return await fn();
  } finally {
    busy.delete(id);
  }
}

async function ownedBot(id, auth, action, fields) {
  const bot = await store.getBot(id);
  if (!bot) fail(404, "Bot not found.");
  const wallet = verify(auth, action, id, fields);
  if (wallet !== bot.owner) fail(403, "Only the wallet that launched this bot can do that.");
  return bot;
}

const routes = [
  ["GET", /^\/api\/bots$/, async (_, url) => {
    const range = RANGES[url.searchParams.get("range")] ? url.searchParams.get("range") : "7D";
    const [bots, totals, coins] = await Promise.all([store.listBots(), store.totals(since(range)), store.listCoins()]);
    const byBot = Object.fromEntries(coins.map((c) => [c.botId, c]));
    const market = await marketData(coins.map((c) => c.mint));
    const list = await Promise.all(bots.map((b) => publicBot(b, totals[b.id], byBot, market)));
    list.sort((a, b) => b.stats.profit - a.stats.profit || b.balance - a.balance);
    return { range, bots: list };
  }],
  ["POST", /^\/api\/bots$/, async (body) => {
    const { fields = {}, auth } = body;
    const owner = verify(auth, "create", "bot", fields);
    const name = String(fields.name || "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,19}$/.test(name)) fail(400, "Name: 2 to 20 letters, numbers, spaces, - or _.");
    if (await store.nameTaken(name)) fail(409, "That name is taken.");
    const maxSize = number(fields.maxSize, 0.01, 100, "Max trade size");
    const dailyLimit = number(fields.dailyLimit, maxSize, 1000, "Daily limit");
    const minEdgeBps = Math.round(number(fields.minEdgeBps, 10, 1000, "Minimum edge"));
    const logo = parseImage(body.logo, "Logo");
    if ((await store.listBots()).filter((b) => b.owner === owner).length >= MAX_BOTS_PER_OWNER) fail(429, `One wallet can launch up to ${MAX_BOTS_PER_OWNER} bots.`);
    const keypair = Keypair.generate();
    const bot = await store.createBot({
      id: randomBytes(6).toString("base64url"),
      name,
      owner,
      wallet: keypair.publicKey.toBase58(),
      secret: sealKeypair(keypair),
      logo: logo.dataUrl,
      status: "running",
      maxSize,
      dailyLimit,
      minEdgeBps,
    });
    return publicBot(bot);
  }],
  ["GET", /^\/api\/bots\/([\w-]+)$/, async (_, url, [id]) => {
    const bot = await store.getBot(id);
    if (!bot) fail(404, "Bot not found.");
    const range = RANGES[url.searchParams.get("range")] ? url.searchParams.get("range") : "ALL";
    const [totals, coin] = await Promise.all([store.totals(since(range)), store.coinForBot(id)]);
    const market = coin ? await marketData([coin.mint]) : {};
    return { ...(await publicBot(bot, totals[id], { [id]: coin }, market)), range, activity: await store.listActivity(id, 50) };
  }],
  ["GET", /^\/api\/bots\/([\w-]+)\/logo$/, async (_, __, [id]) => {
    const bot = await store.getBot(id);
    if (!bot?.logo) fail(404, "No logo.");
    return { image: bot.logo };
  }],
  ["POST", /^\/api\/bots\/([\w-]+)\/status$/, async ({ fields = {}, auth }, _, [id]) => {
    if (!["running", "stopped"].includes(fields.status)) fail(400, "Status must be running or stopped.");
    const bot = await ownedBot(id, auth, "status", fields);
    await store.updateBot(bot.id, { status: fields.status });
    return { status: fields.status };
  }],
  ["POST", /^\/api\/bots\/([\w-]+)\/withdraw$/, async ({ fields = {}, auth }, _, [id]) => {
    const bot = await ownedBot(id, auth, "withdraw", fields);
    const amount = fields.amount === "max" ? null : lamports(number(fields.amount, 0.000001, 1e6, "Amount"));
    return exclusive(bot.id, async () => {
      const { signature, amount: sent } = await withdraw(openKeypair(bot.secret), bot.owner, amount);
      await store.recordActivity(bot.id, { signature, kind: "withdraw", delta: null });
      return { signature, amount: sol(sent) };
    });
  }],
  ["POST", /^\/api\/bots\/([\w-]+)\/claim$/, async ({ fields = {}, auth }, _, [id]) => {
    const bot = await ownedBot(id, auth, "claim", fields);
    if (!(await store.coinForBot(bot.id))) fail(400, "This bot has no coin yet.");
    return exclusive(bot.id, async () => ({ signature: await claimNow(store, bot) }));
  }],
  ["POST", /^\/api\/bots\/([\w-]+)\/coin$/, async (body, _, [id]) => {
    const { fields = {}, auth } = body;
    const bot = await ownedBot(id, auth, "launch", fields);
    if (await store.coinForBot(bot.id)) fail(409, "This bot already has a coin.");
    const name = String(fields.name || "").trim();
    const ticker = String(fields.ticker || "").trim().toUpperCase();
    const description = String(fields.description || "").trim().slice(0, 500);
    if (name.length < 2 || name.length > 32) fail(400, "Coin name: 2 to 32 characters.");
    if (!/^[A-Z0-9]{2,10}$/.test(ticker)) fail(400, "Ticker: 2 to 10 letters or numbers.");
    const devBuy = number(fields.devBuy ?? 0, 0, 5, "Dev buy");
    const twitter = socialUrl(fields.twitter, /^(x|twitter)\.com$/, "X link");
    const telegram = socialUrl(fields.telegram, /^t\.me$/, "Telegram link");
    const image = parseImage(body.image || bot.logo, "Coin image");
    return exclusive(bot.id, async () => {
      const keypair = openKeypair(bot.secret);
      const have = sol(await balance(bot.wallet));
      if (have < devBuy + LAUNCH_RESERVE) fail(400, `Fund the bot first. It needs at least ${(devBuy + LAUNCH_RESERVE).toFixed(3)} SOL and has ${have.toFixed(4)}.`);
      const uri = await uploadMetadata({
        name,
        ticker,
        description: description || `${bot.name} is an arbitrage bot on Pillees. Creator fees from this coin fund its trading.`,
        image,
        website: `${SITE}/bots/${bot.id}`,
        twitter,
        telegram,
      });
      const { mint, signature } = await launchCoin(keypair, { name, ticker, uri, devBuySol: devBuy });
      await store.createCoin({ mint, botId: bot.id, name, ticker, description, image: image.dataUrl, twitter, telegram, signature });
      await store.recordActivity(bot.id, { signature, kind: "launch", delta: null });
      return { mint, signature };
    });
  }],
  ["GET", /^\/api\/coins$/, async () => {
    const [coins, bots] = await Promise.all([store.listCoins(), store.listBots()]);
    const names = Object.fromEntries(bots.map((b) => [b.id, b.name]));
    const market = await marketData(coins.map((c) => c.mint));
    return { coins: coins.map((c) => ({ ...publicCoin(c, market[c.mint]), botName: names[c.botId] })) };
  }],
  ["GET", /^\/api\/coins\/(\w+)\/image$/, async (_, __, [mint]) => {
    const coin = await store.getCoin(mint);
    if (!coin?.image) fail(404, "No image.");
    return { image: coin.image };
  }],
];

/* -------------------------------- HTTP -------------------------------- */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};
const SECURITY = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" };

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SECURITY });
  res.end(JSON.stringify(value));
}

function image(res, dataUrl) {
  const [, type, data] = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=86400", ...SECURITY });
  res.end(Buffer.from(data, "base64"));
}

function serveStatic(req, res, url) {
  const path = normalize(join(STATIC, decodeURIComponent(url.pathname)));
  if (!path.startsWith(STATIC)) return res.writeHead(400).end();
  if (existsSync(path) && statSync(path).isFile()) {
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] || "application/octet-stream",
      "cache-control": path.startsWith(join(STATIC, "assets")) ? "public, max-age=31536000, immutable" : "public, max-age=300",
      ...SECURITY,
    });
    return createReadStream(path).pipe(res);
  }
  if (extname(url.pathname)) return res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  const index = join(STATIC, "index.html");
  if (!existsSync(index)) return res.writeHead(503, { "content-type": "text/plain" }).end("Site not built. Run npm run build.");
  res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-cache", ...SECURITY });
  createReadStream(index).pipe(res);
}

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, "Request too large."));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new HttpError(400, "Bad JSON."));
      }
    });
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/healthz") return res.writeHead(200, { "content-type": "text/plain" }).end("ok");
  if (!url.pathname.startsWith("/api/")) return serveStatic(req, res, url);
  try {
    const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url.pathname));
    if (!route) fail(404, "Not found.");
    if (req.method === "POST") {
      const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(",")[0].trim();
      if (limited(ip)) fail(429, "Too many requests. Slow down.");
    }
    const body = req.method === "POST" ? await readBody(req) : null;
    const result = await route[2](body, url, route[1].exec(url.pathname).slice(1));
    if (result?.image && Object.keys(result).length === 1) return image(res, result.image);
    json(res, 200, result);
  } catch (error) {
    const status = error instanceof HttpError || error instanceof AuthError ? error.status : 500;
    if (status === 500) console.error(error);
    json(res, status, { error: status === 500 ? `Something went wrong: ${error.message}` : error.message });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`pillees on :${PORT} (${process.env.DATABASE_URL ? "postgres" : "file store"})`);
  startTracker(store);
});

