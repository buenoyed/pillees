export const PARTS = {
  body: [135, 0],
  armL: [0, 196],
  armR: [440, 331],
  footL: [66, 499],
  footR: [275, 529],
};
export const GROUND = [330, 715];
export const SPRITE_W = 612;
export const SPRITE_H = 720;
const VISOR = "rgb(12, 24, 22)";
const EYE_TILT = 0.19;
const EYES = [
  { x: 240, y: 244, src: [198, 207, 84, 75] },
  { x: 338, y: 263, src: [297, 227, 82, 72] },
];

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
export const inQuad = (p) => p * p;
export const outQuad = (p) => 1 - (1 - p) * (1 - p);
export const outBack = (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
export const smoothstep = (a, b, t) => {
  const p = clamp01((t - a) / (b - a));
  return p * p * (3 - 2 * p);
};
export const bump = (t, center, radius) => Math.max(0, 1 - Math.abs(t - center) / radius);

export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function key(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, ease = inOut] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return frames[frames.length - 1][1];
}

let partsPromise = null;
export function loadParts() {
  partsPromise ??= Promise.all(
    Object.keys(PARTS).map(
      (name) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = reject;
          image.src = `/intro/${name}.png`;
        }),
    ),
  ).then((loaded) => Object.fromEntries(loaded));
  return partsPromise;
}

export function restPose(t = 0) {
  const sy = 1 + Math.sin(t * 2.4) * 0.012;
  return {
    face: 1,
    sx: 1 / Math.sqrt(sy),
    sy,
    lean: 0,
    spin: 0,
    bob: Math.sin(t * 2.4) * 2,
    bodyRot: 0,
    armL: 0,
    armR: 0,
    footL: { dx: 0, lift: 0, rot: 0 },
    footR: { dx: 0, lift: 0, rot: 0 },
    eyes: { mode: "happy", open: 1, lookX: 0, lookY: 0, wide: 1 },
  };
}

function drawEyes(ctx, body, eyes) {
  if (eyes.mode === "happy" && eyes.open >= 0.999) return;
  const open = Math.max(0.1, eyes.open);
  for (const eye of EYES) {
    const [sx, sy, sw, sh] = eye.src;
    ctx.fillStyle = VISOR;
    ctx.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
    if (eyes.mode === "happy") {
      const h = sh * open;
      ctx.drawImage(body, sx - PARTS.body[0], sy, sw, sh, sx, sy + (sh - h) / 2, sw, h);
      continue;
    }
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(EYE_TILT);
    ctx.scale(eyes.wide, eyes.wide * open);
    ctx.fillStyle = "#eceeea";
    ctx.fillRect(-15, -30, 30, 60);
    ctx.fillRect(-25, -20, 50, 40);
    ctx.fillStyle = VISOR;
    ctx.fillRect(-10 + eyes.lookX * 11, -15 + eyes.lookY * 11, 20, 30);
    ctx.restore();
  }
}

const FOOT_PIVOTS = { footL: [183, 600], footR: [365, 640] };
const HIPS = { footL: [194, 492], footR: [378, 518] };
const ANKLES = { footL: [194, 536], footR: [378, 566] };
const LEG_W = 46;
const LEG_PX = 8;

function onFoot(foot, pivot, [x, y]) {
  const c = Math.cos(foot.rot);
  const s = Math.sin(foot.rot);
  const rx = x - pivot[0];
  const ry = y - pivot[1];
  return [pivot[0] + rx * c - ry * s + foot.dx, pivot[1] + rx * s + ry * c - foot.lift];
}

function onBody(p, [x, y]) {
  const c = Math.cos(p.bodyRot);
  const s = Math.sin(p.bodyRot);
  const rx = x - 330;
  const ry = y - 540;
  return [330 + rx * c - ry * s, 540 + rx * s + ry * c + p.bob];
}

function drawLegs(ctx, p) {
  const legs = ["footR", "footL"].map((name) => [onBody(p, HIPS[name]), onFoot(p[name], FOOT_PIVOTS[name], ANKLES[name])]);
  for (const [color, width] of [["#182024", LEG_W], ["#384448", 14]]) {
    ctx.fillStyle = color;
    for (const [[hx, hy], [ax, ay]] of legs) {
      const n = Math.max(1, Math.ceil(Math.hypot(ax - hx, ay - hy) / (LEG_PX * 0.75)));
      for (let i = 0; i <= n; i++) {
        const x = Math.round((hx + ((ax - hx) * i) / n) / LEG_PX) * LEG_PX;
        const y = Math.round((hy + ((ay - hy) * i) / n) / LEG_PX) * LEG_PX;
        ctx.fillRect(x - LEG_W / 2, y - LEG_PX, width, LEG_PX * 2);
      }
    }
  }
}

export function drawCharacter(ctx, img, p) {
  drawLegs(ctx, p);
  for (const name of ["footR", "footL"]) {
    const foot = p[name];
    const [ox, oy] = PARTS[name];
    const pivot = FOOT_PIVOTS[name];
    ctx.save();
    ctx.translate(foot.dx, -foot.lift);
    ctx.translate(pivot[0], pivot[1]);
    ctx.rotate(foot.rot);
    ctx.translate(-pivot[0], -pivot[1]);
    ctx.drawImage(img[name], ox, oy);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, p.bob);
  ctx.translate(330, 540);
  ctx.rotate(p.bodyRot);
  ctx.translate(-330, -540);
  for (const [name, pivot] of [["armR", [452, 372]], ["armL", [170, 322]]]) {
    ctx.save();
    ctx.translate(pivot[0], pivot[1]);
    ctx.rotate(p[name]);
    ctx.translate(-pivot[0], -pivot[1]);
    ctx.drawImage(img[name], PARTS[name][0], PARTS[name][1]);
    ctx.restore();
  }
  ctx.drawImage(img.body, PARTS.body[0], PARTS.body[1]);
  drawEyes(ctx, img.body, p.eyes);
  ctx.restore();
}

export function placeCharacter(ctx, img, p, x, y, zoom) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.lean * Math.sign(p.face) + p.spin);
  ctx.scale(p.face * p.sx * zoom, p.sy * zoom);
  ctx.translate(-GROUND[0], -GROUND[1]);
  drawCharacter(ctx, img, p);
  ctx.restore();
}

export function groundShadow(ctx, x, y, zoom, strength = 1) {
  if (strength <= 0) return;
  const rx = SPRITE_W * 0.34 * zoom;
  const ry = 34 * zoom;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${0.55 * strength})`);
  g.addColorStop(0.6, `rgba(0,0,0,${0.3 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(x - 18 * zoom, y - 6 * zoom);
  ctx.scale(rx, ry);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const HANDOFF = "pillee:handoff";
