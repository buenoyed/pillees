import { PublicKey } from "@solana/web3.js";
import { openKeypair } from "./keys.js";
import { balance, claimable, claimFees, connection } from "./solana.js";

const SYSTEM = "11111111111111111111111111111111";
const COMPUTE = "ComputeBudget111111111111111111111111111111";
const SCAN_MS = 60_000;
const CLAIM_MS = 15 * 60_000;
const MIN_CLAIM = 2_000_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Plain SOL transfers are the owner funding or emptying the bot. Everything else is the bot working.
function classify(tx, wallet) {
  const ixs = tx.transaction.message.instructions.filter((ix) => ix.programId.toBase58() !== COMPUTE);
  const transfers = ixs.filter((ix) => ix.programId.toBase58() === SYSTEM && ix.parsed?.type === "transfer");
  if (transfers.length && transfers.length === ixs.length) {
    if (transfers.every((ix) => ix.parsed.info.destination === wallet)) return "deposit";
    if (transfers.every((ix) => ix.parsed.info.source === wallet)) return "withdraw";
  }
  return "trade";
}

async function scanBot(store, bot) {
  const wallet = new PublicKey(bot.wallet);
  const sigs = await connection.getSignaturesForAddress(wallet, bot.lastSig ? { until: bot.lastSig, limit: 100 } : { limit: 100 });
  for (const info of sigs.reverse()) {
    if (info.err) {
      await store.updateBot(bot.id, { lastSig: info.signature });
      continue;
    }
    const tx = await connection.getParsedTransaction(info.signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) break;
    const index = tx.transaction.message.accountKeys.findIndex((k) => k.pubkey.toBase58() === bot.wallet);
    const delta = index >= 0 ? tx.meta.postBalances[index] - tx.meta.preBalances[index] : 0;
    const known = await store.activityKind(bot.id, info.signature);
    await store.recordActivity(bot.id, {
      signature: info.signature,
      kind: known || classify(tx, bot.wallet),
      delta,
      time: new Date((tx.blockTime ?? Date.now() / 1000) * 1000).toISOString(),
    });
    await store.updateBot(bot.id, { lastSig: info.signature });
    await sleep(150);
  }
  await store.updateBot(bot.id, { balance: await balance(bot.wallet) });
}

export async function claimNow(store, bot) {
  const signature = await claimFees(openKeypair(bot.secret));
  await store.recordActivity(bot.id, { signature, kind: "fee", delta: null });
  return signature;
}

export function startTracker(store, log = console) {
  let lastClaim = 0;
  let busy = false;
  const pass = async () => {
    if (busy) return;
    busy = true;
    try {
      const claimRound = Date.now() - lastClaim > CLAIM_MS;
      for (const bot of await store.listBots()) {
        try {
          await scanBot(store, bot);
          if (claimRound && bot.status === "running" && (await store.coinForBot(bot.id))) {
            const owed = await claimable(bot.wallet);
            if (owed >= MIN_CLAIM && bot.balance > 10_000) {
              const sig = await claimNow(store, bot);
              log.info?.(`claimed ${owed} lamports for ${bot.name}: ${sig}`);
            }
          }
        } catch (error) {
          log.warn?.(`tracker ${bot.name}: ${error.message}`);
        }
        await sleep(300);
      }
      if (claimRound) lastClaim = Date.now();
    } finally {
      busy = false;
    }
  };
  pass();
  return setInterval(pass, SCAN_MS);
}
