import { useEffect, useRef, useState } from "react";
import {
  GROUND,
  HANDOFF,
  SPRITE_H,
  SPRITE_W,
  bump,
  clamp01,
  groundShadow,
  hash,
  inOut,
  key,
  lerp,
  loadParts,
  outBack,
  outQuad,
  placeCharacter,
  smoothstep,
} from "./pillee";
import { getAudio, setSoundEnabled, sfx, soundEnabled } from "./sound";

const NOTICE = 7.38;
const CROUCH = 7.5;
const RUN = 7.72;
const JUMP = 8.3;
const FOG = 9.62;
const CHUTE = 9.86;
const DOCK = 10.85;
const LAND = 11.5;
const END = LAND + 1.08;

const FALL_FROM = 0.68;
const FOLLOW = 0.6;
const RISE_FOG = 0.93;
const RISE_CHUTE = 0.5;

const CANOPY_RIM = -750;
const CANOPY_H = 140;
const CANOPY_W = 580;
const PIVOT = 760;
const HARNESS = [[-150, -400], [125, -360]];
const GORES = [
  ["#86efac", "#5fd08a", "#3a9d62"],
  ["#f4f5f1", "#d6d9d3", "#a9aea7"],
];

const glide = (p) => 0.72 * p + 0.28 * inOut(p);
const linear = (p) => p;

const walkAt = (t) => Math.sin((clamp01((t - 0.5) / 2.9) * Math.PI) / 2);
const WALK_PHASE = 15 * Math.PI;
const stridePhase = (t) => (t < RUN ? walkAt(t) * WALK_PHASE : WALK_PHASE + (t - RUN) * 32);
const walkAmpAt = (t) => 1 - smoothstep(3.0, 3.42, t);
const runAmpAt = (t) => (t >= RUN && t < JUMP ? 1.25 * smoothstep(RUN, RUN + 0.1, t) : 0);

// Body travel = integral of the stance foot's backward sweep, so planted feet never slide.
const STRIDE_DT = 0.002;
function strideTable(from, to, ampAt) {
  const xs = [0];
  let x = 0;
  let prev = stridePhase(from);
  for (let t = from + STRIDE_DT; t <= to + 1e-9; t += STRIDE_DT) {
    const phase = stridePhase(t);
    x += ampAt(t) * Math.abs(Math.cos(phase)) * (phase - prev);
    prev = phase;
    xs.push(x);
  }
  return { from, xs, total: x };
}
const WALK_TABLE = strideTable(0.5, RUN - 0.001, walkAmpAt);
const RUN_TABLE = strideTable(RUN, JUMP, runAmpAt);
function strideAt(table, t) {
  const f = Math.max(0, (t - table.from) / STRIDE_DT);
  const i = Math.min(table.xs.length - 1, Math.floor(f));
  const j = Math.min(table.xs.length - 1, i + 1);
  return lerp(table.xs[i], table.xs[j], f - i) / table.total;
}

function pose(t, reach = { walk: 26, run: 26 }) {
  const walkAmp = walkAmpAt(t);
  const runAmp = runAmpAt(t);
  const stride = t < RUN ? reach.walk : reach.run;
  const airborne = t >= JUMP && t < LAND;
  const chute = t >= CHUTE && t < LAND;
  const landed = t >= LAND;
  const phase = t < JUMP ? stridePhase(t) : (t - JUMP) * (chute ? 7 : 14);
  const amp = landed ? 0 : chute ? 0.14 : airborne ? 0.22 : t < RUN ? walkAmp : runAmp;
  const cosL = Math.cos(phase);
  const sinL = Math.sin(phase);

  const face = key(t, [[4.95, 1], [5.15, -1], [6.08, -1], [6.28, 1]]);
  const turnSquash = 1 - 0.08 * (1 - Math.abs(face));
  const breathe = airborne || landed ? 1 : 1 + Math.sin(t * 2.4) * 0.012;
  const settle = key(t, [[3.28, 1], [3.46, 0.91], [3.66, 1.04], [3.9, 1]]);
  const ready = key(t, [[CROUCH, 1], [CROUCH + 0.16, 0.86], [RUN + 0.04, 0.95], [RUN + 0.12, 1.04], [RUN + 0.25, 1]]);
  const leap =
    t < CHUTE
      ? key(t, [[JUMP - 0.07, 1], [JUMP, 0.84], [JUMP + 0.1, 1.14], [JUMP + 0.4, 1.04]])
      : key(t, [[CHUTE, 0.84], [CHUTE + 0.14, 1.07], [CHUTE + 0.34, 1]]);
  const crouch = key(t, [
    [LAND, 1],
    [LAND + 0.08, 0.74, outQuad],
    [LAND + 0.32, 0.78],
    [LAND + 0.5, 1.07],
    [LAND + 0.66, 0.97],
    [LAND + 0.8, 1],
  ]);
  const step = 1 - (1 - Math.abs(cosL)) * 0.035 * amp;
  const sy = settle * ready * breathe * turnSquash * leap * step * crouch;
  const squat = Math.max(0, 1 - crouch);

  const wave = smoothstep(6.45, 6.65, t) * (1 - smoothstep(7.2, 7.38, t));
  const spread = smoothstep(JUMP, JUMP + 0.2, t) * (1 - smoothstep(CHUTE - 0.05, CHUTE + 0.1, t));
  const hold = t < LAND ? smoothstep(CHUTE, CHUTE + 0.12, t) : 1 - smoothstep(LAND, LAND + 0.2, t);
  const tada = smoothstep(LAND + 0.48, LAND + 0.62, t) * (1 - smoothstep(LAND + 0.84, LAND + 1.0, t));
  const open =
    (t >= 3.97 && t < 6.42) || (t >= NOTICE && t < JUMP) || (t >= CHUTE - 0.02 && t < LAND + 0.04);

  return {
    face: Math.sign(face || 1) * (0.32 + 0.68 * Math.abs(face)),
    sx: 1 / Math.sqrt(sy),
    sy,
    lean:
      0.06 * walkAmp +
      key(t, [[4.08, 0], [4.32, 0.05], [4.88, 0.05], [5.02, 0]]) +
      key(t, [[5.2, 0], [5.42, 0.05], [5.94, 0.05], [6.08, 0]]) +
      key(t, [[NOTICE, 0], [NOTICE + 0.15, 0.06], [CROUCH, 0.06], [RUN, 0.1], [RUN + 0.15, 0.17], [JUMP, 0.17], [JUMP + 0.2, 0]]),
    spin:
      t >= JUMP && t < CHUTE
        ? key(t, [[JUMP, 0], [JUMP + 0.45, 0.38], [FOG, 0.22], [CHUTE, 0]]) + Math.sin(t * 5) * 0.05
        : 0,
    bob: airborne || landed ? 0 : -Math.abs(cosL) * (t >= RUN ? 22 : 14) * amp + Math.sin(t * 2.4) * 2,
    bodyRot: sinL * 0.035 * amp,
    armL:
      -sinL * (t >= RUN ? 0.5 : 0.22) * amp +
      wave * (0.22 + Math.sin((t - 6.45) * 15) * 0.32) +
      spread * (0.95 + Math.sin(t * 18) * 0.08) +
      hold * 0.42 +
      tada * 0.55,
    armR: -sinL * (t >= RUN ? 0.5 : 0.22) * amp - spread * (1.0 + Math.cos(t * 17) * 0.08) - hold * 0.62 - tada * 0.55,
    footL: {
      dx: sinL * stride * amp - squat * 60 - spread * 40,
      lift: Math.max(0, cosL) * (t >= RUN ? 44 : 32) * amp + spread * 18,
      rot: -Math.max(0, cosL) * 0.18 * amp,
    },
    footR: {
      dx: -sinL * stride * amp + squat * 60 + spread * 40,
      lift: Math.max(0, -cosL) * (t >= RUN ? 44 : 32) * amp + spread * 18,
      rot: -Math.max(0, -cosL) * 0.18 * amp,
    },
    eyes: {
      mode: open ? "open" : "happy",
      open:
        1 -
        Math.max(
          bump(t, 3.97, 0.08), bump(t, 5.62, 0.07), bump(t, 6.42, 0.08), bump(t, NOTICE, 0.06),
          bump(t, JUMP, 0.06), bump(t, CHUTE - 0.02, 0.06), bump(t, LAND + 0.04, 0.06),
        ),
      lookX: key(t, [
        [4.05, 0], [4.22, 1, outBack], [4.85, 1], [5.0, 0.2], [5.2, 1], [6.0, 1], [6.24, 0],
        [NOTICE, 0], [NOTICE + 0.12, 1, outBack], [JUMP, 1], [CHUTE, 0],
      ]),
      lookY: key(t, [
        [5.3, 0], [5.45, -0.7], [5.95, -0.7], [6.15, 0],
        [NOTICE, 0], [NOTICE + 0.12, 0.7], [NOTICE + 0.42, 0.7], [CROUCH + 0.05, 0],
        [CHUTE, 0], [CHUTE + 0.12, -1], [CHUTE + 0.6, -1], [CHUTE + 0.8, 1], [LAND - 0.1, 1], [LAND, 0],
      ]),
      wide: key(t, [[NOTICE, 1], [NOTICE + 0.14, 1.15, outBack], [JUMP, 1.15], [JUMP + 0.05, 1], [CHUTE, 1.2], [CHUTE + 0.3, 1]]),
    },
  };
}

function footfalls() {
  const times = [];
  let last = Math.floor((stridePhase(0.5) - Math.PI / 2) / Math.PI);
  for (let t = 0.5; t < JUMP; t += 0.002) {
    const k = Math.floor((stridePhase(t) - Math.PI / 2) / Math.PI);
    const moving = t >= RUN ? t > RUN + 0.05 : 1 - smoothstep(3.0, 3.42, t) > 0.25;
    if (k !== last && moving) times.push(t);
    last = k;
  }
  return times;
}

function soundtrack() {
  const voice = (contour, level) => (a, out, at) => sfx.voice(a, out, at, contour, level);
  const events = [
    { t: 0, until: JUMP + 0.4, play: (a, out, at, dur) => sfx.pad(a, out, at, dur, [130.81, 196, 246.94, 329.63]) },
    { t: 0, until: FOG + 0.2, play: (a, out, at, dur) => sfx.breeze(a, out, at, dur) },
    { t: 3.3, play: sfx.squish },
    { t: 3.97, play: (a, out, at) => sfx.blip(a, out, at, 700, 1300) },
    { t: 4.12, play: sfx.tick },
    { t: 4.95, play: (a, out, at) => { sfx.swish(a, out, at); sfx.squeak(a, out, at + 0.05, 0.9, 0.6); } },
    { t: 5.62, play: sfx.tick },
    { t: 6.08, play: (a, out, at) => { sfx.swish(a, out, at); sfx.squeak(a, out, at + 0.05, 1, 0.6); } },
    { t: 6.45, play: voice([[0, 620], [0.07, 1000], [0.26, 860]]) },
    { t: NOTICE + 0.04, play: voice([[0, 560], [0.28, 920]], 0.9) },
    { t: CROUCH + 0.06, play: (a, out, at) => sfx.squeak(a, out, at, 0.8, 0.8) },
    { t: JUMP - 0.04, play: voice([[0, 520], [0.1, 820]], 0.9) },
    { t: JUMP, play: (a, out, at) => sfx.swish(a, out, at, 0.35) },
    { t: JUMP + 0.18, play: voice([[0, 820], [0.2, 1220], [0.95, 1280]]) },
    { t: JUMP + 0.1, play: (a, out, at) => sfx.wind(a, out, at, FOG - JUMP + 0.3) },
    { t: FOG - 0.3, play: (a, out, at) => sfx.swish(a, out, at, 0.6) },
    { t: CHUTE, play: sfx.pop },
    { t: CHUTE + 0.18, play: voice([[0, 520], [0.3, 780]], 0.8) },
    { t: CHUTE + 0.1, until: LAND + 0.1, play: (a, out, at, dur) => sfx.flutter(a, out, at, dur) },
    { t: LAND, play: sfx.thud },
    { t: LAND + 0.14, play: (a, out, at) => sfx.swish(a, out, at, 0.4) },
    { t: LAND + 0.38, play: voice([[0, 480], [0.1, 780]], 0.8) },
    { t: LAND + 0.5, play: voice([[0, 720], [0.1, 720]]) },
    { t: LAND + 0.64, play: voice([[0, 1020], [0.3, 960]]) },
    { t: LAND + 0.52, play: sfx.sparkle },
    { t: LAND + 0.5, play: (a, out, at) => sfx.pad(a, out, at, 1.8, [261.63, 329.63, 392, 523.25], 1.3) },
  ];
  footfalls().forEach((t, i) => {
    const running = t >= RUN;
    const level = running ? 1 : 0.35 + 0.65 * walkAt(t);
    const pitch = (i % 2 ? 0.92 : 1.04) * (running ? 1.12 : 1);
    events.push({ t, play: (a, out, at) => sfx.step(a, out, at, pitch, level) });
  });
  return events;
}

function fallPath(t, s) {
  const tau = Math.max(0, t - JUMP);
  const unit = s * SPRITE_H;
  const v0 = -unit * 2.4;
  const g = unit * 14;
  const vt = unit * 7;
  const tc = (vt - v0) / g;
  const y = tau < tc ? v0 * tau + 0.5 * g * tau * tau : v0 * tc + 0.5 * g * tc * tc + vt * (tau - tc);
  const x = (unit * 1.4 * (1 - Math.exp(-tau * 1.8))) / 1.8;
  return { x, y, tau };
}

function makeRock(bs) {
  const n = 16;
  const c = document.createElement("canvas");
  c.width = c.height = n * bs;
  const g = c.getContext("2d");
  const tones = ["#1a2029", "#1f2631", "#252d39", "#2b3441", "#323c4a"];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const r = hash(i * 31 + j * 17);
      const band = Math.floor((j + Math.floor(hash(i + 5) * 3)) / 4) % 2;
      g.fillStyle = tones[Math.min(4, Math.floor(r * 3.2) + band)];
      g.fillRect(i * bs, j * bs, bs, bs);
      if (hash(i * 7 + j * 13 + 3) > 0.93) {
        g.fillStyle = "#101215";
        g.fillRect(i * bs, j * bs, bs, bs * 2);
      }
    }
  }
  return c;
}

function makeGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 255;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 16;
  }
  g.putImageData(data, 0, 0);
  return c;
}

function ridge(x, seed) {
  return 0.5 + 0.28 * Math.sin(x * 2.1 + seed) + 0.15 * Math.sin(x * 5.3 + seed * 2.3) + 0.07 * Math.sin(x * 13.7 + seed * 4.1);
}

function drawCanopy(ctx, open, lines) {
  const width = CANOPY_W * (0.2 + 0.8 * open);
  const height = CANOPY_H * (0.3 + 0.7 * open);
  const px = 20;
  const rows = Math.ceil(height / px);
  const gore = width / 6;

  if (lines > 0) {
    ctx.globalAlpha *= lines;
    ctx.strokeStyle = "rgba(225,232,228,0.75)";
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
      ctx.fillStyle = GORES[g % 2][tone === 1 && r < 2 ? 0 : tone];
      ctx.fillRect(x0, y, x1 - x0 + 0.5, px + 0.5);
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-width * 0.3, CANOPY_RIM - height * 0.86, px * 2, px);
  ctx.fillRect(-width * 0.36, CANOPY_RIM - height * 0.72, px, px);
}

const SoundIcon = ({ on }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
    {on ? (
      <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M10.5 6l4 4M14.5 6l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    )}
  </svg>
);

export default function Intro({ onStage, onDone }) {
  const canvasRef = useRef(null);
  const callbacks = useRef({ onStage, onDone });
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [sound, setSound] = useState(soundEnabled());
  const done = useRef(false);
  const begun = useRef(false);
  const stage = useRef("waiting");
  const audio = useRef({ out: null, clock: 0, scheduled: false });
  callbacks.current = { onStage, onDone };

  function setStage(next) {
    if (stage.current === next || stage.current === "landed") return;
    stage.current = next;
    callbacks.current.onStage?.(next);
    if (next === "landed") window.dispatchEvent(new Event(HANDOFF));
  }

  function silence() {
    const out = audio.current.out;
    if (!out) return;
    const { ctx } = getAudio();
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    audio.current.out = null;
    audio.current.scheduled = false;
    window.setTimeout(() => out.disconnect(), 600);
  }

  function schedule() {
    const state = audio.current;
    if (state.scheduled || !begun.current || done.current || !soundEnabled()) return;
    const a = getAudio();
    if (!a || a.ctx.state !== "running") return;
    state.scheduled = true;
    state.out = a.ctx.createGain();
    state.out.gain.value = 0.9;
    state.out.connect(a.comp);
    const clock = state.clock;
    const now = a.ctx.currentTime + 0.03;
    for (const event of soundtrack()) {
      if (event.until) {
        if (clock < event.until - 0.3) {
          const from = Math.max(event.t, clock);
          event.play(a, state.out, now + from - clock, event.until - from);
        }
      } else if (event.t >= clock - 0.02) {
        event.play(a, state.out, now + Math.max(0, event.t - clock));
      }
    }
  }

  function unlock() {
    const a = getAudio();
    if (!a) return;
    if (a.ctx.state === "running") schedule();
    else a.ctx.resume?.().then(schedule, () => {});
  }

  function begin() {
    if (begun.current || done.current) return;
    begun.current = true;
    audio.current.clock = 0;
    setEntered(true);
    if (soundEnabled()) {
      const a = getAudio();
      if (a) sfx.blip(a, a.comp, a.ctx.currentTime + 0.01, 500, 900);
      unlock();
    }
  }

  function toggleSound(event) {
    event.stopPropagation();
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) unlock();
    else silence();
  }

  function finish(fade = true) {
    if (done.current) return;
    done.current = true;
    if (fade) silence();
    document.documentElement.style.removeProperty("--intro-rise");
    setStage("landed");
    if (!fade) {
      callbacks.current.onDone();
      return;
    }
    setLeaving(true);
    window.setTimeout(() => callbacks.current.onDone(), 380);
  }

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("intro-lock");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("intro-lock");
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    let started = 0;
    let dpr = 1;
    let target = null;
    let side = 0;
    let lastRise = "";
    let img = null;
    let rock = null;
    let rockSize = 0;
    let fallback = 0;
    const grain = ctx.createPattern(makeGrain(), "repeat");

    if (reduce) begun.current = true;

    loadParts()
      .then((parts) => {
        if (stopped) return;
        img = parts;
        raf = requestAnimationFrame(draw);
      })
      .catch(() => finish(false));

    function measure() {
      const hero = document.querySelector(".hero-pillee");
      const rect = hero?.getBoundingClientRect();
      const nav = document.querySelector(".nav");
      side = nav && getComputedStyle(nav).position === "fixed" ? nav.getBoundingClientRect().right * dpr : 0;
      if (!rect?.height || rect.top > window.innerHeight || rect.bottom < 0) {
        target = null;
        return;
      }
      target = {
        x: (rect.left + (rect.width * GROUND[0]) / SPRITE_W) * dpr,
        y: (rect.top + (rect.height * GROUND[1]) / SPRITE_H) * dpr,
        zoom: (rect.height * dpr) / SPRITE_H,
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    function draw(now) {
      if (stopped) return;
      const ambient = now / 1000;
      if (begun.current && !started) {
        started = now;
        fallback = window.setTimeout(() => finish(), (reduce ? 1.6 : END + 3) * 1000);
      }
      const clock = started ? (now - started) / 1000 : 0;
      const t = reduce ? 4.4 : clock;
      audio.current.clock = clock;

      if (started && (reduce ? clock > 1.2 : t >= END)) {
        finish(reduce);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const bs = Math.max(4, Math.round(8 * dpr));
      if (bs !== rockSize) {
        rock = ctx.createPattern(makeRock(bs), "repeat");
        rockSize = bs;
      }
      if (t < JUMP) measure();

      const unit = Math.min(h * 0.26, w * 0.42);
      const s = unit / SPRITE_H;
      const charW = SPRITE_W * s;
      const ledgeY = h * FALL_FROM;
      const edgeX = w * 0.64;
      const standX = w * 0.36;
      const walkFrom = -charW * 0.9;
      const jumpX = edgeX - charW * 0.2;
      const p = pose(t, {
        walk: (standX - walkFrom) / s / WALK_TABLE.total,
        run: (jumpX - standX) / s / RUN_TABLE.total,
      });
      const landing = target ?? { x: w * 0.7, y: h * 0.7, zoom: s * 1.6 };
      const followY = h * FOLLOW;

      const fall = fallPath(Math.min(t, FOG), s);
      const follow = lerp(ledgeY, followY, smoothstep(0, 0.8, fall.tau));
      const camYAt = (y) => ledgeY + y - follow;
      const camY = t < JUMP ? 0 : camYAt(fall.y);
      const pan = t < JUMP ? 0 : inOut(clamp01((t - JUMP - 0.1) / (FOG - JUMP - 0.15)));
      const camX = (edgeX - side) * pan;
      const afterFog = t >= FOG;
      const rise = afterFog
        ? key(t, [[FOG, RISE_FOG * h], [CHUTE, RISE_CHUTE * h, linear], [LAND, 0, outQuad]])
        : RISE_FOG * h;
      const scroll = afterFog ? camY + (RISE_FOG * h - rise) : camY;

      let gx;
      let gy;
      let zoom;
      if (t < JUMP) {
        gx = t < RUN ? lerp(walkFrom, standX, strideAt(WALK_TABLE, t)) : lerp(standX, jumpX, strideAt(RUN_TABLE, t));
        gy = ledgeY;
        zoom = s;
      } else if (!afterFog) {
        gx = jumpX + fall.x - camX;
        gy = ledgeY + fall.y - camY;
        zoom = lerp(s, landing.zoom, inOut(clamp01((t - JUMP) / (FOG - JUMP))));
      } else {
        const fogX = jumpX + fall.x - (edgeX - side);
        const drift = t >= CHUTE ? Math.sin((t - CHUTE) * 2.1) * landing.zoom * 36 * (1 - smoothstep(LAND - 0.45, LAND, t)) : 0;
        gx = lerp(fogX, landing.x, inOut(clamp01((t - FOG) / (LAND - 0.3 - FOG)))) + drift;
        gy = key(t, [[CHUTE, followY], [CHUTE + 0.22, followY - landing.zoom * 60, outQuad], [LAND, landing.y, glide]]);
        zoom = landing.zoom;
      }

      if (!done.current && afterFog) {
        const value = `${(rise / dpr).toFixed(1)}px`;
        if (value !== lastRise) {
          lastRise = value;
          document.documentElement.style.setProperty("--intro-rise", value);
        }
      }
      if (!reduce && started) {
        if (t >= END - 0.08) setStage("landed");
        else if (t >= DOCK + 0.42) setStage("docked");
        else if (afterFog) setStage("revealing");
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.clearRect(0, 0, w, h);

      const step = bs;
      if (!afterFog) {
        const sky = ctx.createLinearGradient(0, -camY * 0.05, 0, h - camY * 0.05);
        sky.addColorStop(0, "#04060f");
        sky.addColorStop(0.32, "#0a1430");
        sky.addColorStop(0.58, "#183556");
        sky.addColorStop(0.74, "#2a5d6c");
        sky.addColorStop(0.86, "#21424f");
        sky.addColorStop(1, "#142530");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 3; k++) {
          const ay = h * (0.16 + k * 0.05) - camY * 0.04;
          const band = ctx.createLinearGradient(0, ay - h * 0.12, 0, ay + h * 0.12);
          band.addColorStop(0, "rgba(134,239,172,0)");
          band.addColorStop(0.5, `rgba(134,239,172,${0.09 - k * 0.022})`);
          band.addColorStop(1, "rgba(134,239,172,0)");
          ctx.fillStyle = band;
          ctx.beginPath();
          ctx.moveTo(-10, ay + h * 0.12);
          for (let x = 0; x <= w + step; x += step * 4) {
            ctx.lineTo(x, ay + Math.sin(x / w * 5 + ambient * 0.25 + k * 1.7) * h * 0.05 - h * 0.1);
          }
          for (let x = w + step; x >= -step; x -= step * 4) {
            ctx.lineTo(x, ay + Math.sin(x / w * 5 + ambient * 0.25 + k * 1.7 + 0.6) * h * 0.04 + h * 0.08);
          }
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        for (let i = 0; i < 110; i++) {
          const x = hash(i) * w - camX * 0.04;
          const y = hash(i + 300) * h * 0.62 - camY * 0.05;
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(ambient * (0.6 + hash(i + 9)) + i));
          ctx.globalAlpha = (0.25 + hash(i + 77) * 0.6) * tw;
          ctx.fillStyle = hash(i + 41) > 0.85 ? "#c8f7d6" : "#e8eef5";
          const size = hash(i + 51) > 0.9 ? step * 0.5 : Math.max(1, step * 0.25);
          ctx.fillRect(Math.round(x), Math.round(y), size, size);
        }
        ctx.globalAlpha = 1;

        const moonX = w * 0.8 - camX * 0.06;
        const moonY = h * 0.2 - camY * 0.06;
        const moonR = Math.round(h * 0.055 / step) * step;
        const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 5);
        halo.addColorStop(0, "rgba(220,240,230,0.18)");
        halo.addColorStop(1, "rgba(220,240,230,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);
        for (let yy = -moonR; yy < moonR; yy += step) {
          const half = Math.round(Math.sqrt(Math.max(0, moonR * moonR - (yy + step / 2) ** 2)) / step) * step;
          ctx.fillStyle = "#e9efe6";
          ctx.fillRect(moonX - half, moonY + yy, half * 2, step);
        }
        ctx.fillStyle = "#c9d2cc";
        ctx.fillRect(moonX - moonR * 0.4, moonY - moonR * 0.3, step * 2, step * 2);
        ctx.fillRect(moonX + moonR * 0.25, moonY + moonR * 0.2, step * 3, step * 2);
        ctx.fillRect(moonX - moonR * 0.1, moonY + moonR * 0.45, step, step);

        for (const [base, amp, seed, freq, color, para] of [
          [0.7, 0.26, 1.3, 2.4, "#142c44", 0.12],
          [0.8, 0.2, 4.1, 3.6, "#0c1a2b", 0.22],
        ]) {
          const oy = -camY * para;
          ctx.fillStyle = color;
          for (let x = 0; x < w; x += step) {
            const wx = ((x + camX * para) / w) * freq;
            const top = Math.round((h * base - h * amp * ridge(wx, seed)) / step) * step + oy;
            ctx.fillRect(x, top, step, h - top + Math.abs(oy) + step);
          }
        }

        const sea = h * 0.8 - camY * 0.35;
        for (let i = 0; i < 16; i++) {
          const x = ((hash(i + 900) * 1.4 - 0.2) * w + ambient * w * 0.004 * (1 + hash(i))) % (w * 1.2) - camX * 0.35;
          const r = h * (0.08 + hash(i + 901) * 0.08);
          const cloud = ctx.createRadialGradient(x, sea, 0, x, sea, r * 2.2);
          cloud.addColorStop(0, "rgba(150,180,196,0.3)");
          cloud.addColorStop(1, "rgba(150,180,196,0)");
          ctx.fillStyle = cloud;
          ctx.save();
          ctx.translate(x, sea);
          ctx.scale(1, 0.35);
          ctx.translate(-x, -sea);
          ctx.fillRect(x - r * 2.2, sea - r * 2.2, r * 4.4, r * 4.4);
          ctx.restore();
        }

        const peakX = w * 0.2 - camX * 0.55;
        const peakY = h * 0.1 - camY * 0.55;
        const baseY = ledgeY + h * 0.04 - camY * 0.55;
        const span = w * 0.36;
        const snowLine = peakY + h * 0.13;
        for (let x = Math.floor((peakX - span) / step) * step; x < peakX + span; x += step) {
          const col = Math.floor((x + camX * 0.55) / step);
          const d = Math.abs(x - peakX) / span;
          const jag = (ridge(x / w, 2.7) - 0.5) * h * 0.07 * Math.sin(Math.min(1, d * 1.4) * Math.PI);
          const top = Math.round((lerp(peakY, baseY, d ** 1.25) + jag) / step) * step;
          const lit = x > peakX;
          ctx.fillStyle = lit ? "#1b2f45" : "#101c2c";
          ctx.fillRect(x, top, step, h - top + step);
          ctx.fillStyle = lit ? "#24405a" : "#14233a";
          for (let k = 0; k < 4; k++) {
            if (hash(col * 9 + k) > 0.55) ctx.fillRect(x, top + step * (3 + Math.floor(hash(col + k * 31) * 18)), step, step * 2);
          }
          const cap = snowLine + (hash(col + 3) - 0.5) * step * 4 - top;
          if (cap > 0) {
            ctx.fillStyle = lit ? "#dbe7ee" : "#93a7b8";
            ctx.fillRect(x, top, step, Math.round(cap / step) * step);
            ctx.fillStyle = lit ? "#f4f8fa" : "#b3c3cf";
            ctx.fillRect(x, top, step, step);
          }
        }
      } else {
        const mist = Math.min(h, rise + h * 0.22);
        const valley = ctx.createLinearGradient(0, 0, 0, mist);
        valley.addColorStop(0, "#0b0c0e");
        valley.addColorStop(clamp01(rise / Math.max(1, mist)), "#0b0c0e");
        valley.addColorStop(1, "rgba(11,12,14,0)");
        ctx.fillStyle = valley;
        ctx.fillRect(0, 0, w, mist);
      }

      const morph = smoothstep(DOCK, DOCK + 0.45, t);
      const wallFade = 1 - smoothstep(DOCK + 0.42, DOCK + 0.85, t);
      const faceX = edgeX - camX;
      const topY = t < JUMP || !afterFog ? ledgeY - camY : -h;
      if (wallFade > 0 && faceX > -step * 4) {
        const firstRow = Math.floor((Math.max(0, topY) + scroll) / step);
        const lastRow = Math.ceil((h + scroll) / step);
        rock.setTransform(new DOMMatrix([1, 0, 0, 1, 0, -scroll]));
        ctx.globalAlpha = wallFade;
        ctx.fillStyle = rock;
        const edgeAt = (row) => {
          const near = row * step - scroll - topY;
          const cap = near < step * 3 ? -step * (3 - near / step) * 0.6 : 0;
          return faceX + (Math.round((hash(row * 1.7) - 0.5) * 2.6) * step * (1 - morph)) + cap * (1 - morph);
        };
        const body = new Path2D();
        for (let row = firstRow; row <= lastRow; row++) {
          body.rect(0, row * step - scroll, Math.max(0, edgeAt(row)), step + 0.5);
        }
        ctx.fill(body);
        if (topY > -h) {
          const shade = ctx.createLinearGradient(0, topY, 0, topY + h * 0.9);
          shade.addColorStop(0, "rgba(160,200,215,0.08)");
          shade.addColorStop(1, "rgba(0,0,0,0.35)");
          ctx.fillStyle = shade;
          ctx.fill(body);
        }
        ctx.fillStyle = `rgba(160,205,215,${0.3 * (1 - morph)})`;
        for (let row = firstRow; row <= lastRow; row++) {
          const y = row * step - scroll;
          ctx.fillRect(edgeAt(row) - step * 0.6, y, step * 0.6, step + 0.5);
        }
        if (morph > 0) {
          ctx.fillStyle = `rgba(13,14,17,${morph})`;
          ctx.fill(body);
          ctx.fillStyle = `rgba(255,255,255,${0.08 * morph})`;
          ctx.fillRect(faceX - 1, Math.max(0, topY), Math.max(1, dpr), h);
        }
        const depth = Math.max(2, Math.ceil((46 * s) / step)) * step;
        if (topY > -depth - step * 3) {
          const lip = edgeAt(firstRow);
          const rows = depth / step;
          for (let x = 0; x < lip; x += step) {
            const col = Math.floor((x + camX) / step);
            const inset = x > lip - step * 2 ? step : 0;
            for (let r = 0; r < rows; r++) {
              const n = hash(col * 13.1 + r * 7.7 + 90);
              ctx.fillStyle = r === 0 ? "#4f9e6c" : n > 0.72 ? "#4a9466" : n < 0.2 ? "#2f6d48" : "#3d8459";
              ctx.fillRect(x + (r === 0 ? inset : 0), topY - depth + r * step, step, step);
            }
            if (hash(col + 40) > 0.55) {
              ctx.fillStyle = hash(col + 70) > 0.5 ? "#5fb07c" : "#3d8459";
              ctx.fillRect(x, topY - depth - step * 0.5, step, step * 0.5);
            }
            ctx.fillStyle = "#24583a";
            ctx.fillRect(x, topY, step, step);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(x, topY + step, step, step * 0.5);
          }
        }
        ctx.globalAlpha = 1;
      }

      if (!afterFog) {
        for (let i = 0; i < 26; i++) {
          const life = (ambient * (0.18 + hash(i + 3) * 0.2) + hash(i)) % 1;
          const x = life * w * 1.2 - w * 0.1;
          const y = h * (0.35 + hash(i + 11) * 0.5) + Math.sin(ambient + i) * h * 0.02 - camY * 0.8;
          ctx.globalAlpha = Math.sin(life * Math.PI) * 0.35;
          ctx.fillStyle = "#dfe8ef";
          ctx.fillRect(x, y, Math.max(1, step * 0.3), Math.max(1, step * 0.3));
        }
        ctx.globalAlpha = 1;
      }

      const speed = smoothstep(JUMP + 0.25, JUMP + 0.65, t) * (1 - smoothstep(CHUTE - 0.05, CHUTE + 0.3, t));
      if (speed > 0) {
        ctx.fillStyle = "rgba(225,238,248,0.22)";
        for (let i = 0; i < 26; i++) {
          const span = h * 1.6;
          const y = span - ((hash(i + 500) * span + scroll * 1.25) % span) - h * 0.3;
          const x = hash(i + 501) * w;
          ctx.globalAlpha = speed * (0.4 + hash(i + 502) * 0.6);
          ctx.fillRect(x, y, Math.max(1, dpr), h * (0.08 + hash(i + 503) * 0.1) * speed);
        }
        ctx.globalAlpha = 1;
      }

      if (t < JUMP) {
        const lift = Math.max(0, -p.bob) / 30;
        groundShadow(ctx, gx, ledgeY, s, (reduce || started ? 1 : 0) * (1 - lift * 0.3));
      } else if (afterFog) {
        const near = t >= LAND ? 1 : smoothstep(CHUTE, LAND, t) * 0.9;
        groundShadow(ctx, landing.x, landing.y + rise, landing.zoom, near);
      }

      const chuteOpen = t >= CHUTE ? outBack(clamp01((t - CHUTE) / 0.24)) : 0;
      const release = clamp01((t - LAND - 0.1) / 0.75);
      const swing =
        t >= CHUTE && t < LAND
          ? Math.sin((t - CHUTE) * 3.6 + 0.5) * 0.17 * Math.exp(-(t - CHUTE) * 0.75) * (1 - smoothstep(LAND - 0.4, LAND - 0.02, t))
          : 0;
      if (chuteOpen > 0 && release < 1) {
        ctx.save();
        if (release > 0) {
          const r = release * release;
          ctx.translate(gx + r * w * 0.35, gy - zoom * PIVOT - r * h * 0.5);
          ctx.rotate(r * 0.9);
          ctx.globalAlpha = 1 - smoothstep(0.4, 1, release);
          ctx.scale(zoom * (1 - r * 0.3), zoom * (1 - r * 0.5));
          ctx.translate(0, PIVOT);
        } else {
          ctx.translate(gx, gy - zoom * PIVOT);
          ctx.rotate(swing);
          ctx.translate(0, zoom * PIVOT);
          ctx.scale(zoom, zoom);
        }
        drawCanopy(ctx, chuteOpen, 1 - clamp01(release * 6));
        ctx.restore();
      }

      if (started || reduce) {
        ctx.save();
        if (swing) {
          ctx.translate(gx, gy - zoom * PIVOT);
          ctx.rotate(swing);
          ctx.translate(-gx, -(gy - zoom * PIVOT));
        }
        placeCharacter(ctx, img, p, gx, gy, zoom);
        ctx.restore();
      }

      const pix = Math.max(2, landing.zoom * 16);
      if (t > LAND && t < LAND + 0.8) {
        const life = t - LAND;
        for (let i = 0; i < 26; i++) {
          const dir = i % 2 ? 1 : -1;
          const fade = 1 - clamp01(life / (0.45 + hash(i + 800) * 0.3));
          if (fade <= 0) continue;
          const out = 1 - Math.exp(-life * 6);
          const x = landing.x + dir * (landing.zoom * 140 + (landing.zoom * (260 + hash(i + 700) * 420) / 6) * out);
          const y = landing.y - landing.zoom * (8 + hash(i + 600) * 50) - out * landing.zoom * (30 + hash(i + 500) * 90);
          const size = pix * (1 + hash(i + 900) * 1.4) * (0.6 + 0.4 * fade);
          ctx.globalAlpha = fade * 0.7;
          ctx.fillStyle = i % 4 ? "#c9cdc7" : "#86efac";
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      }
      if (t > LAND + 0.5 && t < END) {
        const life = t - LAND - 0.5;
        for (let i = 0; i < 9; i++) {
          const local = life - hash(i + 40) * 0.2;
          if (local <= 0) continue;
          const fade = Math.sin(clamp01(local / 0.45) * Math.PI);
          const angle = -Math.PI * (0.1 + (i / 8) * 0.8);
          const dist = landing.zoom * (420 + hash(i + 41) * 160) * (0.8 + local * 0.6);
          const x = landing.x + Math.cos(angle) * dist;
          const y = landing.y - landing.zoom * 380 + Math.sin(angle) * dist * 0.85;
          const size = pix * (0.8 + hash(i + 42) * 0.8) * fade;
          ctx.globalAlpha = fade;
          ctx.fillStyle = i % 3 ? "#86efac" : "#f4f5f1";
          ctx.fillRect(x - size * 1.5, y - size / 2, size * 3, size);
          ctx.fillRect(x - size / 2, y - size * 1.5, size, size * 3);
        }
        ctx.globalAlpha = 1;
      }

      const fog = key(t, [[FOG - 0.36, 0], [FOG - 0.1, 1, (q) => q * q], [FOG + 0.1, 1], [FOG + 0.42, 0, outQuad]]);
      if (t > FOG - 0.7 && t < FOG + 0.7) {
        for (let i = 0; i < 22; i++) {
          const worldY = camYAt(fallPath(FOG, s).y) + h * 0.5 + (hash(i + 1200) - 0.5) * h * 1.6;
          const y = worldY - scroll;
          const x = hash(i + 1201) * w;
          const r = w * (0.18 + hash(i + 1202) * 0.22);
          const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
          puff.addColorStop(0, "rgba(116,132,150,0.85)");
          puff.addColorStop(0.6, "rgba(96,110,128,0.4)");
          puff.addColorStop(1, "rgba(96,110,128,0)");
          ctx.fillStyle = puff;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
      if (fog > 0) {
        ctx.globalAlpha = fog;
        ctx.fillStyle = "#57636f";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      if (!afterFog) {
        ctx.globalCompositeOperation = "source-atop";
        const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
        ctx.translate(Math.floor(hash(Math.floor(ambient * 24)) * 128), Math.floor(hash(Math.floor(ambient * 24) + 9) * 128));
        ctx.fillStyle = grain;
        ctx.fillRect(-128, -128, w + 256, h + 256);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      }

      const dim = reduce ? 0 : 1 - smoothstep(0, 0.9, t);
      if (dim > 0) {
        ctx.fillStyle = `rgba(2,3,6,${0.55 * dim})`;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty("--intro-rise");
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={leaving ? "intro leaving" : "intro"} role="dialog" aria-label="Pillees opening animation">
      <canvas ref={canvasRef} className="intro-canvas" />
      <div className={entered ? "intro-gate gone" : "intro-gate"}>
        <button className="intro-enter" type="button" onClick={begin} autoFocus>
          <span className="intro-enter-icon">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M5 3.2l8 4.8-8 4.8z" fill="currentColor" />
            </svg>
          </span>
          Enter
        </button>
      </div>
      <div className="intro-controls">
        <button
          className="intro-btn"
          type="button"
          onClick={toggleSound}
          aria-label={sound ? "Mute intro sound" : "Turn on intro sound"}
          aria-pressed={sound}
        >
          <SoundIcon on={sound} />
        </button>
        <button className="intro-btn" type="button" onClick={() => finish()} aria-label="Skip intro">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M2 3l6 5-6 5zM8 3l6 5-6 5z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
