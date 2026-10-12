import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

process.env.BOT_KEY_SECRET = "11".repeat(32);
const { openKeypair, sealKeypair } = await import("../src/keys.js");
const { authMessage, verify } = await import("../src/auth.js");

function signed(keypair, action, target, fields, time = Date.now()) {
  const message = new TextEncoder().encode(authMessage(action, target, fields, time));
  return { wallet: keypair.publicKey.toBase58(), signature: Buffer.from(nacl.sign.detached(message, keypair.secretKey)).toString("base64"), time };
}

test("bot keys round-trip through encryption and never appear in the sealed text", () => {
  const keypair = Keypair.generate();
  const sealed = sealKeypair(keypair);
  assert.ok(!sealed.includes(bs58.encode(keypair.secretKey)));
  assert.equal(openKeypair(sealed).publicKey.toBase58(), keypair.publicKey.toBase58());
});

test("a sealed key does not open with another secret", () => {
  const sealed = sealKeypair(Keypair.generate());
  process.env.BOT_KEY_SECRET = "22".repeat(32);
  assert.throws(() => openKeypair(sealed));
  process.env.BOT_KEY_SECRET = "11".repeat(32);
});

test("verify accepts the owner's signature once", () => {
  const owner = Keypair.generate();
  const auth = signed(owner, "withdraw", "bot1", { amount: "max" });
  assert.equal(verify(auth, "withdraw", "bot1", { amount: "max" }), owner.publicKey.toBase58());
  assert.throws(() => verify(auth, "withdraw", "bot1", { amount: "max" }), /already used/);
});

test("verify rejects changed fields, another bot, and old signatures", () => {
  const owner = Keypair.generate();
  assert.throws(() => verify(signed(owner, "withdraw", "bot1", { amount: "1" }), "withdraw", "bot1", { amount: "max" }), /does not match/);
  assert.throws(() => verify(signed(owner, "withdraw", "bot1", {}), "withdraw", "bot2", {}), /does not match/);
  assert.throws(() => verify(signed(owner, "status", "bot1", {}, Date.now() - 10 * 60_000), "status", "bot1", {}), /expired/);
});

test("the sell leg's minimum never drops below the floor", async () => {
  const { withFloor, costs } = await import("../src/engine.js");
  for (const [out, floor] of [[1_000_000, 990_000], [123_456_789, 123_000_000], [50_100_000, 50_041_000]]) {
    const q = withFloor({ outAmount: String(out), slippageBps: 100, otherAmountThreshold: "0" }, floor);
    assert.ok(BigInt(q.otherAmountThreshold) >= BigInt(floor));
    assert.ok(BigInt(q.otherAmountThreshold) <= BigInt(out));
    assert.equal(q.otherAmountThreshold, ((BigInt(out) * BigInt(10_000 - q.slippageBps)) / 10_000n).toString());
  }
  assert.equal(withFloor({ outAmount: "1000" }, 1000), null);
  assert.equal(withFloor({ outAmount: "1000000" }, 999_999.5), null);
  assert.ok(costs({ needsTokenAccount: true }) > costs({ needsTokenAccount: false }));
});

test("daily spend counts trade sizes in the window", async () => {
  delete process.env.DATABASE_URL;
  process.env.DATA_DIR = mkdtempSync(`${tmpdir()}/pillees-`);
  const { openStore } = await import("../src/store.js");
  const store = await openStore();
  await store.recordActivity("b", { signature: "x", kind: "trade", delta: null, size: 300, time: new Date().toISOString() });
  await store.recordActivity("b", { signature: "y", kind: "trade", delta: null, size: 200, time: new Date(Date.now() - 2 * 864e5).toISOString() });
  await store.recordActivity("b", { signature: "x", kind: "trade", delta: 12 });
  assert.equal(await store.spentSince("b", new Date(Date.now() - 864e5).toISOString()), 300);
  assert.equal(await store.lead(), true);
});

test("profit leaves out deposits and withdrawals", async () => {
  delete process.env.DATABASE_URL;
  process.env.DATA_DIR = mkdtempSync(`${tmpdir()}/pillees-`);
  const { openStore } = await import("../src/store.js");
  const store = await openStore();
  const id = `t${Date.now()}`;
  await store.createBot({ id, name: id, owner: "o", wallet: `w${id}`, secret: "s", logo: null, status: "running", maxSize: 1, dailyLimit: 5, minEdgeBps: 40 });
  const now = new Date().toISOString();
  await store.recordActivity(id, { signature: "a", kind: "deposit", delta: 5_000_000_000, time: now });
  await store.recordActivity(id, { signature: "b", kind: "trade", delta: 30_000_000, time: now });
  await store.recordActivity(id, { signature: "c", kind: "fee", delta: 10_000_000, time: now });
  await store.recordActivity(id, { signature: "d", kind: "withdraw", delta: -1_000_000_000, time: now });
  await store.recordActivity(id, { signature: "e", kind: "launch", delta: null });
  await store.recordActivity(id, { signature: "e", kind: "trade", delta: -20_000_000, time: now });
  const totals = (await store.totals(new Date(0).toISOString()))[id];
  assert.deepEqual(totals, { profit: 20_000_000, fees: 10_000_000, trades: 1 });
  assert.equal(await store.activityKind(id, "e"), "launch");
});
