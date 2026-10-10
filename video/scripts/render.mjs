import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const root = fileURLToPath(new URL("..", import.meta.url));
const id = process.env.COMP ?? "Promo";
const output = path.join(root, process.argv[2] ?? `out/pillees-${id.toLowerCase()}.mp4`);

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.jsx") });
const composition = await selectComposition({ serveUrl, id });
let last = -1;
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  crf: 16,
  jpegQuality: 95,
  audioCodec: "aac",
  audioBitrate: "320k",
  pixelFormat: "yuv420p",
  outputLocation: output,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (pct >= last + 10) {
      last = pct;
      console.log(`render ${pct}%`);
    }
  },
});
console.log("wrote", output);
