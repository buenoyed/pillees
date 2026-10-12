import { DISPLAY, MONO, SANS } from "./fonts";
import { C } from "./timeline";
import { EXPO, INOUT, ease, useT } from "./ui";

const W = 1000;
const H = 640;
const NODES = [
  { id: "SOL", x: 160, sub: "you pay" },
  { id: "PUMP", x: 500, sub: "pump coin" },
  { id: "COIN", x: 840, sub: "paired with PUMP" },
];
const NODE_Y = 230;
const R = 70;

function Node({ node, lit, pulse }) {
  return (
    <g transform={`translate(${node.x} ${NODE_Y})`}>
      <circle r={R + 18 + pulse * 46} fill="none" stroke={C.mint} strokeOpacity={pulse ? (1 - pulse) * 0.55 : 0} strokeWidth="3" />
      <circle
        r={R}
        fill={lit > 0.5 ? "#173225" : C.panel2}
        stroke={C.mint}
        strokeOpacity={0.25 + lit * 0.75}
        strokeWidth="3"
        style={{ filter: `drop-shadow(0 0 ${8 + 22 * lit}px rgba(74,222,128,${0.15 + 0.45 * lit}))` }}
      />
      <text y="12" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="34" fill={C.ink}>
        {node.id}
      </text>
      <text y={R + 44} textAnchor="middle" fontFamily={MONO} fontSize="18" letterSpacing="2" fill={C.dim}>
        {node.sub.toUpperCase()}
      </text>
    </g>
  );
}

function Compare({ t }) {
  const p = ease(t, [72, 92], [0, 1], EXPO);
  const strike = ease(t, [84, 100], [0, 1], INOUT);
  const row = (label, value, good) => (
    <div style={{ flex: 1, padding: "18px 22px", borderRadius: 18, border: `1px solid ${good ? "rgba(134,239,172,0.45)" : C.line}`, background: good ? "rgba(22,48,36,0.6)" : "#121317" }}>
      <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: good ? C.mint : C.dim }}>{label}</div>
      <div style={{ position: "relative", display: "inline-block", fontFamily: SANS, fontWeight: 600, fontSize: 28, color: good ? C.ink : C.muted, marginTop: 8 }}>
        {value}
        {!good && <span style={{ position: "absolute", left: 0, top: "52%", height: 3, width: `${strike * 100}%`, background: C.down, borderRadius: 2 }} />}
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, display: "flex", gap: 18, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
      {row("TWO SEPARATE TRADES", "Fees on every hop", false)}
      {row("MULTI_HOP_SWAP", "Fees once per route", true)}
    </div>
  );
}

export function RouteGraph() {
  const t = useT();
  const draw = ease(t, [0, 26], [0, 1], EXPO);
  const packet = ease(t, [20, 70], [0, 1], INOUT);
  const packetX = NODES[0].x + packet * (NODES[2].x - NODES[0].x);
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
      <div style={{ position: "absolute", left: 34, top: 28, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: 3, color: C.mint }}>MULTI_HOP_SWAP · 1 INSTRUCTION</span>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: C.mint, opacity: 0.45 + 0.55 * Math.abs(Math.sin(t / 9)) }} />
      </div>
      <div style={{ position: "absolute", right: 34, top: 28, fontFamily: MONO, fontSize: 19, color: C.dim, letterSpacing: 2 }}>2 PUMPSWAP POOLS</div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[0, 1].map((i) => {
          const x1 = NODES[i].x + R;
          const x2 = NODES[i + 1].x - R;
          const p = Math.max(0, Math.min(1, draw * 2 - i));
          const passed = Math.max(0, Math.min(1, (packetX - x1) / (x2 - x1)));
          return (
            <g key={i}>
              <line x1={x1} y1={NODE_Y} x2={x2} y2={NODE_Y} stroke={C.line} strokeWidth="6" strokeLinecap="round" />
              <line x1={x1} y1={NODE_Y} x2={x1 + (x2 - x1) * p} y2={NODE_Y} stroke={C.mint} strokeOpacity="0.4" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" strokeDashoffset={-t * 1.2} />
              {passed > 0 && <line x1={x1} y1={NODE_Y} x2={x1 + (x2 - x1) * passed} y2={NODE_Y} stroke={C.mint} strokeWidth="6" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 10px rgba(134,239,172,0.9))" }} />}
              <text x={(x1 + x2) / 2} y={NODE_Y - 22} textAnchor="middle" fontFamily={MONO} fontSize="18" letterSpacing="1.5" fill={C.muted} opacity={p}>
                PUMPSWAP POOL
              </text>
            </g>
          );
        })}
        {NODES.map((node, i) => {
          const reached = Math.max(0, Math.min(1, (packetX - node.x + 50) / 50));
          const at = 20 + (i / 2) * 50;
          const pulse = t > at && t < at + 22 ? ease(t, [at, at + 22], [0, 1], EXPO) : 0;
          return <Node key={node.id} node={node} lit={Math.max(Math.min(1, draw * 3 - i) * 0.35, reached)} pulse={pulse} />;
        })}
        {packet > 0 && packet < 1 && (
          <g transform={`translate(${packetX} ${NODE_Y})`}>
            <circle r="16" fill={C.mint} style={{ filter: "drop-shadow(0 0 18px rgba(134,239,172,1))" }} />
            <circle r="7" fill="#eafff0" />
          </g>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 500 - 200,
          top: NODE_Y + R + 66,
          width: 400,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 23,
          color: C.mint,
          opacity: ease(t, [44, 56], [0, 1]),
        }}
      >
        PUMP never lands in your wallet
      </div>
      <Compare t={t} />
    </div>
  );
}
