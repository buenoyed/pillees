import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Timeline shared with src/timeline.js: 120 BPM, one bar = 2s.
const SR = 44100;
const BEAT = 0.5;
const BAR = 2;
const DUR = 44;
const DROP = 6;
const OUTRO = 36;
const WHOOSHES = [10, 16, 20, 24, 30, 31.5, 33, 34.5];

const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 7;
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

const CHORDS = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 60, 64, 67],
  [55, 59, 62, 67],
];
const ROOTS = [33, 29, 36, 31];
const chordAt = (t) => Math.floor(t / BAR) % 4;
const inBeat = (t) => t >= DROP && t < OUTRO;

function duck(t) {
  if (!inBeat(t)) return 1;
  const ph = ((t - DROP) % BEAT) / BEAT;
  return 0.3 + 0.7 * clamp01(ph * 3) ** 1.6;
}

// Pad: detuned saws through a lowpass that opens at the drop.
{
  const phases = new Float64Array(16 * 3).map(() => rand());
  let lpL = 0;
  let lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const chord = CHORDS[chordAt(t)];
    const tb = t % BAR;
    const env = clamp01(tb / 0.18) * clamp01((BAR - tb) / 0.04);
    let sl = 0;
    let sr = 0;
    chord.forEach((note, n) => {
      for (let v = 0; v < 3; v++) {
        const k = n * 3 + v;
        const f = midi(note) * (1 + (v - 1) * 0.006);
        phases[k] = (phases[k] + f / SR) % 1;
        const s = 2 * phases[k] - 1;
        const pan = (v - 1) * 0.7;
        sl += s * (1 - pan) * 0.5;
        sr += s * (1 + pan) * 0.5;
      }
    });
    const open = t < DROP ? 500 + 900 * clamp01(t / DROP) ** 2 : t < OUTRO ? 2600 : 2600 - 1900 * clamp01((t - OUTRO) / 6);
    const a = coef(open);
    lpL += a * (sl - lpL);
    lpR += a * (sr - lpR);
    const fade = t > DUR - 3 ? clamp01((DUR - t) / 3) : 1;
    const g = 0.028 * env * duck(t) * fade * (t < 0.6 ? t / 0.6 : 1);
    put(i, lpL * g, lpR * g);
  }
}

// Bass: offbeat-pumping 8ths with a sine sub.
{
  let ph = 0;
  let sub = 0;
  let lp = 0;
  for (let i = Math.floor(DROP * SR); i < Math.floor(OUTRO * SR); i++) {
    const t = i / SR;
    const tn = (t - DROP) % 0.25;
    const f = midi(ROOTS[chordAt(t)] + 12);
    ph = (ph + f / SR) % 1;
    sub = (sub + f / 2 / SR) % 1;
    lp += coef(420 + 900 * Math.exp(-tn * 18)) * (2 * ph - 1 - lp);
    const env = Math.exp(-tn * 5) * clamp01(tn / 0.004);
    const s = (lp * 0.5 + Math.sin(sub * 2 * Math.PI) * 0.7) * env * duck(t) * 0.22;
    put(i, s);
  }
}

// Kick, clap, hats.
for (let beat = 0; beat * BEAT < OUTRO - DROP; beat++) {
  const t0 = DROP + beat * BEAT;
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let j = 0; j < SR * 0.45; j++) {
    const tn = j / SR;
    ph += (46 + 110 * Math.exp(-tn * 32)) / SR;
    const s = Math.sin(ph * 2 * Math.PI) * Math.exp(-tn * 6.5) * 0.62 + (tn < 0.003 ? noise() * 0.25 : 0);
    put(start + j, s);
  }
  if (beat % 2 === 1) {
    let hp = 0;
    let lp = 0;
    for (let j = 0; j < SR * 0.25; j++) {
      const tn = j / SR;
      const n = noise();
      lp += coef(2200) * (n - lp);
      hp += coef(700) * (lp - hp);
      const burst = tn < 0.03 ? 0.6 + 0.4 * Math.sin(tn * 2 * Math.PI * 100) : 1;
      const s = (lp - hp) * Math.exp(-tn * 16) * burst * 0.5;
      put(start + j, s * 0.9, s);
    }
  }
  const hatStart = Math.floor((t0 + BEAT / 2) * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.08; j++) {
    const n = noise();
    lp += coef(7000) * (n - lp);
    const s = (n - lp) * Math.exp((-j / SR) * 55) * 0.13;
    put(hatStart + j, s * 0.8, s);
  }
}

// Arp: 16th-note plucks with a ping-pong delay.
{
  const arp = new Float32Array(N);
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let step = 0; step * 0.125 < DUR - 4; step++) {
    const t0 = step * 0.125;
    if (t0 < 2) continue;
    const chord = CHORDS[chordAt(t0)];
    const f = midi(chord[pattern[step % 8]] + 12);
    const level = t0 < DROP ? 0.03 + 0.05 * ((t0 - 2) / 4) : t0 < OUTRO ? 0.085 : 0.05;
    const start = Math.floor(t0 * SR);
    let ph = 0;
    for (let j = 0; j < SR * 0.2; j++) {
      ph = (ph + f / SR) % 1;
      const tri = 1 - 4 * Math.abs(ph - 0.5);
      const sq = ph < 0.5 ? 1 : -1;
      const s = (tri * 0.7 + sq * 0.12) * Math.exp((-j / SR) * 14) * level;
      if (start + j < N) arp[start + j] += s;
    }
  }
  const delay = Math.floor(0.375 * SR);
  const dl = new Float32Array(N);
  const dr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const inL = i >= delay ? arp[i - delay] + dr[i - delay] * 0.4 : 0;
    const inR = i >= delay ? dl[i - delay] * 0.4 : 0;
    dl[i] = inL;
    dr[i] = inR;
    const t = i / SR;
    const d = inBeat(t) ? duck(t) : 1;
    put(i, (arp[i] + dl[i] * 0.5) * d, (arp[i] + dr[i] * 0.5) * d);
  }
}

// Riser into the drop, impacts on the drop and the outro.
{
  let lp = 0;
  for (let i = Math.floor(3.5 * SR); i < Math.floor(DROP * SR); i++) {
    const t = i / SR;
    const p = (t - 3.5) / (DROP - 3.5);
    lp += coef(300 + 9000 * p * p) * (noise() - lp);
    const tone = Math.sin(2 * Math.PI * (180 * t + 500 * p * p * (t - 3.5)));
    const s = (lp * 0.35 + tone * 0.04) * p * p;
    put(i, s, s * 0.9);
  }
}
function impact(t0, level = 1) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  let lp = 0;
  for (let j = 0; j < SR * 2.4; j++) {
    const tn = j / SR;
    ph += (38 + 70 * Math.exp(-tn * 9)) / SR;
    lp += coef(5200 * Math.exp(-tn * 2) + 300) * (noise() - lp);
    const s = (Math.sin(ph * 2 * Math.PI) * Math.exp(-tn * 2.2) * 0.7 + lp * Math.exp(-tn * 3.2) * 0.32) * level;
    put(start + j, s, s * 0.95);
  }
}
impact(DROP);
impact(OUTRO, 0.9);
impact(DUR - 2.6, 0.45);

for (const t1 of WHOOSHES) {
  let lp = 0;
  const from = t1 - 0.5;
  for (let j = 0; j < SR * 0.62; j++) {
    const tn = j / SR;
    const p = tn / 0.5;
    lp += coef(400 + 6000 * Math.min(1, p) ** 2) * (noise() - lp);
    const env = tn < 0.5 ? p ** 2.2 : Math.exp(-(tn - 0.5) * 30);
    const pan = Math.min(1, p);
    const s = lp * env * 0.16;
    put(Math.floor(from * SR) + j, s * (1.2 - pan * 0.6), s * (0.6 + pan * 0.6));
  }
}

// Master: gentle saturation and peak normalize.
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.3);
  R[i] = Math.tanh(R[i] * 1.3);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.92 / peak;
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
await writeFile(`${dir}track.wav`, out);
console.log("wrote track.wav", (out.length / 1e6).toFixed(1), "MB, peak", peak.toFixed(2));
