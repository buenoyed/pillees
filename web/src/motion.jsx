import { useEffect, useRef, useState } from "react";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = (t) => 1 - Math.pow(1 - t, 3);

// Counts from the last shown value to the new one, so live refreshes glide instead of jumping.
export function Count({ value, format = (n) => n.toFixed(0), duration = 700 }) {
  const [shown, setShown] = useState(reduced() ? value : 0);
  const from = useRef(shown);

  useEffect(() => {
    if (reduced()) return setShown(value);
    const start = performance.now();
    const begin = from.current;
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = begin + (value - begin) * ease(t);
      from.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return format(shown);
}
