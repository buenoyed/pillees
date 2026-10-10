import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Collage, DialogOne, DialogTwo, FeesCard, Finale, MiddleCard, MigrationCard, RouteCard, SlippageCard } from "./scenes";
import { T, TOTAL, cardStart } from "./timeline";

const CARD_SCENES = [RouteCard, FeesCard, MiddleCard, MigrationCard, SlippageCard];

export function Teaser() {
  return (
    <AbsoluteFill style={{ background: "#0d0c14" }}>
      <Sequence durationInFrames={T.cards}>
        <DialogOne />
      </Sequence>
      {CARD_SCENES.map((Scene, i) => (
        <Sequence key={i} from={cardStart(i)} durationInFrames={T.card}>
          <Scene />
        </Sequence>
      ))}
      <Sequence from={cardStart(CARD_SCENES.length)} durationInFrames={T.collage - cardStart(CARD_SCENES.length)}>
        <DialogTwo />
      </Sequence>
      <Sequence from={T.collage} durationInFrames={T.crowd - T.collage}>
        <Collage />
      </Sequence>
      <Sequence from={T.crowd} durationInFrames={TOTAL - T.crowd}>
        <Finale />
      </Sequence>
      <Audio src={staticFile("audio/teaser.wav")} />
    </AbsoluteFill>
  );
}
