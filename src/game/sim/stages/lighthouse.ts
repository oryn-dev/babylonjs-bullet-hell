import { cross, hover, sink } from "../path";
import type { StageType } from "../types";

/** Beams and tides: light sweeps with a warning line, water comes in walls with a gap. */
export const lighthouse: StageType = {
  id: "lighthouse",
  name: "The Lighthouse",
  line: "It turns and turns, and it is looking for you.",
  colors: ["ice", "gold"],
  foes: {
    buoy: {
      model: "buoy", hp: 32, radius: 0.75, score: 900, dust: 6,
      emits: [{ n: 12, layers: 2, layerStep: 0.6, layerTurn: 15, at: 0.9, every: 2.1, spin: 8, speed: 2.3, shape: "ring", color: "ice" }],
    },
    gull: {
      model: "gull", hp: 12, radius: 0.6, score: 500, dust: 4,
      emits: [{ form: "fan", n: 1, fixed: true, layers: 4, layerStep: 0.5, aim: true, at: 1.1, every: 1.9, speed: 2.8, shape: "needle", color: "gold" }],
    },
    storm: {
      model: "storm", hp: 58, radius: 0.8, score: 1600, dust: 9,
      emits: [
        { beam: true, n: 1, aim: true, spread: 0, at: 1, every: 2.8, warn: 0.95, hold: 0.8, width: 0.55, color: "gold" },
        { form: "fan", n: 9, spread: 140, at: 2.1, every: 2.8, speed: 2.5, shape: "orb", color: "ice" },
      ],
    },
  },
  waves: [
    { at: 0.8, foe: "buoy", path: sink(-3, 12), n: 2, gap: 1.6, mirror: true },
    { at: 6, foe: "gull", path: cross(6, 7, 1), n: 5, gap: 0.8 },
    { at: 10, foe: "buoy", path: hover(2.6, 5, 7), n: 2, gap: 1, mirror: true },
    { at: 14, foe: "storm", path: hover(0, 5.4, 8) },
    { at: 18, foe: "gull", path: cross(5, 7, 1.2), n: 4, gap: 0.8, mirror: true },
    { at: 26, foe: "buoy", path: hover(-3.6, 4.6, 7), n: 3, gap: 0.8, step: [3.6, 0.5] },
    { at: 36, foe: "storm", path: hover(-3.4, 5.6, 8), n: 2, gap: 1.4, mirror: true },
    { at: 31, foe: "gull", path: cross(6.4, 7, 1), n: 4, gap: 0.8 },
    { at: 41, foe: "gull", path: cross(6.5, 7, 1), n: 5, gap: 0.8 },
    { at: 48, foe: "buoy", path: hover(-3, 4.6, 5), n: 3, gap: 0.6, step: [3, 0.4] },
  ],
  boss: {
    id: "keeper",
    name: "The Keeper's Lamp",
    model: "keeper",
    radius: 1.75,
    phases: [
      {
        name: "Sweep", hp: 260, time: 30, move: [[0, 0, 5.4]],
        emits: [
          { beam: true, n: 1, angle: -78, spread: 0, at: 0.2, every: 8, warn: 1.1, hold: 4.2, width: 0.6, sweep: 17, color: "gold" },
          { beam: true, n: 1, angle: 78, spread: 0, at: 4.2, every: 8, warn: 1.1, hold: 4.2, width: 0.6, sweep: -17, color: "gold" },
          { n: 18, layers: 2, layerStep: 0.45, layerTurn: 10, at: 0.6, every: 1.6, spin: 9, speed: 2.1, shape: "ring", color: "ice" },
        ],
      },
      {
        name: "Tide Table", hp: 290, time: 32, move: [[0, 0, 5.6], [6, 2.5, 5.6], [12, -2.5, 5.6], [18, 0, 5.6]],
        emits: [
          { form: "curtain", n: 24, gap: 2.9, gapStep: 1.7, at: 0.1, every: 1.5, speed: 2.3, shape: "orb", color: "ice" },
          { form: "fan", n: 3, spread: 34, layers: 2, layerStep: 0.5, aim: true, at: 1.4, every: 2.7, speed: 3, shape: "needle", color: "gold" },
        ],
      },
      {
        name: "Fog Signal", hp: 300, time: 32, move: [[0, 0, 5], [5, -2, 5.4], [10, 2, 5.4], [15, 0, 5]],
        emits: [
          { n: 20, at: 0.2, every: 2.4, spin: 9, speed: 4.2, accel: -3.6, to: 0, shape: "ring", color: "ice", acts: [{ at: 1.5, speed: 0.2, aim: 0, accel: 2, to: 3, color: "gold" }] },
          { n: 18, layers: 2, layerStep: 0.4, layerTurn: 10, at: 1.2, every: 2.4, spin: 11, speed: 2, shape: "orb", color: "ice" },
        ],
      },
      {
        name: "Wreckers' Light", hp: 340, time: 36, move: [[0, 0, 5.2], [6, -1.5, 5.2], [12, 1.5, 5.2], [18, 0, 5.2]],
        emits: [
          { beam: true, n: 4, spread: 130, at: 0.3, every: 3.4, warn: 1.15, hold: 1.2, width: 0.6, swing: [16, 3], color: "gold" },
          { n: 6, at: 0.2, every: 0.2, spin: 13, speed: 2.5, shape: "orb", color: "ice" },
          { n: 4, at: 0.3, every: 0.2, spin: -13, speed: 2.5, shape: "orb", color: "ice", rank: 2 },
        ],
      },
    ],
  },
};
