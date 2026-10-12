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

export function WalletMenu() {
  const { address, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!event.target.closest?.(".wallet-menu")) setOpen(false);
    };
    const escape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!address) {
    return (
      <button type="button" className="wallet-btn" onClick={() => connect().catch((e) => setNote(e.message))} title={note || undefined}>
        Connect wallet
      </button>
    );
  }
  return (
    <div className="wallet-menu">
      <button type="button" className="wallet-btn on" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <i aria-hidden="true" />
        {short(address)}
      </button>
      {open && (
        <div className="wallet-pop" role="menu">
          <code>{address}</code>
          <button
            type="button"
            role="menuitem"
            onClick={() => navigator.clipboard?.writeText(address).then(() => setOpen(false))}
          >
            Copy address
          </button>
          <a role="menuitem" href={`https://solscan.io/account/${address}`} target="_blank" rel="noreferrer">
            View on Solscan
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

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
