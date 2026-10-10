import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import {
  PARTS,
  bump,
  clamp01,
  groundShadow,
  key,
  outQuad,
  placeCharacter,
  restPose,
  smoothstep,
} from "../../src/pillee.js";
import { HEIGHT, WIDTH } from "./timeline";

let parts = null;
function loadParts() {
  parts ??= Promise.all(
    Object.keys(PARTS).map(
      (name) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = reject;
          image.src = staticFile(`intro/${name}.png`);
        }),
    ),
  ).then(Object.fromEntries);
  return parts;
}

export function Pillee({ pose, x, y, zoom, shadow = 1, style }) {
  const ref = useRef(null);
  const [img, setImg] = useState(null);
  const [handle] = useState(() => delayRender("pillee parts"));

  useLayoutEffect(() => {
    loadParts().then((loaded) => {
      setImg(loaded);
      continueRender(handle);
    });
  }, [handle]);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.imageSmoothingQuality = "high";
    if (shadow > 0) groundShadow(ctx, x, y, zoom, shadow);
    placeCharacter(ctx, img, pose, x, y, zoom);
  });

  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      style={{ position: "absolute", inset: 0, width: WIDTH, height: HEIGHT, ...style }}
    />
  );
}

const openEyes = (t, blinks = [], look = [0, 0], wide = 1) => ({
  mode: "open",
  open: 1 - Math.max(0, ...blinks.map((b) => bump(t, b, 0.07))),
  lookX: look[0],
  lookY: look[1],
  wide,
});

// t = seconds relative to touchdown (negative while falling).
export function landingPose(t) {
  const base = restPose(Math.max(0, t));
  if (t < 0) {
    return {
      ...base,
      sx: 0.92,
      sy: 1.16,
      bob: 0,
      armL: 1.0 + Math.sin(t * 30) * 0.08,
      armR: -1.05 - Math.cos(t * 28) * 0.08,
      footL: { dx: -30, lift: 26, rot: 0.1 },
      footR: { dx: 30, lift: 18, rot: -0.1 },
      eyes: openEyes(t, [], [0, -0.4], 1.25),
    };
  }
  const crouch = key(t, [
    [0, 1],
    [0.07, 0.7, outQuad],
    [0.3, 0.8],
    [0.5, 1.1],
    [0.68, 0.96],
    [0.85, 1],
  ]);
  const squat = Math.max(0, 1 - crouch);
  const tada = smoothstep(0.42, 0.62, t) * (1 - smoothstep(1.5, 1.9, t));
  const sy = crouch * base.sy;
  return {
    ...base,
    sy,
    sx: 1 / Math.sqrt(sy),
    bob: t < 0.9 ? 0 : base.bob,
    armL: tada * (0.95 + Math.sin(t * 9) * 0.05) + squat * 0.5,
    armR: -tada * (0.95 + Math.cos(t * 9) * 0.05) - squat * 0.5,
    footL: { dx: -squat * 70, lift: 0, rot: 0 },
    footR: { dx: squat * 70, lift: 0, rot: 0 },
    eyes: t < 0.5 ? openEyes(t, [0.06], [0, 0.4], 1.15) : base.eyes,
  };
}

export function wavePose(t) {
  const base = restPose(t);
  const wave = smoothstep(0.7, 0.95, t) * (1 - smoothstep(2.6, 2.9, t)) + smoothstep(5.6, 5.85, t) * (1 - smoothstep(7.2, 7.5, t));
  const look = key(t, [
    [3.0, 0],
    [3.2, 1],
    [4.3, 1],
    [4.5, 0],
  ]);
  return {
    ...base,
    armL: wave * (0.35 + Math.sin(t * 14) * 0.35),
    armR: -0.05 * wave,
    lean: -0.03 * wave,
    eyes: openEyes(t, [2.2, 4.9, 6.9], [look, 0]),
  };
}

// Pops up from below the frame with a squash, used by the outro.
export function popPose(t) {
  const base = wavePose(Math.max(0, t));
  const land = key(t, [
    [0, 1.18],
    [0.32, 1.12],
    [0.42, 0.78, outQuad],
    [0.6, 1.06],
    [0.76, 0.98],
    [0.9, 1],
  ]);
  return { ...base, sy: base.sy * land, sx: base.sx / Math.sqrt(land) };
}

export const riseY = (t) => clamp01(t / 0.42);
