// Addresses and limits from pump-fun/pump-public-docs (docs/instructions/MULTI_HOP_SWAP.md, idl/pump_amm.json).

export const PROGRAMS = {
  pumpAmm: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  pump: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  token2022: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  system: "11111111111111111111111111111111",
};

export const ADDRESSES = {
  globalConfig: "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw",
  feeConfig: "5PHirr8joyTMp9JMm6nW7hNDVyEYdkzDqazxPD7RaTjx",
  pumpGlobal: "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf",
  pumpFeeConfig: "8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt",
  pumpEventAuthority: "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1",
};

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

// Anchor discriminator of PumpSwap `multi_hop_swap`.
export const MULTI_HOP_SWAP_DISCRIMINATOR = Uint8Array.from([43, 100, 73, 19, 233, 246, 111, 148]);

export const FIXED_ACCOUNTS = 16;
export const ACCOUNTS_PER_HOP = 5;
export const MAX_LEGACY_HOPS = 3;
export const COMPUTE_PER_HOP = 50_000;
export const COMPUTE_BASE = 20_000;
export const COMPUTE_VOLUME_ACCUMULATOR = 25_000;

export const ERRORS = {
  6080: "MayhemPoolNotSupported",
  6084: "MultiHopDiscontinuousPath",
  6086: "MultiHopMixedDirection",
  6108: "MultiHopMayhemCurveNotSupported",
};

export const BPS = 10_000n;
