import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { footfalls } from "../src/teaser/motion.js";
import { ARB, CAPSULE, CLIFF, CROWD, CUTS, END, FPS, HOP, T, TOTAL, URL as SITE, WORD } from "../src/teaser/timeline.js";

// 120 BPM chiptune in C G Am F (one bar = 2s = 60 frames), synced to the teaser timeline.
const SR = 44100;
const BAR = 2;
const DUR = TOTAL / FPS;
const sec = (frame) => frame / FPS;
const DROP = sec(T.chute);
const FINALE = sec(T.crowd);
const END_AT = sec(T.end + END.line + 26);
const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 11;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const coef = (fc) => 1 - Math.exp((-2 * Math.PI * Math.max(1, fc)) / SR);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function put(i, l, r = l) {
  if (i >= 0 && i < N) {
    L[i] += l;
    R[i] += r;
  }
}

const osc = {
  square: (ph, duty = 0.5) => (ph % 1 < duty ? 1 : -1),
  tri: (ph) => 1 - 4 * Math.abs((ph % 1) - 0.5),
  saw: (ph) => 2 * (ph % 1) - 1,
  sine: (ph) => Math.sin(ph * 2 * Math.PI),
};

function tone(t0, dur, f, { wave = "square", level = 0.1, attack = 0.004, decay = 0, release = 0.03, pan = 0, duty = 0.5, vibrato = 0 } = {}) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor((dur + release) * SR);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const tn = j / SR;
    const hz = (typeof f === "function" ? f(tn) : f) * (1 + vibrato * Math.sin(tn * 2 * Math.PI * 5.5) * clamp01(tn / 0.15));
    ph += hz / SR;
    const env = clamp01(tn / attack) * (decay ? Math.exp(-tn * decay) : 1) * (tn > dur ? clamp01(1 - (tn - dur) / release) : 1);
    const s = osc[wave](ph, duty) * env * level;
    put(start + j, s * (1 - pan), s * (1 + pan));
  }
}

function hit(t0, { dur = 0.1, hp = 0, lp = 9000, level = 0.2, decay = 30, pan = 0 } = {}) {
  const start = Math.floor(t0 * SR);
  let a = 0;
  let b = 0;
  for (let j = 0; j < SR * dur; j++) {
    const n = noise();
    a += coef(lp) * (n - a);
    b += coef(hp || 1) * (a - b);
    const s = (hp ? a - b : a) * Math.exp((-j / SR) * decay) * level;
    put(start + j, s * (1 - pan), s * (1 + pan));
  }
}

function sweep(t0, dur, { from = 400, to = 7000, level = 0.12, shape = (p) => Math.sin(p * Math.PI) ** 2 } = {}) {
  const start = Math.floor(t0 * SR);
  let a = 0;
  for (let j = 0; j < SR * dur; j++) {
    const p = j / (SR * dur);
    a += coef(from + (to - from) * p) * (noise() - a);
    const s = a * shape(p) * level;
    put(start + j, s * (1.3 - p * 0.6), s * (0.7 + p * 0.6));
  }
}

/* ---------- Music ---------- */

const CHORDS = [
  [60, 64, 67],
  [59, 62, 67],
  [57, 60, 64],
  [57, 60, 65],
];
const ROOTS = [36, 43, 45, 41];
const LEAD = [
  [72, -1, 76, 79, 81, 79, 76, -1],
  [74, -1, 79, -1, 76, 74, 72, -1],
  [69, 72, 76, -1, 74, 72, 69, -1],
  [69, -1, 72, 74, 76, -1, 74, 72],
];
const chordAt = (t) => Math.floor(t / BAR) % 4;

// Night pad before the drop: soft detuned triangles.
for (let bar = 0; bar * BAR < DROP; bar++) {
  const t0 = bar * BAR;
  CHORDS[bar % 4].forEach((m, k) => {
    for (const d of [-0.004, 0.004]) {
      tone(t0, BAR - 0.1, midi(m - 12) * (1 + d), { wave: "tri", level: 0.035, attack: 0.5, release: 0.4, pan: (k - 1) * 0.6 });
    }
  });
}
// Twinkly arp before the drop.
for (let s = 0; s * 0.25 < DROP - 0.5; s++) {
  const t = s * 0.25;
  if (t < 0.6) continue;
  const chord = CHORDS[chordAt(t)];
  tone(t, 0.08, midi(chord[s % 3] + 12), { wave: "square", duty: 0.25, level: 0.022 * (t < sec(T.jump) ? 1 : 0.6), decay: 14, pan: s % 2 ? 0.5 : -0.5 });
}

for (let bar = 0; bar * BAR < END_AT; bar++) {
  const t0 = bar * BAR;
  const c = bar % 4;
  const finale = t0 >= FINALE;
  for (let e = 0; e < 16; e++) {
    const t = t0 + e * 0.125;
    if (t < DROP || t >= END_AT) continue;
    CHORDS[c].forEach((m, k) => tone(t, 0.07, midi(m), { wave: "square", duty: 0.25, level: 0.02, decay: 18, pan: (k - 1) * 0.5 }));
  }
  for (let q = 0; q < 8; q++) {
    const t = t0 + q * 0.25;
    if (t < DROP || t >= END_AT) continue;
    tone(t, 0.2, midi(ROOTS[c] + (q % 2 ? 12 : 0)), { wave: "tri", level: 0.2, release: 0.02 });
  }
  LEAD[c].forEach((m, q) => {
    const t = t0 + q * 0.25;
    if (m < 0 || t < DROP || t >= END_AT) return;
    const len = LEAD[c][q + 1] === -1 ? 0.45 : 0.21;
    const note = midi(m + (finale ? 12 : 0));
    tone(t, len, note, { wave: "square", level: 0.065, vibrato: 0.006, release: 0.05, pan: 0.1 });
    tone(t + 0.1875, len, note, { wave: "square", duty: 0.125, level: 0.017, release: 0.05, pan: -0.5 });
  });
  for (let q = 0; q < 4; q++) {
    const t = t0 + q * 0.5;
    if (t < DROP || t >= END_AT) continue;
    tone(t, 0.12, (tn) => 50 + 140 * Math.exp(-tn * 40), { wave: "sine", level: 0.45, decay: 14 });
    if (q % 2) hit(t, { dur: 0.16, hp: 900, lp: 6000, level: 0.22, decay: 22 });
    for (let h = 0; h < 2; h++) hit(t + h * 0.25 + (finale ? 0.125 : 0), { dur: 0.04, hp: 6000, lp: 14000, level: 0.07, decay: 70, pan: 0.3 });
  }
}
CHORDS[0].forEach((m, k) => tone(END_AT, 1.2, midi(m + 12), { wave: "square", duty: 0.25, level: 0.03, decay: 2, release: 0.2, pan: (k - 1) * 0.5 }));
tone(END_AT, 1.2, midi(36), { wave: "tri", level: 0.22, decay: 1.8 });

/* ---------- SFX ---------- */

const step = (frame, pan = 0, level = 0.09) => {
  hit(sec(frame), { dur: 0.05, hp: 200, lp: 2400, level, decay: 60, pan });
  tone(sec(frame), 0.03, (tn) => 160 - tn * 1500, { wave: "tri", level: level * 0.9, release: 0.01, pan });
};
const blip = (frame, up = 0, level = 0.07) => tone(sec(frame), 0.06, (tn) => midi(84 + up) * (1 + tn * 6), { wave: "square", duty: 0.25, level });
const tick = (frame, pan = 0) => tone(sec(frame), 0.018, midi(96), { wave: "square", level: 0.03, release: 0.005, pan });
const thud = (frame, level = 0.25) => tone(sec(frame), 0.08, (tn) => 140 - tn * 900, { wave: "tri", level, release: 0.02 });
const pop = (frame, m = 79, level = 0.06) => tone(sec(frame), 0.05, (tn) => midi(m) * (1 + tn * 12), { wave: "square", level });
const chutePop = (frame, level = 1) => {
  hit(sec(frame), { dur: 0.25, hp: 300, lp: 3000, level: 0.3 * level, decay: 14 });
  tone(sec(frame), 0.1, (tn) => 90 + 200 * Math.exp(-tn * 30), { wave: "sine", level: 0.35 * level, decay: 10 });
};

// Cliff walk, the "!", the crouch and the jump.
for (const f of footfalls({ from: T.walk, x0: CLIFF.x0, x1: CLIFF.x1, zoom: CLIFF.zoom, omega: CLIFF.omega })) step(f, (f / T.notice) * 0.6 - 0.3);
blip(T.notice, 7, 0.08);
tone(sec(T.notice + 3), 0.12, (tn) => midi(88) * (1 - tn * 2), { wave: "square", duty: 0.25, level: 0.05 });
tone(sec(T.jump - 14), 0.15, (tn) => 300 - tn * 900, { wave: "square", duty: 0.25, level: 0.04 });
tone(sec(T.jump), 0.25, (tn) => 260 * 2 ** (tn * 8), { wave: "square", duty: 0.25, level: 0.06 });
sweep(sec(T.jump), 0.4, { level: 0.12 });

// Free fall: wind and a riser into the cloud bank, then into the chute.
sweep(sec(T.jump + 6), sec(T.chute - T.jump - 6), { from: 300, to: 5000, level: 0.12, shape: (p) => clamp01(p * 3) * (0.5 + 0.5 * p) });
sweep(sec(196), 1.2, { from: 6000, to: 800, level: 0.16 });
tone(sec(T.jump + 20), sec(T.chute - T.jump - 20), (tn) => midi(48) * 2 ** (tn / 2.6), { wave: "saw", level: 0.018 });
chutePop(T.chute);
blip(T.chute + 6, 12, 0.06);
sweep(sec(T.glideOut + 2), 0.9, { from: 600, to: 6000, level: 0.1 });

// Pixel wipes.
for (const c of CUTS) sweep(sec(c - 10), 0.6, { from: 800, to: 8000, level: 0.1 });

// multi_hop_swap: node lights and chips.
HOP.nodes.forEach(([, x], i) => {
  const g = Math.round(((x + 220) * 205) / 2380);
  pop(T.hop + g, 79 + i * 4, 0.07);
  tone(sec(T.hop + g + 2), 0.1, midi(91 + i * 4), { wave: "square", duty: 0.25, level: 0.04, decay: 12 });
});
for (const [i, g] of HOP.chips.entries()) blip(T.hop + g, 5 + i * 3);
[0, 7, 12, 19].forEach((s2, k) => tone(sec(T.hop + HOP.spread) + k * 0.05, 0.1, midi(84 + s2), { wave: "square", duty: 0.25, level: 0.05, decay: 9 }));

// Arbitrage: land, grab the cheap coin, hop over, sell it higher.
const A = (g) => T.arb + g;
chutePop(A(0), 0.5);
thud(A(ARB.land));
pop(A(ARB.grab), 84, 0.07);
tone(sec(A(ARB.hop)), 0.3, (tn) => 240 * 2 ** (tn * 7), { wave: "square", duty: 0.25, level: 0.06, vibrato: 0.02 });
sweep(sec(A(ARB.hop)), 0.9, { from: 600, to: 5000, level: 0.07 });
thud(A(ARB.hop + ARB.hopDur));
tone(sec(A(ARB.drop + 8)), 0.25, midi(96), { wave: "square", level: 0.06, decay: 10 });
[0, 4, 7, 12].forEach((s2, k) => tone(sec(A(ARB.drop + 4)) + k * 0.06, 0.12, midi(86 + s2), { wave: "square", level: 0.05, decay: 8 }));

// Capsule: land, shell shimmer, the three things it comes with.
const C = (g) => T.capsule + g;
chutePop(C(0), 0.5);
thud(C(CAPSULE.land));
tone(sec(C(CAPSULE.shell)), 0.5, (tn) => midi(67) * 2 ** (tn * 2), { wave: "tri", level: 0.06, release: 0.1 });
for (let k = 0; k < 8; k++) tone(sec(C(CAPSULE.shell)) + k * 0.05, 0.04, midi(88 + ((k * 7) % 12)), { wave: "sine", level: 0.045, decay: 20, pan: (k % 2) - 0.5 });
CAPSULE.items.forEach((at, i) => {
  pop(C(at), 76 + i * 3, 0.07);
  for (let k = 0; k < 4; k++) tick(C(at + 6 + k * 3), i - 1);
});
[0, 4, 7, 12].forEach((s2, k) => tone(sec(C(CAPSULE.cheer)) + k * 0.06, 0.12, midi(84 + s2), { wave: "square", level: 0.05, decay: 8 }));

// Crowd drop.
for (const [, , land] of CROWD) {
  chutePop(T.crowd + land - 52, 0.35);
  thud(T.crowd + land, 0.15);
  blip(T.crowd + land + 8, 12, 0.035);
}

// Wordmark, URL, landing, confetti.
for (let k = 0; k < WORD.length; k++) tone(sec(T.end + END.word + k * END.step), 0.03, midi(72 + [0, 2, 4, 5, 7, 9, 12][k]), { wave: "square", level: 0.06, release: 0.01 });
for (let k = 0; k < SITE.length; k++) tick(T.end + END.url + k * END.urlStep, (k / SITE.length) * 0.6 - 0.3);
{
  const at = sec(T.end + END.word + WORD.length * END.step);
  for (let k = 0; k < 24; k++) tone(at + k * 0.03 + rand() * 0.02, 0.04, midi(96 + Math.floor(rand() * 12)), { wave: "square", duty: 0.25, level: 0.03, decay: 30, pan: rand() * 1.6 - 0.8 });
  hit(at, { dur: 0.5, hp: 4000, lp: 14000, level: 0.1, decay: 6 });
}
chutePop(T.end + END.land - 46, 0.4);
thud(T.end + END.land, 0.2);
blip(T.end + END.land + 10, 12, 0.05);

/* ---------- Master ---------- */

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = clamp01((DUR - t) / 0.4) * clamp01(t / 0.05);
  L[i] = Math.tanh(L[i] * 1.2) * fade;
  R[i] = Math.tanh(R[i] * 1.2) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.9 / peak;
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0);
out.writeUInt32LE(36 + N * 4, 4);
out.write("WAVEfmt ", 8);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write("data", 36);
out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4);
}
const dir = fileURLToPath(new URL("../public/audio/", import.meta.url));
await mkdir(dir, { recursive: true });
await writeFile(`${dir}teaser.wav`, out);
console.log("wrote teaser.wav", (out.length / 1e6).toFixed(1), "MB, peak", peak.toFixed(2));
