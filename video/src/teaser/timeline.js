// Pure data, shared by the scenes and scripts/music-teaser.mjs.
export const FPS = 30;
export const TOTAL = 1140;

// Global frames.
export const T = {
  walk: 14,
  notice: 106,
  jump: 138,
  chute: 250,
  glideOut: 300,
  hop: 330,
  mig: 540,
  crowd: 870,
  end: 990,
};
export const CUTS = [T.hop, T.mig, T.crowd, T.end];

// The cliff walk and the jump.
export const CLIFF = { top: 760, edge: 1180, x0: 160, x1: 1100, zoom: 0.4, omega: 18 };

// multi_hop_swap scene, local frames.
export const HOP = { nodes: [["SOL", 400, 760], ["MOSS", 960, 690], ["PILL", 1520, 760]], chips: [70, 110, 150] };

// Synthetic migration scene, local frames.
export const MIG = {
  land: 40,
  ghost: 52,
  wall: 78,
  bonk: 86,
  now: 118,
  full: 172,
  bridge: 176,
  run: 208,
  leap: 250,
  open: 272,
};
export const CURVE = { right: 1120, top: 520, base: 990 };
export const POOL = { left: 1360, right: 1880, rim: 700, floor: 1000, level: 780 };

// Crowd scene: landing frame per parachuter, local.
export const CROWD = [
  ["pink", 300, 34],
  ["blue", 1610, 40],
  ["yellow", 560, 47],
  ["orange", 1360, 52],
  ["teal", 180, 58],
  ["purple", 1110, 62],
  ["red", 1760, 66],
  ["green", 820, 72],
];

export const WORD = "Pillees";
export const URL = "pillees.fun";
export const END = { word: 10, step: 4, url: 52, urlStep: 3, land: 96 };
