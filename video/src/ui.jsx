import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO, SANS } from "./fonts";
import { C, PAD } from "./timeline";

export const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);

// Scene-local frame. Scenes start PAD frames early so they can crossfade.
export const useT = () => useCurrentFrame() - PAD;

export const ease = (frame, [a, b], [from, to], easing) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export function usePop(delay = 0, config = { damping: 16, stiffness: 120, mass: 0.7 }) {
  const frame = useT();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

// Words rise in one by one, unblurring as they land.
export function Words({ text, start = 0, stagger = 3, size = 120, weight = 700, color = C.ink, accent = [], style, font = DISPLAY, lineHeight = 1.02, align = "center", out }) {
  const frame = useT();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const leave = out ? ease(frame, out, [0, 1]) : 0;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        letterSpacing: "-0.035em",
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: "0.24em",
        opacity: 1 - leave,
        transform: `translateY(${-leave * 40}px)`,
        filter: leave ? `blur(${leave * 10}px)` : undefined,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const p = spring({ frame: frame - start - i * stagger, fps, config: { damping: 20, stiffness: 120, mass: 0.8 } });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: Math.min(1, p * 1.4),
              transform: `translateY(${(1 - p) * 0.55}em)`,
              filter: `blur(${(1 - Math.min(1, p)) * 8}px)`,
              color: accent.includes(i) ? C.mint : undefined,
              textShadow: accent.includes(i) ? `0 0 40px rgba(134,239,172,0.45)` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export function Label({ children, color = C.mint, size = 22, style }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Body({ children, size = 30, style }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: size, lineHeight: 1.45, color: C.muted, ...style }}>{children}</div>
  );
}

export function Backdrop({ glow = [0.5, 0.45], intensity = 1, grid = true }) {
  const frame = useCurrentFrame();
  const drift = frame * 0.35;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 50% at ${glow[0] * 100}% ${glow[1] * 100}%, rgba(74,222,128,${0.13 * intensity}), transparent 70%),
            radial-gradient(ellipse 40% 35% at ${100 - glow[0] * 70}% ${100 - glow[1] * 60}%, rgba(134,239,172,${0.05 * intensity}), transparent 70%)`,
        }}
      />
      {grid && (
        <AbsoluteFill
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.6px)",
            backgroundSize: "36px 36px",
            backgroundPosition: `${drift}px ${drift * 0.6}px`,
            maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black, transparent)",
          }}
        />
      )}
    </AbsoluteFill>
  );
}

export function Grain() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.12 }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={3} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

export function Vignette({ strength = 0.7 }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,${strength}))`,
      }}
    />
  );
}

// Dark browser window showing a site capture. scroll is in rendered pixels.
export function Browser({ src, width, scroll = 0, zoom = 1, origin = "50% 50%", url = "pillees.fun", style, children, glow = 1 }) {
  const height = width / 1.6;
  const bar = Math.round(width * 0.034);
  return (
    <div
      style={{
        position: "relative",
        width,
        height: height + bar,
        borderRadius: width * 0.014,
        overflow: "hidden",
        background: "#0d0e11",
        border: `1px solid ${C.lineStrong}`,
        boxShadow: `0 50px 120px rgba(0,0,0,0.65), 0 0 ${120 * glow}px rgba(74,222,128,${0.16 * glow})`,
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          display: "flex",
          alignItems: "center",
          gap: bar * 0.22,
          padding: `0 ${bar * 0.45}px`,
          background: "#121317",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {["#3f3f46", "#3f3f46", "#3f3f46"].map((c, i) => (
          <span key={i} style={{ width: bar * 0.26, height: bar * 0.26, borderRadius: "50%", background: c }} />
        ))}
        <span
          style={{
            marginLeft: bar * 0.4,
            display: "flex",
            alignItems: "center",
            gap: bar * 0.2,
            padding: `${bar * 0.12}px ${bar * 0.4}px`,
            borderRadius: bar,
            background: "#1a1b20",
            fontFamily: SANS,
            fontSize: bar * 0.36,
            color: C.muted,
          }}
        >
          <Img src={staticFile("pillee.png")} style={{ height: bar * 0.42 }} />
          {url}
        </span>
      </div>
      <div style={{ position: "relative", height, overflow: "hidden" }}>
        <Img src={staticFile(`shots/${src}.png`)} style={{ width, display: "block", transform: `translateY(${-scroll}px) scale(${zoom})`, transformOrigin: origin }} />
        {children}
      </div>
    </div>
  );
}

// Arrow cursor gliding through points [frame, x, y]; clicks ripple at the given frames.
export function Cursor({ path, clicks = [], scale = 1 }) {
  const t = useT();
  if (t < path[0][0]) return null;
  let x = path[0][1];
  let y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [f0, x0, y0] = path[i - 1];
    const [f1, x1, y1] = path[i];
    if (t >= f0) {
      const p = ease(t, [f0, f1], [0, 1], INOUT);
      x = x0 + (x1 - x0) * p;
      y = y0 + (y1 - y0) * p;
    }
  }
  const press = Math.max(0, ...clicks.map((c) => interpolate(t, [c - 3, c, c + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const appear = ease(t, [path[0][0], path[0][0] + 8], [0, 1]);
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", opacity: appear, zIndex: 50 }}>
      {clicks.map((c) => {
        const r = ease(t, [c, c + 18], [0, 1], EXPO);
        if (t < c || t > c + 18) return null;
        return <span key={c} style={{ position: "absolute", left: -30 * scale * r, top: -30 * scale * r, width: 60 * scale * r, height: 60 * scale * r, borderRadius: "50%", border: `3px solid ${C.mint}`, opacity: 1 - r }} />;
      })}
      <svg width={34 * scale} height={40 * scale} viewBox="0 0 34 40" style={{ transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
        <path d="M2 2 L2 32 L10 25 L16 38 L22 35 L16 23 L27 23 Z" fill="#fff" stroke="#0b0c0e" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Chip({ children, delay = 0, style, tone = "mint" }) {
  const p = usePop(delay, { damping: 17, stiffness: 140, mass: 0.7 });
  const mint = tone === "mint";
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 26px 16px 18px",
        borderRadius: 999,
        background: mint ? "rgba(22,48,36,0.92)" : "rgba(20,21,24,0.94)",
        border: `1px solid ${mint ? "rgba(134,239,172,0.45)" : C.lineStrong}`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.5)${mint ? ", 0 0 40px rgba(74,222,128,0.18)" : ""}`,
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 28,
        color: C.ink,
        opacity: Math.min(1, p * 1.5),
        transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 30}px)`,
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      <span style={{ width: 14, height: 14, background: C.mint, boxShadow: `0 0 14px ${C.mint}` }} />
      {children}
    </div>
  );
}

export function Flash({ at, length = 10, color = "#eafff0" }) {
  const frame = useT();
  const o = interpolate(frame, [at - 2, at, at + length], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o * 0.85, mixBlendMode: "screen" }} />;
}
