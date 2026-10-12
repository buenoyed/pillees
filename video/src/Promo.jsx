import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Create, Drop, Home, Hook, Montage, Multihop, Outro, Trade } from "./scenes";
import { C, PAD, SCENES, TOTAL } from "./timeline";
import { EXPO, Grain, INOUT, Vignette, ease } from "./ui";

const ORDER = [
  ["hook", Hook],
  ["drop", Drop],
  ["home", Home],
  ["create", Create],
  ["multihop", Multihop],
  ["trade", Trade],
  ["montage", Montage],
  ["outro", Outro],
];

// Fades and settles a scene in over its lead-in and out over its tail.
function Fade({ length, first, last, children }) {
  const f = useCurrentFrame();
  const end = length + PAD * 2;
  const enter = first ? 1 : ease(f, [0, PAD * 2], [0, 1], EXPO);
  const leave = last ? 0 : ease(f, [end - PAD * 2, end], [0, 1], INOUT);
  return (
    <AbsoluteFill style={{ opacity: enter * (1 - leave), transform: `scale(${(1.035 - enter * 0.035) * (1 - leave * 0.025)})` }}>
      {children}
    </AbsoluteFill>
  );
}

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio
        src={staticFile("audio/track.wav")}
        volume={(f) => interpolate(f, [0, 8, TOTAL - 30, TOTAL], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      {ORDER.map(([id, Scene], i) => {
        const [from, to] = SCENES[id];
        return (
          <Sequence key={id} from={from - PAD} durationInFrames={to - from + PAD * 2}>
            <Fade length={to - from} first={i === 0} last={i === ORDER.length - 1}>
              <Scene />
            </Fade>
          </Sequence>
        );
      })}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
}
