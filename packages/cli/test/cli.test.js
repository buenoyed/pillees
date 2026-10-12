import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/pillees.js", import.meta.url));
const cli = (...args) => execFileSync(process.execPath, [bin, ...args], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });

test("help lists the commands", () => {
  assert.match(cli("help"), /pillees quote/);
});

test("quote prices a two-hop buy", () => {
  const out = JSON.parse(cli("quote", "SOL", "MOSS", "PILL", "--in", "1", "--json"));
  assert.equal(out.side, "buy");
  assert.equal(out.accounts, 26);
  assert.ok(BigInt(out.amountOut) > BigInt(out.minAmountOut));
});

test("accounts prints 26 rows for two hops", () => {
  assert.equal(JSON.parse(cli("accounts", "SOL", "MOSS", "PILL", "--json")).length, 26);
});

test("init writes a capsule and run reads it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pillees-"));
  const file = path.join(dir, "capsule.json");
  cli("init", file);
  assert.equal(JSON.parse(readFileSync(file, "utf8")).strategy, "spread");
  const events = cli("run", file, "--ticks", "5", "--json").trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(new Set(events.map((e) => e.tick)).size, 5);
});
