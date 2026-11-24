import { cross, hover, swoop } from "../path";
import type { StageType } from "../types";

/** Launch and burst: shells fly, wait a breath and open. */
export const street: StageType = {
  id: "street",
  name: "Firework Street",
  line: "The whole street is celebrating. Nobody looks up.",
  colors: ["rose", "gold"],
  foes: {
    rocket: {
      model: "rocket", hp: 16, radius: 0.55, score: 500, dust: 4,
      emits: [{ form: "fan", n: 1, fixed: true, aim: true, at: 0.8, every: 2.2, speed: 3.4, accel: -2.4, to: 0.6, shape: "lamp", color: "gold", size: 0.7, acts: [{ at: 1.25, burst: { n: 12, speed: 2.5, shape: "petal", color: "rose" }, die: true }] }],
    },
    cracker: {
      model: "cracker", hp: 12, radius: 0.55, score: 450, dust: 4,
      emits: [{ form: "scatter", n: 3, spread: 70, at: 0.5, every: 0.36, speed: 1.5, speedTo: 2.6, accel: 0.5, to: 3.4, shape: "star", color: "gold" }],
    },
    kite: {
      model: "kite", hp: 34, radius: 0.8, score: 1000, dust: 7,
      emits: [{ form: "fan", n: 2, spread: 300, at: 0.7, every: 0.3, swing: [40, 2.4], speed: 2.2, curve: 24, curveFor: 1.6, shape: "petal", color: "rose" }],
    },
    mortar: {
      model: "mortar", hp: 60, radius: 0.85, score: 1600, dust: 9,
      emits: [{ form: "fan", n: 3, fixed: true, spread: 110, angle: 180, at: 0.7, every: 2.3, speed: 4.2, accel: -4, to: 0.3, shape: "lamp", color: "rose", size: 0.75, acts: [{ at: 1.1, burst: { n: 16, speed: 2.3, shape: "orb", color: "gold" }, die: true }] }],
    },
  },
  waves: [
    { at: 0.8, foe: "rocket", path: hover(-3.4, 5.6, 5), n: 3, gap: 0.6, step: [3.4, 0] },
    { at: 8.5, foe: "cracker", path: swoop(5.5, 3.2), n: 4, gap: 0.7 },
    { at: 12, foe: "cracker", path: swoop(5.5, 3.6), n: 4, gap: 0.7, mirror: true },
    { at: 15.5, foe: "rocket", path: hover(-3.4, 6, 4.5), n: 2, gap: 0.6, mirror: true },
    { at: 19, foe: "mortar", path: hover(0, 4.2, 8) },
    { at: 24, foe: "rocket", path: hover(-4, 6, 5), n: 2, gap: 0.4, mirror: true },
    { at: 31, foe: "kite", path: cross(5, 8, 1), n: 4, gap: 1.5 },
    { at: 37, foe: "kite", path: cross(6, 8, 1), n: 3, gap: 1.5, mirror: true },
    { at: 41, foe: "rocket", path: hover(-4, 6, 5), n: 3, gap: 0.5, step: [4, -0.4] },
    { at: 45, foe: "mortar", path: hover(-3, 4.8, 7), n: 2, gap: 1, mirror: true },
    { at: 49, foe: "cracker", path: swoop(5.5, 4), n: 5, gap: 0.6 },
  ],
  boss: {
    id: "pinwheel",
    name: "The Grand Pinwheel",
    model: "pinwheel",
    radius: 1.75,
    phases: [
      {
        name: "First Fuse", hp: 270, time: 30, move: [[0, 0, 5], [5, 2, 5], [10, -2, 5], [15, 0, 5]],
        emits: [
          { n: 7, at: 0.1, every: 0.21, swing: [150, 9], speed: 3, shape: "petal", color: "rose" },
          { n: 14, layers: 2, layerStep: 0.5, layerTurn: 13, at: 1.5, every: 2.6, speed: 1.9, shape: "star", color: "gold" },
        ],
      },
      {
        name: "Paper Rain", hp: 290, time: 32,
        emits: [
          { form: "fan", n: 7, spread: 150, angle: 180, at: 0.2, every: 2.6, speed: 5, accel: -5.5, to: 0.2, shape: "lamp", color: "gold", size: 0.65, acts: [{ at: 1, burst: { n: 7, spread: 200, angle: 180, speed: 1, accel: 0.7, to: 3, shape: "star", color: "gold" }, die: true }] },
          { form: "fan", n: 7, spread: 60, aim: true, at: 1.2, every: 2.6, speed: 3.2, shape: "needle", color: "rose" },
        ],
      },
      {
        name: "Chrysanthemum", hp: 330, time: 36, move: [[0, 0, 5.4], [4, -2.2, 5.4], [8, 2.2, 5.4], [12, 0, 5.4]],
        emits: [
          { form: "fan", n: 1, fixed: true, at: 0.4, every: 2.5, swing: [42, 8.5], speed: 4, accel: -2.9, to: 0.4, shape: "lamp", color: "rose", acts: [{ at: 1.25, burst: { n: 22, layers: 3, layerStep: 0.55, stagger: true, speed: 1.7, shape: "petal", color: "rose", acts: [{ at: 1.1, turn: 22, speed: 2.4 }] }, die: true }] },
          { form: "poly", n: 30, petals: 5, at: 1.6, every: 2.5, spin: 21, speed: 2.7, shape: "star", color: "gold" },
        ],
      },
    ],
  },
};
