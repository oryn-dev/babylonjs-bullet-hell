import { hover, swoop } from "../path";
import type { StageType } from "../types";

/** Tick and stop: bullets move on the beat, hands are beams, gears are toothed rings. */
export const clock: StageType = {
  id: "clock",
  name: "The Clock Tower",
  line: "Time waits here, in pieces, until you move.",
  colors: ["amber", "jade"],
  foes: {
    gear: {
      model: "gear", hp: 36, radius: 0.85, score: 1000, dust: 6,
      emits: [{ form: "poly", n: 24, petals: 6, at: 0.8, every: 2.2, spin: 15, speed: 2.5, shape: "orb", color: "amber" }],
    },
    beetle: {
      model: "beetle", hp: 14, radius: 0.55, score: 500, dust: 4,
      emits: [{ form: "fan", n: 3, spread: 50, aim: true, at: 0.9, every: 1.7, speed: 3.4, accel: -5, to: 0, shape: "needle", color: "jade", acts: [{ at: 1, speed: 0.6, accel: 3, to: 3.6 }] }],
    },
    pendulum: {
      model: "pendulum", hp: 62, radius: 0.85, score: 1700, dust: 9,
      emits: [
        { form: "fan", n: 2, spread: 180, at: 0.6, every: 0.28, swing: [70, 2.4], speed: 1.6, accel: -1.4, to: 0, shape: "orb", color: "jade", acts: [{ at: 1.3, turn: 0, aim: 0, speed: 0.3, accel: 1.8, to: 2.6 }] },
        { n: 12, at: 1.6, every: 2.8, spin: 7, speed: 2.3, shape: "ring", color: "amber" },
      ],
    },
  },
  waves: [
    { at: 0.8, foe: "beetle", path: swoop(6, 4), n: 4, gap: 0.8 },
    { at: 7, foe: "gear", path: hover(-3, 5, 7), n: 2, gap: 0.6, mirror: true },
    { at: 12, foe: "beetle", path: swoop(6, 4.4), n: 3, gap: 0.8 },
    { at: 15, foe: "pendulum", path: [[0, 0, 10.5], [1.4, 0, 4.6], [3, -3, 5.2], [5, 0, 4.4], [7, 3, 5.2], [9, 0, 4.6], [11, 0, 11]] },
    { at: 20, foe: "beetle", path: swoop(6, 4.4), n: 4, gap: 0.8, mirror: true },
    { at: 28, foe: "gear", path: hover(-3.8, 4.8, 8), n: 3, gap: 0.8, step: [3.8, 0.6] },
    { at: 24, foe: "gear", path: hover(3.4, 5.4, 5) },
    { at: 34, foe: "beetle", path: swoop(6, 4.4), n: 4, gap: 0.7 },
    { at: 42, foe: "pendulum", path: hover(-3, 5, 8), n: 2, gap: 1.2, mirror: true },
    { at: 46, foe: "beetle", path: swoop(6, 4.4), n: 4, gap: 0.7, mirror: true },
    { at: 50, foe: "gear", path: hover(0, 5, 6) },
  ],
  boss: {
    id: "thirteen",
    name: "The Thirteenth Hour",
    model: "thirteen",
    radius: 1.85,
    phases: [
      {
        name: "Minute Hand", hp: 270, time: 30, move: [[0, 0, 4.8]],
        emits: [
          { beam: true, n: 1, angle: -60, spread: 0, spin: 30, at: 0.2, every: 1.7, warn: 0.9, hold: 0.7, width: 0.6, color: "amber" },
          { beam: true, n: 1, angle: 70, spread: 0, spin: -25, at: 1.05, every: 1.7, warn: 0.9, hold: 0.7, width: 0.6, color: "amber" },
          { n: 15, layers: 3, layerStep: 0.42, layerTurn: 4, at: 0.8, every: 1.7, spin: 15, speed: 1.9, shape: "orb", color: "jade" },
        ],
      },
      {
        name: "Escapement", hp: 300, time: 32, move: [[0, 0, 5], [6, -2, 5], [12, 2, 5], [18, 0, 5]],
        emits: [
          {
            n: 18, layers: 2, layerStep: 0.5, layerTurn: 10, at: 0.2, every: 1.2, spin: 10, speed: 2.9, shape: "orb", color: "amber",
            acts: [{ at: 0.7, speed: 0 }, { at: 1.1, speed: 2.9, turn: 28 }, { at: 1.8, speed: 0 }, { at: 2.2, speed: 2.9, turn: -28 }, { at: 2.9, speed: 0, color: "jade" }, { at: 3.3, speed: 2.9 }],
          },
        ],
      },
      {
        name: "Cogs", hp: 320, time: 34, move: [[0, 0, 5], [4, 2, 5.3], [8, -2, 5.3], [12, 0, 5]],
        emits: [
          { form: "poly", n: 32, petals: 8, at: 0.2, every: 1.9, spin: 11, speed: 2.5, curve: 16, curveFor: 2.4, shape: "orb", color: "amber" },
          { form: "poly", n: 32, petals: 8, at: 1.15, every: 1.9, spin: -11, speed: 2.5, curve: -16, curveFor: 2.4, shape: "orb", color: "jade" },
        ],
      },
      {
        name: "Thirteen", hp: 360, time: 38, move: [[0, 0, 4.8], [6, 1.6, 5], [12, -1.6, 5], [18, 0, 4.8]],
        emits: [
          { n: 13, at: 0.1, every: 0.36, spin: 7.5, speed: 2.4, shape: "needle", color: "amber" },
          { beam: true, n: 2, angle: -52, spread: 104, spin: 13, at: 1.5, every: 3.4, warn: 1.1, hold: 0.9, width: 0.6, color: "jade" },
          { n: 13, fixed: true, at: 3, every: 5.2, speed: 4.6, accel: -4, to: 0, shape: "moon", color: "jade", acts: [{ at: 1.4, speed: 0.4, accel: 1.6, to: 2.6, turn: 180 }, { at: 2.2, turn: 180 }] },
        ],
      },
    ],
  },
};
