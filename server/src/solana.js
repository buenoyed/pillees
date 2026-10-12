import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

export const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
export const connection = new Connection(RPC_URL, "confirmed");

const TX_FEE = 5_000;
const PUMPPORTAL = "https://pumpportal.fun/api/trade-local";
const PUMP_IPFS = "https://pump.fun/api/ipfs";

export const sol = (lamports) => lamports / LAMPORTS_PER_SOL;
export const lamports = (value) => Math.round(Number(value) * LAMPORTS_PER_SOL);

export async function balance(address) {
  return connection.getBalance(new PublicKey(address));
}

export async function send(tx, signers) {
  if (signers && tx instanceof VersionedTransaction) tx.sign(signers);
  const raw = tx.serialize();
  const signature = await connection.sendRawTransaction(raw, { maxRetries: 3 });
  const latest = await connection.getLatestBlockhash();
  const result = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  if (result.value.err) throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}

export async function withdraw(keypair, to, amountLamports) {
  const have = await balance(keypair.publicKey);
  const max = have - TX_FEE;
  const amount = amountLamports == null ? max : Math.min(amountLamports, max);
  if (amount <= 0) throw new Error("Nothing to withdraw after the network fee.");
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: keypair.publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: new PublicKey(to), lamports: amount }),
  );
  tx.sign(keypair);
  return { signature: await send(tx, [keypair]), amount };
}

async function pumpportal(body) {
  const response = await fetch(PUMPPORTAL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`PumpPortal: ${response.status} ${(await response.text()).slice(0, 200)}`);
  return VersionedTransaction.deserialize(new Uint8Array(await response.arrayBuffer()));
}

export async function uploadMetadata({ name, ticker, description, image, website, twitter, telegram }) {
  const form = new FormData();
  form.append("file", new Blob([image.bytes], { type: image.type }), `logo.${image.type.split("/")[1]}`);
  form.append("name", name);
  form.append("symbol", ticker);
  form.append("description", description);
  form.append("website", website);
  if (twitter) form.append("twitter", twitter);
  if (telegram) form.append("telegram", telegram);
  form.append("showName", "true");
  const response = await fetch(PUMP_IPFS, { method: "POST", body: form });
  if (!response.ok) throw new Error(`pump.fun metadata upload: ${response.status}`);
  const json = await response.json();
  if (!json.metadataUri) throw new Error("pump.fun metadata upload returned no URI");
  return json.metadataUri;
}

// Creates the coin on pump.fun with the bot wallet as creator, so creator fees accrue to the bot.
export async function launchCoin(botKeypair, { name, ticker, uri, devBuySol }) {
  const mint = Keypair.generate();
  const tx = await pumpportal({
    publicKey: botKeypair.publicKey.toBase58(),
    action: "create",
    tokenMetadata: { name, symbol: ticker, uri },
    mint: mint.publicKey.toBase58(),
    denominatedInSol: "true",
    amount: devBuySol,
    slippage: 10,
    priorityFee: 0.0005,
    pool: "pump",
  });
  const signature = await send(tx, [mint, botKeypair]);
  return { mint: mint.publicKey.toBase58(), signature };
}

export function creatorVault(creator) {
  return PublicKey.findProgramAddressSync([Buffer.from("creator-vault"), new PublicKey(creator).toBuffer()], PUMP_PROGRAM)[0];
}

export async function claimable(creator) {
  const info = await connection.getAccountInfo(creatorVault(creator));
  if (!info) return 0;
  const rent = await connection.getMinimumBalanceForRentExemption(info.data.length);
  return Math.max(0, info.lamports - rent);
}

export async function claimFees(botKeypair) {
  const tx = await pumpportal({
    publicKey: botKeypair.publicKey.toBase58(),
    action: "collectCreatorFee",
    priorityFee: 0.000001,
    pool: "pump",
  });
  return send(tx, [botKeypair]);
}
