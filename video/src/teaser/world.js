import { clamp01, hash, lerp, smoothstep } from "../../../web/src/pillee.js";

export const W = 1920;
export const H = 1080;
export const S = 10;
const snap = (v) => Math.round(v / S) * S;

/* ---------- Colour ---------- */

const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, p) => toHex(rgb(a).map((v, i) => lerp(v, rgb(b)[i], p)));

const PALETTES = {
  night: { sky: ["#04060f", "#0a1430", "#183556", "#2a5d6c"], far: "#142c44", near: "#0c1a2b", cloud: "#8fa7b8", sun: "#e9efe6", stars: 1, aurora: 0.4 },
  dawn: { sky: ["#1b1240", "#5b2c6f", "#d86a7c", "#f7b98a"], far: "#4a2a62", near: "#2b1744", cloud: "#ffd2c4", sun: "#fff1c9", stars: 0.3, aurora: 0 },
  day: { sky: ["#2a64c4", "#4f97e6", "#9fd3f4", "#eaf5e8"], far: "#7fb3dc", near: "#5b93c4", cloud: "#ffffff", sun: "#fff7da", stars: 0, aurora: 0 },
  dusk: { sky: ["#140832", "#3d166b", "#963a8c", "#f2916c"], far: "#3a1a64", near: "#220e40", cloud: "#f4b0c2", sun: "#ffd9a6", stars: 0.45, aurora: 0 },
  aurora: { sky: ["#03050c", "#08122a", "#0e3040", "#12584a"], far: "#0e2236", near: "#081523", cloud: "#7f9cad", sun: "#e9efe6", stars: 1, aurora: 1 },
};

const KEYS = [
  [0, "night"],
  [175, "night"],
  [300, "dawn"],
  [345, "day"],
  [700, "day"],
  [780, "dusk"],
  [920, "dusk"],
  [970, "aurora"],
];

export function paletteAt(f) {
  let i = 0;
  while (i < KEYS.length - 2 && f >= KEYS[i + 1][0]) i++;
  const [f0, a] = KEYS[i];
  const [f1, b] = KEYS[i + 1];
  const p = smoothstep(f0, f1, f);
  const A = PALETTES[a];
  const B = PALETTES[b];
  const out = {};
  for (const k of Object.keys(A)) {
    out[k] = Array.isArray(A[k]) ? A[k].map((c, j) => mix(c, B[k][j], p)) : typeof A[k] === "string" ? mix(A[k], B[k], p) : lerp(A[k], B[k], p);
  }
  return out;
}

/* ---------- Sky ---------- */

function ridge(x, seed) {
  return 0.5 + 0.28 * Math.sin(x * 2.1 + seed) + 0.15 * Math.sin(x * 5.3 + seed * 2.3) + 0.07 * Math.sin(x * 13.7 + seed * 4.1);
}

function pixelCloud(ctx, x, y, w, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const rows = Math.max(2, Math.round(w / 5 / S));
  for (let r = 0; r < rows; r++) {
    const v = (r + 0.5) / rows;
    const bump = 0.55 + 0.45 * Math.sin(v * Math.PI);
    const half = snap((w / 2) * bump * (r < rows / 2 ? 0.7 + 0.3 * (r / (rows / 2)) : 1));
    ctx.fillRect(snap(x) - half, snap(y) + r * S, half * 2, S);
  }
  ctx.globalAlpha = 1;
}

// camY: how far the camera has dropped. rush: upward cloud travel (for falling).
export function drawSky(ctx, f, { camY = 0, camX = 0, rush = 0, mountains = 1, sun = [1490, 230] } = {}) {
  const pal = paletteAt(f);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  pal.sky.forEach((c, i) => g.addColorStop(i / 3, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (pal.aurora > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 3; k++) {
      const ay = H * (0.18 + k * 0.06) - camY * 0.03;
      ctx.fillStyle = `rgba(134,239,172,${(0.11 - k * 0.03) * pal.aurora})`;
      for (let x = 0; x < W; x += S * 2) {
        const top = snap(ay + Math.sin((x / W) * 5 + f * 0.012 + k * 1.7) * H * 0.05 - H * 0.08);
        const bot = snap(ay + Math.sin((x / W) * 5 + f * 0.012 + k * 1.7 + 0.6) * H * 0.04 + H * 0.07);
        ctx.fillRect(x, top, S * 2, bot - top);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  if (pal.stars > 0.01) {
    for (let i = 0; i < 150; i++) {
      const x = (hash(i) * W - camX * 0.03 + W) % W;
      const y = hash(i + 300) * H * 0.7 - camY * 0.03;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(f * 0.03 * (0.6 + hash(i + 9)) + i));
      ctx.globalAlpha = pal.stars * (0.25 + hash(i + 77) * 0.6) * tw;
      ctx.fillStyle = hash(i + 41) > 0.85 ? "#c8f7d6" : "#eef3f7";
      const size = hash(i + 51) > 0.9 ? 5 : 3;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  const [sx, sy0] = sun;
  const sy = sy0 - camY * 0.05;
  const r = 60;
  const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 5);
  halo.addColorStop(0, pal.sun + "40");
  halo.addColorStop(1, pal.sun + "00");
  ctx.fillStyle = halo;
  ctx.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
  ctx.fillStyle = pal.sun;
  for (let yy = -r; yy < r; yy += S) {
    const half = snap(Math.sqrt(Math.max(0, r * r - (yy + S / 2) ** 2)));
    ctx.fillRect(sx - half, sy + yy, half * 2, S);
  }

  if (mountains > 0) {
    ctx.globalAlpha = mountains;
    for (const [base, amp, seed, freq, color, para] of [
      [0.72, 0.26, 1.3, 2.4, pal.far, 0.12],
      [0.83, 0.2, 4.1, 3.6, pal.near, 0.25],
    ]) {
      const oy = -camY * para;
      ctx.fillStyle = color;
      for (let x = 0; x < W; x += S) {
        const wx = ((x + camX * para) / W) * freq;
        const top = snap(H * base - H * amp * ridge(wx, seed)) + oy;
        if (top < H) ctx.fillRect(x, top, S, H - top + S);
      }
    }
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < 14; i++) {
    const depth = 0.4 + hash(i + 7) * 0.9;
    const span = H * 2.4;
    const x = ((hash(i + 900) * 1.3 - 0.15) * W + f * 0.6 * depth - camX * depth * 0.5) % (W * 1.3) - W * 0.1;
    const y = (((hash(i + 901) * span - rush * depth - camY * 0.15 * depth) % span) + span) % span - H * 0.4;
    pixelCloud(ctx, x, y, 160 + depth * 260, pal.cloud, 0.22 + depth * 0.25);
  }
  return pal;
}

// A thick layer of cloud whose middle sits at screen y `y`.
export function cloudBank(ctx, f, y, color) {
  for (let i = 0; i < 46; i++) {
    const row = (i % 9) / 8;
    const x = (hash(i + 40) * 1.4 - 0.2) * W + Math.sin(f * 0.02 + i) * 20;
    const cy = y + (row - 0.5) * 760 + (hash(i + 41) - 0.5) * 120;
    pixelCloud(ctx, x, cy, 520 + hash(i + 42) * 520, color, 0.55 + 0.45 * Math.sin(row * Math.PI));
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, snap(y - 220), W, 440);
}

/* ---------- Ground pieces ---------- */

const ROCK = ["#1a2029", "#1f2631", "#252d39", "#2b3441", "#323c4a"];
const GRASS = ["#4f9e6c", "#4a9466", "#2f6d48", "#3d8459"];

function grassCol(ctx, x, top, col, rows = 4) {
  for (let r = 0; r < rows; r++) {
    const n = hash(col * 13.1 + r * 7.7 + 90);
    ctx.fillStyle = r === 0 ? GRASS[0] : n > 0.72 ? GRASS[1] : n < 0.2 ? GRASS[2] : GRASS[3];
    ctx.fillRect(x, top + r * S, S, S);
  }
  if (hash(col + 40) > 0.55) {
    ctx.fillStyle = hash(col + 70) > 0.5 ? "#5fb07c" : "#3d8459";
    ctx.fillRect(x, top - S / 2, S, S / 2);
  }
  ctx.fillStyle = "#24583a";
  ctx.fillRect(x, top + rows * S, S, S);
}

function rockCol(ctx, x, from, to, col, tones = ROCK) {
  for (let y = snap(from); y < to; y += S) {
    const j = y / S;
    const r = hash(col * 31 + j * 17);
    const band = Math.floor((j + Math.floor(hash(col + 5) * 3)) / 4) % 2;
    ctx.fillStyle = tones[Math.min(tones.length - 1, Math.floor(r * 3.2) + band)];
    ctx.fillRect(x, y, S, S);
  }
}

// A cliff whose grass top is at `top` and whose sheer face is at `edge`.
export function drawCliff(ctx, { edge, top, offX = 0, offY = 0 }) {
  const t = snap(top - offY);
  if (t > H) return;
  for (let x = 0; x < edge - offX; x += S) {
    const col = Math.floor((x + offX) / S);
    rockCol(ctx, x, t + 4 * S, H, col);
    grassCol(ctx, x, t, col);
    if (x > edge - offX - S * 3) {
      ctx.fillStyle = "rgba(160,205,215,0.25)";
      ctx.fillRect(x, t + 4 * S, S, H);
    }
  }
  for (let y = t + 5 * S; y < H; y += S) {
    const jag = Math.round((hash(y * 0.17) - 0.5) * 2.6) * S;
    ctx.fillStyle = "#11161d";
    ctx.fillRect(edge - offX + jag - S, y, S, S);
  }
}

// A floating island: grass top centred at (x, y), rock tapering to a point.
export function drawIsland(ctx, x, y, w, seed = 0) {
  const x0 = snap(x - w / 2);
  const cols = Math.round(w / S);
  for (let c = 0; c < cols; c++) {
    const px = x0 + c * S;
    const u = (c + 0.5) / cols;
    const depth = snap(w * 0.55 * Math.sin(u * Math.PI) ** 1.4 * (0.75 + 0.25 * hash(c + seed * 50)));
    rockCol(ctx, px, y + 4 * S, y + 4 * S + depth, c + seed * 97);
    grassCol(ctx, px, snap(y), c + seed * 97);
  }
}

/* ---------- Parachute (ported from the site intro) ---------- */

const CANOPY_RIM = -750;
const CANOPY_H = 140;
const CANOPY_W = 580;
export const PIVOT = 760;
const HARNESS = [[-150, -400], [125, -360]];
export const GORES = {
  mint: [["#86efac", "#5fd08a", "#3a9d62"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
  pink: [["#f7a8cb", "#e47fae", "#b85583"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
  blue: [["#8fd0fa", "#5fb0e8", "#3a7fb8"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
  yellow: [["#fde68a", "#f2c94c", "#c79a22"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
  purple: [["#c9b6ff", "#a48cf0", "#7559c4"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
  orange: [["#fdba74", "#f59a45", "#c46d1f"], ["#f4f5f1", "#d6d9d3", "#a9aea7"]],
};

function drawCanopy(ctx, open, lines, gores) {
  const width = CANOPY_W * (0.2 + 0.8 * open);
  const height = CANOPY_H * (0.3 + 0.7 * open);
  const px = 20;
  const rows = Math.ceil(height / px);
  const gore = width / 6;
  if (lines > 0) {
    ctx.globalAlpha *= lines;
    ctx.strokeStyle = "rgba(225,232,228,0.8)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (const [i, rim] of [-0.5, -1 / 6, 1 / 6, 0.5].entries()) {
      const [hx, hy] = HARNESS[i < 2 ? 0 : 1];
      ctx.moveTo(rim * width, CANOPY_RIM);
      ctx.lineTo(hx, hy);
    }
    ctx.stroke();
    ctx.globalAlpha /= lines;
  }
  for (let r = 0; r < rows; r++) {
    const y = CANOPY_RIM - height + r * px;
    const v = (CANOPY_RIM - (y + px / 2)) / height;
    const half = Math.round(((width / 2) * Math.sqrt(Math.max(0, 1 - v * v))) / px) * px;
    if (half <= 0) continue;
    const shade = r / rows > 0.72 ? 2 : 1;
    for (let g = 0; g < 6; g++) {
      const x0 = Math.max(-half, -width / 2 + g * gore);
      const x1 = Math.min(half, -width / 2 + (g + 1) * gore);
      if (x1 <= x0) continue;
      const tone = g === 0 && shade === 1 ? 0 : g > 3 ? Math.min(2, shade + 1) : shade;
      ctx.fillStyle = gores[g % 2][tone === 1 && r < 2 ? 0 : tone];
      ctx.fillRect(x0, y, x1 - x0 + 0.5, px + 0.5);
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-width * 0.3, CANOPY_RIM - height * 0.86, px * 2, px);
  ctx.fillRect(-width * 0.36, CANOPY_RIM - height * 0.72, px, px);
}

// Canopy for a character standing at (x, y). release 0..1 flies it away.
export function drawChute(ctx, { x, y, zoom, open, swing = 0, release = 0, gores = GORES.mint }) {
  if (open <= 0 || release >= 1) return;
  ctx.save();
  if (release > 0) {
    const r = release * release;
    ctx.translate(x + r * 700, y - zoom * PIVOT - r * 600);
    ctx.rotate(r * 0.9);
    ctx.globalAlpha = 1 - smoothstep(0.4, 1, release);
    ctx.scale(zoom * (1 - r * 0.3), zoom * (1 - r * 0.5));
    ctx.translate(0, PIVOT);
  } else {
    ctx.translate(x, y - zoom * PIVOT);
    ctx.rotate(swing);
    ctx.translate(0, zoom * PIVOT);
    ctx.scale(zoom, zoom);
  }
  drawCanopy(ctx, open, 1 - clamp01(release * 6), gores);
  ctx.restore();
}

/* ---------- Bits ---------- */

export function speedLines(ctx, f, amount, scroll) {
  if (amount <= 0) return;
  ctx.fillStyle = "rgba(235,242,250,0.3)";
  for (let i = 0; i < 34; i++) {
    const span = H * 1.6;
    const y = span - ((hash(i + 500) * span + scroll * 1.4) % span) - H * 0.3;
    const x = hash(i + 501) * W;
    ctx.globalAlpha = amount * (0.4 + hash(i + 502) * 0.6);
    ctx.fillRect(snap(x), y, 4, H * (0.08 + hash(i + 503) * 0.12) * amount);
  }
  ctx.globalAlpha = 1;
}

export function dust(ctx, x, y, zoom, life) {
  if (life <= 0 || life > 0.8) return;
  const pix = Math.max(4, zoom * 16);
  for (let i = 0; i < 24; i++) {
    const dir = i % 2 ? 1 : -1;
    const fade = 1 - clamp01(life / (0.45 + hash(i + 800) * 0.3));
    if (fade <= 0) continue;
    const out = 1 - Math.exp(-life * 6);
    const px = x + dir * (zoom * 140 + (zoom * (260 + hash(i + 700) * 420) / 6) * out);
    const py = y - zoom * (8 + hash(i + 600) * 50) - out * zoom * (30 + hash(i + 500) * 90);
    const size = pix * (1 + hash(i + 900) * 1.4) * (0.6 + 0.4 * fade);
    ctx.globalAlpha = fade * 0.75;
    ctx.fillStyle = i % 4 ? "#d9ddd6" : "#86efac";
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

export function pixelCoin(ctx, x, y, r, spin = 0, lit = 0) {
  const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
  const s = 6;
  for (let yy = -r; yy < r; yy += s) {
    const half = Math.round((Math.sqrt(Math.max(0, r * r - (yy + s / 2) ** 2)) * sx) / s) * s;
    const edge = Math.max(s, Math.round((half * 0.18) / s) * s);
    ctx.fillStyle = "#1a1408";
    ctx.fillRect(x - half - s, y + yy, half * 2 + s * 2, s);
    ctx.fillStyle = lit ? "#a7f3c4" : "#ffd34d";
    ctx.fillRect(x - half, y + yy, half * 2, s);
    ctx.fillStyle = lit ? "#4fc98a" : "#e09a22";
    ctx.fillRect(x + half - edge, y + yy, edge, s);
  }
}
