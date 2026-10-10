import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { Board, Drop, Hook, Montage, Outro, Step1, Step2, Step3 } from "./scenes";
import { C, SCENES, TOTAL } from "./timeline";
import { Grain, Vignette } from "./ui";

const span = ([from, to]) => ({ from, durationInFrames: to - from });

export function Promo() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio
        src={staticFile("audio/track.wav")}
        volume={(f) => interpolate(f, [0, 8, TOTAL - 30, TOTAL], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Sequence {...span(SCENES.hook)}>
        <Hook />
      </Sequence>
      <Sequence from={SCENES.drop[0] - 12} durationInFrames={SCENES.drop[1] - SCENES.drop[0] + 12}>
        <Drop />
      </Sequence>
      <Sequence {...span(SCENES.board)}>
        <Board />
      </Sequence>
      <Sequence {...span(SCENES.step1)}>
        <Step1 />
      </Sequence>
      <Sequence {...span(SCENES.step2)}>
        <Step2 />
      </Sequence>
      <Sequence {...span(SCENES.step3)}>
        <Step3 />
      </Sequence>
      <Sequence {...span(SCENES.montage)}>
        <Montage />
      </Sequence>
      <Sequence {...span(SCENES.outro)}>
        <Outro />
      </Sequence>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
}
