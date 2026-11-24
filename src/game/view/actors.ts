import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { Foe, World } from "../sim/world";
import { type Batch, GLYPH, PREMULTIPLIED } from "./batch";
import { linear } from "./color";
import { buildBoss, buildFoe, type Model } from "./models";
import { makeShader } from "./shader";

/** The lamps the moth meets: one pooled model per kind, and the boss of the stage. */
export class Actors {
  private pool = new Map<string, Model[]>();
  private live = new Map<number, { model: Model; kind: string; age: number }>();
  private boss: { name: string; model: Model } | null = null;
  private moon: { mesh: Mesh; material: ShaderMaterial };
  private bossTime = 0;
  private charge = 0;
  private moonPhase = 0;

  constructor(private scene: Scene, private paint: ShaderMaterial, moonTexture: string) {
    this.moon = makeMoon(scene, moonTexture);
  }

  /** Builds a stage's models ahead, so nothing hitches when they enter. */
  warm(models: string[], boss: string) {
    for (const name of models) if (!this.pool.get(name)?.length) this.release(name, buildFoe(name, this.scene, this.paint));
    this.holdBoss(boss);
    this.boss!.model.root.setEnabled(false);
  }

  private release(kind: string, model: Model) {
    model.root.setEnabled(false);
    const list = this.pool.get(kind) ?? [];
    list.push(model);
    this.pool.set(kind, list);
  }

  private holdBoss(name: string) {
    if (this.boss?.name === name) return;
    this.boss?.model.dispose();
    this.boss = { name, model: buildBoss(name, this.scene, this.paint) };
  }

  update(dt: number, world: World, glow: Batch, dim: number) {
    const seen = new Set<number>();
    for (const foe of world.foes) {
      seen.add(foe.id);
      this.drawFoe(foe, dt, glow, dim);
    }
    for (const [id, entry] of this.live) {
      if (seen.has(id)) continue;
      this.release(entry.kind, entry.model);
      this.live.delete(id);
    }
    this.drawBoss(dt, world, glow, dim);
  }

  private drawFoe(foe: Foe, dt: number, glow: Batch, dim: number) {
    let entry = this.live.get(foe.id);
    if (!entry) {
      const kind = foe.type.model;
      const model = this.pool.get(kind)?.pop() ?? buildFoe(kind, this.scene, this.paint);
      model.root.setEnabled(true);
      entry = { model, kind, age: 0 };
      this.live.set(foe.id, entry);
    }
    entry.age += dt;
    const { model } = entry;
    const punch = 1 + foe.flash * 0.1;
    model.root.position.set(foe.x, foe.y, 0.2);
    model.root.scaling.setAll(punch);
    model.animate(entry.age + foe.id, 0);
    halo(glow, foe.x, foe.y + model.glow.y, model.glow.size, model.glow.color, (0.5 + foe.flash * 0.8) * dim);
  }

  private drawBoss(dt: number, world: World, glow: Batch, dim: number) {
    const { boss } = world;
    if (!boss || boss.done) {
      this.boss?.model.root.setEnabled(false);
      this.moon.mesh.setEnabled(false);
      return;
    }
    this.holdBoss(boss.type.model);
    const model = this.boss!.model;
    this.bossTime += dt;
    const telling = boss.tell > 0 ? 1 - boss.tell / world.params.tellSeconds : 0;
    const want = boss.tell > 0 ? telling * telling : 0;
    this.charge += (want - this.charge) * Math.min(1, dt * (want > this.charge ? 8 : 3));
    const shake = telling > 0.4 ? (Math.random() - 0.5) * 0.06 * telling : 0;
    model.root.setEnabled(true);
    model.root.position.set(boss.x + shake, boss.y, 0.6);
    model.root.scaling.setAll(1 + boss.flash * 0.025 + this.charge * 0.06);
    model.animate(this.bossTime, this.charge);
    halo(glow, boss.x, boss.y + model.glow.y, model.glow.size * (1 + this.charge * 0.35 + Math.sin(this.bossTime * 3) * 0.03), model.glow.color, (0.42 + boss.flash * 0.25 + this.charge * 0.5) * dim);
    if (this.charge > 0.05) {
      const k = 1 - telling;
      glow.add(boss.x, boss.y, -0.1, 0, 0.6 + k * 4.5, 0.6 + k * 4.5, GLYPH.wave, this.charge * 0.8 * dim, ...linear(model.glow.color), 1, 0.1);
    }
    const isMoon = boss.type.model === "moon";
    this.moon.mesh.setEnabled(isMoon);
    if (isMoon) {
      const full = boss.type.phases.length > 1 ? boss.index / (boss.type.phases.length - 1) : 1;
      this.moonPhase += (full - this.moonPhase) * Math.min(1, dt * 1.4);
      this.moon.mesh.position.set(boss.x + shake, boss.y, 0.4);
      this.moon.mesh.scaling.setAll(2.15 + this.charge * 0.12);
      const a = Math.PI * (1 - this.moonPhase);
      this.moon.material.setVector3("u_sun", new Vector3(Math.sin(a), 0.2, -Math.cos(a)));
      this.moon.material.setFloat("u_dim", dim);
      this.moon.material.setFloat("u_flash", boss.flash * 0.18 + this.charge * 0.4);
    } else this.moonPhase = 0;
  }
}

function halo(batch: Batch, x: number, y: number, size: number, hex: string, alpha: number) {
  batch.add(x, y, 0.8, 0, size, size, GLYPH.glow, alpha * 0.6, ...linear(hex), 1);
}

function makeMoon(scene: Scene, url: string) {
  const texture = new Texture(url, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
  const material = makeShader(scene, "mothMoon", {
    attributes: { position: "vec3" },
    varyings: { v_p: "vec2" },
    uniforms: { u_sun: "vec3", u_dim: "float", u_flash: "float" },
    samplers: ["tex"],
    blend: PREMULTIPLIED,
    vertex: `
      POSITION = u_viewProjection * u_world * vec4(a_position, 1.0);
      v_p = a_position.xy;
    `,
    fragment: `
      float d = length(v_p);
      float px = fwidth(d);
      float a = 1.0 - smoothstep(1.0 - px, 1.0 + px, d);
      vec3 n = vec3(v_p, -sqrt(max(0.0, 1.0 - d * d)));
      vec3 t = pow(max(TEX(tex, v_p * 0.5 + 0.5).rgb, vec3(0.0, 0.0, 0.0)), vec3(2.2, 2.2, 2.2));
      float lit = smoothstep(-0.12, 0.28, dot(n, u_sun));
      vec3 night = vec3(0.02, 0.03, 0.085) * (0.6 + t.r * 1.4) + vec3(0.1, 0.14, 0.32) * pow(d, 5.0);
      vec3 c = mix(night, t * vec3(0.86, 0.94, 1.08) * 0.9, lit) + vec3(0.6, 0.7, 1.0) * u_flash * 0.5;
      COLOR = vec4(c * a * u_dim, a);
    `,
  });
  material.setTexture("tex", texture);
  const mesh = new Mesh("moon-boss", scene);
  const data = new VertexData();
  data.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.applyToMesh(mesh);
  mesh.material = material;
  mesh.renderingGroupId = 1;
  mesh.alphaIndex = 2;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}
