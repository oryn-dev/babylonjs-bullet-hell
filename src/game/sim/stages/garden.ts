import { cross, hover, sink } from "../path";
import type { StageType } from "../types";

/** Rings and petals: slow gold circles from lamps, rose petals on curves. */
export const garden: StageType = {
  id: "garden",
  name: "The Lantern Garden",
  line: "Every lamp in the garden has seen you.",
  colors: ["gold", "rose"],
  foes: {
    glow: { model: "glow", hp: 7, radius: 0.5, score: 300, dust: 3, emits: [{ form: "fan", n: 3, spread: 24, aim: true, at: 1.2, every: 2, speed: 3.1, shape: "orb", color: "gold" }] },
    first: {
      model: "paper", hp: 70, radius: 0.85, score: 1500, dust: 10,
      emits: [{ form: "flower", n: 20, petals: 5, depth: 0.22, at: 0.9, every: 0.95, spin: 12, speed: 2.4, shape: "orb", color: "gold" }],
    },
    paper: {
      model: "paper", hp: 30, radius: 0.85, score: 900, dust: 6,
      emits: [{ n: 14, layers: 2, layerStep: 0.4, layerTurn: 13, at: 0.9, every: 1.8, spin: 13, speed: 2.4, shape: "orb", color: "gold" }],
    },
    rose: {
      model: "rose", hp: 46, radius: 0.8, score: 1400, dust: 8,
      emits: [
        { n: 5, at: 0.8, every: 0.2, salvo: [8, 1.1], spin: 11, speed: 2.5, curve: 26, curveFor: 2, shape: "petal", color: "rose" },
        { n: 8, at: 1.4, every: 2.6, speed: 2, shape: "orb", color: "gold", rank: 1 },
      ],
    },
  },
  waves: [
    { at: 0.6, foe: "first", path: hover(0, 4.2, 8.5) },
    { at: 11, foe: "glow", path: hover(-3.5, 5, 4), n: 4, gap: 0.5, step: [2.3, 0] },
    { at: 13, foe: "glow", path: cross(6.4, 7), n: 3, gap: 0.8, mirror: true },
    { at: 17, foe: "paper", path: hover(-3, 4.6, 6), n: 2, gap: 0.4, mirror: true },
    { at: 20, foe: "glow", path: cross(6, 7), n: 4, gap: 0.8 },
    { at: 27, foe: "rose", path: hover(0, 4.6, 8) },
    { at: 24, foe: "paper", path: hover(3.4, 5.4, 5) },
    { at: 30, foe: "glow", path: cross(6.6, 7), n: 4, gap: 0.8, mirror: true },
    { at: 38, foe: "paper", path: sink(-3.6, 11), n: 4, gap: 1.8, mirror: true },
    { at: 34, foe: "glow", path: hover(-4, 5.4, 4), n: 5, gap: 0.3, step: [2, 0.2] },
    { at: 43, foe: "glow", path: cross(6.6, 7), n: 4, gap: 0.8 },
    { at: 47, foe: "rose", path: hover(-3, 5, 7), n: 2, gap: 1, mirror: true },
    { at: 51, foe: "paper", path: hover(0, 5.6, 5) },
  ],
  boss: {
    id: "wick",
    name: "Old Wick",
    model: "wick",
    radius: 1.7,
    phases: [
      {
        name: "Moths Welcome", hp: 250, time: 30, move: [[0, 0, 5], [4, -2.4, 5.4], [8, 0, 5], [12, 2.4, 5.4], [16, 0, 5]],
        emits: [
          { form: "flower", n: 25, petals: 5, depth: 0.2, at: 0.2, every: 0.8, spin: 9, speed: 2.5, shape: "orb", color: "gold", size: 0.9 },
          { form: "fan", n: 5, spread: 46, aim: true, at: 1, every: 3, speed: 3.5, shape: "petal", color: "rose" },
        ],
      },
      {
        name: "Rose Trellis", hp: 270, time: 32,
        emits: [
          { n: 6, at: 0.1, every: 0.24, salvo: [14, 0.9], spin: 9, speed: 2.7, curve: 30, curveFor: 1.8, shape: "petal", color: "rose" },
          { n: 6, at: 0.1, every: 0.24, salvo: [14, 0.9], spin: -9, speed: 2.7, curve: -30, curveFor: 1.8, shape: "petal", color: "rose" },
          { n: 12, at: 2, every: 3.4, speed: 2, shape: "lamp", color: "gold", size: 0.8 },
        ],
      },
      {
        name: "Let the Garden Glow", hp: 320, time: 36, move: [[0, 0, 5], [5, -1.8, 4.6], [10, 1.8, 4.6], [15, 0, 5]],
        emits: [
          { n: 3, orbit: { r: 2.2, spin: 46, n: 4, outward: true }, at: 0.2, every: 0.34, spin: 17, speed: 2.5, shape: "orb", color: "gold" },
          { form: "flower", n: 30, petals: 6, depth: 0.35, at: 1.6, every: 2.8, spin: 15, speed: 2.9, shape: "petal", color: "rose" },
        ],
      },
    ],
  },
};
