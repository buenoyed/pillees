import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { hash, lerp, restPose } from "../../../src/pillee.js";
import { cheer, clamp01, eyes, hop, key, smoothstep, stand, walk, walking } from "./motion";
import { Stage } from "./Stage";
import { BUBBLES, SOON, T, WORD, WORD_STEP } from "./timeline";
import { Bubble, Caption, Card, INK, LAVENDER, PIXEL, Tag, Tile, ease, usePop } from "./ui";

const GROUND = 820;
const Z = 0.55;
const GREEN_X = 770;
const PURPLE_X = 1150;
const HEAD = GROUND - 640 * Z;

/* ---------- Dialog: the two of them on a plain stage ---------- */

function wave(t, at, len = 0.9) {
  const w = smoothstep(at, at + 0.15, t) * (1 - smoothstep(at + len - 0.15, at + len, t));
  return w * (0.4 + Math.sin((t - at) * 15) * 0.35);
}

function dialogCast(f) {
  const t = f / 30;
  const gw = walk(f, { from: T.greenWalk, x0: -260, x1: GREEN_X, zoom: Z, omega: 18 });
  const pw = walk(f, { from: T.purpleWalk, x0: 2180, x1: PURPLE_X, zoom: Z, omega: 18 });

  const huntAt = (T.hunt + 14) / 30;
  const greenHappy = f >= T.hunt + 14;
  const greenEyes =
    f >= T.dots && f < T.cards
      ? eyes(t, { look: [0.2, -0.15], wide: 1.4, blinks: [(T.dots + 16) / 30] })
      : eyes(t, { look: [gw.walking ? 0.3 : 0.75, 0], blinks: [3.3, 5.9, 17.2, 18.6] });
  const green = greenHappy
    ? cheer(t, smoothstep(huntAt, huntAt + 0.2, t), { face: 1 })
    : gw.walking
      ? walking(t, gw, { eyes: greenEyes })
      : stand(t, { face: 1, eyes: greenEyes, armL: wave(t, T.gm2 / 30), lean: f >= T.dots && f < T.cards ? -0.03 : 0 });

  const purpleHappy = (f >= T.gm1 && f < T.gm1 + 26) || f >= T.hunt + 30;
  const purpleEyes = purpleHappy
    ? { mode: "happy", open: 1, lookX: 0, lookY: 0, wide: 1 }
    : eyes(t, { look: [pw.walking ? 0.3 : 0.75, 0], blinks: [4.6, 6.6, 16.9] });
  const purple =
    f >= T.hunt + 30
      ? cheer(t + 0.4, smoothstep((T.hunt + 30) / 30, (T.hunt + 40) / 30, t), { face: -1 })
      : pw.walking
        ? walking(t, pw, { eyes: purpleEyes })
        : stand(t + 1.3, {
            face: -1,
            eyes: purpleEyes,
            armL: wave(t, T.gm1 / 30) + (f >= T.ask && f < T.ask + 40 ? 0.25 * smoothstep(T.ask / 30, T.ask / 30 + 0.2, t) : 0),
            lean: f >= T.ask && f < T.cards ? 0.04 : 0,
          });

  return [
    { color: "green", pose: green, x: gw.x, y: GROUND, zoom: Z },
    { color: "purple", pose: purple, x: pw.x, y: GROUND, zoom: Z },
  ];
}

function Bubbles({ from, to }) {
  return BUBBLES.filter((b) => b.at >= from && b.at < to).map((b) => (
    <Bubble
      key={b.at}
      x={b.who === "green" ? GREEN_X + 70 : PURPLE_X - 70}
      y={HEAD - 10}
      side={b.who === "green" ? "left" : "right"}
      text={b.text}
      at={b.at}
      until={b.until}
    />
  ));
}

export function DialogOne() {
  const f = useCurrentFrame();
  const push = ease(f, [150, T.dots], [1, 1.16], Easing.inOut(Easing.quad));
  const zoomIn = ease(f, [T.dots, T.cards], [0, 1], Easing.in(Easing.cubic));
  const scale = push * (1 + zoomIn * 0.75);
  const ox = lerp(960, GREEN_X, zoomIn);
  const oy = lerp(640, HEAD + 120, zoomIn);
  const open = ease(f, [3, 15], [0, 1], Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ background: "#0d0c14" }}>
      <AbsoluteFill style={{ background: LAVENDER, clipPath: `inset(${(1 - open) * 49.6}% 0)` }}>
        <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${ox}px ${oy}px` }}>
          <Stage chars={dialogCast(f)} />
          <Bubbles from={0} to={T.cards} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: ease(f, [10, 22], [0.9, 0]) * (f > 3 ? 1 : 0), clipPath: `inset(${(1 - open) * 49.6}% 0)` }} />
    </AbsoluteFill>
  );
}

export function DialogTwo() {
  const f = useCurrentFrame() + T.sowhat - 4;
  const scale = ease(f, [T.sowhat - 4, T.sowhat + 30], [1.12, 1.02], Easing.out(Easing.cubic)) + ease(f, [T.hunt, T.collage], [0, 0.06]);
  return (
    <AbsoluteFill style={{ background: LAVENDER }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "960px 620px" }}>
        <Stage chars={dialogCast(f)} />
        <Sequence from={-(T.sowhat - 4)} layout="none">
          <Bubbles from={T.cards} to={T.collage} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- Update cards ---------- */

export function RouteCard() {
  const f = useCurrentFrame();
  const t = f / 30;
  const xs = [600, 960, 1320];
  const top = 600;
  const second = t >= 0.78;
  const h = second ? hop(t, 0.84, 0.4) : hop(t, 0.26, 0.4);
  const from = second ? xs[1] : xs[0];
  const to = second ? xs[2] : xs[1];
  const x = lerp(from, to, Easing.inOut(Easing.quad)(h.p));
  const done = t > 1.3;
  const pose = done ? cheer(t, smoothstep(1.25, 1.4, t)) : { ...h.pose, eyes: eyes(t, { look: [0.6, -0.2], wide: 1.1 }) };
  const on = x < 780 ? 0 : x < 1140 ? 1 : 2;
  return (
    <Card color="#f7c85c">
      <Tag>pump update · multi_hop_swap</Tag>
      {xs.map((tx, i) => (
        <Tile key={i} label={["SOL", "A", "B"][i]} x={tx} y={top} lit={on === i && h.height < 0.2 ? 1 : i < on ? 0.6 : 0} />
      ))}
      {[780, 1140].map((ax) => (
        <div key={ax} style={{ position: "absolute", left: ax - 40, top: top + 50, fontFamily: PIXEL, fontWeight: 700, fontSize: 64, color: INK }}>
          →
        </div>
      ))}
      <Stage chars={[{ color: "blue", pose, x, y: top - h.height * 230, zoom: 0.4, shadowY: top, shadow: 1 - h.height * 0.6 }]} />
      <Caption text="one swap. every hop." />
    </Card>
  );
}

function Coin({ x, y, spin = 0, size = 86, label }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ffd34d",
        border: `6px solid ${INK}`,
        boxShadow: "inset -8px -8px 0 #f0a92b",
        transform: `scaleX(${Math.cos(spin)})`,
        display: "grid",
        placeItems: "center",
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: size * 0.4,
        color: INK,
      }}
    >
      {label}
    </div>
  );
}

export function FeesCard() {
  const f = useCurrentFrame();
  const t = f / 30;
  const throwP = ease(f, [7, 24], [0, 1]);
  const cx = lerp(900, 1230, throwP);
  const cy = lerp(560, 600, throwP) - 300 * 4 * throwP * (1 - throwP);
  const landed = f >= 24;
  const jar = landed ? 1 + Math.sin((f - 24) * 0.9) * 0.08 * Math.exp(-(f - 24) * 0.15) : 1;
  const times = usePop(26, { damping: 9, stiffness: 200, mass: 0.6 });
  const toss = key(t, [[0.1, 0], [0.22, 0.5], [0.3, -1.2], [0.5, -0.4], [0.7, 0]]);
  const pose = landed && f > 30 ? cheer(t, smoothstep(1.0, 1.15, t)) : stand(t, { armR: toss, eyes: eyes(t, { look: [0.8, throwP < 0.5 ? -0.6 : 0.2] }) });
  return (
    <Card color="#f490bd">
      <Tag>pump update · multi_hop_swap</Tag>
      <div style={{ position: "absolute", left: 1130, top: 560, width: 200, height: 240, transform: `scaleY(${jar})`, transformOrigin: "50% 100%" }}>
        <div style={{ position: "absolute", left: -14, right: -14, top: 0, height: 28, borderRadius: 10, background: "#fff", border: `6px solid ${INK}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 26, bottom: 0, borderRadius: "0 0 46px 46px", background: "rgba(255,255,255,0.55)", border: `6px solid ${INK}`, borderTop: 0 }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center", fontFamily: PIXEL, fontWeight: 700, fontSize: 34, color: INK }}>fee</div>
      </div>
      {!landed ? <Coin x={cx} y={cy} spin={f * 0.5} /> : <Coin x={1230} y={700 - Math.min(1, (f - 24) / 3) * 40} size={70} />}
      <div style={{ position: "absolute", left: 1370, top: 420, fontFamily: PIXEL, fontWeight: 700, fontSize: 160, color: INK, transform: `scale(${times}) rotate(${(1 - times) * -30}deg)`, opacity: f >= 26 ? 1 : 0 }}>
        ×1
      </div>
      <Stage chars={[{ color: "orange", pose, x: 800, y: 800, zoom: 0.48 }]} />
      <Caption text="fees once. not every hop." />
    </Card>
  );
}

export function MiddleCard() {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = ease(f, [3, 40], [0, 1], Easing.inOut(Easing.sin));
  const ax = lerp(-120, 2040, p);
  const ay = 470 - 300 * 4 * p * (1 - p);
  const look = clamp01((ax - 300) / 1300) * 2 - 1;
  const done = f > 40;
  const pose = done ? cheer(t, smoothstep(1.35, 1.5, t)) : stand(t, { eyes: eyes(t, { look: [look, -0.5 - 0.4 * Math.sin(p * Math.PI)], wide: 1.15 }), lean: -0.02 });
  return (
    <Card color="#f6a35e">
      <Tag>pump update · multi_hop_swap</Tag>
      <div style={{ position: "absolute", left: 1210, top: 660, width: 220, height: 150 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "#6b3f2a", border: `6px solid ${INK}` }} />
        <div style={{ position: "absolute", right: -6, top: 46, width: 74, height: 54, borderRadius: 14, background: "#8a5638", border: `6px solid ${INK}` }} />
        <div style={{ position: "absolute", right: 16, top: 66, width: 14, height: 14, borderRadius: 7, background: "#ffd34d" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", fontFamily: PIXEL, fontWeight: 700, fontSize: 34, color: INK }}>your wallet</div>
      </div>
      {Array.from({ length: 6 }, (_, i) => {
        const q = p - (i + 1) * 0.025;
        if (q <= 0 || q >= 1) return null;
        return <div key={i} style={{ position: "absolute", left: lerp(-120, 2040, q) - 10, top: 470 - 300 * 4 * q * (1 - q) - 10, width: 20, height: 20, background: "#fff", opacity: 0.5 - i * 0.07 }} />;
      })}
      <Tile label="A" x={ax} y={ay - 60} size={120} style={{ transform: `rotate(${p * 360}deg)` }} />
      <Stage chars={[{ color: "teal", pose, x: 900, y: 800, zoom: 0.48 }]} />
      <Caption text="the middle coin never lands." />
    </Card>
  );
}

export function MigrationCard() {
  const f = useCurrentFrame();
  const t = f / 30;
  const fill = ease(f, [3, 18], [0.86, 1], Easing.in(Easing.quad));
  const full = f >= 18;
  const stream = ease(f, [18, 26], [0, 1]);
  const pool = ease(f, [22, 44], [0, 0.72], Easing.out(Easing.cubic));
  const pose = full ? cheer(t, smoothstep(0.62, 0.75, t)) : stand(t, { eyes: eyes(t, { look: [1, -0.6], wide: 1.1 }) });
  const barL = 600;
  const barW = 900;
  return (
    <Card color="#b8a6f3">
      <Tag>pump update · synthetic migration</Tag>
      <div style={{ position: "absolute", left: barL, top: 300, width: barW, height: 96, borderRadius: 48, background: "#fff", border: `6px solid ${INK}`, overflow: "hidden" }}>
        <div style={{ width: `${fill * 100}%`, height: "100%", background: "#86efac", borderRight: fill < 1 ? `6px solid ${INK}` : 0 }} />
        <div style={{ position: "absolute", left: 30, top: 18, fontFamily: PIXEL, fontWeight: 700, fontSize: 40, color: INK }}>bonding curve</div>
        <div style={{ position: "absolute", right: 30, top: 18, fontFamily: PIXEL, fontWeight: 700, fontSize: 40, color: INK }}>{Math.round(fill * 100)}%</div>
      </div>
      <div style={{ position: "absolute", left: barL + barW - 80, top: 396, width: 40, height: stream * 240, background: "#86efac", border: stream ? `6px solid ${INK}` : 0, borderTop: 0 }} />
      <div style={{ position: "absolute", left: 1210, top: 620, width: 460, height: 210, borderRadius: "0 0 110px 110px", border: `6px solid ${INK}`, borderTop: 0, background: "rgba(255,255,255,0.45)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pool * 100}%`, background: "#86efac", borderTop: pool ? `6px solid ${INK}` : 0 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 60, textAlign: "center", fontFamily: PIXEL, fontWeight: 700, fontSize: 44, color: INK }}>pool</div>
      </div>
      <Stage chars={[{ color: "green", pose, x: 420, y: 830, zoom: 0.48 }]} />
      <Caption text="the last buy keeps going." />
    </Card>
  );
}

export function SlippageCard() {
  const f = useCurrentFrame();
  const t = f / 30;
  const stamp = usePop(14, { damping: 10, stiffness: 240, mass: 0.7 });
  const pose = f > 18 ? cheer(t, smoothstep(0.6, 0.75, t) * 0.8) : stand(t, { eyes: eyes(t, { look: [1, 0], wide: 1.05 }) });
  return (
    <Card color="#f0e4c4">
      <Tag>pump update · multi_hop_swap</Tag>
      <div style={{ position: "absolute", left: 1010, top: 250, width: 360, height: 520, borderRadius: 22, background: "#fff", border: `6px solid ${INK}`, padding: 34, boxShadow: `0 14px 0 ${INK}` }}>
        <div style={{ fontFamily: PIXEL, fontWeight: 700, fontSize: 40, color: INK, marginBottom: 26 }}>min out</div>
        {[0.9, 0.7, 0.8, 0.55, 0.75].map((w, i) => (
          <div key={i} style={{ height: 22, width: `${w * 100}%`, borderRadius: 11, background: "#e4e1ef", marginBottom: 24 }} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1110,
          top: 420,
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: "#86efac",
          border: `8px solid ${INK}`,
          display: "grid",
          placeItems: "center",
          transform: `scale(${f >= 14 ? 2.2 - 1.2 * stamp : 0}) rotate(${-14 + (1 - stamp) * 20}deg)`,
          opacity: f >= 14 ? 1 : 0,
        }}
      >
        <svg width="120" height="100" viewBox="0 0 12 10">
          <path d="M1 5 L4.5 8.5 L11 1.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="square" />
        </svg>
      </div>
      <Stage chars={[{ color: "pink", pose, x: 700, y: 820, zoom: 0.5 }]} />
      <Caption text="one slippage check." />
    </Card>
  );
}

/* ---------- Collage ---------- */

const POLAROIDS = [
  { x: 300, y: 150, rot: -8, color: "purple", bg: "#cdbdf8", label: "spread hunter" },
  { x: 640, y: 70, rot: 5, color: "orange", bg: "#f9bd80", label: "migration watch" },
  { x: 1300, y: 90, rot: -4, color: "blue", bg: "#a8d9f8", label: "fee recycler" },
  { x: 1620, y: 330, rot: 7, color: "pink", bg: "#f7aacb", label: "custom note" },
  { x: 230, y: 560, rot: 6, color: "yellow", bg: "#f9df8a", label: "own wallet" },
  { x: 1560, y: 680, rot: -6, color: "teal", bg: "#a9ebda", label: "own rules" },
];

function Polaroid({ item, i }) {
  const f = useCurrentFrame();
  const p = usePop(4 + i * 6, { damping: 12, stiffness: 150, mass: 0.7 });
  const t = f / 30 + i;
  const float = Math.sin(f / 14 + i) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: item.x - 145,
        top: item.y + float,
        width: 290,
        padding: "16px 16px 0",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 18px 40px rgba(42,35,64,0.18)",
        transform: `scale(${p}) rotate(${item.rot + (1 - p) * 25}deg)`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <div style={{ position: "relative", width: 258, height: 210, background: item.bg, overflow: "hidden" }}>
        <Stage width={258} height={210} chars={[{ color: item.color, pose: i % 2 ? cheer(t, 0.7) : restPose(t), x: 132, y: 196, zoom: 0.24 }]} />
      </div>
      <div style={{ padding: "12px 0 16px", textAlign: "center", fontFamily: PIXEL, fontWeight: 600, fontSize: 30, color: INK }}>{item.label}</div>
    </div>
  );
}

export function Collage() {
  const f = useCurrentFrame();
  const t = f / 30;
  const look = key(t, [[0.2, 0], [0.5, -1], [1.4, -1], [1.7, 1], [2.7, 1], [3.0, 0]]);
  const pose = f > 92 ? cheer(t, smoothstep(3.05, 3.25, t)) : stand(t, { eyes: eyes(t, { look: [look, -0.4], blinks: [1.55] }) });
  return (
    <AbsoluteFill style={{ background: "#f4ecd8" }}>
      {POLAROIDS.map((item, i) => (
        <Polaroid key={item.label} item={item} i={i} />
      ))}
      <Stage chars={[{ color: "green", pose, x: 960, y: 800, zoom: 0.5 }]} />
      <Caption text="a capsule for every strategy." at={40} y={950} size={72} />
    </AbsoluteFill>
  );
}

/* ---------- Crowd + wordmark ---------- */

const BACK = { y: 742, zoom: 0.34, xs: [470, 640, 810, 1110, 1280, 1450] };
const FRONT = { y: 884, zoom: 0.4, xs: [330, 560, 800, 1120, 1360, 1590] };
function crowdCast(f) {
  const t = f / 30;
  const chars = [];
  const rows = [
    { ...BACK, colors: ["teal", "pink", "yellow", "blue", "orange", "red"], delay: 0 },
    { ...FRONT, colors: ["yellow", "blue", "green", "purple", "teal", "orange"], delay: 6 },
  ];
  rows.forEach((row, r) => {
    row.xs.forEach((x1, i) => {
      const hero = r === 1 && (i === 2 || i === 3);
      const left = x1 < 960;
      const x0 = left ? -180 - i * 40 : 2100 + (5 - i) * 40;
      const from = hero ? -999 : row.delay + (left ? (2 - i) : i - 3) * 5;
      const w = walk(f, { from, x0, x1, zoom: row.zoom, omega: 24 });
      const party = f > Math.max(w.arrive, 60) + (i % 3) * 3;
      const seed = r * 10 + i;
      let pose;
      if (party) {
        const bounce = smoothstep(0, 0.25, t - Math.max(w.arrive, 60) / 30);
        pose = cheer(t + hash(seed) * 2, bounce * (0.6 + hash(seed + 1) * 0.4), { face: left ? 1 : -1 });
      } else if (w.walking) {
        pose = walking(t, w, { eyes: eyes(t, { look: [0.5, 0] }) });
      } else {
        pose = stand(t + seed, { face: hero ? (i === 2 ? 1 : -1) : left ? 1 : -1, eyes: eyes(t, { look: [0.6, 0], blinks: [0.8 + hash(seed) * 1.5] }) });
      }
      const jump = party ? Math.abs(Math.sin((t + hash(seed) * 3) * 6)) * 26 * row.zoom * 2 : 0;
      chars.push({ color: hero ? (i === 2 ? "green" : "purple") : row.colors[i], pose, x: w.x, y: row.y - jump, shadowY: row.y, zoom: row.zoom, z: row.y });
    });
  });
  return chars;
}

function Confetti({ at }) {
  const f = useCurrentFrame();
  const g = f - at;
  if (g < 0) return null;
  const colors = ["#f490bd", "#86efac", "#7cc4f5", "#f7c85c", "#b8a6f3", "#f6a35e"];
  return (
    <AbsoluteFill>
      {Array.from({ length: 90 }, (_, i) => {
        const a = hash(i) * Math.PI * 2;
        const v = 10 + hash(i + 1) * 22;
        const x = 960 + (hash(i + 2) - 0.5) * 900 + Math.cos(a) * v * g * 0.6;
        const y = 230 + Math.sin(a) * v * g * 0.5 - 14 * g + 0.75 * g * g;
        const s = 10 + hash(i + 3) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s * 0.6,
              background: colors[i % colors.length],
              transform: `rotate(${g * (8 + hash(i + 4) * 20)}deg) scaleY(${Math.cos(g * 0.3 + i)})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Typed({ text, at, step, size, color, y, cursorColor, keepCursor }) {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / step) + 1));
  if (f < at) return null;
  const blink = Math.floor(f / 8) % 2 === 0;
  const typing = n < text.length;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: PIXEL, fontWeight: 700, fontSize: size, color, lineHeight: 1 }}>
      <span style={{ position: "relative" }}>
        {text.slice(0, n)}
        <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
        {(typing || keepCursor) && (
          <span
            style={{
              position: "absolute",
              top: "8%",
              left: `calc(${(n / text.length) * 100}% + 0.08em)`,
              width: "0.14em",
              height: "0.9em",
              background: cursorColor,
              opacity: typing || blink ? 1 : 0,
            }}
          />
        )}
      </span>
    </div>
  );
}

export function Finale() {
  const f = useCurrentFrame();
  const wordAt = T.word - T.crowd;
  const soonAt = T.soon - T.crowd;
  return (
    <AbsoluteFill style={{ background: LAVENDER }}>
      <div style={{ position: "absolute", left: 300, right: 300, top: 690, height: 58, background: "#f8f7fc", borderRadius: 8 }} />
      <div style={{ position: "absolute", left: 300, right: 300, top: 748, height: 52, background: "#dad6ea" }} />
      <div style={{ position: "absolute", left: 170, right: 170, top: 820, height: 60, background: "#fbfaff", borderRadius: 8 }} />
      <div style={{ position: "absolute", left: 170, right: 170, top: 880, height: 56, background: "#d4cfe6" }} />
      <Stage chars={crowdCast(f)} />
      <Typed text={WORD} at={wordAt} step={WORD_STEP} size={210} color={INK} y={90} cursorColor="#86efac" />
      <Typed text={SOON} at={soonAt} step={5} size={68} color="#8b7fd6" y={340} cursorColor="#b8a6f3" keepCursor />
      <Confetti at={wordAt + WORD.length * WORD_STEP} />
    </AbsoluteFill>
  );
}