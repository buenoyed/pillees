import { bump, clamp01, key, outQuad, restPose, smoothstep } from "../../../src/pillee.js";

export const STRIDE = 70;

// Distance covered by the planted foot after `phase` radians: integral of |cos|.
function travel(phase) {
  const half = Math.floor(phase / Math.PI);
  const u = phase - half * Math.PI;
  return 2 * half + (u <= Math.PI / 2 ? Math.sin(u) : 2 - Math.sin(u));
}

// A walk from x0 to x1 that starts at frame `from`. Feet stay planted: the body only
// moves as fast as the stance foot sweeps back.
export function walk(frame, { from, x0, x1, zoom, omega = 16, fps = 30 }) {
  const dir = Math.sign(x1 - x0) || 1;
  const steps = Math.max(1, Math.round(Math.abs(x1 - x0) / (zoom * STRIDE * 2)));
  const duration = (steps * Math.PI) / omega;
  const t = clamp01(((frame - from) / fps) / duration) * duration;
  const phase = t * omega;
  return {
    x: x0 + dir * zoom * STRIDE * travel(phase),
    phase,
    face: dir,
    walking: frame >= from && t < duration,
    arrive: from + Math.ceil(duration * fps),
    steps,
  };
}

export function footfalls(spec) {
  const out = [];
  const w = walk(0, { ...spec, from: 0 });
  for (let k = 0; k < w.steps; k++) {
    out.push(spec.from + ((k + 0.5) * Math.PI) / (spec.omega ?? 16) * (spec.fps ?? 30));
  }
  return out;
}

export function eyes(t, { mode = "open", look = [0, 0], wide = 1, blinks = [] } = {}) {
  return {
    mode,
    open: 1 - Math.max(0, ...blinks.map((b) => bump(t, b, 0.07))),
    lookX: look[0],
    lookY: look[1],
    wide,
  };
}

export function stand(t, extra = {}) {
  return { ...restPose(t), ...extra };
}

export function walking(t, w, extra = {}) {
  const base = restPose(t);
  if (!w.walking) return { ...base, face: w.face, ...extra };
  const s = Math.sin(w.phase);
  const c = Math.cos(w.phase);
  return {
    ...base,
    face: w.face,
    lean: 0.05,
    bob: -Math.abs(c) * 12,
    bodyRot: s * 0.035,
    armL: -s * 0.28,
    armR: -s * 0.28,
    footL: { dx: s * STRIDE, lift: Math.max(0, c) * 34, rot: -Math.max(0, c) * 0.18 },
    footR: { dx: -s * STRIDE, lift: Math.max(0, -c) * 34, rot: -Math.max(0, -c) * 0.18 },
    ...extra,
  };
}

// A hop that leaves at `t0` (seconds) and lands `dur` later. Returns pose + height 0..1.
export function hop(t, t0, dur, extra = {}) {
  const base = restPose(t);
  const p = clamp01((t - t0) / dur);
  const crouch = key(t, [
    [t0 - 0.12, 1],
    [t0 - 0.02, 0.82],
    [t0 + 0.05, 1.12],
    [t0 + dur - 0.05, 1.05],
    [t0 + dur + 0.04, 0.8, outQuad],
    [t0 + dur + 0.2, 1.04],
    [t0 + dur + 0.32, 1],
  ]);
  const air = p > 0 && p < 1;
  const squat = Math.max(0, 1 - crouch);
  return {
    pose: {
      ...base,
      sy: crouch,
      sx: 1 / Math.sqrt(crouch),
      bob: 0,
      armL: air ? 0.9 : squat * 0.6,
      armR: air ? -0.9 : -squat * 0.6,
      footL: { dx: -squat * 50, lift: air ? 18 : 0, rot: air ? 0.12 : 0 },
      footR: { dx: squat * 50, lift: air ? 12 : 0, rot: air ? -0.12 : 0 },
      ...extra,
    },
    p,
    height: 4 * p * (1 - p),
  };
}

export function cheer(t, strength = 1, extra = {}) {
  const base = restPose(t);
  const k = strength * (0.9 + Math.sin(t * 16) * 0.12);
  return {
    ...base,
    armL: k,
    armR: -k,
    bob: base.bob - Math.abs(Math.sin(t * 8)) * 10 * strength,
    eyes: { mode: "happy", open: 1, lookX: 0, lookY: 0, wide: 1 },
    ...extra,
  };
}

// Free fall: arms and legs spread, a little tumble.
export function dive(t, k = 1, extra = {}) {
  const base = restPose(t);
  return {
    ...base,
    bob: 0,
    spin: Math.sin(t * 5) * 0.06 * k,
    armL: (0.95 + Math.sin(t * 18) * 0.08) * k,
    armR: -(1.0 + Math.cos(t * 17) * 0.08) * k,
    footL: { dx: -40 * k, lift: 18 * k + Math.sin(t * 14) * 6, rot: 0.12 * k },
    footR: { dx: 40 * k, lift: 18 * k + Math.cos(t * 13) * 6, rot: -0.12 * k },
    eyes: { mode: "open", open: 1, lookX: 0, lookY: 0.6, wide: 1.2 },
    ...extra,
  };
}

// Hanging under a canopy: hands up on the lines, feet dangling.
export function hang(t, extra = {}) {
  const base = restPose(t);
  return {
    ...base,
    bob: 0,
    armL: 0.42 + Math.sin(t * 3) * 0.04,
    armR: -0.62 - Math.sin(t * 3) * 0.04,
    footL: { dx: -12 + Math.sin(t * 4) * 8, lift: 4, rot: 0.08 },
    footR: { dx: 12 - Math.sin(t * 4) * 8, lift: 2, rot: -0.06 },
    eyes: { mode: "open", open: 1, lookX: 0.4, lookY: 0.2, wide: 1 },
    ...extra,
  };
}

export { smoothstep, clamp01, key };
