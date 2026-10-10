import { Composition, registerRoot } from "remotion";
import { Promo } from "./Promo";
import { Teaser } from "./teaser/Teaser";
import { TOTAL as TEASER_TOTAL } from "./teaser/timeline";
import { FPS, HEIGHT, TOTAL, WIDTH } from "./timeline";

function Root() {
  return (
    <>
      <Composition id="Teaser" component={Teaser} durationInFrames={TEASER_TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
}

registerRoot(Root);
