import { ADDRESSES, MULTI_HOP_SWAP_DISCRIMINATOR, PROGRAMS } from "./constants.js";
import { planRoute, RouteError } from "./route.js";

const HOP_SLOTS = {
  pool: ["pool.base_mint", "pool.quote_mint", "pool", "pool.pool_base_token_account", "pool.pool_quote_token_account"],
  curve: ["base_mint", "bonding_curve.quote_mint", "bonding_curve", "bonding_curve base ATA", "bonding_curve quote ATA"],
};
const HOP_KEYS = ["baseMint", "quoteMint", "venue", "baseVault", "quoteVault"];

/**
 * The account list for multi_hop_swap: 16 fixed accounts, then 5 per hop in route order.
 * Addresses you do not pass (user token accounts, PDAs you have not derived) come back as
 * null with the seeds needed to derive them.
 */
export function multiHopAccounts(route, { user = null, userIn = null, userOut = null, buybackFeeRecipient = null, userVolumeAccumulator = null, eventAuthority = null } = {}) {
  const plan = planRoute(route);
  if (!plan.ok) throw new RouteError(plan.errors);
  if (!plan.multiHop) throw new RouteError([{ code: 0, name: "InvalidRoute", hop: 0, message: "outside venues are not multi_hop_swap hops" }]);
  const fixed = [
    { name: "user", address: user, writable: true, signer: true },
    { name: "user_in_token_account", address: userIn, writable: true, note: `token account for ${route.input}` },
    { name: "user_out_token_account", address: userOut, writable: true, note: `token account for ${plan.output}` },
    { name: "global_config", address: ADDRESSES.globalConfig },
    { name: "fee_config", address: ADDRESSES.feeConfig },
    { name: "user_volume_accumulator", address: userVolumeAccumulator, writable: true, seeds: ["user_volume_accumulator", "user"], program: PROGRAMS.pumpAmm },
    { name: "buyback_fee_recipient", address: buybackFeeRecipient, writable: true, note: "a buyback fee recipient's ATA for the user-side quote mint" },
    { name: "token_program", address: PROGRAMS.token },
    { name: "token_2022_program", address: PROGRAMS.token2022 },
    { name: "system_program", address: PROGRAMS.system },
    { name: "event_authority", address: eventAuthority, seeds: ["__event_authority"], program: PROGRAMS.pumpAmm },
    { name: "program", address: PROGRAMS.pumpAmm },
    { name: "pump_program", address: PROGRAMS.pump },
    { name: "pump_global", address: ADDRESSES.pumpGlobal },
    { name: "pump_fee_config", address: ADDRESSES.pumpFeeConfig },
    { name: "pump_event_authority", address: ADDRESSES.pumpEventAuthority },
  ];
  const remaining = route.hops.flatMap((hop, h) =>
    HOP_SLOTS[hop.kind].map((name, slot) => ({
      name: `hop ${h + 1} ${name}`,
      address: hop.accounts?.[HOP_KEYS[slot]] ?? null,
      writable: slot >= 2,
      note: slot === 0 ? hop.base : slot === 1 ? hop.quote : undefined,
    })),
  );
  return [...fixed, ...remaining].map((a, i) => ({ index: i + 1, writable: false, signer: false, ...a }));
}

const u64 = (value) => {
  const out = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
};

// Instruction data: discriminator, then amount_in and min_amount_out as little-endian u64.
export function multiHopSwapData(amountIn, minAmountOut) {
  if (amountIn <= 0n || minAmountOut <= 0n) throw new RangeError("amount_in and min_amount_out must be greater than 0");
  const data = new Uint8Array(24);
  data.set(MULTI_HOP_SWAP_DISCRIMINATOR, 0);
  data.set(u64(amountIn), 8);
  data.set(u64(minAmountOut), 16);
  return data;
}
