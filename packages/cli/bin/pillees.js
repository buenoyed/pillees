#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  defineCapsule,
  findEdge,
  fromUnits,
  minAmountOut,
  mockMarket,
  multiHopAccounts,
  multiHopSwapData,
  quoteRoute,
  quoteSeparateTrades,
  resolveRoute,
  runCapsule,
  spotPrice,
  toUnits,
} from "@pillees/sdk";

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const mint = paint("38;5;121");
const dim = paint("2");
const bold = paint("1");
const red = paint("31");

const decimals = (m) => (m === "SOL" ? 9 : 6);
const amount = (units, m) => `${fromUnits(units, decimals(m))} ${m}`;
const table = (rows) => {
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).replace(/\x1b\[[0-9;]*m/g, "").length)));
  return rows.map((r) => r.map((cell, c) => String(cell) + " ".repeat(widths[c] - String(cell).replace(/\x1b\[[0-9;]*m/g, "").length)).join("  ")).join("\n");
};

const PAIRS = [
  [["SOL", "MOSS", "PILL"], ["SOL", "PILL"]],
  [["SOL", "ZEST", "CAPS"], ["SOL", "CAPS"]],
];

const TEMPLATE = {
  name: "spread-hunter",
  strategy: "spread",
  wallet: null,
  paths: PAIRS[0],
  maxSize: "0.5",
  dailyLimit: "5",
  minEdgeBps: 40,
  slippageBps: 50,
  cooldownTicks: 2,
};

const HELP = `${bold("pillees")} ${dim("— capsules that hunt the spread on Pump")}

${bold("Usage")}
  pillees quote <mint> <mint> [<mint>...] --in <amount> [--slippage <bps>]
  pillees accounts <mint> <mint> [<mint>...] [--user <pubkey>]
  pillees venues
  pillees scan [--ticks 20]
  pillees init [capsule.json]
  pillees run [capsule.json] [--ticks 40] [--interval 250]

${bold("Options")}
  --seed <n>       seed for the offline sample market (default 7)
  --json           machine-readable output

${bold("Examples")}
  pillees quote SOL MOSS PILL --in 1
  pillees accounts SOL MOSS PILL --user <your wallet>
  pillees init && pillees run capsule.json

Prices come from an offline sample market. Nothing is signed or sent.`;

const json = (value) => JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v instanceof Uint8Array ? Buffer.from(v).toString("hex") : v), 2);

function quote(path, opts) {
  const venues = mockMarket({ seed: Number(opts.seed) }).venues();
  const route = resolveRoute(path, venues);
  const amountIn = toUnits(opts.in ?? "1", decimals(path[0]));
  const q = quoteRoute(route, amountIn);
  const min = minAmountOut(q.amountOut, Number(opts.slippage ?? 50));
  if (opts.json) return console.log(json({ ...q, minAmountOut: min }));
  const separate = route.hops.length > 1 ? quoteSeparateTrades(route, amountIn) : null;
  console.log(`${bold(path.join(" → "))}  ${dim(`${q.side} · ${route.hops.length} hop${route.hops.length > 1 ? "s" : ""}`)}\n`);
  console.log(
    table([
      [dim("hop"), dim("venue"), dim("in"), dim("out"), dim("fee")],
      ...q.steps.map((s, i) => [
        i + 1,
        `${route.hops[i].kind} ${route.hops[i].base}/${route.hops[i].quote}`,
        amount(s.amountIn, s.mintIn),
        amount(s.amountOut, s.mintOut),
        s.fee > 0n ? `${amount(s.fee, s.feeMint)} ${dim(`(${Object.keys(s.fees).join(" + ")})`)}` : dim("none"),
      ]),
    ]),
  );
  console.log(`\n  out          ${mint(amount(q.amountOut, q.output))}`);
  console.log(`  min out      ${amount(min, q.output)} ${dim(`at ${opts.slippage ?? 50} bps`)}`);
  if (separate) console.log(`  vs ${route.hops.length} trades  ${mint("+" + amount(q.amountOut - separate.amountOut, q.output))} ${dim("kept by charging fees once per route")}`);
  if (q.multiHop) {
    console.log(`  accounts     ${q.accounts} ${dim(`(16 fixed + 5 × ${route.hops.length})`)}${q.legacy ? "" : red("  needs an address lookup table")}`);
    console.log(`  compute      ~${q.computeUnits.toLocaleString()} CU ${dim("incl. first-trade volume accumulator")}`);
    console.log(`  data         ${dim(Buffer.from(multiHopSwapData(q.amountIn, min)).toString("hex"))}`);
  } else {
    console.log(`  ${dim("outside venue: a plain swap there, not multi_hop_swap")}`);
  }
}

function accounts(path, opts) {
  const route = resolveRoute(path, mockMarket({ seed: Number(opts.seed) }).venues());
  const list = multiHopAccounts(route, { user: opts.user ?? null });
  if (opts.json) return console.log(json(list));
  console.log(`${bold("multi_hop_swap accounts")} ${dim(path.join(" → "))}\n`);
  console.log(
    table([
      [dim("#"), dim("account"), dim("address"), dim("w"), dim("s")],
      ...list.map((a) => [a.index, a.name, a.address ?? dim(a.seeds ? `PDA [${a.seeds.join(", ")}]` : a.note ?? "you provide"), a.writable ? "w" : "", a.signer ? "s" : ""]),
    ]),
  );
}

function venues(opts) {
  const list = mockMarket({ seed: Number(opts.seed) }).venues();
  if (opts.json) return console.log(json(list));
  console.log(
    table([
      [dim("id"), dim("kind"), dim("pair"), dim("price")],
      ...list.map((v) => [v.id, v.kind, `${v.base}/${v.quote}`, `${(spotPrice(v) * 10 ** (decimals(v.base) - decimals(v.quote))).toPrecision(5)} ${v.quote}`]),
    ]),
  );
  console.log(dim("\nOffline sample market. Not chain data."));
}

function scan(opts) {
  const market = mockMarket({ seed: Number(opts.seed) });
  const ticks = Number(opts.ticks ?? 20);
  for (let n = 1; n <= ticks; n++) {
    market.tick();
    const rows = PAIRS.map((paths) => findEdge({ paths, venues: market.venues(), maxSize: toUnits("1", 9), minEdgeBps: 30 }));
    const best = rows.reduce((a, b) => (b.edgeBps > a.edgeBps ? b : a));
    const tag = best.fire ? mint(`+${best.edgeBps} bps`) : dim(`${best.edgeBps} bps`);
    console.log(`${dim(String(n).padStart(3))}  ${tag.padEnd(tty ? 22 : 12)} ${best.label}  ${dim(`size ${fromUnits(best.amountIn)} SOL`)}`);
  }
}

function init(file) {
  if (existsSync(file)) {
    console.error(red(`${file} already exists`));
    process.exit(1);
  }
  writeFileSync(file, json(TEMPLATE) + "\n");
  console.log(`${mint("wrote")} ${file}\n${dim("edit paths, sizes and limits, then:")} pillees run ${file}`);
}

async function run(file, opts) {
  const config = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : TEMPLATE;
  const capsule = defineCapsule(config);
  if (!opts.json && !existsSync(file)) console.log(dim(`${file} not found, using the template capsule\n`));
  if (!opts.json) console.log(`${bold(capsule.name)} ${dim(`· ${capsule.strategy} · max ${capsule.maxSize} SOL · limit ${capsule.dailyLimit} SOL/day · min edge ${capsule.minEdgeBps} bps · dry run`)}\n`);
  const market = mockMarket({ seed: Number(opts.seed), shock: 0.04 });
  let fills = 0;
  let profit = 0;
  for await (const e of runCapsule(capsule, { market, ticks: Number(opts.ticks ?? 40), intervalMs: Number(opts.interval ?? 0) })) {
    if (opts.json) {
      console.log(JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      continue;
    }
    const n = dim(String(e.tick).padStart(3));
    if (e.type === "fill") {
      fills++;
      profit += Number(e.profit);
      console.log(`${n}  ${mint("fill")}  ${e.route}  ${mint(`+${e.edgeBps} bps`)}  ${dim(`size ${e.size} SOL · +${e.profit} SOL · spent ${e.spent}`)}`);
    } else if (e.type === "skip") console.log(`${n}  ${dim(`skip  ${e.reason} (${e.edgeBps} bps)`)}`);
    else if (e.type === "idle") console.log(`${n}  ${dim(`idle  best ${e.edgeBps} bps`)}`);
  }
  if (!opts.json) console.log(`\n${fills} fill${fills === 1 ? "" : "s"}, ${mint(`+${profit.toFixed(6)} SOL`)} ${dim("on the sample market. Nothing was signed or sent.")}`);
}

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    in: { type: "string" },
    slippage: { type: "string" },
    user: { type: "string" },
    ticks: { type: "string" },
    interval: { type: "string" },
    seed: { type: "string", default: "7" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});
const [command, ...args] = positionals;

try {
  if (!command || opts.help || command === "help") console.log(HELP);
  else if (command === "quote") quote(args, opts);
  else if (command === "accounts") accounts(args, opts);
  else if (command === "venues") venues(opts);
  else if (command === "scan") scan(opts);
  else if (command === "init") init(args[0] ?? "capsule.json");
  else if (command === "run") await run(args[0] ?? "capsule.json", opts);
  else {
    console.error(red(`unknown command: ${command}`) + "\n\n" + HELP);
    process.exit(1);
  }
} catch (error) {
  console.error(red(error.message));
  process.exit(1);
}
