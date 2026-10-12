export const SOL_DECIMALS = 9;
export const TOKEN_DECIMALS = 6;

// Parse a decimal string or number into base units as a bigint.
export function toUnits(value, decimals = SOL_DECIMALS) {
  const text = typeof value === "bigint" ? value.toString() : String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`not a positive amount: ${value}`);
  const [whole, frac = ""] = text.split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export function fromUnits(units, decimals = SOL_DECIMALS, digits = 6) {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").slice(0, digits).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

export const sol = (value) => toUnits(value, SOL_DECIMALS);
