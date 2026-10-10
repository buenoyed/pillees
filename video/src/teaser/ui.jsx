import { loadFont } from "@remotion/google-fonts/PixelifySans";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const PIXEL = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const INK = "#2a2340";

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
