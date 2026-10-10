import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = fileURLToPath(new URL("..", import.meta.url));
const id = process.env.COMP ?? "Promo";
const frames = process.argv.slice(2).map(Number);
const out = path.join(root, "out/stills");
await mkdir(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.jsx") });
const browserExecutable = process.env.CHROME || undefined;
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const frame of frames) {
  const output = path.join(out, `${id}-${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, browserExecutable });
  console.log("still", frame);
}
