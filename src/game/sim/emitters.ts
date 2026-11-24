import { type Beam, type Color, type Emit, type Emitter, FIELD } from "./types";
import type { Rng } from "./rng";

export interface Origin {
  x: number;
  y: number;
}

export interface LiveBeam {
  x: number;
  y: number;
  /** Degrees, 0 is down. */
  angle: number;
  sweep: number;
  age: number;
  warn: number;
  hold: number;
  width: number;
  color: Color;
  fired: boolean;
  grazeIn: number;
  owner: Origin;
  dx: number;
  dy: number;
}

/** What an emitter needs from the world it fires into. */
export interface Muzzle {
  rng: Rng;
  aim: Origin;
  density: number;
  speed: number;
  rate: number;
  rank: number;
  shoot(x: number, y: number, angle: number, speed: number, spec: Emit, safe: boolean): void;
  beam(beam: LiveBeam): void;
  volley(x: number, y: number, color: Color): void;
}

const TWO_PI = Math.PI * 2;
const isBeam = (emitter: Emitter): emitter is Beam => "beam" in emitter;

/** Runs a list of emitters for one owner; the pattern data stays untouched. */
export class EmitterSet {
  private states: { spec: Emitter; next: number; volley: number }[];
  time = 0;

  constructor(emitters: Emitter[], rank: number) {
    this.states = emitters.filter((spec) => (spec.rank ?? 0) <= rank).map((spec) => ({ spec, next: spec.at ?? 0, volley: 0 }));
  }

  step(dt: number, owner: Origin, muzzle: Muzzle) {
    this.time += dt;
    for (const state of this.states) {
      const { spec } = state;
      while (this.time >= state.next && state.volley < (spec.times ?? Infinity)) {
        if (isBeam(spec)) fireBeam(spec, state.volley, owner, muzzle);
        else fire(spec, state.volley, this.time, owner, muzzle);
        state.volley += 1;
        const salvo = isBeam(spec) ? undefined : spec.salvo;
        const pause = salvo && state.volley % salvo[0] === 0 ? salvo[1] : (spec.every ?? Infinity);
        state.next += pause / (isBeam(spec) ? 1 : muzzle.rate);
      }
    }
  }
}

export function aimAngle(from: Origin, to: Origin) {
  return (Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI;
}

function fire(spec: Emit, volley: number, time: number, owner: Origin, muzzle: Muzzle) {
  const count = spec.fixed ? spec.n : Math.max(1, Math.round(spec.n * muzzle.density));
  const sources = spec.orbit
    ? Array.from({ length: spec.orbit.n }, (_, i) => {
        const a = ((i / spec.orbit!.n) * 360 + spec.orbit!.spin * time) * (Math.PI / 180);
        return { x: owner.x + Math.sin(a) * spec.orbit!.r, y: owner.y - Math.cos(a) * spec.orbit!.r, out: (a * 180) / Math.PI };
      })
    : [{ x: owner.x + (spec.from?.[0] ?? 0), y: owner.y + (spec.from?.[1] ?? 0), out: 0 }];

  for (const source of sources) {
    const swing = spec.swing ? Math.sin((time / spec.swing[1]) * TWO_PI) * spec.swing[0] : 0;
    const base = (spec.angle ?? 0) + (spec.aim ? aimAngle(source, muzzle.aim) : 0) + (spec.spin ?? 0) * volley + swing + (spec.orbit?.outward ? source.out : 0);
    muzzle.volley(source.x, source.y, spec.color);
    const layers = spec.layers ?? 1;
    for (let layer = 0; layer < layers; layer++) {
      const extra = (spec.layerStep ?? 0.5) * layer;
      const turn = (spec.layerTurn ?? 0) * layer;
      volleyForm(spec, count, base + turn, extra, volley, source, muzzle);
    }
  }
}

function volleyForm(spec: Emit, n: number, base: number, extra: number, volley: number, at: Origin, muzzle: Muzzle) {
  const speed = spec.speed * muzzle.speed + extra * muzzle.speed;
  const shoot = (angle: number, s = speed) => muzzle.shoot(at.x, at.y, angle, s, spec, true);
  switch (spec.form ?? "ring") {
    case "ring":
      for (let i = 0; i < n; i++) shoot(base + (i / n) * 360);
      return;
    case "fan": {
      const spread = spec.spread ?? 40;
      for (let i = 0; i < n; i++) shoot(base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread));
      return;
    }
    case "scatter":
      for (let i = 0; i < n; i++) {
        const top = spec.speedTo ?? spec.speed;
        shoot(base + (muzzle.rng() - 0.5) * (spec.spread ?? 360), (spec.speed + (top - spec.speed) * muzzle.rng()) * muzzle.speed);
      }
      return;
    case "flower": {
      const petals = spec.petals ?? 5;
      const total = Math.round(n / petals) * petals;
      for (let i = 0; i < total; i++) shoot(base + (i / total) * 360, speed * (1 + (spec.depth ?? 0.25) * Math.cos((i / total) * petals * TWO_PI)));
      return;
    }
    case "poly": {
      const sides = spec.petals ?? 4;
      const total = Math.round(n / sides) * sides;
      const per = 360 / sides;
      for (let i = 0; i < total; i++) {
        const a = (i / total) * 360;
        const off = (((a % per) - per / 2) * Math.PI) / 180;
        shoot(base + a, (speed * Math.cos(Math.PI / sides)) / Math.cos(off));
      }
      return;
    }
    case "curtain": {
      const edge = spec.edge ?? "top";
      const length = edge === "top" ? FIELD.width : FIELD.height;
      const gap = spec.gap ?? 2.4;
      // The way through walks back and forth, so the next gap is always near the last one.
      const walk = (volley * (spec.gapStep ?? 1.6)) % ((length - gap) * 2);
      const gapFrom = walk > length - gap ? (length - gap) * 2 - walk : walk;
      const step = length / n;
      for (let i = 0; i <= n; i++) {
        const along = i * step;
        if (along > gapFrom && along < gapFrom + gap) continue;
        if (edge === "top") muzzle.shoot(FIELD.left + along, FIELD.top + 0.5, spec.angle ?? 0, speed, spec, false);
        else if (edge === "left") muzzle.shoot(FIELD.left - 0.5, FIELD.bottom + along, 90 + (spec.angle ?? 0), speed, spec, false);
        else muzzle.shoot(FIELD.right + 0.5, FIELD.bottom + along, -90 + (spec.angle ?? 0), speed, spec, false);
      }
      return;
    }
  }
}

function fireBeam(spec: Beam, volley: number, owner: Origin, muzzle: Muzzle) {
  const [dx, dy] = spec.from ?? [0, 0];
  const at = { x: owner.x + dx, y: owner.y + dy };
  const base = (spec.angle ?? 0) + (spec.aim ? aimAngle(at, muzzle.aim) : 0) + (spec.spin ?? 0) * volley;
  const swing = spec.swing ? Math.sin((volley / spec.swing[1]) * TWO_PI) * spec.swing[0] : 0;
  const spread = spec.spread ?? 360;
  for (let i = 0; i < spec.n; i++) {
    const turn = spread >= 360 ? (i / spec.n) * 360 : spec.n === 1 ? 0 : (i / (spec.n - 1) - 0.5) * spread;
    muzzle.beam({
      x: at.x, y: at.y, angle: base + turn + swing, sweep: spec.sweep ?? 0, age: 0, warn: spec.warn, hold: spec.hold,
      width: spec.width, color: spec.color, fired: false, grazeIn: 0, owner, dx, dy,
    });
  }
}
