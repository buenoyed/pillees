const TTL = 60_000;
const cache = new Map();

// Market cap and price per mint from DexScreener, cached for a minute. Missing data is fine.
export async function marketData(mints) {
  const now = Date.now();
  const stale = mints.filter((m) => !(cache.get(m)?.at > now - TTL));
  for (let i = 0; i < stale.length; i += 30) {
    const batch = stale.slice(i, i + 30);
    try {
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${batch.join(",")}`);
      const pairs = response.ok ? await response.json() : [];
      for (const mint of batch) {
        const best = pairs
          .filter((p) => p.baseToken?.address === mint)
          .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        cache.set(mint, {
          at: now,
          value: best ? { marketCap: best.marketCap ?? best.fdv ?? null, priceUsd: best.priceUsd ? Number(best.priceUsd) : null } : null,
        });
      }
    } catch {
      for (const mint of batch) cache.set(mint, { at: now - TTL / 2, value: cache.get(mint)?.value ?? null });
    }
  }
  return Object.fromEntries(mints.map((m) => [m, cache.get(m)?.value ?? null]));
}
