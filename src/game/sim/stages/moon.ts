import { hover, swoop } from "../path";
import type { StageType } from "../types";

/** Constellations: star bullets, comet trails, crescents, and everything the moon has learned from the lamps. */
export const moon: StageType = {
  id: "moon",
  name: "The Moon",
  line: "The last lamp, and the first.",
  colors: ["ice", "gold"],
  foes: {
    star: {
      model: "star", hp: 24, radius: 0.65, score: 800, dust: 5,
      emits: [{ n: 5, layers: 4, layerStep: 0.45, at: 0.9, every: 2.3, spin: 36, speed: 2, shape: "star", color: "ice" }],
    },
    comet: {
      model: "comet", hp: 12, radius: 0.55, score: 500, dust: 4,
      emits: [{ form: "scatter", n: 2, spread: 120, at: 0.3, every: 0.28, speed: 0.6, speedTo: 1.2, accel: 0.9, to: 2.8, shape: "star", color: "gold" }],
    },
    halo: {
      model: "halo", hp: 68, radius: 0.85, score: 1900, dust: 10,
      emits: [
        { n: 8, at: 0.6, every: 0.3, salvo: [7, 1.3], spin: 8, speed: 2.5, curve: 20, curveFor: 2, shape: "moon", color: "ice" },
        { form: "fan", n: 5, spread: 70, aim: true, at: 1.8, every: 2.6, speed: 3, shape: "star", color: "gold" },
      ],
    },
  },
  waves: [
    { at: 0.8, foe: "comet", path: swoop(5.5, 4.5), n: 4, gap: 0.8 },
    { at: 5, foe: "comet", path: swoop(5.5, 4.8), n: 4, gap: 0.8, mirror: true },
    { at: 12, foe: "star", path: hover(-3.8, 5, 7), n: 3, gap: 0.5, step: [3.8, 0.8] },
    { at: 16, foe: "comet", path: swoop(6, 5), n: 4, gap: 0.8 },
    { at: 21, foe: "halo", path: hover(0, 4.8, 9) },
    { at: 26, foe: "comet", path: swoop(6, 5), n: 4, gap: 0.9 },
    { at: 34, foe: "star", path: hover(-4, 4.6, 8), n: 4, gap: 0.5, step: [2.6, 0.5] },
    { at: 39, foe: "comet", path: swoop(6, 5), n: 4, gap: 0.8, mirror: true },
    { at: 44, foe: "halo", path: hover(-3, 5.2, 9), n: 2, gap: 1.4, mirror: true },
  ],
  boss: {
    id: "moon",
    name: "The Moon",
    model: "moon",
    radius: 2.2,
    phases: [
      {
        name: "New", hp: 260, time: 28, move: [[0, 0, 5], [5, 1.8, 5.2], [10, -1.8, 5.2], [15, 0, 5]],
        emits: [
          { n: 20, layers: 2, layerStep: 0.5, layerTurn: 9, at: 0.2, every: 1.05, spin: 7, speed: 2.3, shape: "star", color: "ice" },
          { form: "fan", n: 7, spread: 80, aim: true, at: 1.4, every: 2.2, speed: 3.2, shape: "orb", color: "gold" },
        ],
      },
      {
        name: "Crescent", hp: 290, time: 30,
        emits: [
          { n: 9, at: 0.1, every: 0.3, salvo: [11, 0.8], spin: 8, speed: 2.7, curve: 24, curveFor: 2.4, shape: "moon", color: "ice" },
          { n: 18, layers: 2, layerStep: 0.5, layerTurn: 10, at: 1.6, every: 2.9, speed: 1.9, shape: "orb", color: "gold" },
        ],
      },
      {
        name: "Half", hp: 310, time: 32, move: [[0, 0, 5.4], [6, -2, 5.4], [12, 2, 5.4], [18, 0, 5.4]],
        emits: [
          { form: "curtain", n: 18, gap: 3.3, gapStep: 1.7, at: 0.1, every: 1.8, speed: 2.2, shape: "moon", color: "ice" },
          { form: "poly", n: 30, petals: 5, at: 0.8, every: 2.4, spin: 14, speed: 2.5, shape: "star", color: "gold" },
        ],
      },
      {
        name: "Constellation", hp: 330, time: 34, move: [[0, 0, 5], [5, 2, 4.6], [10, -2, 4.6], [15, 0, 5]],
        emits: [
          { n: 10, layers: 2, layerStep: 1.1, layerTurn: 18, at: 0.2, every: 2.7, spin: 12, speed: 4, accel: -3.4, to: 0, shape: "star", color: "gold", size: 1.2, acts: [{ at: 1.6, burst: { n: 5, speed: 2.1, shape: "star", color: "ice" }, die: true }] },
          { beam: true, n: 3, spread: 96, at: 1.8, every: 4.2, warn: 1.1, hold: 0.9, width: 0.5, swing: [18, 3], color: "ice" },
        ],
      },
      {
        name: "Full", hp: 420, time: 44, move: [[0, 0, 4.6]],
        emits: [
          { form: "flower", n: 40, petals: 8, depth: 0.3, at: 0.2, every: 1.7, spin: 12, speed: 2.6, shape: "petal", color: "gold" },
          { n: 5, at: 0.5, every: 0.2, spin: 12.5, speed: 2.5, shape: "star", color: "ice" },
          { n: 5, at: 0.6, every: 0.2, spin: -12.5, speed: 2.5, shape: "star", color: "ice" },
        ],
      },
    ],
  },
};
