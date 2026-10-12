// Captures the real site with demo bots for the promo. Seeds a throwaway file store, runs the
// server on it with trading off, and fakes a connected Phantom wallet for the owner views.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import puppeteer from "puppeteer-core";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = fileURLToPath(new URL("../public/shots/", import.meta.url));
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 8131;
const BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

/* ------------------------------- Logos ------------------------------- */

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 } });
const mascot = `data:image/png;base64,${readFileSync(`${ROOT}web/public/pillee.png`).toString("base64")}`;
const LOOKS = [
  ["#14532d", "#4ade80", 0],
  ["#1e1b4b", "#818cf8", 150],
  ["#431407", "#fb923c", 250],
  ["#083344", "#22d3ee", 110],
  ["#4a044e", "#e879f9", 200],
  ["#3f2a00", "#facc15", 300],
  ["#1c1917", "#a8a29e", 0],
  ["#450a0a", "#f87171", 230],
];
async function logo([dark, light, hue], i) {
  const page = await browser.newPage();
  await page.setViewport({ width: 256, height: 256, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0"><div style="width:256px;height:256px;display:grid;place-items:center;background:radial-gradient(circle at 30% 25%, ${light}, ${dark} 70%)">
    <img src="${mascot}" style="height:${i % 2 ? 190 : 210}px;transform:rotate(${i % 3 === 0 ? -8 : i % 3 === 1 ? 6 : 0}deg);filter:hue-rotate(${hue}deg) drop-shadow(0 10px 18px rgba(0,0,0,.45))"></div></body>`);
  const png = await page.screenshot({ type: "png" });
  await page.close();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}
const logos = [];
for (let i = 0; i < LOOKS.length; i++) logos.push(await logo(LOOKS[i], i));
writeFileSync(`${tmpdir()}/pillees-logo.png`, Buffer.from(logos[2].split(",")[1], "base64"));

/* -------------------------------- Seed -------------------------------- */

let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const sig = () => bs58.encode(randomBytes(64));
const owner = Keypair.generate().publicKey.toBase58();
const others = Array.from({ length: 5 }, () => Keypair.generate().publicKey.toBase58());
const DAY = 864e5;
const now = Date.now();

const BOTS = [
  { name: "Moss Hunter", owner, coin: ["Moss Hunter", "MOSS"], edge: 1.0, days: 9 },
  { name: "Gapfinder", owner: others[0], coin: ["Gapfinder", "GAP"], edge: 0.8, days: 8 },
  { name: "Hopscotch", owner, coin: ["Hopscotch", "HOPS"], edge: 0.62, days: 7 },
  { name: "Night Shift", owner: others[1], coin: ["Night Shift", "NIGHT"], edge: 0.5, days: 6 },
  { name: "Two Hop", owner: others[2], coin: null, edge: 0.38, days: 5 },
  { name: "Pill Runner", owner: others[3], coin: ["Pill Runner", "PILLR"], edge: 0.27, days: 4 },
  { name: "Spreadsheet", owner: others[4], coin: null, edge: 0.16, days: 3 },
  { name: "Curvebot", owner, coin: null, edge: 0.08, days: 1 },
];

const db = { bots: [], coins: [], activity: [] };
BOTS.forEach((b, i) => {
  const id = randomBytes(6).toString("base64url");
  const created = now - b.days * DAY - rand() * 3600e3;
  const deposit = Math.round((2 + rand() * 6) * 1e9);
  let balance = deposit;
  const act = (kind, delta, t) => {
    balance += delta;
    db.activity.push({ botId: id, signature: sig(), kind, delta, size: kind === "trade" ? Math.round(1e8 + rand() * 4e8) : null, time: new Date(t).toISOString() });
  };
  act("deposit", deposit, created + 60e3);
  for (let t = created + 3 * 3600e3; t < now - 60e3; t += (0.6 + rand() * 3.5) * 3600e3) {
    act("trade", Math.round((rand() * 0.034 * b.edge + 0.0005) * 1e9), t);
    if (b.coin && rand() < 0.3) act("fee", Math.round((0.004 + rand() * 0.05 * b.edge) * 1e9), t + 400e3);
  }
  db.bots.push({
    id,
    name: b.name,
    owner: b.owner,
    wallet: Keypair.generate().publicKey.toBase58(),
    secret: "demo",
    logo: logos[i],
    status: i === 6 ? "stopped" : "running",
    maxSize: [0.5, 1, 0.5, 0.75, 0.3, 0.5, 0.25, 0.5][i],
    dailyLimit: [5, 10, 5, 6, 3, 4, 2, 5][i],
    minEdgeBps: [40, 35, 50, 40, 60, 45, 80, 40][i],
    balance,
    lastSig: null,
    createdAt: new Date(created).toISOString(),
  });
  if (b.coin) {
    db.coins.push({
      mint: `${bs58.encode(randomBytes(28)).slice(0, 39)}pump`,
      botId: id,
      name: b.coin[0],
      ticker: b.coin[1],
      description: `${b.name} trades price gaps on PumpSwap. Creator fees from this coin fund its trading.`,
      image: logos[i],
      twitter: "https://x.com/pillees",
      telegram: null,
      signature: sig(),
      createdAt: new Date(created + 1800e3).toISOString(),
    });
  }
});
const dataDir = mkdtempSync(`${tmpdir()}/pillees-shots-`);
writeFileSync(`${dataDir}/db.json`, JSON.stringify(db));
const [moss, , , , , , , curve] = db.bots;

/* ------------------------------- Server ------------------------------- */

const server = spawn("node", ["src/index.js"], {
  cwd: `${ROOT}server`,
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ENGINE: "off", RPC_URL: "http://127.0.0.1:9", BOT_KEY_SECRET: randomBytes(32).toString("hex"), DATABASE_URL: "", RAILWAY_ENVIRONMENT: "" },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve) => server.stdout.on("data", (d) => String(d).includes("pillees on") && resolve()));

/* -------------------------------- Shots -------------------------------- */

const caps = Object.fromEntries(db.coins.map((c, i) => [c.mint, [184_000, 92_500, 61_200, 38_900, 21_400][i]]));
const page = await browser.newPage();
await page.evaluateOnNewDocument((address) => {
  const publicKey = { toString: () => address, toBase58: () => address };
  window.phantom = {
    solana: {
      isPhantom: true,
      publicKey,
      connect: async () => ({ publicKey }),
      disconnect: async () => {},
      signMessage: async () => ({ signature: new Uint8Array(64) }),
      on() {},
      off() {},
    },
  };
}, owner);
await page.setRequestInterception(true);
page.on("request", async (req) => {
  const url = new URL(req.url());
  if (!url.pathname.startsWith("/api/") || /\/(logo|image)$/.test(url.pathname)) return req.continue();
  const body = await (await fetch(req.url())).json();
  const patch = (v) => {
    if (Array.isArray(v)) v.forEach(patch);
    else if (v && typeof v === "object") {
      if (v.mint && "marketCap" in v) v.marketCap = caps[v.mint] ?? null;
      Object.values(v).forEach(patch);
    }
  };
  patch(body);
  req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});

async function go(path, settle = 1600) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "input, textarea { caret-color: transparent; }" });
  await page.evaluate(() => document.querySelectorAll("input, textarea").forEach((el) => (el.spellcheck = false)));
  await wait(settle);
}
async function shot(name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("saved", name);
}

await go("/", 600);
await page.keyboard.press("Escape");
await wait(2600);
await shot("home");

await page.click(".topbar input");
await page.type(".topbar input", "mo", { delay: 60 });
await wait(900);
await shot("search");

await go("/leaderboard");
await shot("leaderboard");

await go("/launch");
await page.type("input[placeholder=Hopscotch]", "Spread Hunter", { delay: 30 });
const file = await page.$("input[type=file]");
await file?.uploadFile(`${tmpdir()}/pillees-logo.png`);
await wait(900);
await shot("launch");

await go(`/bots/${moss.id}`, 2400);
await shot("bot");

await go(`/bots/${curve.id}/coin`);
await page.type("input[placeholder=HOP]", "CURVE", { delay: 20 });
await page.type("textarea", "Curvebot hunts gaps between PumpSwap and Meteora. Creator fees fund its trades.", { delay: 5 });
await page.evaluate(() => [...document.querySelectorAll(".chips button")].find((b) => b.textContent.trim().startsWith("0.5"))?.click());
await wait(700);
await shot("coin-launch");

await go("/docs#engine", 1800);
await shot("docs");

await browser.close();
server.kill();
console.log("done");
