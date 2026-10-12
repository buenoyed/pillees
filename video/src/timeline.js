export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// 120 BPM: one bar = 2s = 60 frames. Cuts land on bar lines to match scripts/music.mjs.
export const SCENES = {
  hook: [0, 180],
  drop: [180, 300],
  home: [300, 480],
  create: [480, 600],
  multihop: [600, 720],
  trade: [720, 900],
  montage: [900, 1080],
  outro: [1080, 1320],
};
export const TOTAL = 1320;

// Each scene starts PAD frames early and ends PAD frames late, so neighbours crossfade.
export const PAD = 10;

export const C = {
  bg: "#0b0c0e",
  panel: "#141518",
  panel2: "#191a1e",
  ink: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
  mint: "#86efac",
  leaf: "#4ade80",
  deep: "#163024",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
  down: "#fb7185",
};
