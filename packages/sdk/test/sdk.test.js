import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MULTI_HOP_SWAP_DISCRIMINATOR,
  defineCapsule,
  findEdge,
  fromUnits,
  minAmountOut,
  mockMarket,
  multiHopAccounts,
  multiHopSwapData,
  planRoute,
  quoteRoute,
  quoteSeparateTrades,
  resolveRoute,
  runCapsule,
  sol,
  toUnits,
} from "../src/index.js";

const pool = (base, quote, extra = {}) => ({ kind: "pool", base, quote, baseReserve: 1_000_000_000_000n, quoteReserve: 100_000_000_000n, fees: { protocolBps: 5, lpBps: 20, creatorBps: 5 }, ...extra });
const curve = (base, quote, extra = {}) => ({ kind: "curve", base, quote, baseReserve: 900_000_000_000n, quoteReserve: 300_000_000_000n, fees: { protocolBps: 95, creatorBps: 30 }, ...extra });

test("units round-trip", () => {
  assert.equal(sol("1.5"), 1_500_000_000n);
  assert.equal(toUnits("0.000001", 6), 1n);
  assert.equal(fromUnits(1_500_000_000n), "1.5");
  assert.throws(() => toUnits("-1"));
});

test("a buy route chains SOL → A → B", () => {
  const plan = planRoute({ input: "SOL", hops: [pool("A", "SOL"), curve("B", "A")] });
  assert.ok(plan.ok);
  assert.equal(plan.side, "buy");
  assert.deepEqual(plan.path, ["SOL", "A", "B"]);
  assert.equal(plan.accounts, 26);
  assert.equal(plan.legacy, true);
});

test("a broken chain is MultiHopDiscontinuousPath (6084)", () => {
  const plan = planRoute({ input: "SOL", hops: [pool("A", "SOL"), curve("B", "C")] });
  assert.equal(plan.ok, false);
  assert.equal(plan.errors[0].code, 6084);
});

test("mixing a buy and a sell is MultiHopMixedDirection (6086)", () => {
  const plan = planRoute({ input: "SOL", hops: [pool("A", "SOL"), pool("A", "SOL")] });
  assert.ok(plan.errors.some((e) => e.code === 6086));
});

test("mayhem venues are rejected", () => {
  const plan = planRoute({ input: "SOL", hops: [pool("A", "SOL", { mayhem: true }), curve("B", "A", { mayhem: true })] });
  assert.deepEqual(plan.errors.map((e) => e.code).sort(), [6080, 6108]);
});

test("four hops need a lookup table", () => {
  const plan = planRoute({ input: "SOL", hops: [pool("A", "SOL"), curve("B", "A"), curve("C", "B"), curve("D", "C")] });
  assert.equal(plan.legacy, false);
  assert.equal(plan.accounts, 36);
});

test("fees are charged once per route, so the route beats separate trades", () => {
  const route = { input: "SOL", hops: [pool("A", "SOL"), curve("B", "A")] };
  const once = quoteRoute(route, sol(1));
  const separate = quoteSeparateTrades(route, sol(1));
  assert.ok(once.amountOut > separate.amountOut);
  assert.deepEqual(Object.keys(once.steps[0].fees), ["protocol"]);
  assert.deepEqual(Object.keys(once.steps[1].fees), ["creator"]);
});

test("a sell route takes the protocol fee on the last hop", () => {
  const route = { input: "B", hops: [curve("B", "A"), pool("A", "SOL")] };
  const q = quoteRoute(route, 1_000_000n);
  assert.equal(q.side, "sell");
  assert.ok("creator" in q.steps[0].fees);
  assert.ok("protocol" in q.steps[1].fees);
});

test("min out and slippage", () => {
  assert.equal(minAmountOut(10_000n, 50), 9_950n);
  assert.throws(() => minAmountOut(1n, 9_999));
});

test("account layout is 16 fixed + 5 per hop", () => {
  const route = { input: "SOL", hops: [pool("A", "SOL"), curve("B", "A")] };
  const accounts = multiHopAccounts(route, { user: "User111" });
  assert.equal(accounts.length, 26);
  assert.equal(accounts[0].name, "user");
  assert.equal(accounts[0].signer, true);
  assert.equal(accounts[11].address, "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
  assert.equal(accounts[18].name, "hop 1 pool");
  assert.equal(accounts[18].writable, true);
});

test("instruction data is discriminator + two u64", () => {
  const data = multiHopSwapData(258n, 1n);
  assert.equal(data.length, 24);
  assert.deepEqual([...data.slice(0, 8)], [...MULTI_HOP_SWAP_DISCRIMINATOR]);
  assert.deepEqual([...data.slice(8, 10)], [2, 1]);
  assert.equal(data[16], 1);
});

test("outside venues cannot be a multi_hop_swap hop", () => {
  const outside = { ...pool("B", "SOL"), kind: "external" };
  assert.equal(planRoute({ input: "SOL", hops: [outside] }).ok, true);
  assert.equal(planRoute({ input: "SOL", hops: [pool("A", "SOL"), outside] }).ok, false);
});

test("findEdge fires when the outside pool drifts away", () => {
  const market = mockMarket({ seed: 3 });
  const venues = market.venues();
  const outside = venues.find((v) => v.id === "pill-outside");
  outside.quoteReserve = (outside.quoteReserve * 106n) / 100n;
  const edge = findEdge({ paths: [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]], venues, maxSize: sol(1) });
  assert.equal(edge.fire, true);
  assert.ok(edge.edgeBps > 0);
  assert.ok(resolveRoute(["SOL", "MOSS", "PILL"], venues).hops.length === 2);
});

test("runCapsule fires within its limits on the mock market", async () => {
  const capsule = defineCapsule({ name: "test", paths: [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]], maxSize: "1", dailyLimit: "2", minEdgeBps: 20 });
  const events = [];
  for await (const e of runCapsule(capsule, { market: mockMarket({ seed: 11, shock: 0.06 }), ticks: 60 })) events.push(e);
  const fills = events.filter((e) => e.type === "fill");
  assert.ok(fills.length > 0, "expected at least one fill");
  assert.ok(Number(fills[fills.length - 1].spent) <= 2);
});
