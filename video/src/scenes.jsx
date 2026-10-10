import { AbsoluteFill, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { hash, smoothstep } from "../../src/pillee.js";
import { DISPLAY, MONO, SANS } from "./fonts";
import { Pillee, landingPose, popPose, riseY } from "./Pillee";
import { RouteGraph } from "./RouteGraph";
import { C } from "./timeline";
import { Backdrop, Body, Browser, Chip, Flash, Label, Words, ease, usePop } from "./ui";

const center = { display: "flex", alignItems: "center", justifyContent: "center" };

/* ---------- 1. Hook: the same coin, two prices ---------- */

const baseY = (x) => 610 + Math.sin(x / 190 + 1.2) * 54 + Math.sin(x / 71) * 22 + Math.sin(x / 23) * 6;
const gapAt = (x) => 4 + 132 * smoothstep(520, 1380, x);

function PriceChart({ head, opacity }) {
  const pts = [];
  for (let x = 0; x <= head; x += 8) pts.push(x);
  const top = pts.map((x) => [x, baseY(x) - gapAt(x) / 2]);
  const bot = pts.map((x) => [x, baseY(x) + gapAt(x) / 2 + Math.sin(x / 37) * 4]);
  const line = (p) => p.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const band = `${line(top)} ${bot.reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;
  const hy1 = baseY(head) - gapAt(head) / 2;
  const hy2 = baseY(head) + gapAt(head) / 2;
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        <linearGradient id="band" x1="0" x2="1">
          <stop offset="0" stopColor={C.mint} stopOpacity="0" />
          <stop offset="1" stopColor={C.mint} stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {pts.length > 1 && (
        <>
          <path d={band} fill="url(#band)" />
          <path d={line(top)} fill="none" stroke={C.mint} strokeWidth="4" style={{ filter: "drop-shadow(0 0 12px rgba(134,239,172,0.8))" }} />
          <path d={line(pts.map((x) => [x, baseY(x) + gapAt(x) / 2 + Math.sin(x / 37) * 4]))} fill="none" stroke={C.ink} strokeOpacity="0.75" strokeWidth="3" />
          <circle cx={head} cy={hy1} r="9" fill={C.mint} />
          <circle cx={head} cy={hy2} r="8" fill={C.ink} />
        </>
      )}
    </svg>
  );
}

function PriceTag({ x, y, label, value, mint, opacity }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x + 26,
        top: y - 30,
        display: "flex",
        gap: 14,
        alignItems: "baseline",
        padding: "10px 18px",
        borderRadius: 14,
        background: "rgba(20,21,24,0.92)",
        border: `1px solid ${mint ? "rgba(134,239,172,0.5)" : C.lineStrong}`,
        opacity,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: C.dim }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 26, color: mint ? C.mint : C.ink }}>{value}</span>
    </div>
  );
}

export function Hook() {
  const f = useCurrentFrame();
  const head = ease(f, [0, 112], [0, 1460], Easing.out(Easing.cubic));
  const chartIn = ease(f, [0, 20], [0, 0.55]) + ease(f, [58, 70], [0, 0.45]);
  const chartOut = ease(f, [118, 134], [1, 0]);
  const tags = ease(f, [74, 86], [0, 1]) * chartOut;
  const spread = usePop(92);
  const push = ease(f, [120, 180], [1, 1.12], Easing.in(Easing.quad));
  const shake = f > 150 ? (hash(f) - 0.5) * (f - 150) * 0.5 : 0;
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.5, 0.6]} intensity={ease(f, [0, 50], [0.2, 1])} />
      <AbsoluteFill style={{ transform: `scale(${push}) translate(${shake}px, ${shake * 0.6}px)` }}>
        <PriceChart head={head} opacity={chartIn * chartOut} />
        <PriceTag x={head} y={baseY(head) - gapAt(head) / 2} label="CURVE" value="0.000412" mint opacity={tags} />
        <PriceTag x={head} y={baseY(head) + gapAt(head) / 2 + 10} label="POOL" value="0.000447" opacity={tags} />
        <div
          style={{
            position: "absolute",
            left: head - 230,
            top: baseY(head) - 34,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 54,
            color: C.mint,
            textShadow: "0 0 30px rgba(134,239,172,0.6)",
            opacity: Math.min(1, spread) * chartOut,
            transform: `scale(${0.5 + spread * 0.5})`,
          }}
        >
          +8.4%
        </div>

        <Sequence durationInFrames={62}>
          <AbsoluteFill style={{ ...center, paddingBottom: 260 }}>
            <Words text="Pump coins move fast." size={150} accent={[3]} out={[48, 60]} />
          </AbsoluteFill>
        </Sequence>
        <Sequence from={60} durationInFrames={62}>
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 }}>
            <Label style={{ marginBottom: 26 }}>Same coin · MOSS</Label>
            <Words text="Two prices. One gap." size={124} accent={[2, 3]} out={[50, 60]} />
          </AbsoluteFill>
        </Sequence>
        <Sequence from={120} durationInFrames={60}>
          <AbsoluteFill style={center}>
            <Words text="Something hunts it." size={170} accent={[1, 2]} stagger={4} out={[44, 52]} />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- 2. Drop: the mascot lands, the wordmark slams ---------- */

const TOUCH = 12;

function Dust({ f }) {
  const t = f - TOUCH;
  if (t < 0 || t > 40) return null;
  return (
    <AbsoluteFill>
      {Array.from({ length: 34 }, (_, i) => {
        const dir = hash(i) > 0.5 ? 1 : -1;
        const vx = dir * (6 + hash(i + 9) * 20);
        const vy = -(8 + hash(i + 3) * 18);
        const x = 960 + dir * (60 + hash(i + 5) * 120) + vx * t;
        const y = 905 + vy * t + 0.9 * t * t;
        const s = 8 + Math.round(hash(i + 7) * 3) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: Math.min(y, 912),
              width: s,
              height: s,
              background: hash(i + 1) > 0.4 ? C.mint : "#d4d4d8",
              opacity: Math.max(0, 1 - t / 34),
              boxShadow: "0 0 12px rgba(134,239,172,0.6)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

export function Drop() {
  const f = useCurrentFrame();
  const t = (f - TOUCH) / 30;
  const fall = t < 0 ? (t / -0.4) ** 2 : 0;
  const y = 900 - fall * 1300;
  const slam = usePop(TOUCH + 1, { damping: 11, stiffness: 170, mass: 0.9 });
  const shake = f >= TOUCH && f < TOUCH + 14 ? (hash(f * 3.1) - 0.5) * 34 * (1 - (f - TOUCH) / 14) : 0;
  const ring = ease(f, [TOUCH, TOUCH + 22], [0, 1], Easing.out(Easing.cubic));
  const bg = ease(f, [TOUCH - 3, TOUCH], [0, 1]);
  const exit = ease(f, [110, 132], [0, 1], Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${1 - exit * 0.12})`, filter: exit ? `blur(${exit * 16}px)` : undefined }}>
      <AbsoluteFill style={{ opacity: bg }}>
        <Backdrop glow={[0.5, 0.55]} intensity={1.6 - ring * 0.6} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.7}px)` }}>
        <AbsoluteFill style={{ ...center, paddingBottom: 120 }}>
          <div style={{ position: "relative", transform: `scale(${2.2 - slam * 1.2})`, opacity: Math.min(1, slam * 2) * bg }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 400,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "transparent",
                backgroundImage: `linear-gradient(180deg, rgba(187,247,208,${0.62 + ease(f, [TOUCH + 20, TOUCH + 60], [0, 0.18])}) 0%, rgba(74,222,128,0.28) 55%, rgba(74,222,128,0.03) 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 40px rgba(134,239,172,0.35))",
              }}
            >
              Pillees
            </div>
          </div>
        </AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 960 - ring * 760,
            top: 905 - ring * 70,
            width: ring * 1520,
            height: ring * 140,
            borderRadius: "50%",
            border: `4px solid ${C.mint}`,
            opacity: f >= TOUCH ? 1 - ring : 0,
            boxShadow: "0 0 40px rgba(134,239,172,0.6)",
          }}
        />
        <Pillee pose={landingPose(t)} x={960} y={y} zoom={0.8} shadow={t < 0 ? Math.max(0, 1 + t * 2) : 1} />
        <Dust f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 70 }}>
        <Words text="Arbitrage capsules on Pump." start={TOUCH + 26} size={46} weight={600} font={SANS} color={C.muted} stagger={2} accent={[0, 1]} />
      </AbsoluteFill>
      <Flash at={TOUCH} length={12} />
    </AbsoluteFill>
  );
}

/* ---------- 3. Board reveal ---------- */

export function Board() {
  const f = useCurrentFrame();
  const enter = ease(f, [0, 34], [0, 1], Easing.out(Easing.cubic));
  const scroll = ease(f, [56, 118], [0, 545], Easing.inOut(Easing.cubic));
  const push = ease(f, [0, 180], [1, 1.06]);
  const exit = ease(f, [166, 180], [0, 1], Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.5, 0.3]} />
      <AbsoluteFill style={{ ...center, perspective: 1800, opacity: 1 - exit }}>
        <div
          style={{
            transform: `translateY(${(1 - enter) * 300}px) rotateX(${(1 - enter) * 34}deg) scale(${(0.84 + enter * 0.16) * push + exit * 0.08})`,
            opacity: enter,
            filter: exit ? `blur(${exit * 12}px)` : undefined,
          }}
        >
          <Browser src="home-full" width={1520} scroll={scroll}>
            <Sequence from={0}>
              <BoardCallouts />
            </Sequence>
          </Browser>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BoardCallouts() {
  const f = useCurrentFrame();
  if (f < 118) return null;
  return (
    <>
      <Chip delay={120} style={{ left: 120, top: 250 }}>Top capsules</Chip>
      <Chip delay={128} style={{ left: 560, top: 360 }}>Route tape</Chip>
      <Chip delay={136} style={{ left: 1170, top: 250 }}>Open edges</Chip>
    </>
  );
}

/* ---------- 4. How it works ---------- */

function StepText({ n, title, accent, body, f }) {
  return (
    <div style={{ position: "absolute", left: 120, top: 0, bottom: 0, width: 640, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30, opacity: ease(f, [2, 10], [0, 1]) }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: "#05210f", background: C.mint, borderRadius: 14, padding: "4px 16px" }}>{n}</span>
        <Label color={C.muted}>How it works</Label>
      </div>
      <Words text={title} size={92} align="left" accent={accent} start={4} stagger={3} />
      <Body size={30} style={{ marginTop: 30, opacity: ease(f, [18, 30], [0, 1]), transform: `translateY(${ease(f, [18, 30], [20, 0])}px)` }}>
        {body}
      </Body>
    </div>
  );
}

function StepShell({ children, length }) {
  const f = useCurrentFrame();
  const out = ease(f, [length - 12, length], [0, 1], Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.7, 0.5]} />
      <AbsoluteFill style={{ opacity: 1 - out, transform: `translateX(${-out * 80}px)`, filter: out ? `blur(${out * 10}px)` : undefined }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Rise({ children, left, top, delay = 0 }) {
  const f = useCurrentFrame();
  const p = ease(f, [delay, delay + 26], [0, 1], Easing.out(Easing.cubic));
  return (
    <div style={{ position: "absolute", left, top, perspective: 1600 }}>
      <div style={{ opacity: p, transform: `translateX(${(1 - p) * 140}px) rotateY(${(1 - p) * -18}deg)` }}>{children}</div>
    </div>
  );
}

export function Step1() {
  const f = useCurrentFrame();
  const scroll = ease(f, [24, 112], [0, 470], Easing.inOut(Easing.cubic));
  return (
    <StepShell length={120}>
      <StepText
        f={f}
        n="01"
        title="Spin up a capsule."
        accent={[3]}
        body="Each bot gets a fresh wallet you control, a strategy you write, a hop cap, and spend limits."
      />
      <Rise left={810} top={210}>
        <Browser src="new-full" width={1000} scroll={scroll} title="Pillees — New capsule" glow={0.8} />
      </Rise>
      <Chip delay={30} style={{ left: 760, top: 170 }}>Fresh wallet you control</Chip>
      <Chip delay={42} style={{ left: 1430, top: 420 }} tone="dark">Strategy you write</Chip>
      <Chip delay={54} style={{ left: 790, top: 740 }} tone="dark">Size + daily spend caps</Chip>
      <Chip delay={66} style={{ left: 1480, top: 840 }}>Optional coin</Chip>
    </StepShell>
  );
}

export function Step2() {
  const f = useCurrentFrame();
  return (
    <StepShell length={120}>
      <StepText
        f={f}
        n="02"
        title="It watches for the gap."
        accent={[3, 4]}
        body="The capsule quotes the whole route against the coins on it, and only fires when the edge clears your minimum."
      />
      <Rise left={800} top={210}>
        <RouteGraph mode="watch" />
      </Rise>
    </StepShell>
  );
}

function Stat({ big, text, delay }) {
  const p = usePop(delay, { damping: 13, stiffness: 140, mass: 0.7 });
  return (
    <div
      style={{
        width: 320,
        padding: "22px 26px",
        borderRadius: 20,
        background: "rgba(20,21,24,0.95)",
        border: `1px solid ${C.lineStrong}`,
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * 40}px)`,
      }}
    >
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, color: C.mint }}>{big}</div>
      <div style={{ fontFamily: SANS, fontSize: 22, color: C.muted, marginTop: 6 }}>{text}</div>
    </div>
  );
}

export function Step3() {
  const f = useCurrentFrame();
  const lift = ease(f, [92, 116], [0, 1], Easing.inOut(Easing.cubic));
  return (
    <StepShell length={180}>
      <StepText
        f={f}
        n="03"
        title="One swap clears the route."
        accent={[0, 1]}
        body="PumpSwap's multi_hop_swap runs every hop in a single instruction. The middle coin never touches the wallet."
      />
      <div style={{ position: "absolute", left: 0, top: -lift * 120, width: 1920, height: 1080 }}>
        <Rise left={800} top={210}>
          <RouteGraph mode="swap" />
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 800, top: 820, display: "flex", gap: 30 }}>
        <Stat big="Once" text="Fees per route, not per hop" delay={100} />
        <Stat big="None" text="Token account for the middle coin" delay={108} />
        <Stat big="One" text="Slippage check, on the final amount" delay={116} />
      </div>
    </StepShell>
  );
}

/* ---------- 5. Montage ---------- */

const SHOTS = [
  { src: "capsules", title: "Pillees — Capsules", caption: "Every bot is its own wallet.", accent: [4, 5], label: "Capsules" },
  { src: "drawer", title: "Pillees — Board", caption: "Open any capsule. Read its route.", accent: [4, 5], label: "Capsule drawer" },
  { src: "pools", title: "Pillees — Pools", caption: "Launch a coin. Keep a strategy on it.", accent: [5, 6], label: "Liquidity launchpad" },
  { src: "protocol", title: "Pillees — Protocol", caption: "Built on public Pump instructions.", accent: [3, 4], label: "Protocol" },
];
const SLOT = 45;

export function Montage() {
  const f = useCurrentFrame();
  const out = ease(f, [168, 180], [0, 1]);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.62, 0.45]} />
      <AbsoluteFill style={{ perspective: 2000, opacity: 1 - out }}>
        {SHOTS.map((shot, i) => {
          const g = f - i * SLOT;
          if (g < -2 || g > SLOT + 14) return null;
          const enter = i === 0 ? ease(g, [0, 16], [0, 1], Easing.out(Easing.cubic)) : ease(g, [-2, 14], [0, 1], Easing.out(Easing.cubic));
          const leave = i === SHOTS.length - 1 ? 0 : ease(g, [SLOT - 4, SLOT + 12], [0, 1], Easing.in(Easing.cubic));
          const x = (1 - enter) * 1300 - leave * 1500;
          const ry = (1 - enter) * -30 + leave * 30 - 6 + g * 0.08;
          return (
            <div key={shot.src} style={{ position: "absolute", left: 470, top: 120, transform: `translateX(${x}px) rotateY(${ry}deg) scale(${1 - leave * 0.1})`, opacity: 1 - leave * 0.6, zIndex: i }}>
              <Browser src={shot.src} width={1330} title={shot.title} />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(11,12,14,0.95) 0%, rgba(11,12,14,0.6) 30%, transparent 55%)", opacity: 1 - out }} />
      {SHOTS.map((shot, i) => (
        <Sequence key={shot.src} from={i * SLOT} durationInFrames={i === SHOTS.length - 1 ? SLOT + 15 : SLOT}>
          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 110px" }}>
            <Label style={{ marginBottom: 20 }}>
              {String(i + 1).padStart(2, "0")} / 04 · {shot.label}
            </Label>
            <Words text={shot.caption} size={78} align="left" accent={shot.accent} stagger={2} out={[SLOT - 8, SLOT]} style={{ width: 760 }} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/* ---------- 6. Outro ---------- */

export function Outro() {
  const f = useCurrentFrame();
  const t = f / 30;
  const rise = riseY(t - 0.1);
  const y = 1400 - (1400 - 860) * (1 - (1 - rise) ** 3);
  const cta = usePop(46);
  const fade = ease(f, [214, 240], [0, 1]);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.3, 0.55]} intensity={1.3} />
      <Pillee pose={popPose(t - 0.1)} x={560} y={y} zoom={0.82} shadow={rise} />
      <div style={{ position: "absolute", left: 930, top: 250, width: 900 }}>
        <Words text="Pillees" size={230} align="left" start={10} />
        <Words text="Capsules that hunt the spread." size={64} weight={600} align="left" start={20} stagger={2} accent={[4]} style={{ marginTop: 10 }} color={C.muted} />
        <div
          style={{
            marginTop: 54,
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            padding: "22px 40px 22px 26px",
            borderRadius: 999,
            background: C.mint,
            color: "#05210f",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 40,
            boxShadow: `0 0 ${60 + Math.sin(f / 8) * 20}px rgba(134,239,172,0.45)`,
            opacity: Math.min(1, cta * 1.5),
            transform: `scale(${0.7 + cta * 0.3})`,
          }}
        >
          <span style={{ width: 46, height: 46, borderRadius: 23, background: "#05210f", display: "grid", placeItems: "center" }}>
            <Img src={staticFile("pillee.png")} style={{ height: 34 }} />
          </span>
          Spin up a capsule
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", opacity: ease(f, [70, 90], [0, 1]) }}>
        <Label color={C.dim} size={18}>
          Preview build · Illustrative data, not live chain activity · Not a promise of profit
        </Label>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
}