import { type Act, type Burst, COLORS, type Color, FIELD, HIT_RADIUS, SHAPES, type Shape } from "./types";

const RAD = Math.PI / 180;
const MARGIN = 1.4;
const FADE_IN = 0.16;

export interface BulletSpec {
  shape: Shape;
  color: Color;
  size?: number;
  accel?: number;
  to?: number;
  curve?: number;
  curveFor?: number;
  acts?: Act[];
}

/** All enemy bullets, one array per property; removing one moves the last into its place. */
export class Bullets {
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly angle: Float32Array;
  readonly speed: Float32Array;
  readonly accel: Float32Array;
  readonly to: Float32Array;
  readonly curve: Float32Array;
  readonly curveFor: Float32Array;
  readonly age: Float32Array;
  readonly size: Float32Array;
  readonly radius: Float32Array;
  readonly shape: Uint8Array;
  readonly color: Uint8Array;
  readonly grazed: Uint8Array;
  private acts: (Act[] | null)[];
  private act: Uint8Array;

  constructor(readonly capacity: number) {
    const floats = () => new Float32Array(capacity);
    const bytes = () => new Uint8Array(capacity);
    this.x = floats(); this.y = floats(); this.angle = floats(); this.speed = floats();
    this.accel = floats(); this.to = floats(); this.curve = floats(); this.curveFor = floats();
    this.age = floats(); this.size = floats(); this.radius = floats();
    this.shape = bytes(); this.color = bytes(); this.grazed = bytes(); this.act = bytes();
    this.acts = new Array(capacity).fill(null);
  }

  /** `angle` in degrees, 0 is down. */
  spawn(x: number, y: number, angle: number, speed: number, spec: BulletSpec) {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    const size = spec.size ?? 1;
    this.x[i] = x; this.y[i] = y;
    this.angle[i] = angle * RAD;
    this.speed[i] = speed;
    this.accel[i] = spec.accel ?? 0;
    this.to[i] = spec.to ?? (spec.accel && spec.accel < 0 ? 0 : 99);
    this.curve[i] = (spec.curve ?? 0) * RAD;
    this.curveFor[i] = spec.curveFor ?? 99;
    this.age[i] = 0;
    this.size[i] = size;
    this.radius[i] = HIT_RADIUS[spec.shape] * size;
    this.shape[i] = SHAPES.indexOf(spec.shape);
    this.color[i] = COLORS.indexOf(spec.color);
    this.grazed[i] = 0;
    this.act[i] = 0;
    this.acts[i] = spec.acts?.length ? spec.acts : null;
  }

  harmless(i: number) {
    return this.age[i] < FADE_IN;
  }

  remove(i: number) {
    const j = --this.count;
    if (i === j) return;
    for (const list of [this.x, this.y, this.angle, this.speed, this.accel, this.to, this.curve, this.curveFor, this.age, this.size, this.radius, this.shape, this.color, this.grazed, this.act]) list[i] = list[j];
    this.acts[i] = this.acts[j];
  }

  /** Moves bullet `i`; false once it has left the field for good. */
  step(i: number, dt: number, aim: { x: number; y: number }, speedScale: number, onBurst: (x: number, y: number, angle: number, burst: Burst) => void): boolean {
    const age = (this.age[i] += dt);
    const list = this.acts[i];
    if (list) {
      while (this.act[i] < list.length && list[this.act[i]].at <= age) {
        const act = list[this.act[i]++];
        if (act.stop) { this.speed[i] = 0; this.accel[i] = 0; this.curve[i] = 0; }
        if (act.turn !== undefined) this.angle[i] += act.turn * RAD;
        if (act.aim !== undefined) this.angle[i] = Math.atan2(aim.x - this.x[i], -(aim.y - this.y[i])) + act.aim * RAD;
        if (act.speed !== undefined) this.speed[i] = act.speed * speedScale;
        if (act.accel !== undefined) { this.accel[i] = act.accel; this.to[i] = act.to === undefined ? (act.accel < 0 ? 0 : 99) : act.to * speedScale; }
        if (act.curve !== undefined) { this.curve[i] = act.curve * RAD; this.curveFor[i] = act.curveFor ?? 99; }
        if (act.color) this.color[i] = COLORS.indexOf(act.color);
        if (act.burst) onBurst(this.x[i], this.y[i], this.angle[i] / RAD, act.burst);
        if (act.die) return false;
      }
    }
    const accel = this.accel[i];
    if (accel) {
      const next = this.speed[i] + accel * dt;
      this.speed[i] = accel > 0 ? Math.min(next, Math.max(this.speed[i], this.to[i])) : Math.max(next, Math.min(this.speed[i], this.to[i]));
    }
    if (this.curveFor[i] > 0) {
      this.curveFor[i] -= dt;
      this.angle[i] += this.curve[i] * dt;
    }
    const step = this.speed[i] * dt;
    const x = (this.x[i] += Math.sin(this.angle[i]) * step);
    const y = (this.y[i] -= Math.cos(this.angle[i]) * step);
    const late = list !== null && this.act[i] < list.length;
    const margin = late ? MARGIN + 2 : MARGIN;
    return x > FIELD.left - margin && x < FIELD.right + margin && y > FIELD.bottom - margin && y < FIELD.top + margin;
  }
}
