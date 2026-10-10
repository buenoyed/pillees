// Pure data, shared by the scenes and scripts/music-teaser.mjs.
export const FPS = 30;
export const TOTAL = 1250;

// Global frames.
export const T = {
  walk: 14,
  notice: 106,
  jump: 138,
  chute: 250,
  glideOut: 300,
  arb: 330,
  capsule: 520,
  hop: 730,
  crowd: 940,
  end: 1060,
};
export const CUTS = [T.arb, T.capsule, T.hop, T.crowd, T.end];

// Arbitrage scene, local frames: land, grab the cheap coin, hop over, sell it higher.
export const ARB = { land: 34, grab: 52, hop: 72, hopDur: 27, drop: 112, cheer: 122 };

// The cliff walk and the jump.
export const CLIFF = { top: 760, edge: 1180, x0: 160, x1: 1100, zoom: 0.4, omega: 18 };

// Capsule scene, local frames: landing, the shell, then the three things it comes with.
export const CAPSULE = { land: 40, shell: 48, items: [70, 104, 138], cheer: 170 };

// Route scene, local frames.
export const HOP = { nodes: [["SOL", 400, 720], ["MOSS", 960, 650], ["PILL", 1520, 720]], chips: [70, 110, 150], spread: 160 };

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
export const END = { pill: 4, land: 46, word: 56, step: 4, url: 88, urlStep: 3, line: 120, fade: 176 };
