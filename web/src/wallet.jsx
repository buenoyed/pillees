import { createContext, useCallback, useContext, useEffect, useState } from "react";

const WalletContext = createContext(null);
const provider = () => window.phantom?.solana ?? window.solflare ?? window.solana ?? null;

// Must match server/src/auth.js.
export function authMessage(action, target, fields, time) {
  return `Pillees\n${action} ${target}\n${JSON.stringify(fields)}\n${time}`;
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);

  useEffect(() => {
    const p = provider();
    if (!p) return undefined;
    p.connect?.({ onlyIfTrusted: true }).then((r) => setAddress((r?.publicKey ?? p.publicKey)?.toString() ?? null)).catch(() => {});
    const onChange = (key) => setAddress(key ? key.toString() : null);
    const onDisconnect = () => setAddress(null);
    p.on?.("accountChanged", onChange);
    p.on?.("disconnect", onDisconnect);
    return () => {
      p.off?.("accountChanged", onChange);
      p.off?.("disconnect", onDisconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    const p = provider();
    if (!p) {
      window.open("https://phantom.app/", "_blank", "noreferrer");
      throw new Error("Install Phantom or Solflare to connect.");
    }
    const result = await p.connect();
    const key = (result?.publicKey ?? p.publicKey)?.toString();
    setAddress(key);
    return key;
  }, []);

  const disconnect = useCallback(async () => {
    await provider()?.disconnect?.();
    setAddress(null);
  }, []);

  // Signs exactly what the server will check, so a signature only works for this one request.
  const sign = useCallback(
    async (action, target, fields) => {
      const wallet = address ?? (await connect());
      const time = Date.now();
      const message = new TextEncoder().encode(authMessage(action, target, fields, time));
      const result = await provider().signMessage(message, "utf8");
      const signature = result?.signature ?? result;
      return { wallet, signature: toBase64(new Uint8Array(signature)), time };
    },
    [address, connect],
  );

  return <WalletContext.Provider value={{ address, connect, disconnect, sign }}>{children}</WalletContext.Provider>;
}

export const useWallet = () => useContext(WalletContext);

export const short = (address) => (address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "");

export function ConnectButton({ className = "btn btn-ghost" }) {
  const { address, connect, disconnect } = useWallet();
  const [error, setError] = useState("");
  if (address) {
    return (
      <button type="button" className={`${className} wallet-on`} onClick={disconnect} title="Disconnect">
        <i aria-hidden="true" />
        {short(address)}
      </button>
    );
  }
  return (
    <button type="button" className={className} onClick={() => connect().catch((e) => setError(e.message))} title={error || undefined}>
      Connect wallet
    </button>
  );
}
