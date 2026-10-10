import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { PARTS, placeCharacter } from "../../../src/pillee.js";

export const COLORS = {
  green: "hue-rotate(0deg)",
  purple: "hue-rotate(125deg) saturate(1.25)",
  blue: "hue-rotate(62deg) saturate(1.2)",
  pink: "hue-rotate(188deg) saturate(1.15)",
  orange: "hue-rotate(-112deg) saturate(1.5) brightness(1.04)",
  yellow: "hue-rotate(-88deg) saturate(1.6) brightness(1.1)",
  teal: "hue-rotate(32deg) saturate(1.1)",
  red: "hue-rotate(-150deg) saturate(1.5)",
  ghost: "grayscale(1) brightness(1.35) contrast(0.75)",
};

let sets = null;
function loadSets() {
  sets ??= Promise.all(
    Object.keys(PARTS).map(
      (name) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = reject;
          image.src = staticFile(`intro/${name}.png`);
        }),
    ),
  ).then((loaded) => {
    const base = Object.fromEntries(loaded);
    const out = {};
    for (const [color, filter] of Object.entries(COLORS)) {
      out[color] = {};
      for (const [name, image] of Object.entries(base)) {
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        const g = c.getContext("2d");
        g.filter = filter;
        g.drawImage(image, 0, 0);
        out[color][name] = c;
      }
    }
    return out;
  });
  return sets;
}

function shadow(ctx, x, y, zoom, strength) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(40,30,80,${0.22 * strength})`);
  g.addColorStop(1, "rgba(40,30,80,0)");
  ctx.save();
  ctx.translate(x - 18 * zoom, y - 4 * zoom);
  ctx.scale(230 * zoom, 34 * zoom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// c: { color, pose, x, y (ground), zoom, shadow, shadowY, alpha, rotate: [angle, pivotY] }
export function drawChar(ctx, sets, c) {
  ctx.save();
  if (c.alpha != null) ctx.globalAlpha = c.alpha;
  if (c.rotate) {
    const [angle, py] = c.rotate;
    ctx.translate(c.x, py);
    ctx.rotate(angle);
    ctx.translate(-c.x, -py);
  }
  placeCharacter(ctx, sets[c.color], c.pose, c.x, c.y, c.zoom);
  ctx.restore();
}

export function drawShadow(ctx, c) {
  if (c.shadow !== 0) shadow(ctx, c.x, c.shadowY ?? c.y, c.zoom, c.shadow ?? 1);
}

// A full-frame canvas repainted every frame by draw(ctx, sets).
export function Paint({ draw, width = 1920, height = 1080, style }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(null);
  const [handle] = useState(() => delayRender("pillee sets"));

  useLayoutEffect(() => {
    loadSets().then((s) => {
      setLoaded(s);
      continueRender(handle);
    });
  }, [handle]);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    draw(ctx, loaded);
  });

  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, ...style }} />;
}

// chars: [{ color, pose, x, y (ground), zoom, shadow, shadowY }]
export function Stage({ chars, width, height, style }) {
  return (
    <Paint
      width={width}
      height={height}
      style={style}
      draw={(ctx, sets) => {
        const list = [...chars].sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));
        for (const c of list) drawShadow(ctx, c);
        for (const c of list) drawChar(ctx, sets, c);
      }}
    />
  );
}
