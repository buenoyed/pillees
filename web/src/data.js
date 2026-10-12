const env = import.meta.env;
const clean = (value) => (value || "").trim();

export const COIN = {
  name: clean(env.VITE_COIN_NAME) || "Pillees",
  ticker: clean(env.VITE_COIN_TICKER) || "PILLEES",
  ca: clean(env.VITE_COIN_CA),
};
COIN.pump = COIN.ca ? `https://pump.fun/coin/${COIN.ca}` : "";
COIN.chart = COIN.ca ? `https://dexscreener.com/solana/${COIN.ca}` : "";

export const SOCIALS = [
  { id: "x", label: "X", url: clean(env.VITE_X_URL) },
  { id: "telegram", label: "Telegram", url: clean(env.VITE_TELEGRAM_URL) },
  { id: "discord", label: "Discord", url: clean(env.VITE_DISCORD_URL) },
  { id: "github", label: "GitHub", url: clean(env.VITE_GITHUB_URL) || "https://github.com/buenoyed/pillees" },
].filter((item) => item.url);

export const DOCS = {
  repo: "https://github.com/pump-fun/pump-public-docs",
  pillees: clean(env.VITE_GITHUB_URL) || "https://github.com/buenoyed/pillees",
  multiHop:
    "https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/MULTI_HOP_SWAP.md",
  pumpSdk: "https://www.npmjs.com/package/@pump-fun/pump-sdk/v/4.0.0",
  swapSdk: "https://www.npmjs.com/package/@pump-fun/pump-swap-sdk/v/2.1.0",
  rustSdk: "https://crates.io/crates/pump-rust-client/0.4.0",
};
