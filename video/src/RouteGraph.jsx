import { Easing, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, MONO, SANS } from "./fonts";
import { C } from "./timeline";
import { ease } from "./ui";

const W = 1020;
const H = 660;
const NODES = [
  { id: "SOL", x: 170, sub: "your currency" },
  { id: "MOSS", x: 510, sub: "pump coin" },
  { id: "PILL", x: 850, sub: "target" },
];
const NODE_Y = 270;
const R = 74;
const HOPS = ["bonding curve", "PumpSwap pool"];

function Node({ node, lit, pulse, price, f }) {
  const glow = 0.25 + lit * 0.75;
  return (
    <g transform={`translate(${node.x} ${NODE_Y})`}>
      <circle r={R + 22 + pulse * 40} fill="none" stroke={C.mint} strokeOpacity={pulse ? (1 - pulse) * 0.6 : 0} strokeWidth="3" />
      <circle r={R} fill={lit > 0.5 ? "#173225" : C.panel2} stroke={C.mint} strokeOpacity={0.3 + lit * 0.7} strokeWidth="3" style={{ filter: `drop-shadow(0 0 ${24 * glow}px rgba(74,222,128,${0.5 * glow}))` }} />
      <text y="12" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="36" fill={C.ink}>
        {node.id}
      </text>
      <text y={R + 46} textAnchor="middle" fontFamily={MONO} fontSize="19" letterSpacing="2" fill={C.dim}>
        {node.sub.toUpperCase()}
      </text>
      {price && (
        <text y={-R - 26} textAnchor="middle" fontFamily={MONO} fontSize="22" fill={C.mint} opacity={ease(f, [10, 22], [0, 1])}>
          {price}
        </text>
      )}
    </g>
  );
}

// mode "watch": quotes tick and the edge meter crosses the minimum.
// mode "swap": a single instruction carries value through every hop.
export function RouteGraph({ mode }) {
  const f = useCurrentFrame();
  const draw = mode === "watch" ? ease(f, [6, 34], [0, 1], Easing.out(Easing.cubic)) : 1;
  const packet = mode === "swap" ? ease(f, [14, 74], [0, 1], Easing.inOut(Easing.cubic)) : -1;
  const packetX = 170 + packet * 680;
  const flick = (seed, base) => (base + Math.sin(f * 0.7 + seed) * 0.000003 + Math.sin(f * 0.23 + seed * 3) * 0.000004).toFixed(6);
  const edge = mode === "watch" ? Math.round(ease(f, [30, 92], [0, 110], Easing.out(Easing.quad))) : 110;
  const meter = edge / 140;
  const cleared = edge >= 40;
  const done = mode === "swap" ? ease(f, [74, 84], [0, 1]) : 0;

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        borderRadius: 28,
        background: "linear-gradient(180deg, #131418, #0f1013)",
        border: `1px solid ${C.lineStrong}`,
        boxShadow: "0 50px 120px rgba(0,0,0,0.6), 0 0 120px rgba(74,222,128,0.1)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 36, top: 30, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3, color: C.mint }}>
          {mode === "watch" ? "QUOTING ROUTE" : "MULTI_HOP_SWAP · 1 INSTRUCTION"}
        </span>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: C.mint, opacity: 0.4 + 0.6 * Math.abs(Math.sin(f / 6)) }} />
      </div>
      <div style={{ position: "absolute", right: 36, top: 28, fontFamily: MONO, fontSize: 20, color: C.dim, letterSpacing: 2 }}>
        ALL BUYS · 2 HOPS
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[0, 1].map((i) => {
          const x1 = NODES[i].x + R;
          const x2 = NODES[i + 1].x - R;
          const p = Math.max(0, Math.min(1, draw * 2 - i));
          const passed = packet > 0 ? Math.max(0, Math.min(1, (packetX - x1) / (x2 - x1))) : 0;
          return (
            <g key={i}>
              <line x1={x1} y1={NODE_Y} x2={x2} y2={NODE_Y} stroke={C.line} strokeWidth="6" strokeLinecap="round" />
              <line x1={x1} y1={NODE_Y} x2={x1 + (x2 - x1) * p} y2={NODE_Y} stroke={C.mint} strokeOpacity="0.45" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" strokeDashoffset={-f * 1.5} />
              {passed > 0 && <line x1={x1} y1={NODE_Y} x2={x1 + (x2 - x1) * passed} y2={NODE_Y} stroke={C.mint} strokeWidth="6" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 10px rgba(134,239,172,0.9))" }} />}
              <text x={(x1 + x2) / 2} y={NODE_Y - 22} textAnchor="middle" fontFamily={MONO} fontSize="19" letterSpacing="1.5" fill={C.muted} opacity={p}>
                {HOPS[i]}
              </text>
            </g>
          );
        })}
        {NODES.map((node, i) => {
          const reached = packet >= 0 ? Math.max(0, Math.min(1, (packetX - node.x + 40) / 40)) : 0;
          const lit = mode === "watch" ? Math.min(1, draw * 3 - i * 0.6) : reached;
          const at = 14 + (i / 2) * 60;
          const pulse = mode === "swap" && f > at && f < at + 18 ? (f - at) / 18 : 0;
          const prices = mode === "watch" ? [null, flick(1, 0.000412), flick(2, 0.000447)] : [null, null, null];
          return <Node key={node.id} node={node} lit={Math.max(0, lit)} pulse={pulse} price={prices[i] && `${prices[i]} SOL`} f={f} />;
        })}
        {packet >= 0 && packet < 1 && (
          <g transform={`translate(${packetX} ${NODE_Y})`}>
            <rect x="-34" y="-17" width="68" height="34" rx="17" fill={C.mint} style={{ filter: "drop-shadow(0 0 22px rgba(134,239,172,1))" }} />
            <rect x="-34" y="-17" width="34" height="34" rx="17" fill="#eafff0" />
            <rect x="-17" y="-17" width="17" height="34" fill="#eafff0" />
          </g>
        )}
      </svg>

      {mode === "swap" && (
        <div
          style={{
            position: "absolute",
            left: 510 - 170,
            top: NODE_Y + R + 70,
            width: 340,
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 24,
            color: C.mint,
            opacity: ease(f, [38, 48], [0, 1]),
            transform: `translateY(${ease(f, [38, 48], [16, 0])}px)`,
          }}
        >
          never lands in the wallet
        </div>
      )}

      <div style={{ position: "absolute", left: 36, right: 36, bottom: 34 }}>
        {mode === "watch" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 20, color: C.muted, marginBottom: 14, letterSpacing: 1 }}>
              <span>EDGE AFTER FEES</span>
              <span style={{ color: cleared ? C.mint : C.ink, fontSize: 30, fontFamily: DISPLAY, fontWeight: 700 }}>+{edge} bps</span>
            </div>
            <div style={{ position: "relative", height: 22, borderRadius: 11, background: "#1d1f24", overflow: "visible" }}>
              <div style={{ width: `${meter * 100}%`, height: "100%", borderRadius: 11, background: cleared ? `linear-gradient(90deg, ${C.leaf}, ${C.mint})` : "#3f3f46", boxShadow: cleared ? "0 0 30px rgba(134,239,172,0.55)" : undefined }} />
              <div style={{ position: "absolute", left: `${(40 / 140) * 100}%`, top: -10, bottom: -10, width: 3, background: C.ink, opacity: 0.8 }} />
              <div style={{ position: "absolute", left: `${(40 / 140) * 100}%`, top: 34, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 18, color: C.dim, whiteSpace: "nowrap" }}>
                YOUR MIN 40
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: done, transform: `translateY(${(1 - done) * 20}px)` }}>
            <span style={{ fontFamily: MONO, fontSize: 20, color: C.muted, letterSpacing: 1 }}>ROUTE CLEARED · MIN_AMOUNT_OUT CHECKED ONCE</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: C.mint, textShadow: "0 0 30px rgba(134,239,172,0.5)" }}>
              +110 bps
            </span>
          </div>
        )}
      </div>
      {mode === "watch" && cleared && (
        <div
          style={{
            position: "absolute",
            right: 36,
            top: 74,
            padding: "10px 18px",
            borderRadius: 999,
            background: C.mint,
            color: "#05210f",
            fontFamily: MONO,
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: 2,
            transform: `scale(${interpolate(f, [43, 49, 53], [0.6, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
            opacity: ease(f, [43, 47], [0, 1]),
          }}
        >
          EDGE CLEARS
        </div>
      )}
    </div>
  );
}
