import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { footfalls } from "../src/teaser/motion.js";
import { BUBBLES, CARDS, FPS, SOON, T, TOTAL, WORD, WORD_STEP, cardStart } from "../src/teaser/timeline.js";

// 120 BPM chiptune in C G Am F; one bar = 2s = 60 frames.
const SR = 44100;
const BAR = 2;
const DUR = TOTAL / FPS;
const FULL = T.cards / FPS;
const FINALE = T.crowd / FPS;
const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const sec = (frame) => frame / FPS;

let seed = 11;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const coef = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / SR);
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

// One note. `f` may be a function of note time for slides.
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
    put(start + j, s * (1 - pan) , s * (1 + pan));
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
const bars = Math.ceil(DUR / BAR);
const endAt = DUR - 1.2;

for (let bar = 0; bar < bars; bar++) {
  const t0 = bar * BAR;
  const c = bar % 4;
  const full = t0 >= FULL;
  const finale = t0 >= FINALE;
  if (t0 >= endAt) break;

  // Soft square chord stabs on 8ths, panned out.
  for (let e = 0; e < 16; e++) {
    const t = t0 + e * 0.125;
    if (t >= endAt) break;
    if (!full && e % 2) continue;
    CHORDS[c].forEach((m, k) =>
      tone(t, 0.07, midi(m), { wave: "square", duty: 0.25, level: full ? 0.022 : 0.016, decay: 18, pan: (k - 1) * 0.5 }),
    );
  }

  // Bass: triangle, root/octave bounce.
  if (t0 >= sec(T.purpleWalk)) {
    for (let q = 0; q < 8; q++) {
      const t = t0 + q * 0.25;
      if (t >= endAt) break;
      const m = ROOTS[c] + (q % 2 ? 12 : 0);
      tone(t, 0.2, midi(m), { wave: "tri", level: full ? 0.2 : 0.13, release: 0.02 });
    }
  }

  // Lead: square melody, an octave up in the finale.
  if (t0 >= sec(T.gm1) - 1) {
    LEAD[c].forEach((m, q) => {
      if (m < 0) return;
      const t = t0 + q * 0.25;
      if (t >= endAt) return;
      const len = LEAD[c][q + 1] === -1 ? 0.45 : 0.21;
      tone(t, len, midi(m + (finale ? 12 : 0)), { wave: "square", duty: 0.5, level: full ? 0.07 : 0.045, vibrato: 0.006, release: 0.05, pan: 0.1 });
      if (full) tone(t + 0.25 * 0.75, len, midi(m + (finale ? 12 : 0)), { wave: "square", duty: 0.125, level: 0.018, release: 0.05, pan: -0.5 });
    });
  }

  // Drums: chip kick/snare/hats once the update cards start.
  if (full) {
    for (let q = 0; q < 4; q++) {
      const t = t0 + q * 0.5;
      if (t >= endAt) break;
      tone(t, 0.12, (tn) => 50 + 140 * Math.exp(-tn * 40), { wave: "sine", level: 0.45, decay: 14 });
      if (q % 2) hit(t, { dur: 0.16, hp: 900, lp: 6000, level: 0.22, decay: 22 });
      for (let h = 0; h < 2; h++) hit(t + h * 0.25 + 0.125 * (finale ? 1 : 0), { dur: 0.04, hp: 6000, lp: 14000, level: 0.07, decay: 70, pan: 0.3 });
    }
  }
}

// Little arpeggio sparkle under the finale.
for (let s = 0; sec(T.crowd) + s * 0.0625 < endAt; s++) {
  const t = sec(T.crowd) + s * 0.0625;
  const c = Math.floor(t / BAR) % 4;
  const chord = CHORDS[c];
  tone(t, 0.05, midi(chord[s % 3] + 24), { wave: "square", duty: 0.25, level: 0.014, decay: 30, pan: s % 2 ? 0.6 : -0.6 });
}

// Final chord ring-out.
CHORDS[0].forEach((m, k) => tone(endAt, 1.0, midi(m + 12), { wave: "square", duty: 0.25, level: 0.03, decay: 2.2, release: 0.2, pan: (k - 1) * 0.5 }));
tone(endAt, 1.0, midi(36), { wave: "tri", level: 0.2, decay: 2 });

/* ---------- SFX synced to the animation ---------- */

const step = (frame, pan = 0, level = 0.09) => {
  hit(sec(frame), { dur: 0.05, hp: 200, lp: 2400, level, decay: 60, pan });
  tone(sec(frame), 0.03, (tn) => 160 - tn * 1500, { wave: "tri", level: level * 0.9, release: 0.01, pan });
};
const blip = (frame, up = 0) => tone(sec(frame), 0.06, (tn) => midi(84 + up) * (1 + tn * 6), { wave: "square", duty: 0.25, level: 0.07 });
const tick = (frame, pan = 0) => tone(sec(frame), 0.018, midi(96), { wave: "square", duty: 0.5, level: 0.03, release: 0.005, pan });
const boing = (frame) => tone(sec(frame), 0.22, (tn) => 220 * 2 ** (tn * 10), { wave: "square", duty: 0.25, level: 0.07, release: 0.03, vibrato: 0.02 });
const thud = (frame) => tone(sec(frame), 0.08, (tn) => 140 - tn * 900, { wave: "tri", level: 0.25, release: 0.02 });
const pop = (frame, m = 79) => tone(sec(frame), 0.05, (tn) => midi(m) * (1 + tn * 12), { wave: "square", duty: 0.5, level: 0.06 });
function swoosh(frame, len = 0.35, level = 0.12) {
  const start = Math.floor(sec(frame) * SR);
  let a = 0;
  for (let j = 0; j < SR * len; j++) {
    const p = j / (SR * len);
    a += coef(500 + 7000 * Math.sin(p * Math.PI)) * (noise() - a);
    const s = a * Math.sin(p * Math.PI) ** 2 * level;
    put(start + j, s * (1.4 - p), s * (0.6 + p));
  }
}

for (const f of footfalls({ from: T.greenWalk, x0: -260, x1: 770, zoom: 0.55, omega: 18 })) step(f, -0.4);
for (const f of footfalls({ from: T.purpleWalk, x0: 2180, x1: 1150, zoom: 0.55, omega: 18 })) step(f, 0.4);

for (const b of BUBBLES) {
  blip(b.at, b.who === "green" ? 0 : 3);
  const frames = Math.ceil(b.text.length / 1.6);
  for (let k = 2; k < frames; k += 2) tick(b.at + k, b.who === "green" ? -0.3 : 0.3);
}

swoosh(T.cards - 8, 0.4, 0.16);
CARDS.forEach((name, i) => {
  const s = cardStart(i);
  if (i) swoosh(s - 6, 0.3, 0.12);
  pop(s, 72 + i * 2);
  for (let k = 6; k < 6 + 10; k += 1) if (k % 2 === 0) tick(s + k, 0);
  if (name === "route") {
    boing(s + 0.26 * FPS);
    thud(s + 0.66 * FPS);
    blip(s + 0.68 * FPS, 5);
    boing(s + 0.84 * FPS);
    thud(s + 1.24 * FPS);
    blip(s + 1.26 * FPS, 8);
  }
  if (name === "fees") {
    swoosh(s + 7, 0.5, 0.06);
    tone(sec(s + 24), 0.25, midi(96), { wave: "square", duty: 0.5, level: 0.06, decay: 10 });
    tone(sec(s + 26), 0.3, midi(101), { wave: "square", duty: 0.5, level: 0.06, decay: 9 });
  }
  if (name === "middle") swoosh(s + 6, 1.2, 0.12);
  if (name === "migration") {
    tone(sec(s + 3), sec(15), (tn) => midi(60) * 2 ** (tn * 2.2), { wave: "square", duty: 0.25, level: 0.04 });
    pop(s + 18, 88);
    swoosh(s + 18, 0.6, 0.08);
  }
  if (name === "slippage") {
    thud(s + 14);
    hit(sec(s + 14), { dur: 0.2, hp: 300, lp: 4000, level: 0.25, decay: 18 });
    blip(s + 18, 12);
  }
});
swoosh(T.sowhat - 10, 0.35, 0.12);
swoosh(T.collage - 8, 0.35, 0.14);
for (let i = 0; i < 6; i++) pop(T.collage + 4 + i * 6, 76 + i * 2);
swoosh(T.crowd - 8, 0.35, 0.14);
for (let k = 0; k < WORD.length; k++) tone(sec(T.word + k * WORD_STEP), 0.03, midi(72 + [0, 2, 4, 5, 7, 9, 12][k % 7]), { wave: "square", duty: 0.5, level: 0.06, release: 0.01 });
{
  const at = sec(T.word + WORD.length * WORD_STEP);
  for (let k = 0; k < 24; k++) tone(at + k * 0.03 + rand() * 0.02, 0.04, midi(96 + Math.floor(rand() * 12)), { wave: "square", duty: 0.25, level: 0.03, decay: 30, pan: rand() * 1.6 - 0.8 });
  hit(at, { dur: 0.5, hp: 4000, lp: 14000, level: 0.1, decay: 6 });
}
for (let k = 0; k < SOON.length; k++) tick(T.soon + k * 5);

/* ---------- Master ---------- */

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = clamp01((DUR - t) / 0.3) * clamp01(t / 0.05);
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
