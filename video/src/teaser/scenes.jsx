import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp01, hash, key, lerp, outBack, outQuad, smoothstep } from "../../../src/pillee.js";
import { cheer, dive, eyes, hang, hop, stand, walk, walking } from "./motion";
import { Paint, drawChar, drawShadow } from "./Stage";
import { ARB, CAPSULE, CLIFF, CROWD, CUTS, END, HOP, T, URL, WORD } from "./timeline";
import { Bubble, PIXEL, usePop } from "./ui";
import { GORES, H, PIVOT, S, W, cloudBank, drawChute, drawCliff, drawIsland, drawSky, dust, pixelCoin, speedLines } from "./world";

const MINT = "#86efac";
const snap = (v) => Math.round(v / S) * S;

/* ---------- Type ---------- */

function Title({ text, at, until = 1e9, y = 110, size = 76, color = "#fff" }) {
  const f = useCurrentFrame();
  if (f < at || f >= until) return null;
  const n = Math.max(1, Math.floor((f - at) * 1.8));
  const out = clamp01((f - (until - 6)) / 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y - out * 16,
        textAlign: "center",
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.1,
        color,
        opacity: 1 - out,
        textShadow: "0 6px 0 rgba(4,6,15,0.45)",
      }}
    >
      {text.slice(0, n)}
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </div>
  );
}

function Chip({ text, at }) {
  const f = useCurrentFrame();
  const p = usePop(at);
  if (f < at) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 26px 14px 16px",
        borderRadius: 18,
        background: "rgba(4,8,14,0.72)",
        border: "3px solid rgba(134,239,172,0.55)",
        color: "#fff",
        fontFamily: PIXEL,
        fontWeight: 600,
        fontSize: 32,
        transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <span style={{ width: 34, height: 34, background: MINT, display: "grid", placeItems: "center", color: "#06120c", fontSize: 26 }}>✓</span>
      {text}
    </div>
  );
}

function Label({ x, y, text, at = 0, size = 34, color = "#fff", bg = "rgba(4,8,14,0.6)" }) {
  const f = useCurrentFrame();
  const p = usePop(at);
  if (f < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.5 + 0.5 * p})`,
        opacity: Math.min(1, p * 2),
        padding: "6px 16px 8px",
        borderRadius: 12,
        background: bg,
        color,
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: size,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

/* ---------- Shared bits ---------- */

const landPose = (t, tl, extra = {}) => {
  const sy = key(t, [[tl, 1], [tl + 0.08, 0.76, outQuad], [tl + 0.3, 1.06], [tl + 0.45, 1]]);
  const squat = Math.max(0, 1 - sy);
  return stand(t, {
    sy,
    sx: 1 / Math.sqrt(sy),
    footL: { dx: -squat * 60, lift: 0, rot: 0 },
    footR: { dx: squat * 60, lift: 0, rot: 0 },
    ...extra,
  });
};

const swingAt = (t, t0) => Math.sin((t - t0) * 3.6 + 0.5) * 0.17 * Math.exp(-(t - t0) * 0.75);

function chuteChar(ctx, sets, { color, pose, x, y, zoom, open = 1, swing = 0, release = 0, gores }) {
  drawChute(ctx, { x, y, zoom, open, swing, release, gores });
  drawChar(ctx, sets, { color, pose, x, y, zoom, rotate: release > 0 ? null : [swing, y - zoom * PIVOT] });
}

/* ---------- 1. Cliff, jump, skydive, chute ---------- */

const BANK = 212;
const CLIFF_WALK = { from: T.walk, x0: CLIFF.x0, x1: CLIFF.x1, zoom: CLIFF.zoom, omega: CLIFF.omega };

const CLIFF_END = walk(1e6, CLIFF_WALK).x;

const PATH = (() => {
  const out = [];
  let x = CLIFF_END;
  let y = CLIFF.top;
  let vx = 0;
  let vy = 0;
  const dt = 1 / 30;
  for (let f = 0; f <= T.arb; f++) {
    out[f] = { x, y };
    if (f < T.jump) continue;
    if (f === T.jump) {
      vx = 430;
      vy = -760;
    }
    if (f < T.chute) {
      vy = Math.min(1350, vy + 1900 * dt);
      vx *= 0.975;
    } else {
      vy += (95 - vy) * 0.14;
      const gliding = f >= T.glideOut;
      vx += ((gliding ? 1300 : 30) - vx) * (gliding ? 0.08 : 0.12);
    }
    x += vx * dt;
    y += vy * dt;
  }
  return out;
})();

function flightCamera(f) {
  const p = PATH[Math.min(f, T.arb)];
  const fx = PATH[Math.min(f, T.glideOut)].x;
  const camX = (fx - 960) * smoothstep(T.jump, T.jump + 40, f);
  const target = f < T.jump ? CLIFF.top : lerp(lerp(CLIFF.top, 560, smoothstep(T.jump + 8, T.jump + 40, f)), 790, smoothstep(T.chute, T.chute + 40, f));
  return { camX, camY: Math.max(0, p.y - target) };
}

function flightHero(f) {
  const t = f / 30;
  const w = walk(f, CLIFF_WALK);
  const zoom = CLIFF.zoom + 0.16 * smoothstep(T.jump + 20, T.chute - 10, f) - 0.04 * smoothstep(T.chute, T.chute + 40, f);
  if (f < T.jump) {
    let pose;
    if (w.walking) pose = walking(t, w, { eyes: eyes(t, { look: [0.6, 0.1], blinks: [1.6, 2.9] }) });
    else if (f < T.jump - 16) {
      const scared = smoothstep(T.notice, T.notice + 5, f);
      pose = stand(t, {
        lean: -0.05 * scared,
        eyes: eyes(t, { look: [lerp(0.6, 1, scared), lerp(0, 0.85, scared)], wide: 1 + 0.25 * scared, blinks: [(T.notice + 12) / 30] }),
      });
    } else pose = { ...hop(t, T.jump / 30, 0.5).pose, eyes: eyes(t, { look: [1, 0.3], wide: 1.15 }), lean: 0.12 };
    return { pose, x: w.x, y: CLIFF.top, zoom, chute: 0 };
  }
  const p = PATH[Math.min(f, T.arb)];
  if (f < T.chute) {
    const k = smoothstep(T.jump, T.jump + 8, f);
    return { pose: dive(t, k), x: p.x, y: p.y, zoom, chute: 0 };
  }
  const tc = T.chute / 30;
  const lookUp = f < T.chute + 22;
  const tilt = 0.14 * smoothstep(T.glideOut, T.glideOut + 14, f);
  return {
    pose: hang(t, { eyes: eyes(t, { look: lookUp ? [0, -1] : [0.7, 0.1], wide: lookUp ? 1.25 : 1, blinks: [(T.chute + 40) / 30] }) }),
    x: p.x,
    y: p.y,
    zoom,
    chute: outBack(clamp01((f - T.chute) / 7)),
    swing: swingAt(t, tc) + tilt,
  };
}

export function Flight() {
  const f = useCurrentFrame();
  const { camX, camY } = flightCamera(f);
  const hero = flightHero(f);
  const hx = hero.x - camX;
  const hy = hero.y - camY;
  return (
    <AbsoluteFill>
      <Paint
        draw={(ctx, sets) => {
          const above = 1 - smoothstep(BANK - 8, BANK, f);
          const pal = drawSky(ctx, f, { camX, camY: above > 0 ? camY : 0, rush: camY * 0.8, mountains: above * (1 - clamp01(camY / 900)) });
          if (above > 0) {
            ctx.globalAlpha = above;
            drawCliff(ctx, { edge: CLIFF.edge, top: CLIFF.top, offX: camX, offY: camY });
            ctx.globalAlpha = 1;
          }
          speedLines(ctx, f, smoothstep(T.jump + 15, T.jump + 40, f) * (1 - smoothstep(T.chute - 4, T.chute + 14, f)), camY);
          const bankY = lerp(H + 800, -800, clamp01((f - BANK + 18) / 36));
          if (f > BANK - 20 && f < BANK + 20) cloudBank(ctx, f, bankY + 200, pal.cloud);
          if (f < T.jump + 4) drawShadow(ctx, { x: hx, y: CLIFF.top - camY, zoom: hero.zoom, shadow: 1 - clamp01((CLIFF.top - hero.y) / 200) });
          chuteChar(ctx, sets, { color: "green", pose: hero.pose, x: hx, y: hy, zoom: hero.zoom, open: hero.chute, swing: hero.swing ?? 0 });
          if (f > BANK - 20 && f < BANK + 20) {
            ctx.globalAlpha = 0.75;
            cloudBank(ctx, f + 7, bankY - 120, pal.cloud);
            ctx.globalAlpha = 1;
          }
        }}
      />
      <Bubble x={CLIFF.x1 + 40} y={CLIFF.top - 640 * CLIFF.zoom - 10} text="!" at={T.notice} until={T.jump - 8} size={52} />
      <Title text="meet the pillees." at={24} until={100} />
      <Title text="little arbitrage bots for pump." at={172} until={246} y={130} size={88} />
      <Title text="they hunt price gaps between coins." at={262} until={322} y={930} size={70} />
    </AbsoluteFill>
  );
}

/* ---------- 4. The route: one swap through every hop ---------- */

const arc = (a, b, u, lift) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * lift];

export function HopScene() {
  const g = useCurrentFrame();
  const f = g + T.hop;
  const t = f / 30;
  const hx = lerp(-220, 2160, g / 205);
  const hy = 330 + Math.sin(g * 0.06) * 16;
  const nodes = HOP.nodes.map(([label, x, y], i) => ({ label, x, y: y + Math.sin(g * 0.05 + i * 1.7) * 8 }));
  return (
    <AbsoluteFill>
      <Paint
        draw={(ctx, sets) => {
          drawSky(ctx, f, { rush: -g * 0.3 });
          nodes.forEach((n, i) => drawIsland(ctx, n.x, n.y, 260, i + 1));
          for (let s = 0; s < 2; s++) {
            const a = [nodes[s].x, nodes[s].y - 80];
            const b = [nodes[s + 1].x, nodes[s + 1].y - 80];
            for (let k = 1; k < 18; k++) {
              const [px, py] = arc(a, b, k / 18, 170);
              if (px > hx) break;
              ctx.fillStyle = "#06120c";
              ctx.fillRect(snap(px) - 9, snap(py) - 9, 18, 18);
              ctx.fillStyle = MINT;
              ctx.fillRect(snap(px) - 6, snap(py) - 6, 12, 12);
            }
          }
          nodes.forEach((n, i) => pixelCoin(ctx, n.x, n.y - 80, 46, g * 0.08 + i, hx > n.x));
          const pose = hang(t, { eyes: eyes(t, { look: [0.5, 0.8], blinks: [(T.hop + 90) / 30] }) });
          chuteChar(ctx, sets, { color: "green", pose, x: hx, y: hy, zoom: 0.36, swing: 0.1 + Math.sin(g * 0.08) * 0.05 });
        }}
      />
      {nodes.map((n) => (
        <Label key={n.label} x={n.x} y={n.y - 160} text={n.label} at={6} size={30} />
      ))}
      <Title text="it finds a gap. one swap clears it." at={12} y={120} size={80} />
      <Label x={1520} y={470} text="+ spread" at={HOP.spread} size={40} color="#06120c" bg={MINT} />
      <Title text="built on pump's new multi_hop_swap" at={30} y={226} size={34} color="rgba(255,255,255,0.7)" />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", justifyContent: "center", gap: 22 }}>
        <Chip text="fees once per route" at={HOP.chips[0]} />
        <Chip text="middle coin: no token account" at={HOP.chips[1]} />
        <Chip text="slippage checked once, at the end" at={HOP.chips[2]} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 2. What arbitrage is: same coin, two prices ---------- */

const POOLS = [
  { x: 500, y: 720, name: "pool A", price: "0.98", cheap: true },
  { x: 1420, y: 720, name: "pool B", price: "1.03", cheap: false },
];
const AZ = 0.4;

function coinStack(ctx, x, y, n) {
  for (let k = 0; k < n; k++) pixelCoin(ctx, x + (k % 2 ? 32 : -32), y - 28 - Math.floor(k / 2) * 22, 28, 0, false);
}

export function ArbScene() {
  const g = useCurrentFrame();
  const f = g + T.arb;
  const t = f / 30;
  const [A, B] = POOLS;
  const p = clamp01(g / ARB.land);
  const h = hop(t, (T.arb + ARB.hop) / 30, ARB.hopDur / 30);
  const carrying = g >= ARB.grab && g < ARB.drop;
  let hx;
  let hy;
  let pose;
  if (g < ARB.land) {
    hx = lerp(260, A.x, outQuad(p));
    hy = lerp(-160, A.y, 1 - (1 - p) ** 1.6);
    pose = hang(t, { eyes: eyes(t, { look: [0.3, 0.9] }) });
  } else if (g < ARB.hop - 8) {
    hx = A.x;
    hy = A.y;
    const up = smoothstep(ARB.grab - 4, ARB.grab + 4, g);
    pose = landPose(t, (T.arb + ARB.land) / 30, { armL: 0.9 * up, armR: -0.9 * up, eyes: eyes(t, { look: [1, g < ARB.grab ? 0.2 : -0.6], wide: 1.1 }) });
  } else if (h.p < 1) {
    hx = lerp(A.x, B.x, h.p);
    hy = lerp(A.y, B.y, h.p) - h.height * 300;
    pose = { ...h.pose, armL: 0.9, armR: -0.9, eyes: eyes(t, { look: [1, 0], wide: 1.2 }) };
  } else {
    hx = B.x;
    hy = B.y;
    const tl = (T.arb + ARB.hop + ARB.hopDur) / 30;
    if (g >= ARB.cheer) pose = cheer(t, smoothstep((T.arb + ARB.cheer) / 30, (T.arb + ARB.cheer + 6) / 30, t));
    else pose = landPose(t, tl, { armL: carrying ? 0.9 : 0, armR: carrying ? -0.9 : 0, eyes: eyes(t, { look: [0, 0.6] }) });
  }
  const headY = hy - 640 * AZ - 34;
  const drop = clamp01((g - ARB.drop) / 8);
  return (
    <AbsoluteFill>
      <Paint
        draw={(ctx, sets) => {
          drawSky(ctx, f, { rush: -g * 0.3 });
          POOLS.forEach((pool, i) => drawIsland(ctx, pool.x, pool.y, 380, 11 + i));
          coinStack(ctx, A.x - 120, A.y, g >= ARB.grab ? 4 : 5);
          coinStack(ctx, B.x + 120, B.y, g >= ARB.drop + 8 ? 4 : 3);
          if (g >= 30) {
            const k = smoothstep(30, 40, g);
            ctx.globalAlpha = k;
            ctx.fillStyle = MINT;
            for (let x = A.x + 200; x < B.x - 200; x += 30) ctx.fillRect(x, 560, 14, 8);
            ctx.fillRect(A.x + 190, 540, 8, 48);
            ctx.fillRect(B.x - 198, 540, 8, 48);
            ctx.globalAlpha = 1;
          }
          drawShadow(ctx, { x: hx, y: g < ARB.land || h.p >= 1 || g < ARB.hop ? (g < ARB.hop ? A.y : B.y) : lerp(A.y, B.y, h.p), zoom: AZ, shadow: g < ARB.land ? p : 1 - h.height * 0.7 });
          chuteChar(ctx, sets, {
            color: "green",
            pose,
            x: hx,
            y: hy,
            zoom: AZ,
            open: g < ARB.land + 30 ? 1 : 0,
            swing: g < ARB.land ? swingAt(t, T.arb / 30) * 0.6 : 0,
            release: g >= ARB.land ? clamp01((g - ARB.land - 3) / 22) : 0,
          });
          if (carrying) pixelCoin(ctx, hx, headY, 34, g * 0.2, false);
          else if (g >= ARB.drop && drop < 1) pixelCoin(ctx, lerp(hx, B.x + 146, drop), lerp(headY, B.y - 74, drop) - Math.sin(drop * Math.PI) * 60, 30, g * 0.3, false);
          dust(ctx, A.x, A.y, AZ, (g - ARB.land) / 30);
          dust(ctx, B.x, B.y, AZ, (g - ARB.hop - ARB.hopDur) / 30);
        }}
      />
      {POOLS.map((pool) => (
        <Label key={pool.name} x={pool.x} y={pool.y + 250} text={`${pool.name} · MOSS ${pool.price}`} at={8} size={36} color={pool.cheap ? "#06120c" : "#fff"} bg={pool.cheap ? MINT : "#d94f86"} />
      ))}
      <Label x={960} y={520} text="spread" at={34} size={34} color={MINT} />
      {g >= ARB.drop + 4 && <Label x={B.x} y={headY - 70} text="+0.05" at={ARB.drop + 4} size={56} color="#06120c" bg={MINT} />}
      <Title text="same coin. two prices." at={6} until={70} />
      <Title text="buy where it's cheap..." at={72} until={110} />
      <Title text="...sell where it's not. that's arbitrage." at={112} size={70} />
    </AbsoluteFill>
  );
}

/* ---------- 3. The capsule: wallet, strategy, coin ---------- */

const ISLAND = { x: 960, y: 800 };
const ITEMS = [
  { x: 470, y: 500, label: "a fresh wallet you control", ly: 630, look: [-1, -0.3] },
  { x: 960, y: 300, label: "a strategy you write", ly: 420, look: [0, -1] },
  { x: 1450, y: 500, label: "an optional coin", ly: 630, look: [1, -0.3] },
];

function drawWallet(ctx) {
  ctx.fillStyle = "#06120c";
  ctx.fillRect(-80, -56, 160, 112);
  ctx.fillStyle = "#7a4a30";
  ctx.fillRect(-72, -48, 144, 96);
  ctx.fillStyle = "#94603f";
  ctx.fillRect(-72, -48, 144, 16);
  ctx.fillStyle = "#06120c";
  ctx.fillRect(20, -20, 70, 44);
  ctx.fillStyle = "#a8714c";
  ctx.fillRect(26, -14, 58, 32);
  ctx.fillStyle = MINT;
  ctx.fillRect(40, -6, 14, 14);
}

function drawScroll(ctx, g) {
  ctx.fillStyle = "#06120c";
  ctx.fillRect(-78, -92, 156, 184);
  ctx.fillStyle = "#f4f5f1";
  ctx.fillRect(-70, -84, 140, 168);
  const lines = [[0.7, MINT], [0.5, "#8fd0fa"], [0.85, "#c9b6ff"], [0.4, MINT], [0.65, "#fdba74"], [0.55, "#8fd0fa"]];
  lines.forEach(([w, c], i) => {
    const shown = clamp01((g - i * 3) / 6);
    ctx.fillStyle = c;
    ctx.fillRect(-54 + (i % 3 ? 16 : 0), -64 + i * 24, 108 * w * shown, 12);
  });
}

export function CapsuleScene() {
  const g = useCurrentFrame();
  const f = g + T.capsule;
  const t = f / 30;
  const shell = usePop(CAPSULE.shell, { damping: 12, stiffness: 150, mass: 0.7 });
  const landed = g >= CAPSULE.land;
  const p = clamp01(g / CAPSULE.land);
  const hx = landed ? ISLAND.x : lerp(640, ISLAND.x, outQuad(p));
  const hy = landed ? ISLAND.y : lerp(-160, ISLAND.y, 1 - (1 - p) ** 1.6);
  const current = CAPSULE.items.reduce((k, at, i) => (g >= at ? i : k), -1);
  let pose;
  if (!landed) pose = hang(t, { eyes: eyes(t, { look: [0.3, 0.9] }) });
  else if (g >= CAPSULE.cheer) pose = cheer(t, smoothstep(CAPSULE.cheer / 30, CAPSULE.cheer / 30 + 0.2, t));
  else {
    const look = current >= 0 ? ITEMS[current].look : [0, 0.4];
    pose = landPose(t, (T.capsule + CAPSULE.land) / 30, { face: look[0] < 0 ? -1 : 1, eyes: eyes(t, { look: [Math.abs(look[0]), look[1]], wide: 1.1, blinks: [(T.capsule + 120) / 30] }) });
  }
  return (
    <AbsoluteFill>
      <Paint
        draw={(ctx, sets) => {
          drawSky(ctx, f, { rush: -g * 0.3 });
          drawIsland(ctx, ISLAND.x, ISLAND.y, 560, 7);
          ITEMS.forEach((it, i) => {
            const at = CAPSULE.items[i];
            if (g < at) return;
            const k = outBack(clamp01((g - at) / 10));
            const bob = Math.sin(g * 0.07 + i * 2) * 10;
            ctx.fillStyle = MINT;
            for (let s = 0; s < 1; s += 0.06) {
              if (s > k) break;
              const x = lerp(ISLAND.x, it.x, s);
              const y = lerp(ISLAND.y - 180, it.y + bob, s);
              ctx.fillRect(snap(x) - 5, snap(y) - 5, 10, 10);
            }
            ctx.save();
            ctx.translate(it.x, it.y + bob);
            ctx.scale(k, k);
            if (i === 0) drawWallet(ctx);
            else if (i === 1) drawScroll(ctx, g - at);
            ctx.restore();
            if (i === 2) pixelCoin(ctx, it.x, it.y + bob, 64 * k, g * 0.08, false);
          });
          if (landed) drawShadow(ctx, { x: hx, y: hy, zoom: 0.4, shadow: 0.8 });
          chuteChar(ctx, sets, {
            color: "green",
            pose,
            x: hx,
            y: hy,
            zoom: 0.4,
            open: g < CAPSULE.land + 30 ? 1 : 0,
            swing: landed ? 0 : swingAt(t, T.capsule / 30) * 0.6,
            release: landed ? clamp01((g - CAPSULE.land - 3) / 22) : 0,
          });
          dust(ctx, ISLAND.x, ISLAND.y, 0.4, (g - CAPSULE.land) / 30);
        }}
      />
      {g >= CAPSULE.shell && (
        <div
          style={{
            position: "absolute",
            left: ISLAND.x - 165,
            top: ISLAND.y - 350,
            width: 330,
            height: 370,
            borderRadius: 165,
            border: `6px solid ${MINT}`,
            background: "linear-gradient(100deg, rgba(255,255,255,0.28) 0%, rgba(134,239,172,0.12) 30%, rgba(134,239,172,0.06) 70%, rgba(255,255,255,0.2) 100%)",
            boxShadow: "0 0 40px rgba(134,239,172,0.45)",
            transform: `scale(${shell})`,
            transformOrigin: "50% 100%",
          }}
        >
          <div style={{ position: "absolute", left: 46, top: 50, width: 18, height: 110, borderRadius: 9, background: "rgba(255,255,255,0.6)" }} />
        </div>
      )}
      {ITEMS.map((it, i) => (
        <Label key={it.label} x={it.x} y={it.ly} text={it.label} at={CAPSULE.items[i] + 6} size={34} />
      ))}
      <Title text="every pillee lives in a capsule." at={8} y={110} size={80} />
    </AbsoluteFill>
  );
}

/* ---------- 4. Everyone drops in ---------- */

const GORE_FOR = { pink: "pink", blue: "blue", yellow: "yellow", orange: "orange", teal: "mint", purple: "purple", red: "pink", green: "mint" };
const GROUND = 880;
const CZ = 0.3;

export function CrowdScene() {
  const g = useCurrentFrame();
  const f = g + T.crowd;
  const t = f / 30;
  return (
    <AbsoluteFill>
      <Paint
        draw={(ctx, sets) => {
          drawSky(ctx, f, { rush: -g * 0.4 });
          drawCliff(ctx, { edge: W + 200, top: GROUND, offX: 0, offY: 0 });
          const list = CROWD.map(([color, x, land], i) => {
            const start = land - 52;
            if (g < start) return null;
            const p = clamp01((g - start) / (land - start));
            const y = lerp(-140, GROUND, 1 - (1 - p) ** 1.6);
            const sway = (x < 960 ? 1 : -1) * 70 * (1 - p);
            const landed = g >= land;
            const pose = landed
              ? g > land + 8
                ? cheer(t + hash(i) * 2, smoothstep((land + 8) / 30, (land + 14) / 30, t), { face: x < 960 ? 1 : -1 })
                : landPose(t, land / 30, { face: x < 960 ? 1 : -1 })
              : hang(t + i, { face: x < 960 ? 1 : -1, eyes: eyes(t, { look: [0, 0.9] }) });
            return { i, color, x: x - sway, y, land, landed, pose, p };
          });
          for (const c of list) if (c && c.p > 0.6) drawShadow(ctx, { x: c.x, y: GROUND, zoom: CZ, shadow: (c.p - 0.6) * 2.5 });
          for (const c of list) {
            if (!c) continue;
            const release = c.landed ? clamp01((g - c.land - 2) / 24) : 0;
            chuteChar(ctx, sets, { color: c.color, pose: c.pose, x: c.x, y: c.y, zoom: CZ, swing: c.landed ? 0 : Math.sin(g * 0.1 + c.i) * 0.08, release, gores: GORES[GORE_FOR[c.color]] });
            dust(ctx, c.x, GROUND, CZ, (g - c.land) / 30);
          }
        }}
      />
      <Title text="capsules that hunt the spread." at={8} y={120} size={84} />
      <Title text="spread hunters · fee recyclers · your own rules" at={40} y={240} size={40} color={MINT} />
    </AbsoluteFill>
  );
}

/* ---------- 5. Wordmark + pillees.fun ---------- */

function Confetti({ at }) {
  const f = useCurrentFrame();
  const g = f - at;
  if (g < 0 || g > 90) return null;
  const colors = ["#86efac", "#f7a8cb", "#8fd0fa", "#fde68a", "#c9b6ff", "#fdba74"];
  return (
    <AbsoluteFill>
      {Array.from({ length: 90 }, (_, i) => {
        const a = hash(i) * Math.PI * 2;
        const v = 10 + hash(i + 1) * 22;
        const x = 960 + (hash(i + 2) - 0.5) * 900 + Math.cos(a) * v * g * 0.6;
        const y = 300 + Math.sin(a) * v * g * 0.5 - 14 * g + 0.75 * g * g;
        const s = 10 + hash(i + 3) * 10;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, background: colors[i % colors.length], transform: `rotate(${g * (8 + hash(i + 4) * 20)}deg) scaleY(${Math.cos(g * 0.3 + i)})` }} />;
      })}
    </AbsoluteFill>
  );
}

const PILL = { x: 960, y: 700, w: 760, h: 120 };
const HERO_END_X = 1230;

export function EndScene() {
  const g = useCurrentFrame();
  const f = g + T.end;
  const t = f / 30;
  const word = Math.max(0, Math.min(WORD.length, Math.floor((g - END.word) / END.step) + 1));
  const url = Math.max(0, Math.min(URL.length, Math.floor((g - END.url) / END.urlStep) + 1));
  const pill = usePop(END.pill, { damping: 12, stiffness: 160, mass: 0.7 });
  const blink = Math.floor(g / 8) % 2 === 0;
  const fade = clamp01((g - END.fade) / 12);
  const start = END.land - 46;
  const p = clamp01((g - start) / 46);
  const hy = lerp(-160, PILL.y - PILL.h / 2, 1 - (1 - p) ** 1.6);
  const landed = g >= END.land;
  const pose = landed
    ? g > END.land + 10
      ? cheer(t, smoothstep((END.land + 10) / 30, (END.land + 16) / 30, t))
      : landPose(t, END.land / 30)
    : hang(t, { eyes: eyes(t, { look: [-0.6, 0.6] }) });
  return (
    <AbsoluteFill>
      <Paint draw={(ctx) => drawSky(ctx, f, { rush: -g * 0.4 })} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center", fontFamily: PIXEL, fontWeight: 700, fontSize: 250, lineHeight: 1, color: "#fff", textShadow: `0 12px 0 #2f8a5a, 0 24px 0 rgba(4,6,15,0.5)` }}>
        {WORD.slice(0, word)}
        <span style={{ visibility: "hidden" }}>{WORD.slice(word)}</span>
      </div>
      {g >= END.pill && (
        <div
          style={{
            position: "absolute",
            left: PILL.x - PILL.w / 2,
            top: PILL.y - PILL.h / 2,
            width: PILL.w,
            height: PILL.h,
            borderRadius: 30,
            background: "rgba(4,8,14,0.82)",
            border: `5px solid ${MINT}`,
            boxShadow: `0 10px 0 #2f8a5a`,
            display: "flex",
            alignItems: "center",
            gap: 26,
            padding: "0 40px",
            transform: `scale(${pill})`,
            fontFamily: PIXEL,
            fontWeight: 700,
            fontSize: 72,
            color: "#fff",
          }}
        >
          <svg width="40" height="48" viewBox="0 0 10 12" style={{ flex: "none" }}>
            <rect x="1" y="5" width="8" height="7" fill={MINT} />
            <rect x="2" y="1" width="1.5" height="4" fill={MINT} />
            <rect x="6.5" y="1" width="1.5" height="4" fill={MINT} />
            <rect x="2" y="0" width="6" height="1.5" fill={MINT} />
          </svg>
          <span>
            {URL.slice(0, url)}
            <span style={{ display: "inline-block", width: 14, height: 64, marginLeft: 6, verticalAlign: "-8px", background: MINT, opacity: url < URL.length || blink ? 1 : 0 }} />
          </span>
        </div>
      )}
      <Paint
        draw={(ctx, sets) => {
          if (g < start) return;
          chuteChar(ctx, sets, {
            color: "green",
            pose,
            x: lerp(HERO_END_X + 160, HERO_END_X, p),
            y: hy,
            zoom: 0.28,
            swing: landed ? 0 : swingAt(t, start / 30) * 0.5,
            release: landed ? clamp01((g - END.land - 2) / 24) : 0,
          });
          dust(ctx, HERO_END_X, PILL.y - PILL.h / 2, 0.28, (g - END.land) / 30);
        }}
      />
      <Title text="your wallet · your strategy · one-swap routes" at={END.line} y={830} size={36} color="#9fb3c3" />
      <Confetti at={END.word + WORD.length * END.step} />
      <AbsoluteFill style={{ background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
}

/* ---------- Pixel wipe between scenes ---------- */

export function Wipe() {
  const f = useCurrentFrame();
  const cut = CUTS.find((c) => Math.abs(f - c) < 10);
  if (cut == null) return null;
  const p = (1 - Math.abs(f - cut) / 10) * 1.05;
  const size = 80;
  const cols = W / size;
  const rows = Math.ceil(H / size);
  const cells = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const th = 0.1 + 0.9 * (0.55 * ((i / cols + j / rows) / 2) + 0.45 * hash(i * 7 + j * 131 + cut));
      if (th < p) cells.push(<div key={`${i}-${j}`} style={{ position: "absolute", left: i * size, top: j * size, width: size, height: size, background: "#05070d" }} />);
    }
  }
  return <AbsoluteFill>{cells}</AbsoluteFill>;
}
