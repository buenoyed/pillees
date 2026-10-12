const PREF = "pillees-sound";
let shared = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(PREF) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(PREF, on ? "on" : "off");
  } catch {
    // Storage can be blocked; the toggle still works for this visit.
  }
}

export function getAudio() {
  if (shared) return shared;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  shared = { ctx, comp, noise };
  return shared;
}

function ramp(param, at, points, exp = false) {
  param.cancelScheduledValues(at);
  param.setValueAtTime(points[0][1], at + points[0][0]);
  for (let i = 1; i < points.length; i++) {
    const [dt, v] = points[i];
    if (exp) param.exponentialRampToValueAtTime(Math.max(v, 0.0001), at + dt);
    else param.linearRampToValueAtTime(v, at + dt);
  }
}

function amp(ctx, out, at, points) {
  const g = ctx.createGain();
  g.gain.value = 0;
  ramp(g.gain, at, points);
  g.connect(out);
  return g;
}

function tone(a, out, at, { type = "sine", freq, gain, vibrato = 0, rate = 7, filter }) {
  const { ctx } = a;
  const end = gain[gain.length - 1][0];
  const osc = ctx.createOscillator();
  osc.type = type;
  ramp(osc.frequency, at, freq, true);
  let node = amp(ctx, out, at, gain);
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type ?? "lowpass";
    f.frequency.value = filter.freq;
    f.Q.value = filter.q ?? 1;
    f.connect(node);
    node = f;
  }
  osc.connect(node);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = rate;
    depth.gain.value = freq[0][1] * vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(at);
    lfo.stop(at + end + 0.05);
  }
  osc.start(at);
  osc.stop(at + end + 0.05);
}

function hiss(a, out, at, { type = "bandpass", freq, q = 1, gain, wobble = 0 }) {
  const { ctx, noise } = a;
  const end = gain[gain.length - 1][0];
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  ramp(f.frequency, at, freq, true);
  const g = amp(ctx, out, at, gain);
  if (wobble) {
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = wobble;
    depth.gain.value = 0.5;
    trem.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    src.connect(f).connect(trem).connect(g);
    lfo.start(at);
    lfo.stop(at + end + 0.05);
  } else {
    src.connect(f).connect(g);
  }
  src.start(at, Math.random());
  src.stop(at + end + 0.05);
}

export const sfx = {
  squeak(a, out, at, pitch = 1, level = 1) {
    tone(a, out, at, {
      type: "triangle",
      freq: [[0, 2100 * pitch], [0.025, 3100 * pitch], [0.075, 2300 * pitch]],
      gain: [[0, 0], [0.006, 0.09 * level], [0.055, 0.06 * level], [0.085, 0]],
      vibrato: 0.06,
      rate: 55,
      filter: { type: "bandpass", freq: 2600 * pitch, q: 2.5 },
    });
  },
  step(a, out, at, pitch = 1, level = 1) {
    tone(a, out, at, { freq: [[0, 150], [0.08, 55]], gain: [[0, 0], [0.004, 0.35 * level], [0.1, 0]] });
    hiss(a, out, at, { type: "lowpass", freq: [[0, 500], [0.06, 200]], gain: [[0, 0.12 * level], [0.06, 0]] });
    sfx.squeak(a, out, at + 0.01, pitch, 0.7 * level);
  },
  squish(a, out, at) {
    tone(a, out, at, { freq: [[0, 220], [0.12, 120]], gain: [[0, 0], [0.01, 0.18], [0.16, 0]], filter: { freq: 900 } });
    sfx.squeak(a, out, at + 0.04, 0.8, 0.5);
  },
  blip(a, out, at, from = 900, to = 1500) {
    tone(a, out, at, { freq: [[0, from], [0.07, to]], gain: [[0, 0], [0.005, 0.07], [0.09, 0]] });
  },
  tick(a, out, at) {
    tone(a, out, at, { freq: [[0, 2600], [0.02, 2200]], gain: [[0, 0], [0.002, 0.04], [0.03, 0]] });
  },
  swish(a, out, at, dur = 0.2) {
    hiss(a, out, at, { freq: [[0, 500], [dur, 2400]], q: 1.4, gain: [[0, 0], [dur * 0.4, 0.09], [dur, 0]] });
  },
  voice(a, out, at, contour, level = 1) {
    const end = contour[contour.length - 1][0];
    tone(a, out, at, {
      type: "sawtooth",
      freq: contour,
      gain: [[0, 0], [0.02, 0.07 * level], [end - 0.04, 0.06 * level], [end, 0]],
      vibrato: 0.03,
      rate: 8,
      filter: { freq: 2400, q: 5 },
    });
    tone(a, out, at, {
      type: "sine",
      freq: contour.map(([t, f]) => [t, f * 2]),
      gain: [[0, 0], [0.02, 0.04 * level], [end, 0]],
    });
  },
  click(a, out, at) {
    hiss(a, out, at, { type: "highpass", freq: [[0, 2500], [0.02, 2500]], gain: [[0, 0.3], [0.025, 0]] });
    tone(a, out, at, { freq: [[0, 95], [0.2, 48]], gain: [[0, 0], [0.004, 0.5], [0.22, 0]] });
    for (const [f, g] of [[312, 0.05], [527, 0.035], [791, 0.025]]) {
      tone(a, out, at, { freq: [[0, f], [0.35, f * 0.99]], gain: [[0, 0], [0.003, g], [0.35, 0]] });
    }
  },
  slam(a, out, at) {
    sfx.click(a, out, at);
    hiss(a, out, at, { type: "lowpass", freq: [[0, 900], [0.4, 120]], gain: [[0, 0.35], [0.45, 0]] });
    tone(a, out, at, { freq: [[0, 70], [0.4, 38]], gain: [[0, 0], [0.01, 0.6], [0.5, 0]] });
  },
  buzz(a, out, at, dur = 0.05) {
    tone(a, out, at, {
      type: "sawtooth",
      freq: [[0, 100], [dur, 100]],
      gain: [[0, 0], [0.003, 0.08], [dur, 0.06], [dur + 0.01, 0]],
      filter: { type: "bandpass", freq: 1400, q: 2 },
    });
    hiss(a, out, at, { type: "highpass", freq: [[0, 3000], [0.01, 3000]], gain: [[0, 0.12], [0.012, 0]] });
  },
  hum(a, out, at, dur) {
    tone(a, out, at, {
      type: "sawtooth",
      freq: [[0, 60], [dur, 60]],
      gain: [[0, 0], [0.3, 0.025], [dur - 0.4, 0.025], [dur, 0]],
      filter: { freq: 220 },
    });
    hiss(a, out, at, { type: "lowpass", freq: [[0, 320], [dur, 320]], gain: [[0, 0], [0.5, 0.03], [dur - 0.4, 0.03], [dur, 0]] });
  },
  whistle(a, out, at, dur = 0.8, from = 1700, to = 380) {
    tone(a, out, at, {
      freq: [[0, from], [dur, to]],
      gain: [[0, 0], [0.05, 0.05], [dur - 0.1, 0.04], [dur, 0]],
      vibrato: 0.012,
      rate: 6,
    });
  },
  wind(a, out, at, dur) {
    hiss(a, out, at, { freq: [[0, 300], [dur * 0.7, 1400], [dur, 700]], q: 0.8, gain: [[0, 0], [dur * 0.6, 0.14], [dur, 0]] });
  },
  pop(a, out, at) {
    hiss(a, out, at, { type: "lowpass", freq: [[0, 1400], [0.25, 200]], gain: [[0, 0], [0.008, 0.45], [0.28, 0]] });
    tone(a, out, at, { freq: [[0, 190], [0.2, 70]], gain: [[0, 0], [0.006, 0.4], [0.24, 0]] });
  },
  flutter(a, out, at, dur) {
    hiss(a, out, at, { freq: [[0, 900], [dur, 700]], q: 0.9, wobble: 13, gain: [[0, 0], [0.2, 0.05], [dur - 0.3, 0.04], [dur, 0]] });
  },
  thud(a, out, at) {
    tone(a, out, at, { freq: [[0, 140], [0.22, 42]], gain: [[0, 0], [0.004, 0.75], [0.26, 0]] });
    hiss(a, out, at, { type: "lowpass", freq: [[0, 700], [0.2, 150]], gain: [[0, 0.3], [0.22, 0]] });
    sfx.squeak(a, out, at + 0.02, 1.1, 0.8);
    sfx.squeak(a, out, at + 0.07, 0.95, 0.6);
  },
  pad(a, out, at, dur, freqs, level = 1) {
    freqs.forEach((f, i) => {
      for (const detune of [1, 1.004]) {
        tone(a, out, at, {
          type: i === 0 ? "sine" : "triangle",
          freq: [[0, f * detune], [dur, f * detune]],
          gain: [[0, 0], [Math.min(1.2, dur * 0.4), 0.018 * level], [dur - Math.min(0.8, dur * 0.4), 0.016 * level], [dur, 0]],
          filter: { freq: 1800 },
        });
      }
    });
  },
  breeze(a, out, at, dur) {
    hiss(a, out, at, { type: "bandpass", freq: [[0, 380], [dur, 520]], q: 0.7, wobble: 0.35, gain: [[0, 0], [1, 0.07], [dur - 0.5, 0.07], [dur, 0]] });
  },
  sparkle(a, out, at) {
    [1568, 1976, 2349, 3136].forEach((f, i) => {
      tone(a, out, at + i * 0.055, { type: "triangle", freq: [[0, f], [0.5, f]], gain: [[0, 0], [0.004, 0.05], [0.5, 0]] });
    });
  },
};

export function playAt(delay, name, ...args) {
  if (!soundEnabled()) return;
  const a = getAudio();
  if (!a) return;
  a.ctx.resume?.();
  sfx[name](a, a.comp, a.ctx.currentTime + 0.01 + delay, ...args);
}
