import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { ArbScene, CapsuleScene, CrowdScene, EndScene, Flight, HopScene, Wipe } from "./scenes";
import { T, TOTAL } from "./timeline";

const SCENES = [
  [Flight, 0, T.arb],
  [ArbScene, T.arb, T.capsule],
  [CapsuleScene, T.capsule, T.hop],
  [HopScene, T.hop, T.crowd],
  [CrowdScene, T.crowd, T.end],
  [EndScene, T.end, TOTAL],
];

export function Teaser() {
  return (
    <AbsoluteFill style={{ background: "#04060f" }}>
      {SCENES.map(([Scene, from, to]) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <Scene />
        </Sequence>
      ))}
      <Wipe />
      <Audio src={staticFile("audio/teaser.wav")} />
    </AbsoluteFill>
  );
}
