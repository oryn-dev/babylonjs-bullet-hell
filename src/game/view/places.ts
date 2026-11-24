export interface Layer {
  part: string;
  z: number;
  /** Distances from the middle, mirrored to both sides unless `single`. */
  at: number[];
  every: number;
  /** Height in field units at its depth. */
  size: number;
  ratio?: number;
  vary?: number;
  jitter?: [number, number];
  /** Share of the half width that the card is shifted inwards, 1 puts its outer end on `at`. */
  anchor?: number;
  flip?: boolean;
  random?: boolean;
  single?: boolean;
  offset?: number;
  once?: boolean;
  y?: number;
  fog: number;
  bright?: number;
  alpha?: number;
  /** Lamps and windows shine by this much more. */
  boost?: number;
  /** 0 picture, 1 mist, 2 light, 3 picture made of light, 4 a turning beam. */
  mode?: 0 | 1 | 2 | 3 | 4;
  /** Opens and fades again and again, every so many seconds. */
  firework?: number;
  tint?: number;
  sway?: number;
  swing?: number;
  spin?: number;
  turn?: number;
  drift?: number;
  flicker?: number;
  spanMin?: number;
  /** Swings from its upper end. */
  hang?: boolean;
  /** Stays at this height instead of sinking past. */
  hold?: number;
  /** A light on every card: [size, brightness, height on the card from -1 to 1]. */
  glow?: [number, number, number];
  /** Sideways place of that light on the card, -1 to 1. */
  glowX?: number;
}

export interface Place {
  id: string;
  /** Name of the art sheet when it differs from the id. */
  sheet?: string;
  seed: number;
  speed: number;
  sky: { top: string; mid: string; low: string; cloud: string; lit: string; stars: number; cover: number };
  moon: { at: [number, number]; size: number };
  fog: string;
  veil: string;
  veilAlpha: number;
  motes: { color: string; amount: number; rise: number };
  layers: Layer[];
}

export const PLACES: Place[] = [
  {
    id: "garden", seed: 4, speed: 1.5,
    sky: { top: "#0a1030", mid: "#1c2a58", low: "#2c4a5c", cloud: "#1a2450", lit: "#8fa4d8", stars: 0.9, cover: 0.42 },
    moon: { at: [0.27, 0.7], size: 0.12 },
    fog: "#22406a", veil: "#060a1e", veilAlpha: 0.42,
    motes: { color: "#ffcf72", amount: 34, rise: 0.15 },
    layers: [
      { part: "poplar", z: 62, at: [14, 27, 40, 54], every: 34, size: 30, jitter: [5, 10], fog: 0.5, random: true },
      { part: "treeline", z: 80, at: [10, 34, 58], every: 60, size: 30, once: true, y: -20, fog: 0.5, bright: 0.9 },
      { part: "mist", z: 55, at: [0], single: true, every: 26, size: 22, ratio: 5, mode: 1, fog: 1, alpha: 0.34, bright: 1.1, drift: 8, jitter: [10, 4] },
      { part: "bough2", z: 34, at: [30, 44], every: 15, size: 11, anchor: 1, flip: true, jitter: [1, 3], vary: 0.2, fog: 0.34, sway: 0.012 },
      { part: "trunk", z: 34.4, at: [24, 38], every: 27, size: 30, jitter: [0.5, 0], fog: 0.32, random: true },
      { part: "lantern", z: 33, at: [18, 27, 36], every: 21, size: 7.6, jitter: [3, 5], fog: 0.05, boost: 2.4, sway: 0.04, hang: true, glow: [9, 0.2, -0.5] },
      { part: "mist", z: 26, at: [15], every: 21, size: 15, ratio: 3.4, mode: 1, fog: 1, alpha: 0.28, bright: 1.15, drift: 6, jitter: [4, 4] },
      { part: "trunk", z: 15, at: [14.6, 27], every: 22.4, size: 24, fog: 0.1, jitter: [0.3, 0] },
      { part: "bough", z: 14, at: [20.5], every: 13.5, size: 8.2, anchor: 1, flip: true, jitter: [0.4, 2], vary: 0.14, fog: 0.08, boost: 2.6, sway: 0.016, glow: [9, 0.22, -0.6], glowX: 0.24 },
      { part: "bough2", z: 13.6, at: [29], every: 12, size: 8, anchor: 1, flip: true, jitter: [0.5, 2], vary: 0.2, fog: 0.08, sway: 0.016 },
      { part: "wisteria", z: 8, at: [10.4, 17, 23], every: 16, size: 8.5, jitter: [1.2, 4], vary: 0.2, fog: 0.04, sway: 0.03 },
      { part: "roses", z: 5, at: [12, 18.5], every: 14, size: 5.4, jitter: [1.4, 3], vary: 0.2, random: true, fog: 0.02, sway: 0.012 },
      { part: "hedge", z: 22, at: [12, 34], every: 60, size: 11, once: true, y: -14, fog: 0.16, flip: true },
      { part: "urn", z: 9, at: [10, 17], every: 60, size: 9.5, once: true, y: -9, fog: 0.06 },
      { part: "hedge", z: 6, at: [8.5], every: 60, size: 6.4, once: true, y: -11.5, fog: 0.02, flip: true },
      { part: "foxglove", z: 3, at: [8.4, 14], every: 60, size: 7, once: true, y: -8.5, fog: 0, flip: true, sway: 0.02 },
      { part: "leaves", z: -5, at: [14.4], every: 24, size: 7, anchor: 1, flip: true, jitter: [0.5, 5], fog: 0, bright: 0.7, sway: 0.02, spanMin: 60 },
    ],
  },
  {
    id: "street", seed: 9, speed: 1.7,
    sky: { top: "#120a2e", mid: "#34184e", low: "#6a2c58", cloud: "#2a1446", lit: "#c67aa0", stars: 0.5, cover: 0.5 },
    moon: { at: [-0.25, 0.72], size: 0.145 },
    fog: "#56285e", veil: "#0c0520", veilAlpha: 0.5,
    motes: { color: "#ff9c6a", amount: 40, rise: 0.5 },
    layers: [
      { part: "fireA", z: 84, at: [18, 44], every: 40, size: 30, jitter: [6, 12], fog: 0, mode: 3, firework: 6.5, alpha: 0.55 },
      { part: "fireB", z: 82, at: [30, 56], every: 44, size: 24, jitter: [6, 12], fog: 0, mode: 3, firework: 5, alpha: 0.6, offset: 0.3 },
      { part: "far", z: 52, at: [17, 36, 55], every: 50, size: 52, anchor: -1, flip: true, fog: 0.42, boost: 1.2, offset: 0.4 },
      { part: "roofs", z: 46, at: [0, 40], every: 60, size: 16, once: true, y: -15, fog: 0.3 },
      { part: "flags", z: 40, at: [0], single: true, every: 23, size: 8.4, ratio: 4.2, fog: 0.4, bright: 0.75, sway: 0.012, jitter: [2, 3] },
      { part: "mist", z: 38, at: [0], single: true, every: 22, size: 18, ratio: 5, mode: 1, fog: 1, alpha: 0.3, drift: 8, jitter: [8, 4] },
      { part: "houseB", z: 26, at: [13.4, 28, 42], every: 33.6, size: 34, anchor: -1, flip: true, fog: 0.18, boost: 1 },
      { part: "lamp", z: 24, at: [12.2, 21], every: 17, size: 7, jitter: [1, 5], fog: 0.06, boost: 1.8, sway: 0.04, hang: true, glow: [9, 0.16, -0.5] },
      { part: "flags", z: 27, at: [0], single: true, every: 29, size: 7.6, ratio: 4.2, fog: 0.3, bright: 0.8, sway: 0.01, jitter: [0.6, 4] },
      { part: "houseA", z: 12, at: [11, 24, 37], every: 29.6, size: 30, anchor: -1, flip: true, fog: 0.05, boost: 0.9, offset: 0.37 },
      { part: "sign", z: 11.6, at: [11.2], every: 14.8, size: 4.6, anchor: 1, flip: true, jitter: [0, 1.5], fog: 0.03, sway: 0.02, y: 2 },
      { part: "awning", z: 11.4, at: [14], every: 14.8, size: 2.6, jitter: [0.4, 0], fog: 0.03, y: -2.4, offset: 0.37 },
      { part: "ivy", z: 11.2, at: [13.6], every: 7.4, size: 2.6, anchor: 0.4, flip: true, jitter: [1.2, 1], vary: 0.2, fog: 0.02 },
      { part: "lamp", z: -4, at: [12.6], every: 21, size: 5.4, jitter: [0.6, 5], fog: 0, boost: 1.4, sway: 0.05, hang: true, glow: [6, 0.12, -0.5] },
    ],
  },
  {
    id: "lighthouse", seed: 14, speed: 1.6,
    sky: { top: "#04121e", mid: "#0f3040", low: "#2a6a70", cloud: "#0c2836", lit: "#7fb6b4", stars: 0.55, cover: 0.66 },
    moon: { at: [0.24, 0.7], size: 0.17 },
    fog: "#1d5460", veil: "#03101a", veilAlpha: 0.46,
    motes: { color: "#cdeee8", amount: 30, rise: -0.8 },
    layers: [
      { part: "cliffFar", z: 56, at: [22, 46], every: 56, size: 60, anchor: -1, flip: true, fog: 0.6 },
      { part: "ship", z: 60, at: [16, 38], every: 60, size: 15, once: true, y: -9, fog: 0.35, boost: 1.6, sway: 0.03 },
      { part: "wave", z: 50, at: [0, 46], every: 60, size: 18, once: true, y: -20, fog: 0.36, drift: 3 },
      { part: "cloud", z: 44, at: [12], every: 26, size: 14, ratio: 3.2, fog: 0.4, alpha: 0.5, drift: 6, jitter: [8, 6], random: true },
      { part: "cliff", z: 30, at: [15.6, 34], every: 39.4, size: 42, anchor: -1, flip: true, fog: 0.26 },
      { part: "pine", z: 30.6, at: [22], every: 21, size: 9, anchor: 1, flip: true, jitter: [1, 4], fog: 0.2, sway: 0.012 },
      { part: "wave", z: 24, at: [0, 30], every: 60, size: 11, once: true, y: -13, fog: 0.14, drift: 2 },
      { part: "tower", z: 17, at: [-15.4], single: true, every: 29.4, size: 30, ratio: 0.35, fog: 0.08, boost: 1.5, glow: [8, 0.16, 0.6] },
      { part: "light", z: 36, at: [-19], single: true, every: 60, size: 70, ratio: 0.3, mode: 4, once: true, hold: 6, fog: 0, bright: 0.16, spin: 0.42 },
      { part: "mist", z: 16, at: [13], every: 19, size: 12, ratio: 3.2, mode: 1, fog: 1, alpha: 0.26, drift: 5, jitter: [4, 4] },
      { part: "cliff", z: 12, at: [11.4, 24], every: 30, size: 32, anchor: -1, flip: true, fog: 0.05, offset: 0.3 },
      { part: "pine", z: 12.4, at: [16], every: 15.7, size: 6, anchor: 1, flip: true, jitter: [0.6, 3], vary: 0.2, fog: 0.03, sway: 0.014 },
      { part: "rope", z: 6, at: [9.2, 14], every: 18, size: 9, jitter: [0.6, 4], fog: 0, boost: 1.3, sway: 0.04, hang: true, glow: [5, 0.1, -0.64], tint: 1 },
      { part: "rocks", z: 8, at: [12], every: 60, size: 8, once: true, y: -9, fog: 0 },
      { part: "wave", z: 2, at: [0, 22], every: 60, size: 7, once: true, y: -11.5, fog: 0, drift: 1.5 },
      { part: "cloud", z: -4, at: [13], every: 24, size: 8, ratio: 2.6, fog: 0.2, alpha: 0.28, drift: 3, jitter: [1, 5], random: true },
    ],
  },
  {
    id: "clock", seed: 22, speed: 1.5,
    sky: { top: "#08120f", mid: "#13241f", low: "#2c3a2a", cloud: "#10211c", lit: "#c9b070", stars: 0, cover: 0.5 },
    moon: { at: [0, 4], size: 0.2 },
    fog: "#23453a", veil: "#040a0a", veilAlpha: 0.5,
    motes: { color: "#f0cf8a", amount: 46, rise: 0.25 },
    layers: [
      { part: "face", z: 78, at: [0], single: true, every: 84, size: 46, fog: 0.5, bright: 0.5, y: 10 },
      { part: "gearFar", z: 60, at: [17, 40], every: 34, size: 26, jitter: [2, 4], fog: 0.4, spin: 0.16, offset: 0.4 },
      { part: "window", z: 46, at: [24, 44], every: 40, size: 30, fog: 0.12, boost: 1.2, bright: 1.3, glow: [40, 0.07, 0], tint: 1 },
      { part: "pier", z: 44, at: [30, 52], every: 55, size: 56, anchor: -1, flip: true, fog: 0.4 },
      { part: "mist", z: 40, at: [0], single: true, every: 24, size: 18, ratio: 5, mode: 1, fog: 1, alpha: 0.3, drift: 7, jitter: [8, 4] },
      { part: "gear", z: 28, at: [17.5], every: 25, size: 15, jitter: [1, 3], fog: 0.16, spin: 0.22, boost: 0.6 },
      { part: "gear2", z: 26, at: [23.5], every: 25, size: 10, jitter: [1, 3], fog: 0.12, spin: -0.34, y: 9 },
      { part: "chain", z: 22, at: [12, 20], every: 19.8, size: 20, fog: 0.12 },
      { part: "pier", z: 14, at: [12.6, 25.6], every: 33.2, size: 34, anchor: -1, flip: true, fog: 0.04 },
      { part: "beam", z: 13.6, at: [15], every: 15, size: 2.4, anchor: 0, flip: true, jitter: [0, 3], fog: 0.03 },
      { part: "ivy", z: 13.4, at: [13.6], every: 11, size: 6, anchor: 0.2, flip: true, jitter: [1, 3], vary: 0.2, fog: 0.02, sway: 0.01 },
      { part: "gear2", z: 12, at: [12.4], every: 22, size: 6, jitter: [0.4, 4], fog: 0.02, spin: 0.5 },
      { part: "lamp", z: 8, at: [9.6, 16], every: 17, size: 5.2, jitter: [0.6, 4], fog: 0, boost: 1.6, sway: 0.05, hang: true, glow: [8, 0.2, -0.4] },
      { part: "weight", z: 6, at: [12.6], every: 23, size: 8, jitter: [1, 5], fog: 0, sway: 0.03, hang: true },
      { part: "gear", z: -5, at: [16.4], every: 34, size: 8.5, fog: 0, bright: 0.4, spin: -0.2, spanMin: 60 },
    ],
  },
  {
    id: "moon", sheet: "heavens", seed: 31, speed: 2.1,
    sky: { top: "#080622", mid: "#1c1450", low: "#4a3284", cloud: "#1e1752", lit: "#b9a4e6", stars: 1.3, cover: 0.46 },
    moon: { at: [0, 0.62], size: 0.3 },
    fog: "#4a3a8c", veil: "#080520", veilAlpha: 0.46,
    motes: { color: "#e6dcff", amount: 56, rise: -0.4 },
    layers: [
      { part: "swan", z: 90, at: [22, 54], every: 56, size: 26, jitter: [4, 10], fog: 0, mode: 3, alpha: 0.5, random: true },
      { part: "crown", z: 88, at: [36], every: 56, size: 26, jitter: [6, 10], fog: 0, mode: 3, alpha: 0.5, y: 24, random: true },
      { part: "bankFar", z: 60, at: [54, 72], every: 30, size: 18, anchor: 1, flip: true, jitter: [4, 5], vary: 0.2, fog: 0.35 },
      { part: "wisp", z: 44, at: [0], single: true, every: 24, size: 12, ratio: 5, fog: 0.3, alpha: 0.28, drift: 8, jitter: [8, 5] },
      { part: "bank2", z: 34, at: [40, 56], every: 23, size: 15, anchor: 1, flip: true, jitter: [2, 4], vary: 0.2, fog: 0.14 },
      { part: "sea", z: 30, at: [0, 40], every: 60, size: 16, once: true, y: -13, fog: 0.1 },
      { part: "bank", z: 16, at: [29.5, 40], every: 18, size: 12, anchor: 1, flip: true, jitter: [0.8, 4], vary: 0.16, fog: 0.04 },
      { part: "branch", z: 18, at: [31], every: 23, size: 9.4, anchor: 1, flip: true, jitter: [0.6, 4], fog: 0.02, sway: 0.016 },
      { part: "mobile", z: 8, at: [9.6, 16.5], every: 18, size: 7.5, jitter: [0.6, 4], fog: 0, boost: 1.1, sway: 0.04, hang: true, random: true },
      { part: "mobile2", z: 5, at: [12.6], every: 21, size: 8.5, jitter: [1, 5], fog: 0, boost: 1.1, sway: 0.05, hang: true, random: true },
      { part: "sea", z: 4, at: [0, 24], every: 60, size: 9, once: true, y: -10, fog: 0 },
      { part: "bank2", z: -5, at: [24], every: 21, size: 6, anchor: 1, flip: true, jitter: [0.5, 5], fog: 0, bright: 0.5, alpha: 0.9, spanMin: 60 },
    ],
  },
];
