export const DOCS = {
  repo: "https://github.com/pump-fun/pump-public-docs",
  multiHop:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/MULTI_HOP_SWAP.md",
  synthetic:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/SYNTHETIC_MIGRATION.md",
  tradeV3:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/TRADE_V3.md",
  quoteMint:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/CREATE_WITH_PUMP_COIN_QUOTE.md",
  sweeps:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/SWEEP_FEES.md",
  holderRewards:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/HOLDER_REWARDS_README.md",
  pumpSdk: "https://www.npmjs.com/package/@pump-fun/pump-sdk/v/4.0.0",
  swapSdk: "https://www.npmjs.com/package/@pump-fun/pump-swap-sdk/v/2.1.0",
  rustSdk: "https://crates.io/crates/pump-rust-client/0.4.0",
};

export const STRATEGIES = [
  {
    id: "spread",
    name: "Spread hunter",
    blurb:
      "Compares a multi-hop quote with the coins on the route. Fires when the edge clears your minimum, in one direction only.",
  },
  {
    id: "migration",
    name: "Migration watch",
    blurb:
      "Sits on curves close to complete. The last buy can run through synthetic migration, then the bot waits for the pool to open.",
  },
  {
    id: "fees",
    name: "Fee recycler",
    blurb:
      "Uses an optional coin. Creator fees can be swept back into the bot as trading inventory, or set aside for holders.",
  },
  {
    id: "custom",
    name: "Custom note",
    blurb:
      "You write the instructions. Size and daily spend still cap the capsule.",
  },
];

export const POOL_STRATEGIES = [
  {
    id: "bands",
    name: "Depth bands",
    blurb:
      "Shifts how much of the coin sits ready to trade as price walks through bands you set. Built for after the pool exists.",
  },
  {
    id: "handoff",
    name: "Migration handoff",
    blurb:
      "Watches the completing buy, CompleteEvent, and PostCompleteBuyEvent, then follows the pool that opens on the reserves that buy left behind.",
  },
  {
    id: "dampen",
    name: "Spread dampener",
    blurb:
      "When the coin’s price drifts too far from its quote coin, the strategy leans inventory back toward the band.",
  },
];

export const SEED_BOTS = [
  {
    id: "capsule",
    name: "Capsule",
    strategy: "spread",
    hops: "2–3",
    venues: "Curve then pool",
    direction: "Buys",
    note: "Takes SOL into a pump-coin quote, then into the target. Skips mayhem venues.",
    pnl: { "24H": 2.41, "7D": 6.18, "30D": 18.4 },
    fills: 46,
    hit: "61%",
  },
  {
    id: "visor",
    name: "Visor",
    strategy: "migration",
    hops: "2",
    venues: "Curve only",
    direction: "Buys",
    note: "Only joins a curve hop that can finish in synthetic migration. Stands down once the curve is complete.",
    pnl: { "24H": 1.12, "7D": 3.04, "30D": 9.7 },
    fills: 18,
    hit: "55%",
  },
  {
    id: "greencap",
    name: "Greencap",
    strategy: "fees",
    hops: "2",
    venues: "Mixed",
    direction: "Sells",
    note: "Sells back to SOL and sweeps creator fees into inventory. Holder-rewards mode is off on this capsule.",
    pnl: { "24H": -0.38, "7D": 1.05, "30D": 4.62 },
    fills: 29,
    hit: "48%",
  },
  {
    id: "twohop",
    name: "Twohop",
    strategy: "spread",
    hops: "2",
    venues: "Pool then curve",
    direction: "Buys",
    note: "Requires the first leg on a migrated pump pool so SOL moves as wrapped SOL.",
    pnl: { "24H": 0.74, "7D": 2.2, "30D": 7.15 },
    fills: 33,
    hit: "58%",
  },
  {
    id: "dose",
    name: "Dose",
    strategy: "custom",
    hops: "3",
    venues: "Mixed",
    direction: "Buys",
    note: "Three hops, legacy transaction size. Asks for a higher compute budget before it sends.",
    pnl: { "24H": 0.22, "7D": -0.4, "30D": 2.08 },
    fills: 21,
    hit: "43%",
  },
  {
    id: "mintstep",
    name: "Mintstep",
    strategy: "spread",
    hops: "2",
    venues: "Curve then curve",
    direction: "Sells",
    note: "Both legs still on bonding curves. The middle coin moves curve to curve and never lands in the wallet.",
    pnl: { "24H": 0.91, "7D": 4.4, "30D": 11.2 },
    fills: 27,
    hit: "64%",
  },
  {
    id: "lamport",
    name: "Lamport",
    strategy: "migration",
    hops: "2",
    venues: "Curve then pool",
    direction: "Buys",
    note: "Quotes the pool part of a completing buy off the reserves migration would deposit, minus the SOL migration fee.",
    pnl: { "24H": -0.16, "7D": 0.62, "30D": 3.4 },
    fills: 14,
    hit: "50%",
  },
  {
    id: "nectar",
    name: "Nectar",
    strategy: "fees",
    hops: "2",
    venues: "Pool only",
    direction: "Buys",
    note: "Optional coin is a holder-rewards coin. Creator fees are set aside for holders instead of refilling the bot.",
    pnl: { "24H": 0.48, "7D": 1.7, "30D": 5.9 },
    fills: 24,
    hit: "57%",
  },
];

export const SEED_FEED = [
  {
    id: "f1",
    kind: "route",
    bot: "Capsule",
    time: "2m",
    edge: 86,
    size: "1.20 SOL",
    hops: [
      { mint: "SOL", via: null },
      { mint: "MOSS", via: "curve" },
      { mint: "PILL", via: "pool" },
    ],
    text: "All buys. Protocol fee on the SOL hop, creator fee on PILL. MOSS stays inside the route.",
  },
  {
    id: "f2",
    kind: "fill",
    bot: "Mintstep",
    time: "9m",
    edge: 41,
    size: "0.80 SOL",
    hops: [
      { mint: "VIAL", via: null },
      { mint: "MOSS", via: "curve" },
      { mint: "SOL", via: "curve" },
    ],
    text: "Sell route. Native SOL out on the last curve hop. Wrapped SOL account is present and unused for the transfer.",
  },
  {
    id: "f3",
    kind: "note",
    bot: "Visor",
    time: "14m",
    edge: null,
    size: null,
    hops: [],
    text: "DRIP has 4% of the curve left. Standing by. A buy past what is left can complete the curve and price the rest on the reserves the pool would open with. After that, the curve is closed until migration.",
  },
  {
    id: "f4",
    kind: "route",
    bot: "Twohop",
    time: "21m",
    edge: 63,
    size: "2.00 SOL",
    hops: [
      { mint: "SOL", via: null },
      { mint: "ZEST", via: "pool" },
      { mint: "CAPS", via: "curve" },
    ],
    text: "ZEST already migrated, so the SOL leg is wrapped SOL into the pump pool. CAPS is still on its curve, quoted in ZEST.",
  },
  {
    id: "f5",
    kind: "fill",
    bot: "Greencap",
    time: "28m",
    edge: -12,
    size: "0.45 SOL",
    hops: [
      { mint: "PILL", via: null },
      { mint: "MOSS", via: "pool" },
      { mint: "SOL", via: "pool" },
    ],
    text: "Filled through the minimum. Edge flipped while the quote was live. Counted as a loss on this preview tape.",
  },
  {
    id: "f6",
    kind: "note",
    bot: "Dose",
    time: "36m",
    edge: null,
    size: null,
    hops: [],
    text: "Passed on a four-hop path. Two and three hops fit a legacy transaction. Four or more need a v0 transaction and an address lookup table.",
  },
  {
    id: "f7",
    kind: "route",
    bot: "Lamport",
    time: "44m",
    edge: 110,
    size: "3.10 SOL",
    hops: [
      { mint: "SOL", via: null },
      { mint: "DRIP", via: "curve" },
      { mint: "PILL", via: "pool" },
    ],
    text: "DRIP hop would empty the curve. The rest of that hop’s input prices against the would-be pool. Mayhem curves cannot be a hop, and this one is not mayhem.",
  },
  {
    id: "f8",
    kind: "fill",
    bot: "Nectar",
    time: "1h",
    edge: 28,
    size: "0.60 SOL",
    hops: [
      { mint: "SOL", via: null },
      { mint: "NECT", via: "pool" },
      { mint: "CAPS", via: "pool" },
    ],
    text: "Both hops are pump pools. Holder-rewards fee on CAPS stays with holders. Middle hop charged nothing.",
  },
  {
    id: "f9",
    kind: "note",
    bot: "Capsule",
    time: "1h",
    edge: null,
    size: null,
    hops: [],
    text: "Skipped a route that bought on one hop and sold on the next. Mixed direction is rejected. Every hop in a route has to face the same way.",
  },
  {
    id: "f10",
    kind: "route",
    bot: "Mintstep",
    time: "2h",
    edge: 54,
    size: "1.50 SOL",
    hops: [
      { mint: "SOL", via: null },
      { mint: "MOSS", via: "curve" },
      { mint: "VIAL", via: "curve" },
    ],
    text: "Quote mint on VIAL is MOSS, a pump coin. That is the pair shape multi-hop is for: SOL, then the quote coin, then the target.",
  },
];

export const SEED_EDGES = [
  {
    id: "e1",
    path: ["SOL", "MOSS", "PILL"],
    venues: "curve · pool",
    edge: 86,
    size: 4.2,
  },
  {
    id: "e2",
    path: ["SOL", "DRIP", "PILL"],
    venues: "curve · pool",
    edge: 110,
    size: 1.1,
  },
  {
    id: "e3",
    path: ["SOL", "ZEST", "CAPS"],
    venues: "pool · curve",
    edge: 63,
    size: 6.4,
  },
  {
    id: "e4",
    path: ["SOL", "MOSS", "VIAL"],
    venues: "curve · curve",
    edge: 54,
    size: 3.3,
  },
  {
    id: "e5",
    path: ["PILL", "MOSS", "SOL"],
    venues: "pool · curve",
    edge: 41,
    size: 2.8,
  },
  {
    id: "e6",
    path: ["SOL", "NECT", "CAPS"],
    venues: "pool · pool",
    edge: 28,
    size: 8.6,
  },
  {
    id: "e7",
    path: ["SOL", "ZEST", "VIAL"],
    venues: "pool · curve",
    edge: 19,
    size: 5.1,
  },
  {
    id: "e8",
    path: ["CAPS", "ZEST", "SOL"],
    venues: "curve · pool",
    edge: 12,
    size: 1.4,
  },
];

export const SEED_WATCHES = [
  {
    id: "w1",
    name: "Pillee",
    ticker: "PILL",
    quote: "MOSS",
    strategy: "handoff",
    band: "8",
    status: "Curve open",
  },
  {
    id: "w2",
    name: "Greencap",
    ticker: "CAP",
    quote: "SOL",
    strategy: "bands",
    band: "12",
    status: "Pool live",
  },
];

export function strategyName(id) {
  return (
    STRATEGIES.find((s) => s.id === id)?.name ||
    POOL_STRATEGIES.find((s) => s.id === id)?.name ||
    id
  );
}

export function formatSol(n) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}
