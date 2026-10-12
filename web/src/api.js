import { useCallback, useEffect, useState } from "react";

export async function api(path, body) {
  const response = await fetch(`/api${path}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// Loads a GET endpoint, refreshing every `every` ms.
export function useApi(path, every = 0) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const load = useCallback(() => {
    api(path)
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((error) => setState((s) => ({ ...s, error: error.message, loading: false })));
  }, [path]);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
    if (!every) return undefined;
    const timer = setInterval(load, every);
    return () => clearInterval(timer);
  }, [load, every]);
  return { ...state, reload: load };
}

export function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error("Use a PNG, JPG, WEBP or GIF."));
    if (file.size > 400_000) return reject(new Error("Image must be under 400 KB."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export const solscan = (kind, value) => `https://solscan.io/${kind}/${value}`;

export function fmtSol(n, signed = false) {
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : abs >= 0.01 || abs === 0 ? 2 : 4;
  const text = abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (!signed) return text;
  return n > 0 ? `+${text}` : n < 0 ? `−${text}` : text;
}

export function fmtUsd(n) {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
