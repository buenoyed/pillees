import { DISPLAY, MONO, SANS } from "./fonts";
import { C } from "./timeline";
import { EXPO, INOUT, ease, useT } from "./ui";

const W = 1000;
const H = 660;
const BOX_Y = 150;
const BOX_H = 170;
const BOXES = [
  { x: 34, w: 190, top: "SOL IN", main: "0.500", sub: "from the bot" },
  { x: 268, w: 220, top: "BUY ON", main: "PumpSwap", sub: "0.0004120 SOL" },
  { x: 532, w: 220, top: "SELL ON", main: "Meteora", sub: "0.0004155 SOL" },
  { x: 796, w: 170, top: "SOL OUT", main: null, sub: "to the bot" },
];
const CASES = [
  { from: 0, out: 0.5036, label: "GAP HOLDS" },
  { from: 96, out: 0.499, label: "PRICE MOVED" },
];
const FLOOR = 0.5021;
const scale = (v) => (v - 0.494) / (0.508 - 0.494);

function Box({ box, lit, children }) {
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: BOX_Y,
        width: box.w,
        height: BOX_H,
        borderRadius: 20,
        padding: "20px 20px",
        background: lit ? "rgba(22,48,36,0.75)" : "#141519",
        border: `1px solid ${lit ? "rgba(134,239,172,0.55)" : C.lineStrong}`,
        boxShadow: lit ? "0 0 40px rgba(74,222,128,0.2)" : "none",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: lit ? C.mint : C.dim }}>{box.top}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 31, color: C.ink, marginTop: 16 }}>{children ?? box.main}</div>
      <div style={{ fontFamily: MONO, fontSize: 17, color: C.muted, marginTop: 10 }}>{box.sub}</div>
    </div>
  );
}

export function TradeGraph() {
  const t = useT();
  const which = t >= CASES[1].from ? 1 : 0;
  const c = CASES[which];
  const local = t - c.from;
  const run = ease(local, [10, 58], [0, 1], INOUT);
  const settle = ease(local, [58, 74], [0, 1], EXPO);
  const good = c.out >= FLOOR;
  const reset = which === 1 ? ease(local, [0, 12], [0, 1], EXPO) : 1;
  const packetX = 130 + run * (880 - 130);
  const lit = (i) => packetX >= BOXES[i].x - 10 && !(which === 1 && settle > 0 && i > 0);
  const tone = good ? C.mint : C.down;

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
      <div style={{ position: "absolute", left: 34, top: 28, fontFamily: MONO, fontSize: 19, letterSpacing: 3, color: C.mint }}>ONE TRANSACTION · ALL OR NOTHING</div>
      <div
        style={{
          position: "absolute",
          right: 34,
          top: 22,
          padding: "8px 16px",
          borderRadius: 999,
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: 2,
          color: which ? "#2a0a10" : "#05210f",
          background: which ? C.down : C.mint,
          transform: `scale(${0.85 + 0.15 * reset})`,
          opacity: reset,
        }}
      >
        CASE {which + 1} · {c.label}
      </div>

      <div style={{ position: "absolute", left: 252, top: BOX_Y - 34, width: 516, height: BOX_H + 50, borderRadius: 26, border: `2px dashed ${good || settle < 0.5 ? "rgba(134,239,172,0.35)" : "rgba(251,113,133,0.55)"}` }} />
      <div style={{ position: "absolute", left: 276, top: BOX_Y - 48, padding: "0 10px", background: "#121317", fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: C.dim }}>SAME TRANSACTION</div>

      {BOXES.map((box, i) => (
        <Box key={box.top} box={box} lit={lit(i) && (i < 3 || settle > 0.3)}>
          {i === 3 ? (settle > 0.2 ? (good ? c.out.toFixed(4) : "0.500") : "…") : undefined}
        </Box>
      ))}

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((i) => {
          const x1 = BOXES[i].x + BOXES[i].w + 6;
          const x2 = BOXES[i + 1].x - 6;
          return <line key={i} x1={x1} y1={BOX_Y + BOX_H / 2} x2={x2} y2={BOX_Y + BOX_H / 2} stroke={packetX > x2 ? C.mint : C.lineStrong} strokeWidth="4" strokeLinecap="round" />;
        })}
        {run > 0 && run < 1 && (
          <g transform={`translate(${packetX} ${BOX_Y + BOX_H / 2})`}>
            <circle r="14" fill={C.mint} style={{ filter: "drop-shadow(0 0 16px rgba(134,239,172,1))" }} />
            <circle r="6" fill="#eafff0" />
          </g>
        )}
      </svg>

      <div style={{ position: "absolute", left: 34, right: 34, top: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 17, letterSpacing: 1.5, color: C.muted, marginBottom: 14 }}>
          <span>SELL MUST RETURN AT LEAST THE FLOOR</span>
          <span>FLOOR = SOL IN + FEES + MIN EDGE</span>
        </div>
        <div style={{ position: "relative", height: 26, borderRadius: 13, background: "#1d1f24" }}>
          <div
            style={{
              width: `${scale(0.494 + (c.out - 0.494) * run) * 100}%`,
              height: "100%",
              borderRadius: 13,
              background: settle > 0 ? (good ? `linear-gradient(90deg, ${C.leaf}, ${C.mint})` : `linear-gradient(90deg, #be123c, ${C.down})`) : "#52525b",
              boxShadow: settle > 0 ? `0 0 30px ${good ? "rgba(134,239,172,0.5)" : "rgba(251,113,133,0.45)"}` : undefined,
            }}
          />
          <div style={{ position: "absolute", left: `${scale(FLOOR) * 100}%`, top: -12, bottom: -12, width: 3, background: C.ink }} />
          <div style={{ position: "absolute", left: `${scale(FLOOR) * 100}%`, top: 40, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 16, color: C.dim, whiteSpace: "nowrap" }}>
            FLOOR {FLOOR}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 34,
          right: 34,
          bottom: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: settle,
          transform: `translateY(${(1 - settle) * 18}px)`,
        }}
      >
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: tone }}>
          {good ? "✓ Lands on chain" : "✕ Whole trade cancels"}
        </span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: good ? C.mint : C.ink, textShadow: good ? "0 0 30px rgba(134,239,172,0.5)" : undefined }}>
          {good ? "+0.0036 SOL" : "SOL stays in the wallet"}
        </span>
      </div>
    </div>
  );
}
