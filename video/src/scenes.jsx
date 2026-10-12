import { AbsoluteFill, Easing, Img, staticFile } from "remotion";
import { hash, smoothstep } from "../../web/src/pillee.js";
import { DISPLAY, MONO, SANS } from "./fonts";
import { Pillee, landingPose, popPose, riseY } from "./Pillee";
import { RouteGraph } from "./RouteGraph";
import { TradeGraph } from "./TradeGraph";
import { C } from "./timeline";
import { Backdrop, Body, Browser, Chip, Cursor, EXPO, Flash, INOUT, Label, Words, ease, usePop, useT } from "./ui";

const center = { display: "flex", alignItems: "center", justifyContent: "center" };
const between = (t, a, b) => t >= a && t < b;

/* ---------- 1. Hook: the same coin, two prices ---------- */

const baseY = (x) => 640 + Math.sin(x / 210 + 1.2) * 46 + Math.sin(x / 83) * 16 + Math.sin(x / 29) * 4;
const gapAt = (x) => 6 + 120 * smoothstep(420, 1400, x);

function PriceChart({ head }) {
  const pts = [];
  for (let x = 0; x <= head; x += 6) pts.push(x);
  const top = pts.map((x) => [x, baseY(x) + gapAt(x) / 2 + Math.sin(x / 41) * 3]);
  const bot = pts.map((x) => [x, baseY(x) - gapAt(x) / 2]);
  const path = (p) => p.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const band = `${path(bot)} ${[...top].reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;
  if (pts.length < 2) return null;
  const [hx, hb] = bot[bot.length - 1];
  const ht = top[top.length - 1][1];
  return (
    <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="band" x1="0" x2="1">
          <stop offset="0" stopColor={C.mint} stopOpacity="0" />
          <stop offset="1" stopColor={C.mint} stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <path d={band} fill="url(#band)" />
      <path d={path(bot)} fill="none" stroke={C.ink} strokeOpacity="0.7" strokeWidth="3" />
      <path d={path(top)} fill="none" stroke={C.mint} strokeWidth="4" style={{ filter: "drop-shadow(0 0 10px rgba(134,239,172,0.7))" }} />
      <circle cx={hx} cy={ht} r="9" fill={C.mint} />
      <circle cx={hx} cy={hb} r="8" fill={C.ink} />
    </svg>
  );
}

function PriceTag({ x, y, label, value, mint, opacity }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x + 26,
        top: y - 28,
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
  const t = useT();
  const head = ease(t, [0, 150], [0, 1420], Easing.out(Easing.cubic));
  const tags = ease(t, [64, 80], [0, 1], EXPO);
  const gap = usePop(96, { damping: 18, stiffness: 130, mass: 0.8 });
  const push = ease(t, [0, 190], [1, 1.07], INOUT);
  const hb = baseY(head) - gapAt(head) / 2;
  const ht = baseY(head) + gapAt(head) / 2;
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.6, 0.6]} intensity={ease(t, [0, 50], [0.3, 1])} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "70% 60%" }}>
        <PriceChart head={head} />
        <PriceTag x={head} y={hb} label="METEORA" value="0.0004155" opacity={tags} />
        <PriceTag x={head} y={ht + 8} label="PUMPSWAP" value="0.0004120" mint opacity={tags} />
        <div
          style={{
            position: "absolute",
            left: head - 250,
            top: (hb + ht) / 2 - 36,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 56,
            color: C.mint,
            textShadow: "0 0 30px rgba(134,239,172,0.55)",
            opacity: Math.min(1, gap * 1.3),
            transform: `translateY(${(1 - gap) * 20}px)`,
          }}
        >
          +0.85%
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        {between(t, -10, 62) && <Words text="Same coin." size={150} accent={[1]} start={2} out={[48, 60]} />}
        {between(t, 58, 122) && <Words text="Two prices." size={150} accent={[0]} start={60} out={[108, 120]} />}
        {t >= 118 && <Words text="Your bot takes the gap." size={128} accent={[3, 4]} start={120} stagger={3} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- 2. Drop: the mascot lands on the wordmark ---------- */

const TOUCH = 2;

function Dust({ t }) {
  const d = t - TOUCH;
  if (d < 0 || d > 44) return null;
  return (
    <AbsoluteFill>
      {Array.from({ length: 30 }, (_, i) => {
        const dir = hash(i) > 0.5 ? 1 : -1;
        const vx = dir * (5 + hash(i + 9) * 16);
        const vy = -(6 + hash(i + 3) * 14);
        const x = 960 + dir * (60 + hash(i + 5) * 120) + vx * d * (1 - d / 120);
        const y = 905 + vy * d + 0.7 * d * d;
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
              opacity: Math.max(0, 1 - d / 38),
              boxShadow: "0 0 12px rgba(134,239,172,0.5)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

export function Drop() {
  const t = useT();
  const s = (t - TOUCH) / 30;
  const fall = s < 0 ? (s / -0.4) ** 2 : 0;
  const y = 900 - fall * 1300;
  const slam = usePop(TOUCH, { damping: 15, stiffness: 150, mass: 0.9 });
  const d = Math.max(0, t - TOUCH);
  const bump = t >= TOUCH ? -16 * Math.exp(-d / 6) * Math.cos(d / 2.2) : 0;
  const ring = ease(t, [TOUCH, TOUCH + 26], [0, 1], EXPO);
  const drift = ease(t, [TOUCH, 120], [0, 1], INOUT);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.5, 0.55]} intensity={1.5 - ring * 0.5} />
      <AbsoluteFill style={{ transform: `translateY(${bump}px) scale(${1 + drift * 0.04})` }}>
        <AbsoluteFill style={{ ...center, paddingBottom: 120 }}>
          <div style={{ transform: `scale(${1.6 - slam * 0.6})`, opacity: Math.min(1, slam * 2) }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 400,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: "transparent",
                backgroundImage: `linear-gradient(180deg, rgba(187,247,208,${0.62 + ease(t, [TOUCH + 20, TOUCH + 70], [0, 0.18])}) 0%, rgba(74,222,128,0.28) 55%, rgba(74,222,128,0.03) 100%)`,
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
            opacity: t >= TOUCH ? (1 - ring) * 0.9 : 0,
            boxShadow: "0 0 40px rgba(134,239,172,0.5)",
          }}
        />
        <Pillee pose={landingPose(s)} x={960} y={y} zoom={0.8} shadow={s < 0 ? Math.max(0, 1 + s * 2) : 1} />
        <Dust t={t} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 70 }}>
        <Words text="Create your own arbitrage bot." start={TOUCH + 24} size={50} weight={600} font={SANS} color={C.muted} stagger={2} accent={[3, 4]} />
      </AbsoluteFill>
      <Flash at={TOUCH} length={14} color="#dfffe9" />
    </AbsoluteFill>
  );
}

/* ---------- 3. Home: the real site, search, then Create a bot ---------- */

const HOME_W = 1480;
const K = HOME_W / 1600;

function FadeChips({ until, children }) {
  const t = useT();
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(t, [until, until + 14], [0, 1], INOUT) }}>{children}</div>;
}

export function Home() {
  const t = useT();
  const enter = ease(t, [0, 40], [0, 1], EXPO);
  const push = ease(t, [30, 190], [1, 1.05], INOUT);
  const searching = ease(t, [98, 110], [0, 1], INOUT);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.5, 0.25]} />
      <AbsoluteFill style={{ ...center, perspective: 2000 }}>
        <div
          style={{
            transform: `translateY(${(1 - enter) * 140}px) rotateX(${(1 - enter) * 16}deg) scale(${(0.9 + enter * 0.1) * push})`,
            transformOrigin: "30% 20%",
            opacity: enter,
          }}
        >
          <Browser src="home" width={HOME_W} url="pillees.fun">
            <Img src={staticFile("shots/search.png")} style={{ position: "absolute", inset: 0, width: HOME_W, opacity: searching }} />
            <Cursor
              path={[
                [66, 760, 560],
                [94, 300 * K + 40, 31 * K + 4],
                [130, 300 * K + 40, 31 * K + 4],
                [156, 117 * K + 10, 477 * K + 4],
              ]}
              clicks={[96, 160]}
            />
          </Browser>
        </div>
      </AbsoluteFill>
      <FadeChips until={74}>
        <Chip delay={22} style={{ left: 300, top: 120 }}>Search bots, coins, wallets</Chip>
        <Chip delay={32} style={{ left: 70, top: 560 }}>Create a bot</Chip>
        <Chip delay={42} style={{ left: 1300, top: 860 }} tone="dark">Top bots, live</Chip>
      </FadeChips>
    </AbsoluteFill>
  );
}

/* ---------- 4–6. The three explainers ---------- */

function StepText({ n, kicker, title, accent, body }) {
  const t = useT();
  const body1 = ease(t, [16, 34], [0, 1], EXPO);
  return (
    <div style={{ position: "absolute", left: 110, top: 0, bottom: 0, width: 660, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30, opacity: ease(t, [0, 12], [0, 1]), transform: `translateX(${ease(t, [0, 18], [-20, 0], EXPO)}px)` }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 38, color: "#05210f", background: C.mint, borderRadius: 14, padding: "4px 16px" }}>{n}</span>
        <Label color={C.muted}>{kicker}</Label>
      </div>
      <Words text={title} size={88} align="left" accent={accent} start={4} stagger={3} />
      <Body size={29} style={{ marginTop: 30, opacity: body1, transform: `translateY(${(1 - body1) * 18}px)` }}>
        {body}
      </Body>
    </div>
  );
}

function Panel({ children, left = 840, top = 210, delay = 4 }) {
  const t = useT();
  const p = ease(t, [delay, delay + 34], [0, 1], EXPO);
  const float = Math.sin(t / 40) * 4;
  return (
    <div style={{ position: "absolute", left, top, perspective: 1800 }}>
      <div style={{ opacity: p, transform: `translateX(${(1 - p) * 120}px) translateY(${float}px) rotateY(${(1 - p) * -14 - 3}deg)` }}>{children}</div>
    </div>
  );
}

export function Create() {
  const t = useT();
  const zoom = ease(t, [24, 120], [1, 1.32], INOUT);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.72, 0.5]} />
      <StepText
        n="01"
        kicker="Create your bot"
        title="Name it. Set limits. Fund it."
        accent={[0, 1]}
        body="Pick a name and a logo, then a max trade, a daily limit and a minimum edge. It gets its own public Solana wallet, controlled by yours."
      />
      <Panel left={820} top={200}>
        <Browser src="launch" width={1040} url="pillees.fun/launch" zoom={zoom} origin="34% 42%" glow={0.8} />
      </Panel>
      <Chip delay={34} style={{ left: 780, top: 150 }}>Its own public wallet</Chip>
      <Chip delay={46} style={{ left: 1300, top: 820 }} tone="dark">Max trade · daily limit · min edge</Chip>
      <Chip delay={58} style={{ left: 820, top: 880 }}>Stop or withdraw any time</Chip>
    </AbsoluteFill>
  );
}

export function Multihop() {
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.72, 0.45]} />
      <StepText
        n="02"
        kicker="Pump’s new update"
        title="One route. Fees once."
        accent={[2, 3]}
        body="multi_hop_swap lets one trade walk several Pump pools, like SOL → PUMP → a coin paired with PUMP, and charges fees once for the whole route."
      />
      <Panel left={840} top={220}>
        <RouteGraph />
      </Panel>
    </AbsoluteFill>
  );
}

export function Trade() {
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.72, 0.5]} />
      <StepText
        n="03"
        kicker="The trade"
        title="Buy low, sell high, in one transaction."
        accent={[0, 1, 2, 3]}
        body="When a gap beats every fee plus your minimum edge, the bot buys where it’s cheap and sells where it’s high. If the price moves first, the whole trade cancels."
      />
      <Panel left={840} top={210}>
        <TradeGraph />
      </Panel>
    </AbsoluteFill>
  );
}

/* ---------- 7. Montage ---------- */

const SHOTS = [
  { src: "leaderboard", url: "pillees.fun/leaderboard", caption: "Every bot, ranked by on-chain profit.", accent: [4, 5], label: "Leaderboard" },
  { src: "bot", url: "pillees.fun/bots/moss-hunter", caption: "Its own page, wallet and trades.", accent: [2, 3], label: "Bot page" },
  { src: "coin-launch", url: "pillees.fun/bots/curvebot/coin", caption: "Launch a coin. Its fees fund the bot.", accent: [4, 5, 6], label: "Launchpad · optional" },
  { src: "docs", url: "pillees.fun/docs", caption: "Every detail, in the docs.", accent: [1], label: "Docs" },
];
const SLOT = 45;
const SWAP = 20;

export function Montage() {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.62, 0.45]} />
      <AbsoluteFill style={{ perspective: 2200 }}>
        {SHOTS.map((shot, i) => {
          const g = t - i * SLOT;
          if (g < -SWAP || g > SLOT + SWAP) return null;
          const enter = i === 0 ? ease(g, [-10, 20], [0, 1], EXPO) : ease(g, [-SWAP / 2, SWAP], [0, 1], EXPO);
          const leave = i === SHOTS.length - 1 ? 0 : ease(g, [SLOT - SWAP / 2, SLOT + SWAP], [0, 1], INOUT);
          const x = (1 - enter) * 900 - leave * 700;
          const ry = (1 - enter) * -22 + leave * 16 - 7 + g * 0.05;
          const scale = (0.94 + enter * 0.06) * (1 - leave * 0.08) * (1 + g * 0.0006);
          return (
            <div
              key={shot.src}
              style={{ position: "absolute", left: 500, top: 130, transform: `translateX(${x}px) rotateY(${ry}deg) scale(${scale})`, opacity: Math.min(1, enter * 1.4) * (1 - leave), zIndex: i }}
            >
              <Browser src={shot.src} width={1340} url={shot.url} />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(11,12,14,0.96) 0%, rgba(11,12,14,0.7) 28%, transparent 52%)" }} />
      {SHOTS.map((shot, i) => {
        const a = i * SLOT;
        const b = a + SLOT;
        const last = i === SHOTS.length - 1;
        if (!between(t, a - 4, last ? 999 : b + 2)) return null;
        return (
          <AbsoluteFill key={shot.src} style={{ justifyContent: "flex-end", padding: "0 0 110px 110px" }}>
            <Label style={{ marginBottom: 20, opacity: ease(t, [a, a + 8], [0, 1]) * (last ? 1 : 1 - ease(t, [b - 6, b], [0, 1])) }}>
              {String(i + 1).padStart(2, "0")} / 04 · {shot.label}
            </Label>
            <Words text={shot.caption} size={74} align="left" accent={shot.accent} start={a} stagger={2} out={last ? undefined : [b - 8, b]} style={{ width: 760 }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ---------- 8. Outro ---------- */

export function Outro() {
  const t = useT();
  const s = t / 30;
  const rise = riseY(s - 0.1);
  const y = 1400 - (1400 - 860) * (1 - (1 - rise) ** 3);
  const cta = usePop(44, { damping: 15, stiffness: 140, mass: 0.8 });
  const fade = ease(t, [212, 240], [0, 1], INOUT);
  return (
    <AbsoluteFill>
      <Backdrop glow={[0.3, 0.55]} intensity={1.3} />
      <Pillee pose={popPose(s - 0.1)} x={560} y={y} zoom={0.82} shadow={rise} />
      <div style={{ position: "absolute", left: 930, top: 260, width: 900 }}>
        <Words text="Pillees" size={230} align="left" start={8} />
        <Words text="Create your own arbitrage bot." size={62} weight={600} align="left" start={18} stagger={2} accent={[3, 4]} style={{ marginTop: 10 }} color={C.muted} />
        <div
          style={{
            marginTop: 54,
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            padding: "22px 42px 22px 24px",
            borderRadius: 999,
            background: C.mint,
            color: "#05210f",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 42,
            boxShadow: `0 0 ${60 + Math.sin(t / 12) * 16}px rgba(134,239,172,0.4)`,
            opacity: Math.min(1, cta * 1.5),
            transform: `scale(${0.8 + cta * 0.2})`,
          }}
        >
          <span style={{ width: 48, height: 48, borderRadius: 24, background: "#05210f", display: "grid", placeItems: "center" }}>
            <Img src={staticFile("pillee.png")} style={{ height: 34 }} />
          </span>
          pillees.fun
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", opacity: ease(t, [70, 92], [0, 1]) }}>
        <Label color={C.dim} size={18}>
          Screens show demo bots · Not affiliated with Pump.fun · Trading can lose money
        </Label>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
}
