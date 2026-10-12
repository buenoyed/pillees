import bs58 from "bs58";
import nacl from "tweetnacl";

const MAX_AGE_MS = 5 * 60 * 1000;
const used = new Map();

// Must match web/src/wallet.jsx.
export function authMessage(action, target, fields, time) {
  return `Pillees\n${action} ${target}\n${JSON.stringify(fields)}\n${time}`;
}

export class AuthError extends Error {
  status = 401;
}

// Proves the request was signed by `wallet` just now, for exactly these fields.
export function verify({ wallet, signature, time }, action, target, fields) {
  if (!wallet || !signature || !time) throw new AuthError("Sign the request with your wallet.");
  const age = Date.now() - Number(time);
  if (!(age >= -30_000 && age <= MAX_AGE_MS)) throw new AuthError("Signature expired. Try again.");
  if (used.has(signature)) throw new AuthError("Signature already used.");
  let key;
  let sig;
  try {
    key = bs58.decode(wallet);
    sig = Buffer.from(signature, "base64");
  } catch {
    throw new AuthError("Bad wallet or signature.");
  }
  const message = new TextEncoder().encode(authMessage(action, target, fields, time));
  if (key.length !== 32 || !nacl.sign.detached.verify(message, sig, key)) throw new AuthError("Signature does not match this wallet.");
  used.set(signature, Date.now());
  for (const [s, at] of used) if (Date.now() - at > MAX_AGE_MS * 2) used.delete(s);
  return wallet;
}
