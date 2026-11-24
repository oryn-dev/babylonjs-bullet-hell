import { GLYPH, type Batch } from "./batch";
import type { Rgb } from "./color";

interface Particle {
  x: number; y: number; z: number; vx: number; vy: number; age: number; life: number;
  size: number; grow: number; kind: number; r: number; g: number; b: number; alpha: number;
  drag: number; fall: number; turn: number; spin: number; extra: number; stretch: number;
}

const MAX = 900;

export interface Spawn {
  vx?: number; vy?: number; life?: number; size?: number; grow?: number; kind?: number; alpha?: number;
  drag?: number; fall?: number; turn?: number; spin?: number; extra?: number; stretch?: number; z?: number;
}

/** Short-lived light: sparks, rings, dust. */
export class Fx {
  private list: Particle[] = [];

  add(x: number, y: number, color: Rgb, o: Spawn = {}) {
    if (this.list.length >= MAX) return;
    this.list.push({
      x, y, z: o.z ?? -0.2, vx: o.vx ?? 0, vy: o.vy ?? 0, age: 0, life: o.life ?? 0.5, size: o.size ?? 0.1, grow: o.grow ?? 0,
      kind: o.kind ?? GLYPH.glow, r: color[0], g: color[1], b: color[2], alpha: o.alpha ?? 1, drag: o.drag ?? 0, fall: o.fall ?? 0,
      turn: o.turn ?? 0, spin: o.spin ?? 0, extra: o.extra ?? Math.random(), stretch: o.stretch ?? 1,
    });
  }

  spray(x: number, y: number, color: Rgb, n: number, speed: number, o: Spawn = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random() * 0.75);
      this.add(x, y, color, { ...o, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.6), turn: a - Math.PI / 2 });
    }
  }

  ring(x: number, y: number, color: Rgb, size: number, life = 0.45, width = 0.25, alpha = 1) {
    this.add(x, y, color, { kind: GLYPH.wave, size: size * 0.12, grow: size / life, life, extra: width, alpha });
  }

  update(dt: number) {
    const { list } = this;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep - p.fall * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt * (1 - p.age / p.life) * 2;
      p.turn += p.spin * dt;
    }
  }

  draw(batch: Batch) {
    for (const p of this.list) {
      const t = p.age / p.life;
      const fade = (1 - t) * (1 - t) * p.alpha;
      batch.add(p.x, p.y, p.z, p.turn, p.size, p.size * p.stretch, p.kind, fade, p.r, p.g, p.b, 1, p.extra);
    }
  }

  clear() {
    this.list.length = 0;
  }
}
