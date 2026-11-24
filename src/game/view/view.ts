import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { type Color, COLORS, FIELD, HIT_RADIUS, SHAPES, type Event } from "../sim/types";
import { BEAM_LENGTH, type World } from "../sim/world";
import { Actors } from "./actors";
import { Batch, GLYPH, makeSpriteMaterial, PREMULTIPLIED } from "./batch";
import { BULLET_COLORS, BULLET_GLOW, linear, SILVER } from "./color";
import { Frame } from "./frame";
import { Fx } from "./fx";
import { MothView } from "./moth";
import { PLACES } from "./places";
import { makePaint } from "./sculpt";
import { Scenery } from "./scenery";
import { makeShader } from "./shader";

export interface ViewOptions {
  contrast: boolean;
  calmFlashes: boolean;
}

const GOLD = linear("#ffd27a");
const PALE = linear("#e6ecff");
const DUST = linear("#b8c8ff");
const MOTES = 60;

/** Draws the world: scenery, actors, moth and light below, bullets always on top. */
export class View {
  readonly frame: Frame;
  readonly scenery: Scenery;
  readonly fx = new Fx();
  readonly options: ViewOptions = { contrast: false, calmFlashes: false };
  private under: Batch;
  private over: Batch;
  private bullets: Batch;
  private paint: ShaderMaterial;
  private sprite: ShaderMaterial;
  private actors: Actors;
  private moth: MothView;
  private shade: { mesh: Mesh; material: ShaderMaterial };
  private time = 0;
  private shakeLeft = 0;
  private shakePower = 0;
  private darkness = 0;
  private flash = 0;
  private trail = 0;
  private motes = Array.from({ length: MOTES }, () => ({ x: 0, y: 0, z: 0, s: 0, p: 0 }));

  constructor(scene: Scene, url: (path: string) => string) {
    this.frame = new Frame(scene);
    scene.autoClear = true;
    this.scenery = new Scenery(scene, this.frame, url);
    this.paint = makePaint(scene);
    this.sprite = makeSpriteMaterial(scene);
    this.under = new Batch(scene, "light", 1400, this.sprite, 1);
    this.under.mesh.alphaIndex = 1;
    this.over = new Batch(scene, "sparks", 1500, this.sprite, 1);
    this.over.mesh.alphaIndex = 20;
    this.bullets = new Batch(scene, "bullets", 2700, this.sprite, 2);
    this.actors = new Actors(scene, this.paint, url("art/moon.webp"));
    this.moth = new MothView(scene, url("art/moth.webp"));
    this.shade = makeShade(scene);
    for (const mote of this.motes) Object.assign(mote, { x: (Math.random() - 0.5) * 44, y: (Math.random() - 0.5) * 34, z: Math.random() * 22 - 2, s: 0.5 + Math.random(), p: Math.random() * 6.28 });
    window.addEventListener("resize", () => requestAnimationFrame(() => this.frame.fit()));
  }

  warm(models: string[], boss: string) {
    this.actors.warm(models, boss);
  }

  shake(power: number, seconds: number) {
    if (power < this.shakePower && this.shakeLeft > 0) return;
    this.shakePower = power * (this.options.calmFlashes ? 0.35 : 1);
    this.shakeLeft = seconds;
  }

  onEvent(event: Event) {
    const { fx } = this;
    switch (event.kind) {
      case "graze": {
        const a = Math.atan2(event.by - event.y, event.bx - event.x);
        for (let i = 0; i < 3; i++) {
          const b = a + (Math.random() - 0.5) * 1.1, s = 4 + Math.random() * 5;
          fx.add(event.x + Math.cos(a) * 0.35, event.y + Math.sin(a) * 0.35, PALE, { vx: Math.cos(b) * s, vy: Math.sin(b) * s, life: 0.26, size: 0.035, stretch: 4.5, kind: GLYPH.streak, turn: b - Math.PI / 2, drag: 5, alpha: 0.9 });
        }
        return;
      }
      case "spark":
        fx.add(event.x + (Math.random() - 0.5) * 0.3, event.y, SILVER, { size: 0.28, life: 0.14, alpha: 0.35 });
        return;
      case "volley":
        fx.add(event.x, event.y, this.glowOf(event.color), { size: 0.5, grow: 2, life: 0.2, alpha: 0.5, z: -0.1 });
        return;
      case "burst":
        fx.ring(event.x, event.y, this.glowOf(event.color), 1.1, 0.3, 0.4, 0.8);
        fx.add(event.x, event.y, this.glowOf(event.color), { size: 1.1, life: 0.25, alpha: 0.7 });
        return;
      case "swept":
        if (Math.random() < 0.6) fx.add(event.x, event.y, DUST, { size: 0.26, life: 0.3, alpha: 0.5 });
        return;
      case "foeDown":
        fx.spray(event.x, event.y, GOLD, 12, 7, { kind: GLYPH.streak, size: 0.04, stretch: 5, life: 0.45, drag: 4, alpha: 0.9 });
        fx.spray(event.x, event.y, linear("#ff9a4a"), 8, 3, { kind: GLYPH.mote, size: 0.2, life: 1.1, drag: 1.6, fall: 1.5 });
        fx.ring(event.x, event.y, GOLD, event.radius * 2.6, 0.4, 0.3, 0.7);
        fx.add(event.x, event.y, GOLD, { size: event.radius * 2.2, life: 0.28, alpha: 0.9 });
        this.shake(0.05 + event.radius * 0.06, 0.16);
        return;
      case "pickup":
        fx.add(event.x, event.y, DUST, { size: 0.2, life: 0.16, alpha: 0.5 });
        return;
      case "ready":
        fx.ring(this.lastX, this.lastY, PALE, 2.6, 0.6, 0.14, 0.8);
        return;
      case "hit":
        fx.ring(event.x, event.y, linear("#ff5a78"), 8, 0.7, 0.16, 1);
        fx.ring(event.x, event.y, PALE, 4, 0.5, 0.3, 0.8);
        fx.spray(event.x, event.y, PALE, 30, 7, { kind: GLYPH.flake, size: 0.12, life: 1.5, drag: 2.4, fall: 1.4, spin: 3, stretch: 1.5, alpha: 0.9 });
        this.flash = 1;
        this.shake(0.4, 0.45);
        return;
      case "eclipse":
        fx.ring(event.x, event.y, PALE, event.on ? 7 : 4, 0.6, 0.12, 0.8);
        if (event.on) this.shake(0.12, 0.3);
        return;
      case "phaseDown":
        this.boom(event.x, event.y, 0.7);
        return;
      case "bossDown":
        this.boom(event.x, event.y, 1.5);
        return;
    }
  }

  private boom(x: number, y: number, power: number) {
    const { fx } = this;
    fx.spray(x, y, GOLD, Math.round(40 * power), 11 * power, { kind: GLYPH.streak, size: 0.06, stretch: 6, life: 0.8, drag: 3 });
    fx.spray(x, y, PALE, Math.round(60 * power), 7 * power, { kind: GLYPH.mote, size: 0.24, life: 2, drag: 1.5, fall: 1 });
    for (let i = 0; i < 3; i++) fx.ring(x, y, i ? PALE : GOLD, (5 + i * 4) * power, 0.5 + i * 0.2, 0.2, 0.9);
    fx.add(x, y, GOLD, { size: 5 * power, life: 0.5, alpha: 1 });
    this.flash = Math.max(this.flash, 0.35 * power);
    this.shake(0.22 * power, 0.5);
  }

  private glowOf(color: Color) {
    return BULLET_GLOW[COLORS.indexOf(color)];
  }

  private lastX = 0;
  private lastY = 0;

  /** `lead` is the time since the last fixed step, so everything moves smoothly on any display. */
  draw(dt: number, world: World, lead: number, opts: { place: number; title: boolean; scrollSpeed: number; hitPoint: boolean; mothAlpha: number }) {
    this.time += dt;
    const { moth } = world;
    const x = moth.x + moth.vx * lead, y = moth.y + moth.vy * lead;
    this.lastX = x;
    this.lastY = y;
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    const k = this.shakeLeft > 0 ? this.shakePower * Math.min(1, this.shakeLeft / 0.3) : 0;
    this.frame.shake(Math.sin(this.time * 71) * k * 0.5, Math.cos(this.time * 63) * k * 0.5);
    this.frame.update();
    this.scenery.update(dt, x, y, opts.scrollSpeed);
    this.fx.update(dt);

    this.darkness += ((world.eclipse > 0 ? 1 : 0) - this.darkness) * Math.min(1, dt * 7);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    const dim = 1 - this.darkness * 0.72;
    this.paint.setFloat("u_dim", dim);
    this.sprite.setFloat("u_time", this.time);
    this.sprite.setFloat("u_contrast", this.options.contrast ? 1 : 0);
    this.shade.material.setFloat("u_dark", this.darkness * 0.62);
    this.shade.material.setFloat("u_flash", this.flash * (this.options.calmFlashes ? 0.1 : 0.4));
    this.shade.mesh.setEnabled(this.darkness > 0.01 || this.flash > 0.01);
    this.shade.mesh.scaling.set(this.frame.halfWidth * 1.2, this.frame.halfHeight * 1.2, 1);
    this.shade.mesh.position.set(0, this.frame.camera.position.y, 0.1);

    this.under.begin();
    this.over.begin();
    this.drawMotes(dt, opts.place, dim);
    this.actors.update(dt, world, this.under, dim);
    this.drawMoth(dt, world, x, y, opts);
    this.drawDust(world, lead);
    this.drawShots(world, lead);
    this.fx.draw(this.over);
    this.under.end();
    this.over.end();
    this.drawBullets(world, lead, opts, x, y);
  }

  private drawMotes(dt: number, place: number, dim: number) {
    const { motes } = PLACES[place % PLACES.length];
    const color = linear(motes.color);
    const { halfWidth } = this.frame;
    for (let i = 0; i < Math.min(motes.amount, MOTES); i++) {
      const m = this.motes[i];
      m.x += Math.sin(this.time * 0.5 * m.s + m.p) * dt * 0.7;
      m.y += (motes.rise - 0.35 * m.s + Math.cos(this.time * 0.8 * m.s + m.p) * 0.4) * dt;
      if (m.y < -17) m.y += 34;
      if (m.y > 17) m.y -= 34;
      const depth = 1 + m.z / 30;
      const side = Math.abs(m.x) > 6 * depth ? 1 : 0.4;
      if (Math.abs(m.x) > halfWidth * depth * 1.1) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.7 * m.s + m.p * 3);
      this.under.add(m.x, m.y + this.frame.centerY, m.z + 2, 0, 0.18 * m.s, 0.18 * m.s, GLYPH.mote, pulse * 0.6 * side * dim * this.scenery.shown, ...color, 1, m.p);
    }
  }

  private drawMoth(dt: number, world: World, x: number, y: number, opts: { hitPoint: boolean; mothAlpha: number; title: boolean }) {
    const { moth } = world;
    const blink = moth.safe > 0 && world.eclipse <= 0 && !opts.title ? 0.5 + 0.35 * Math.sin(this.time * 22) : 1;
    const eclipse = world.eclipse > 0;
    this.under.add(x, y, 0.1, 0, 1.9, 1.9, GLYPH.glow, 0.2 * opts.mothAlpha, 0.5, 0.62, 1, 1);
    this.moth.update(dt, x, y, moth.vx, moth.vy, { slow: moth.slow, visible: moth.alive && opts.mothAlpha > 0.01, alpha: blink * opts.mothAlpha, glow: eclipse ? 1 : 0 });
    this.trail -= dt;
    if (moth.alive && this.trail <= 0 && opts.mothAlpha > 0.5) {
      this.trail = 0.035;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.fx.add(x + side * (0.15 + Math.random() * 0.5), y - 0.35 - Math.random() * 0.3, SILVER, { vx: -moth.vx * 0.06 + side * 0.2, vy: -1.2 - Math.random() - moth.vy * 0.05, life: 0.9 + Math.random() * 0.6, size: 0.1 + Math.random() * 0.08, kind: GLYPH.mote, alpha: 0.55, drag: 0.6, z: 0.2 });
    }
    if (moth.alive && world.eclipseReady && !opts.title) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
      this.under.add(x, y, 0.05, this.time * 0.4, 1.25 + pulse * 0.08, 1.25 + pulse * 0.08, GLYPH.shield, 0.16 + pulse * 0.14, ...PALE, 1);
    }
    if (eclipse) {
      const size = world.eclipseSize;
      this.under.add(x, y, 0, 0, size * 1.35, size * 1.35, GLYPH.eclipse, 1, 1.1, 1.25, 1.8, 1);
    }
  }

  private drawDust(world: World, lead: number) {
    for (const mote of world.dust) {
      const size = mote.auto ? 0.13 : 0.17;
      this.over.add(mote.x + mote.vx * lead, mote.y + mote.vy * lead, -0.25, 0, size, size, GLYPH.mote, Math.min(1, mote.age * 5) * 0.8, ...DUST, 1, mote.x);
    }
  }

  private drawShots(world: World, lead: number) {
    for (const shot of world.shots) this.over.add(shot.x + shot.vx * lead, shot.y + shot.vy * lead, -0.1, -Math.atan2(shot.vx, shot.vy), 0.085, 0.62, GLYPH.shot, 0.62, ...SILVER, 1);
  }

  private drawBullets(world: World, lead: number, opts: { hitPoint: boolean; title: boolean; mothAlpha: number }, mx: number, my: number) {
    const { bullets: b } = world;
    const batch = this.bullets;
    batch.begin();
    for (const beam of world.beams) {
      const a = (beam.angle * Math.PI) / 180;
      const dx = Math.sin(a), dy = -Math.cos(a), half = BEAM_LENGTH / 2;
      const c = BULLET_COLORS[COLORS.indexOf(beam.color)];
      const firing = beam.age - beam.warn;
      if (firing < 0) {
        const t = beam.age / beam.warn;
        batch.add(beam.x + dx * half, beam.y + dy * half, -0.4, a + Math.PI, beam.width * (0.5 + 0.35 * t), half, GLYPH.warn, Math.min(1, t * 4) * (0.6 + 0.4 * Math.sin(this.time * 18 * (0.4 + t))), ...c, 1);
      } else {
        const open = Math.min(1, firing / 0.08) * Math.min(1, (beam.warn + beam.hold - beam.age) / 0.15);
        batch.add(beam.x + dx * half, beam.y + dy * half, -0.4, a + Math.PI, beam.width * 0.95 * Math.max(0.08, open), half, GLYPH.beam, 1, ...c, 1);
        batch.add(beam.x, beam.y, -0.41, 0, beam.width * 2.2, beam.width * 2.2, GLYPH.glow, 0.7 * open, ...c, 1);
      }
    }
    for (let i = 0; i < b.count; i++) {
      const angle = b.angle[i], s = b.speed[i] * lead;
      const x = b.x[i] + Math.sin(angle) * s, y = b.y[i] - Math.cos(angle) * s;
      const shape = b.shape[i], size = b.size[i];
      const out = Math.max(0, Math.abs(x) - FIELD.right, Math.abs(y) - FIELD.top);
      const age = b.age[i];
      const fade = Math.min(1, age / 0.12) * Math.max(0, 1 - out / 1.2);
      const pop = 0.4 + 0.6 * Math.min(1, age / 0.35);
      const r = (HIT_RADIUS[SHAPES[shape]] / 0.6) * size * pop * (b.grazed[i] ? 1.03 : 1) * 2;
      const long = shape === 1 ? 1.75 : shape === 4 ? 3 : 1;
      const wide = shape === 1 ? 1.5 : shape === 4 ? 2.4 : shape === 3 ? 0.92 : shape === 2 ? 1.3 : 1;
      const turn = shape === 2 ? this.time * 2.4 + i : shape === 5 ? angle + Math.PI + this.time * 2 : angle + Math.PI;
      const c = BULLET_COLORS[b.color[i]];
      batch.add(x, y, -0.4, turn, r * wide, r * long, shape, fade, c[0], c[1], c[2], 1, x);
    }
    if (world.moth.alive && opts.hitPoint && !opts.title) {
      const size = world.moth.slow ? 0.21 : 0.16;
      batch.add(mx, my, -0.5, 0, size, size, GLYPH.dot, opts.mothAlpha, 1.6, 0.5, 0.75, 1);
      if (world.moth.slow) batch.add(mx, my, -0.5, this.time * 1.6, world.grazeRadius, world.grazeRadius, GLYPH.shield, 0.5, ...PALE, 1);
    }
    batch.end();
  }
}

function makeShade(scene: Scene) {
  const material = makeShader(scene, "mothShade", {
    attributes: { position: "vec3" },
    varyings: { v_p: "vec2" },
    uniforms: { u_dark: "float", u_flash: "float" },
    blend: PREMULTIPLIED,
    vertex: `
      POSITION = u_viewProjection * u_world * vec4(a_position, 1.0);
      v_p = a_position.xy;
    `,
    fragment: `
      COLOR = vec4(vec3(0.004, 0.006, 0.02) * u_dark + vec3(0.8, 0.72, 0.7) * u_flash, u_dark);
    `,
  });
  const mesh = new Mesh("shade", scene);
  const data = new VertexData();
  data.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.applyToMesh(mesh);
  mesh.material = material;
  mesh.renderingGroupId = 1;
  mesh.alphaIndex = 0;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}

