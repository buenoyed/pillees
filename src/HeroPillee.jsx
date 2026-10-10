import { useEffect, useRef } from "react";
import {
  GROUND,
  HANDOFF,
  SPRITE_W,
  SPRITE_H,
  bump,
  clamp01,
  groundShadow,
  inQuad,
  key,
  loadParts,
  outQuad,
  placeCharacter,
  restPose,
  smoothstep,
} from "./pillee";
import { playAt } from "./sound";

const PAD_X = 0.25;
const PAD_TOP = 0.22;
const HOP = 0.74;

export default function HeroPillee() {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const hop = useRef(-1e6);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    let img = null;
    let awakeAt = document.querySelector(".intro") ? null : performance.now();
    let last = performance.now();
    const look = { x: 0, y: 0, tx: 0, ty: 0, near: false };
    const eyes = { mode: "happy", since: -10 };
    let nextIdle = 4.5;
    let idle = null;

    const wake = () => {
      awakeAt ??= performance.now();
    };
    window.addEventListener(HANDOFF, wake);

    const onPointer = (event) => {
      const rect = box.getBoundingClientRect();
      const ex = rect.left + rect.width * 0.48;
      const ey = rect.top + rect.height * 0.34;
      const dx = event.clientX - ex;
      const dy = event.clientY - ey;
      look.tx = Math.max(-1, Math.min(1, dx / (rect.width * 0.9)));
      look.ty = Math.max(-1, Math.min(1, dy / (rect.height * 0.8)));
      look.near = Math.hypot(dx / rect.width, dy / rect.height) < 1.1;
    };
    const onLeave = () => {
      look.near = false;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    loadParts().then((parts) => {
      if (stopped) return;
      img = parts;
      raf = requestAnimationFrame(draw);
    });

    function draw(now) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = reduce || awakeAt == null ? 0 : (now - awakeAt) / 1000;
      const p = restPose(reduce ? 0 : t);

      const ease = 1 - Math.exp(-dt * 10);
      look.x += (look.tx - look.x) * ease;
      look.y += (look.ty - look.y) * ease;

      if (!reduce && awakeAt != null) {
        if (!idle && !look.near && t > nextIdle) {
          idle = { kind: Math.random() < 0.5 ? "look" : "wave", at: t };
        }
        if (idle) {
          const local = t - idle.at;
          const length = idle.kind === "look" ? 2.3 : 1.3;
          if (local > length || look.near) {
            idle = null;
            nextIdle = t + 5 + Math.random() * 4;
          } else if (idle.kind === "wave") {
            const wave = smoothstep(0, 0.2, local) * (1 - smoothstep(length - 0.2, length, local));
            p.armL += wave * (0.22 + Math.sin(local * 15) * 0.32);
          }
        }
      }

      const hopT = reduce ? -1 : Math.max(0, now - hop.current) / 1000;
      const hopping = hopT >= 0 && hopT < HOP;
      const glancing = idle?.kind === "look";
      const mode = (look.near || glancing) && !hopping ? "open" : "happy";
      if (mode !== eyes.mode) {
        eyes.mode = mode;
        eyes.since = t;
      }
      p.eyes.mode = mode;
      p.eyes.open = 1 - Math.max(bump(t, eyes.since + 0.03, 0.07), blink(t));
      if (glancing && !look.near) {
        const local = t - idle.at;
        p.eyes.lookX = key(local, [[0.2, 0], [0.4, -1], [1.0, -1], [1.25, 1], [1.9, 1], [2.1, 0]]);
        p.eyes.lookY = 0;
        p.lean = key(local, [[0.3, 0], [0.5, -0.03], [1.0, -0.03], [1.3, 0.03], [1.9, 0.03], [2.1, 0]]);
      } else {
        p.eyes.lookX = look.x;
        p.eyes.lookY = look.y;
        p.lean = look.near ? look.x * 0.025 : 0;
      }

      let lift = 0;
      if (hopping) {
        const squash = key(hopT, [[0, 1], [0.08, 0.84], [0.17, 1.1], [0.38, 1.03], [0.5, 0.86], [0.62, 1.03], [HOP, 1]]);
        p.sy *= squash;
        p.sx = 1 / Math.sqrt(p.sy);
        lift = key(hopT, [[0.12, 0], [0.3, 120, outQuad], [0.48, 0, inQuad]]);
        const air = smoothstep(0.1, 0.18, hopT) * (1 - smoothstep(0.42, 0.5, hopT));
        p.armL += air * 0.5;
        p.armR -= air * 0.5;
        p.footL.lift = p.footR.lift = air * 10;
        p.footL.rot = p.footR.rot = -air * 0.1;
      }

      const zoom = canvas.width / (SPRITE_W * (1 + PAD_X * 2));
      const gx = (SPRITE_W * PAD_X + GROUND[0]) * zoom;
      const gy = (SPRITE_H * PAD_TOP + GROUND[1]) * zoom;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (img) {
        groundShadow(ctx, gx, gy, zoom * (1 - lift / 600), 1 - clamp01(lift / 160) * 0.6);
        placeCharacter(ctx, img, p, gx, gy - lift * zoom, zoom);
      }
      raf = requestAnimationFrame(draw);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener(HANDOFF, wake);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  function poke() {
    const now = performance.now();
    if ((now - hop.current) / 1000 < HOP) return;
    hop.current = now;
    playAt(0, "squeak", 1.15, 0.9);
    playAt(0.06, "voice", [[0, 640], [0.07, 1040], [0.24, 900]], 0.8);
    playAt(0.47, "step", 1.05, 0.6);
  }

  return (
    <div
      ref={boxRef}
      className="hero-pillee"
      role="img"
      aria-label="Pillee, a green and white capsule with a black visor, blocky fists, and green sneakers"
      onClick={poke}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

function blink(t) {
  const period = 3.6;
  const local = t % period;
  const n = Math.floor(t / period);
  const at = 1.2 + ((n * 0.618) % 1) * 1.8;
  return t < 1 ? 0 : bump(local, at, 0.07);
}
