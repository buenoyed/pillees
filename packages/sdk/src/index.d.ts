export type Mint = string;
export type Side = "buy" | "sell";

export interface Fees {
  protocolBps?: number;
  creatorBps?: number;
  lpBps?: number;
}

export interface HopAccounts {
  baseMint?: string;
  quoteMint?: string;
  venue?: string;
  baseVault?: string;
  quoteVault?: string;
}

export interface Hop {
  id?: string;
  kind: "pool" | "curve" | "external";
  base: Mint;
  quote: Mint;
  baseReserve: bigint;
  quoteReserve: bigint;
  fees?: Fees;
  mayhem?: boolean;
  accounts?: HopAccounts;
}

export interface Route {
  input: Mint;
  output?: Mint;
  hops: Hop[];
}

export interface RouteIssue {
  code: number;
  name: string;
  hop: number | null;
  message: string;
}

export interface Plan {
  ok: boolean;
  errors: RouteIssue[];
  side: Side | null;
  steps: { index: number; kind: Hop["kind"]; side: Side | null; mintIn: Mint; mintOut: Mint | null }[];
  path: Mint[];
  output: Mint;
  multiHop: boolean;
  accounts: number;
  legacy: boolean;
  computeUnits: number;
}

export interface QuoteStep {
  index: number;
  side: Side;
  mintIn: Mint;
  mintOut: Mint;
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  feeMint: Mint;
  fees: Partial<Record<"protocol" | "creator" | "lp", bigint>>;
  after: { baseReserve: bigint; quoteReserve: bigint };
}

export interface Quote extends Omit<Plan, "steps"> {
  amountIn: bigint;
  amountOut: bigint;
  steps: QuoteStep[];
  feesByMint: Record<Mint, bigint>;
}

export class RouteError extends Error {
  errors: RouteIssue[];
}

export const PROGRAMS: Record<"pumpAmm" | "pump" | "token" | "token2022" | "system", string>;
export const ADDRESSES: Record<"globalConfig" | "feeConfig" | "pumpGlobal" | "pumpFeeConfig" | "pumpEventAuthority", string>;
export const WSOL_MINT: string;
export const MULTI_HOP_SWAP_DISCRIMINATOR: Uint8Array;
export const FIXED_ACCOUNTS: number;
export const ACCOUNTS_PER_HOP: number;
export const MAX_LEGACY_HOPS: number;
export const ERRORS: Record<number, string>;

export function toUnits(value: string | number | bigint, decimals?: number): bigint;
export function fromUnits(units: bigint, decimals?: number, digits?: number): string;
export function sol(value: string | number): bigint;

export function planRoute(route: Route): Plan;
export function quoteRoute(route: Route, amountIn: bigint, options?: { perHopFees?: boolean }): Quote;
export function quoteSeparateTrades(route: Route, amountIn: bigint): Quote;
export function minAmountOut(amountOut: bigint, slippageBps: number): bigint;
export function applyQuote(route: Route, quote: Quote): Route;
export function resolveRoute(path: Mint[], venues: Hop[]): Route;
export function spotPrice(hop: Hop): number;
export function computeUnits(hops: number, options?: { newUser?: boolean }): number;

export interface AccountMeta {
  index: number;
  name: string;
  address: string | null;
  writable: boolean;
  signer: boolean;
  seeds?: string[];
  program?: string;
  note?: string;
}
export function multiHopAccounts(
  route: Route,
  keys?: { user?: string; userIn?: string; userOut?: string; buybackFeeRecipient?: string; userVolumeAccumulator?: string; eventAuthority?: string },
): AccountMeta[];
export function multiHopSwapData(amountIn: bigint, minAmountOut: bigint): Uint8Array;

export interface Trip {
  amountIn: bigint;
  amountOut: bigint;
  profit: bigint;
  edgeBps: number;
  legs: [Quote, Quote];
  buy: Route;
  sell: Route;
  label: string;
  fire: boolean;
}
export function roundTrip(args: { buy: Route; sell: Route; amountIn: bigint }): Omit<Trip, "buy" | "sell" | "label" | "fire">;
export function sizeLadder(max: bigint, steps?: number): bigint[];
export function findEdge(args: { paths: [Mint[], Mint[]]; venues: Hop[]; maxSize: bigint; steps?: number; minEdgeBps?: number }): Trip;

export interface Market {
  venues(): Hop[];
  tick(): void;
  apply?(fills: { route: Route; quote: Quote }[]): void;
}
export const SAMPLE_FEES: Record<"pool" | "curve" | "external", Fees>;
export function mockMarket(options?: { seed?: number; shock?: number; drift?: number }): Required<Market>;

export interface CapsuleConfig {
  name?: string;
  strategy?: "spread";
  wallet?: string | null;
  paths: [Mint[], Mint[]];
  maxSize?: string;
  dailyLimit?: string;
  minEdgeBps?: number;
  slippageBps?: number;
  cooldownTicks?: number;
}
export type Capsule = Required<CapsuleConfig> & { maxSizeUnits: bigint; dailyLimitUnits: bigint };
export interface LegPlan {
  route: Route;
  quote: Quote;
  amountIn: bigint;
  minAmountOut: bigint;
  multiHop: boolean;
  data: Uint8Array | null;
  accounts: AccountMeta[] | null;
}
export interface Executor {
  execute(plan: { capsule: string; legs: LegPlan[] }): Promise<{ dryRun?: boolean; [key: string]: unknown }>;
}
export interface CapsuleEvent {
  type: "idle" | "skip" | "edge" | "fill";
  tick: number;
  route: string;
  edgeBps: number;
  size: string;
  profit: string;
  reason?: string;
  spent?: string;
  result?: unknown;
}
export const STRATEGIES: string[];
export function defineCapsule(config: CapsuleConfig): Capsule;
export function planTrip(capsule: Capsule, trip: Trip): LegPlan[];
export function dryRunExecutor(): Executor & { sent: { capsule: string; legs: LegPlan[] }[] };
export function runCapsule(capsule: Capsule, options: { market: Market; executor?: Executor; ticks?: number; intervalMs?: number }): AsyncGenerator<CapsuleEvent>;
