import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { openKeypair } from "./keys.js";
import { balance, connection, send } from "./solana.js";

export const WSOL = "So11111111111111111111111111111111111111112";
export const PUMP_TOKEN = "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn";
const JUPITER = (process.env.JUPITER_URL || "https://lite-api.jup.ag/swap/v1").replace(/\/$/, "");
const PUMP_SWAP = "Pump.fun Amm";
const PUMP_ANY = "Pump.fun Amm,Pump.fun";

// Two directions per coin: buy on PumpSwap and sell anywhere else, or the other way round.
export const SIDES = [
  { id: "pump-first", buy: { dexes: PUMP_SWAP }, sell: { excludeDexes: PUMP_ANY } },
  { id: "pump-last", buy: { excludeDexes: PUMP_ANY }, sell: { dexes: PUMP_SWAP } },
];

const LAMPORTS = 1_000_000_000;
const PROBE = 50_000_000;
const RESERVE = 10_000_000;
const TOKEN_RENT = 2_100_000;
const BASE_FEE = 5_000;
const CU_LIMIT = 800_000;
const CU_PRICE = 20_000;
const PRIORITY = Math.ceil((CU_LIMIT * CU_PRICE) / 1e6);
const MAX_ACCOUNTS = 28;
const MAX_TX = 1232;
const CALL_GAP = 1_100;
const SCAN_MS = 4_000;
const DISCOVER_MS = 15 * 60_000;
const BOT_COOLDOWN = 30_000;
const COIN_COOLDOWN = 60_000;
const DAY = 864e5;
const MIN_LIQUIDITY = 20_000;
const MAX_CANDIDATES = 40;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ Jupiter ------------------------------ */

let lastCall = 0;
async function jupiter(path, init) {
  const wait = lastCall + CALL_GAP - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const response = await fetch(`${JUPITER}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Jupiter ${response.status}`);
  return body;
}

export function quote(inputMint, outputMint, amount, venues) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amount),
    slippageBps: "100",
    maxAccounts: String(MAX_ACCOUNTS),
    restrictIntermediateTokens: "true",
    ...venues,
  });
  return jupiter(`/quote?${params}`);
}

const instruction = (ix) =>
  new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    data: Buffer.from(ix.data, "base64"),
  });

const swapInstructions = (quoteResponse, user) =>
  jupiter("/swap-instructions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quoteResponse, userPublicKey: user, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: false }),
  });

/* ------------------------------- Edges ------------------------------- */

// Lamports a round trip has to cover before it counts as profit.
export const costs = ({ needsTokenAccount }) => BASE_FEE + PRIORITY + (needsTokenAccount ? TOKEN_RENT : 0);

// Sets the sell leg's minimum so the whole transaction fails unless SOL out >= floor.
export function withFloor(sellQuote, floor) {
  const out = BigInt(sellQuote.outAmount);
  const min = BigInt(Math.ceil(floor));
  if (out <= min) return null;
  const slippageBps = Number(((out - min) * 10_000n) / out);
  if (slippageBps < 1) return null;
  const threshold = (out * BigInt(10_000 - slippageBps)) / 10_000n;
  return { ...sellQuote, slippageBps, otherAmountThreshold: threshold.toString() };
}

async function roundTrip(mint, side, amount) {
  const buy = await quote(WSOL, mint, amount, side.buy);
  const sell = await quote(mint, WSOL, buy.outAmount, side.sell);
  return { side: side.id, mint, amount, buy, sell, out: Number(sell.outAmount), gross: Number(sell.outAmount) - amount };
}

const venues = (q) => [...new Set(q.routePlan.map((r) => r.swapInfo.label))].join(" + ");

/* ----------------------------- Candidates ----------------------------- */

async function dexscreener(path) {
  const response = await fetch(`https://api.dexscreener.com/${path}`, { signal: AbortSignal.timeout(10_000) });
  return response.ok ? response.json() : null;
}

// Pump coins with a PumpSwap pool and at least one pool somewhere else, both with real liquidity.
export async function discover(extra = []) {
  const seen = new Set([PUMP_TOKEN, ...extra]);
  for (const term of ["pumpswap", "pump"]) {
    const found = await dexscreener(`latest/dex/search?q=${term}`);
    for (const p of found?.pairs ?? []) if (p.chainId === "solana" && p.dexId === "pumpswap") seen.add(p.baseToken.address);
  }
  for (const list of ["token-boosts/top/v1", "token-boosts/latest/v1"]) {
    for (const t of (await dexscreener(list)) ?? []) if (t.chainId === "solana" && t.tokenAddress.endsWith("pump")) seen.add(t.tokenAddress);
  }
  const out = [];
  for (const mint of [...seen].slice(0, 120)) {
    const pairs = (await dexscreener(`token-pairs/v1/solana/${mint}`)) ?? [];
    const deep = pairs.filter((p) => (p.liquidity?.usd ?? 0) >= MIN_LIQUIDITY && [p.baseToken.address, p.quoteToken.address].includes(mint));
    const pump = deep.some((p) => p.dexId === "pumpswap" && [p.baseToken.address, p.quoteToken.address].includes(WSOL));
    const other = deep.some((p) => p.dexId !== "pumpswap" && p.dexId !== "pumpfun");
    if (pump && other) out.push({ mint, symbol: deep[0].baseToken.address === mint ? deep[0].baseToken.symbol : deep[0].quoteToken.symbol, liquidity: deep.reduce((s, p) => s + p.liquidity.usd, 0) });
    await sleep(250);
  }
  return out.sort((a, b) => b.liquidity - a.liquidity).slice(0, MAX_CANDIDATES);
}

/* ------------------------------ Executing ------------------------------ */

async function hasTokenAccount(owner, mint) {
  const { value } = await connection.getTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) });
  return value.length > 0;
}

// Both swaps in one transaction: buy leg, then sell leg with its floor. Either all of it lands or none.
export async function buildTrade(keypair, trip, sellQuote) {
  const user = keypair.publicKey.toBase58();
  const first = await swapInstructions(trip.buy, user);
  const second = await swapInstructions(sellQuote, user);
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: CU_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }),
    ...first.setupInstructions.map(instruction),
    instruction(first.swapInstruction),
    ...second.setupInstructions.map(instruction),
    instruction(second.swapInstruction),
    ...(second.cleanupInstruction ? [instruction(second.cleanupInstruction)] : []),
  ];
  const tables = [...new Set([...first.addressLookupTableAddresses, ...second.addressLookupTableAddresses])];
  const lookups = (await Promise.all(tables.map((t) => connection.getAddressLookupTable(new PublicKey(t))))).map((r) => r.value).filter(Boolean);
  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(
    lookups.map((t) => new AddressLookupTableAccount({ key: t.key, state: t.state })),
  );
  const tx = new VersionedTransaction(message);
  tx.sign([keypair]);
  const size = tx.serialize().length;
  if (size > MAX_TX) throw new Error(`route too large for one transaction (${size} bytes)`);
  return tx;
}

/* -------------------------------- Loop -------------------------------- */

export function startEngine(store, log = console) {
  const state = {
    on: true,
    startedAt: new Date().toISOString(),
    candidates: [],
    discoveredAt: null,
    scans: 0,
    lastScan: null,
    best: null,
    lastTrade: null,
    lastError: null,
  };
  const coolBot = new Map();
  const coolCoin = new Map();
  let cursor = 0;
  let stopped = false;

  async function refresh() {
    const coins = (await store.listCoins()).map((c) => c.mint);
    state.candidates = await discover(coins);
    state.discoveredAt = new Date().toISOString();
    log.info?.(`engine: ${state.candidates.length} coins with a PumpSwap pool and an outside pool`);
  }

  async function tryBot(bot, candidate, side) {
    const have = await balance(bot.wallet);
    const spent = await store.spentSince(bot.id, new Date(Date.now() - DAY).toISOString());
    const needsTokenAccount = !(await hasTokenAccount(bot.wallet, candidate.mint));
    const room = Math.min(bot.maxSize * LAMPORTS, bot.dailyLimit * LAMPORTS - spent, have - RESERVE - (needsTokenAccount ? TOKEN_RENT : 0));
    if (room < PROBE / 5) return null;
    let best = null;
    for (const size of [room, Math.floor(room / 3)]) {
      const trip = await roundTrip(candidate.mint, side, Math.floor(size));
      const cost = costs({ needsTokenAccount });
      const need = trip.amount + cost + (trip.amount * bot.minEdgeBps) / 10_000;
      if (trip.out > need && (!best || trip.out - trip.amount > best.trip.out - best.trip.amount)) best = { trip, cost, floor: trip.amount + cost + Math.max(1, (trip.amount * bot.minEdgeBps) / 10_000) };
    }
    if (!best) return null;
    const sellQuote = withFloor(best.trip.sell, best.floor);
    if (!sellQuote) return null;
    const keypair = openKeypair(bot.secret);
    const tx = await buildTrade(keypair, best.trip, sellQuote);
    const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: false });
    if (sim.value.err) throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)}`);
    const signature = await send(tx);
    await store.recordActivity(bot.id, { signature, kind: "trade", delta: null, size: best.trip.amount });
    const trade = {
      bot: bot.name,
      signature,
      coin: candidate.symbol,
      size: best.trip.amount / LAMPORTS,
      expected: (best.trip.out - best.trip.amount - best.cost) / LAMPORTS,
      route: `${venues(best.trip.buy)} → ${venues(best.trip.sell)}`,
      time: new Date().toISOString(),
    };
    state.lastTrade = trade;
    log.info?.(`engine: ${bot.name} traded ${trade.size} SOL through ${candidate.symbol} (${trade.route}): ${signature}`);
    return trade;
  }

  async function scan() {
    if (!state.candidates.length) return;
    const candidate = state.candidates[cursor++ % state.candidates.length];
    if (coolCoin.get(candidate.mint) > Date.now()) return;
    for (const side of SIDES) {
      const probe = await roundTrip(candidate.mint, side, PROBE);
      const edgeBps = Math.round((probe.gross / PROBE) * 10_000);
      if (!state.best || edgeBps > state.best.edgeBps || Date.parse(state.best.time) < Date.now() - 10 * 60_000) {
        state.best = { coin: candidate.symbol, mint: candidate.mint, edgeBps, route: `${venues(probe.buy)} → ${venues(probe.sell)}`, time: new Date().toISOString() };
      }
      if (probe.gross <= 0) continue;
      const bots = (await store.listBots()).filter((b) => b.status === "running" && !(coolBot.get(b.id) > Date.now()));
      for (const bot of bots) {
        try {
          if (await tryBot(bot, candidate, side)) coolBot.set(bot.id, Date.now() + BOT_COOLDOWN);
        } catch (error) {
          state.lastError = { message: error.message, time: new Date().toISOString() };
          log.warn?.(`engine ${bot.name} on ${candidate.symbol}: ${error.message}`);
          coolCoin.set(candidate.mint, Date.now() + COIN_COOLDOWN);
          break;
        }
      }
    }
  }

  (async () => {
    while (!stopped) {
      try {
        if (!state.discoveredAt || Date.now() - Date.parse(state.discoveredAt) > DISCOVER_MS) await refresh();
        await scan();
        state.scans++;
        state.lastScan = new Date().toISOString();
      } catch (error) {
        state.lastError = { message: error.message, time: new Date().toISOString() };
        log.warn?.(`engine: ${error.message}`);
        await sleep(10_000);
      }
      await sleep(SCAN_MS);
    }
  })();

  return {
    state,
    stop() {
      stopped = true;
      state.on = false;
    },
  };
}
