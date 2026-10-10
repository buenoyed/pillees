import { loadFont } from "@remotion/google-fonts/PixelifySans";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const PIXEL = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const INK = "#2a2340";
export const LAVENDER = "#ecebf5";

export const ease = (f, [a, b], [from, to], easing) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export function usePop(delay, config = { damping: 11, stiffness: 180, mass: 0.6 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

// Speech bubble anchored at its tail tip (x, y). Text types in.
export function Bubble({ x, y, text, at, until, side = "left", size = 44 }) {
  const f = useCurrentFrame();
  const p = usePop(at);
  if (f < at || f >= until) return null;
  const shown = text.slice(0, Math.max(1, Math.floor((f - at) * 1.6)));
  const out = ease(f, [until - 4, until], [0, 1]);
  const tail = 46;
  const edge = side === "left" ? "left" : "right";
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div
        style={{
          position: "absolute",
          bottom: 22,
          [edge]: -(tail + 16),
          transform: `scale(${(0.4 + 0.6 * p) * (1 - out * 0.3)})`,
          transformOrigin: side === "left" ? `${tail + 16}px 100%` : `calc(100% - ${tail + 16}px) 100%`,
          opacity: Math.min(1, p * 2) * (1 - out),
          padding: "14px 28px 18px",
          background: "#fff",
          border: `5px solid ${INK}`,
          borderRadius: 22,
          fontFamily: PIXEL,
          fontWeight: 500,
          fontSize: size,
          color: INK,
          whiteSpace: "nowrap",
          boxShadow: "0 8px 0 rgba(42,35,64,0.12)",
        }}
      >
        <span>{shown}</span>
        <span style={{ visibility: "hidden" }}>{text.slice(shown.length)}</span>
        <div
          style={{
            position: "absolute",
            bottom: -27,
            [edge]: tail - 5,
            width: 0,
            height: 0,
            borderLeft: "16px solid transparent",
            borderRight: "16px solid transparent",
            borderTop: `22px solid ${INK}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -15,
            [edge]: tail + 2,
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: "14px solid #fff",
          }}
        />
      </div>
    </div>
  );
}

export function Caption({ text, at = 6, y = 930, size = 84, color = INK }) {
  const f = useCurrentFrame();
  const p = usePop(at, { damping: 13, stiffness: 160, mass: 0.6 });
  const shown = text.slice(0, Math.max(0, Math.floor((f - at) * 2.2)));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        transform: `translateY(-50%) translateY(${(1 - p) * 24}px)`,
        textAlign: "center",
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.01em",
        color,
        opacity: f >= at ? 1 : 0,
      }}
    >
      {shown}
      <span style={{ visibility: "hidden" }}>{text.slice(shown.length)}</span>
    </div>
  );
}

export function Tag({ children }) {
  const p = usePop(2);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 64,
        padding: "10px 24px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.6)",
        border: `4px solid ${INK}`,
        fontFamily: PIXEL,
        fontWeight: 600,
        fontSize: 32,
        color: INK,
        transform: `scale(${0.6 + 0.4 * p})`,
        transformOrigin: "0 50%",
        opacity: Math.min(1, p * 2),
      }}
    >
      {children}
    </div>
  );
}

export function Card({ color, children }) {
  const f = useCurrentFrame();
  const s = ease(f, [0, 6], [1.07, 1]);
  return (
    <AbsoluteFill style={{ background: color, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Tile({ label, x, y, size = 170, lit = 0, style }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y,
        width: size,
        height: size,
        borderRadius: size * 0.16,
        border: `6px solid ${INK}`,
        background: lit > 0.5 ? "#9be7b4" : "#fff",
        boxShadow: `0 ${size * 0.08}px 0 ${INK}`,
        display: "grid",
        placeItems: "center",
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: size * 0.34,
        color: INK,
        ...style,
      }}
    >
      {label}
    </div>
  );
}
