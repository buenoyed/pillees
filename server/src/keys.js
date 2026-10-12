import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Keypair } from "@solana/web3.js";

function secret() {
  const hex = process.env.BOT_KEY_SECRET || "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("BOT_KEY_SECRET must be 64 hex characters (openssl rand -hex 32)");
  return Buffer.from(hex, "hex");
}

export function checkSecret() {
  secret();
}

// AES-256-GCM, stored as iv.tag.ciphertext in base64.
export function sealKeypair(keypair) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const body = Buffer.concat([cipher.update(Buffer.from(keypair.secretKey)), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}

export function openKeypair(sealed) {
  const [iv, tag, body] = sealed.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", secret(), iv);
  decipher.setAuthTag(tag);
  return Keypair.fromSecretKey(new Uint8Array(Buffer.concat([decipher.update(body), decipher.final()])));
}
