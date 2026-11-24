import type { Rng } from "./rng";
import { STAGES } from "./stages";
import type { BossType, Color, Emitter, Phase, Wave } from "./types";

const ADJECTIVES = ["Quiet", "Crooked", "Second", "Hollow", "Paper", "Borrowed", "Salt", "Velvet", "Late", "Broken", "Hidden", "Patient"];
const NOUNS = ["Wreath", "Window", "Hour", "Garland", "Mirror", "Orchard", "Compass", "Choir", "Harbour", "Crown", "Letter", "Carousel"];

const between = (rng: Rng, low: number, high: number) => low + rng() * (high - low);
const whole = (rng: Rng, low: number, high: number) => Math.floor(between(rng, low, high + 1));
const pick = <T>(rng: Rng, list: T[]) => list[Math.floor(rng() * list.length)];

/** The carpet of a generated pattern: what fills the field. */
function carpet(rng: Rng, color: Color): Emitter[] {
  const spin = between(rng, 7, 16) * pick(rng, [-1, 1]);
  switch (whole(rng, 0, 5)) {
    case 0:
      return [{ form: "flower", n: 30, petals: whole(rng, 3, 7), depth: between(rng, 0.2, 0.36), at: 0.2, every: 1.6, spin, speed: 2.7, shape: "orb", color }];
    case 1:
      return [{ n: whole(rng, 4, 6), at: 0.1, every: 0.24, salvo: [12, 0.9], spin, speed: 2.6, curve: between(rng, -30, 30), curveFor: 1.8, shape: "petal", color }];
    case 2:
      return [{ form: "poly", n: 30, petals: whole(rng, 3, 6), at: 0.2, every: 1.6, spin, speed: 2.6, shape: "star", color }];
    case 3:
      return [{ n: 18, at: 0.2, every: 1.3, spin, speed: 2.8, shape: "ring", color, acts: [{ at: 0.8, speed: 0 }, { at: 1.2, speed: 2.8, turn: whole(rng, 12, 32) * pick(rng, [-1, 1]) }] }];
    case 4:
      return [
        { n: 4, at: 0.1, every: 0.22, spin: Math.abs(spin), speed: 2.5, shape: "petal", color },
        { n: 4, at: 0.2, every: 0.22, spin: -Math.abs(spin), speed: 2.5, shape: "petal", color },
      ];
    default:
      return [{ form: "curtain", n: 18, gap: 3.4, gapStep: between(rng, 1.1, 1.6), at: 0.1, every: 1.9, speed: 2.2, shape: "orb", color }];
  }
}

/** The thorn: the part that looks for the moth. Walls leave little room, so they go with plain fans only. */
function thorn(rng: Rng, color: Color, walls: boolean): Emitter[] {
  switch (whole(rng, 0, walls ? 1 : 4)) {
    case 0:
      return [{ form: "fan", n: whole(rng, 3, 7), spread: between(rng, 40, 80), aim: true, at: 1.2, every: 2.4, speed: 3.2, shape: "orb", color }];
    case 1:
      return [{ form: "fan", n: 1, fixed: true, layers: 4, layerStep: 0.5, aim: true, at: 1.2, every: 1.7, speed: 2.8, shape: "needle", color }];
    case 2:
      return [{ form: "fan", n: 5, spread: 140, angle: 180, at: 0.8, every: 2.8, speed: 4.6, accel: -4.6, to: 0.3, shape: "lamp", color, size: 0.65, acts: [{ at: 1.1, burst: { n: 10, speed: 2.3, shape: "petal", color }, die: true }] }];
    case 3:
      return [{ beam: true, n: whole(rng, 1, 3), spread: 80, at: 1.4, every: 3.4, warn: 1.15, hold: 0.9, width: 0.5, swing: [20, 3], color }];
    default:
      return [{ n: 12, at: 1, every: 2.6, spin: 11, speed: 4.2, accel: -3.6, to: 0, shape: "ring", color, acts: [{ at: 1.5, speed: 0.2, aim: 0, accel: 2, to: 2.8 }] }];
  }
}

export function generatePhase(rng: Rng): Phase {
  const stage = pick(rng, STAGES);
  const ground = carpet(rng, stage.colors[0]);
  const walls = ground.some((emit) => "form" in emit && emit.form === "curtain");
  const x = between(rng, 1, 2.4) * pick(rng, [-1, 1]);
  return {
    name: `${pick(rng, ADJECTIVES)} ${pick(rng, NOUNS)}`,
    hp: 190, time: 22,
    move: [[0, 0, 5], [4, x, 5.3], [8, -x, 5.3], [12, 0, 5]],
    emits: [...ground, ...thorn(rng, stage.colors[1], walls)],
  };
}

const MODELS = ["wick", "pinwheel", "keeper", "thirteen", "moon"];

export function generateBoss(rng: Rng, place: number): BossType {
  const phase = generatePhase(rng);
  return { id: "lamp", name: phase.name, model: MODELS[place % MODELS.length], radius: 1.75, phases: [phase] };
}

/** A short flight of small lamps between two patterns. */
export function generateWaves(rng: Rng, place: number): { stage: number; waves: Wave[] } {
  const stage = place % STAGES.length;
  const list = STAGES[stage].waves;
  const first = whole(rng, 1, list.length - 2);
  const picked = [list[first], list[first + 1]];
  return { stage, waves: picked.map((wave, i) => ({ ...wave, at: 0.6 + i * 4 })) };
}
