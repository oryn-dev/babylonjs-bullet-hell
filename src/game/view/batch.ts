import { Constants } from "@babylonjs/core/Engines/constants";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Scene } from "@babylonjs/core/scene";
import { makeShader } from "./shader";

export const PREMULTIPLIED = Constants.ALPHA_PREMULTIPLIED;

/** One quad drawn many times; the 16 numbers of the instance matrix carry whatever the shader wants. */
export class Batch {
  readonly mesh: Mesh;
  readonly data: Float32Array;
  count = 0;

  constructor(scene: Scene, name: string, readonly capacity: number, material: ShaderMaterial, group: number) {
    const mesh = (this.mesh = new Mesh(name, scene));
    const quad = new VertexData();
    quad.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
    quad.indices = [0, 1, 2, 0, 2, 3];
    quad.applyToMesh(mesh);
    mesh.material = material;
    mesh.renderingGroupId = group;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
    mesh.isPickable = false;
    this.data = new Float32Array(capacity * 16);
    mesh.thinInstanceSetBuffer("matrix", this.data, 16, false);
    mesh.thinInstanceCount = 1;
    mesh.freezeWorldMatrix();
  }

  begin() {
    this.count = 0;
  }

  /** a-d are the four rows handed to the shader. */
  add(a0: number, a1: number, a2: number, a3: number, b0: number, b1: number, b2: number, b3: number, c0: number, c1: number, c2: number, c3: number, d0 = 0, d1 = 0, d2 = 0, d3 = 0) {
    if (this.count >= this.capacity) return;
    const { data } = this;
    let o = this.count++ * 16;
    data[o++] = a0; data[o++] = a1; data[o++] = a2; data[o++] = a3;
    data[o++] = b0; data[o++] = b1; data[o++] = b2; data[o++] = b3;
    data[o++] = c0; data[o++] = c1; data[o++] = c2; data[o++] = c3;
    data[o++] = d0; data[o++] = d1; data[o++] = d2; data[o] = d3;
  }

  /** An empty batch keeps one quad without size: with none, Babylon would compile the shader without instances. */
  end() {
    if (!this.count) this.data.fill(0, 0, 16);
    this.mesh.thinInstanceCount = Math.max(1, this.count);
    this.mesh.thinInstanceBufferUpdated("matrix");
  }
}

/** Shape numbers below 7 are the bullets in the order of SHAPES. */
export const GLYPH = { warn: 8, beam: 9, shot: 10, glow: 20, wave: 21, mote: 22, streak: 23, flake: 24, halo: 25, shield: 26, eclipse: 27, dot: 28 };

/**
 * The one sprite shader: rows are (x y z turn) (half width, half height, glyph, alpha) (colour, glow) (extra).
 * Output is premultiplied, so a bullet has an opaque dark rim and adds its light around it in the same draw.
 */
export function makeSpriteMaterial(scene: Scene) {
  const material = makeShader(scene, "mothSprite", {
    attributes: { position: "vec3", world0: "vec4", world1: "vec4", world2: "vec4", world3: "vec4" },
    varyings: { v_p: "vec2", v_kind: "vec4", v_tint: "vec4", v_extra: "vec4" },
    uniforms: { u_time: "float", u_contrast: "float", u_dim: "float" },
    blend: PREMULTIPLIED,
    vertex: `
      float c = cos(a_world0.w);
      float s = sin(a_world0.w);
      vec2 q = vec2(a_position.x * a_world1.x, a_position.y * a_world1.y);
      vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
      POSITION = u_viewProjection * vec4(a_world0.xyz + vec3(r, 0.0), 1.0);
      v_p = a_position.xy;
      v_kind = a_world1;
      v_tint = a_world2;
      v_extra = a_world3;
    `,
    shared: `
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 w = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
      }
      float bodyDistance(vec2 p, float kind) {
        float d = length(p);
        if (kind > 0.5 && kind < 1.5) {
          float w = 0.52 * (1.0 - 0.36 * p.y);
          d = length(vec2(p.x / w, p.y));
        }
        if (kind > 1.5 && kind < 2.5) {
          float a = ATAN2(p.x, p.y);
          d = length(p) / (0.72 + 0.28 * cos(a * 5.0));
        }
        if (kind > 3.5 && kind < 4.5) {
          d = length(vec2(p.x / (0.3 + 0.12 * (1.0 - p.y)), p.y));
        }
        if (kind > 4.5 && kind < 5.5) {
          float cut = length(p - vec2(0.0, 0.46)) - 0.66;
          d = max(length(p), 1.0 - cut * 2.6);
        }
        return d;
      }
    `,
    fragment: `
      float grad = length(fwidth(v_p)) * 0.6 + 0.0001;
      float kind = v_kind.z;
      float alpha = v_kind.w;
      vec3 tint = v_tint.rgb;
      vec3 rgb = vec3(0.0);
      float a = 0.0;
      if (kind < 7.5) {
        vec2 p = v_p * 2.0;
        float d = bodyDistance(p, kind);
        float px = grad * 2.0;
        float fill = 1.0 - smoothstep(1.0 - px, 1.0 + px, d);
        float rimSize = 1.2 + 0.14 * u_contrast;
        float rim = 1.0 - smoothstep(rimSize - 0.1 - px, rimSize + px, d);
        float core = 1.0 - smoothstep(0.34, 0.74, d);
        if (kind > 2.5 && kind < 3.5) {
          core = 1.0 - smoothstep(0.1, 0.34, abs(d - 0.72));
          float hole = 1.0 - smoothstep(0.34, 0.5, d);
          core = core * (1.0 - hole);
          fill = fill * (1.0 - hole * 0.82);
        }
        if (kind > 5.5) {
          float ringBand = 1.0 - smoothstep(0.05, 0.13, abs(d - 0.74));
          core = max((1.0 - smoothstep(0.2, 0.62, d)) * (0.9 + 0.1 * sin(u_time * 9.0 + v_extra.x)), ringBand * 0.55);
        }
        vec3 body = mix(tint, mix(tint, vec3(1.0), 0.86) * 1.5, core);
        vec3 ink = vec3(0.012, 0.01, 0.03);
        rgb = mix(ink, body, fill);
        a = rim * alpha;
        float light = exp(-max(length(p) - 0.7, 0.0) * 3.4) * (1.0 - u_contrast * 0.7) * v_tint.a;
        float outside = 1.0 - smoothstep(1.5, 2.0, length(p));
        rgb = rgb * a + tint * light * outside * (1.0 - rim * 0.75) * 0.42 * alpha;
      } else if (kind < 8.5) {
        float along = v_p.y * 0.5 + 0.5;
        float line = 1.0 - smoothstep(0.1, 0.5, abs(v_p.x));
        float dash = 0.55 + 0.45 * sin(along * 130.0 - u_time * 14.0);
        float soft = 1.0 - smoothstep(0.0, 1.0, abs(v_p.x));
        a = 0.0;
        rgb = tint * (line * dash * 0.75 + soft * 0.16) * alpha * (1.0 - smoothstep(0.8, 1.0, along));
      } else if (kind < 9.5) {
        float x = abs(v_p.x) * 1.9;
        float body = 1.0 - smoothstep(0.92, 1.0, x);
        float rim = 1.0 - smoothstep(1.16, 1.26, x);
        float core = 1.0 - smoothstep(0.12, 0.8, x);
        float ripple = 0.92 + 0.08 * sin(v_p.y * 60.0 - u_time * 40.0);
        vec3 c = mix(tint, mix(tint, vec3(1.0), 0.9) * 1.6, core * ripple);
        a = rim * alpha;
        rgb = mix(vec3(0.012, 0.01, 0.03), c, body) * a + tint * exp(-max(x - 0.9, 0.0) * 3.0) * (1.0 - smoothstep(1.4, 1.9, x)) * 0.35 * alpha * (1.0 - rim);
      } else if (kind < 10.5) {
        float x = abs(v_p.x);
        float taper = smoothstep(-1.0, 0.7, v_p.y) * (1.0 - smoothstep(0.75, 1.0, v_p.y));
        float m = (1.0 - smoothstep(0.1, 1.0, x)) * taper;
        rgb = tint * m * alpha;
        a = m * 0.25 * alpha;
      } else if (kind < 20.5) {
        float m = max(0.0, 1.0 - length(v_p));
        rgb = tint * m * m * alpha;
      } else if (kind < 21.5) {
        float d = length(v_p);
        float w = v_extra.x;
        float m = smoothstep(1.0 - w, 1.0 - w * 0.4, d) * (1.0 - smoothstep(0.97, 1.0, d));
        rgb = tint * m * alpha;
      } else if (kind < 22.5) {
        float d = length(v_p);
        float twinkle = 0.7 + 0.3 * sin(u_time * 8.0 + v_extra.x * 20.0);
        float cross = max(0.0, 1.0 - abs(v_p.x) * 9.0) * max(0.0, 1.0 - abs(v_p.y)) + max(0.0, 1.0 - abs(v_p.y) * 9.0) * max(0.0, 1.0 - abs(v_p.x));
        float m = (1.0 - smoothstep(0.08, 0.24, d)) * 1.3 + pow(max(0.0, 1.0 - d), 3.0) * 0.5 + cross * 0.35 * twinkle;
        rgb = tint * m * twinkle * alpha;
      } else if (kind < 23.5) {
        float m = (1.0 - smoothstep(0.0, 1.0, abs(v_p.x))) * (1.0 - smoothstep(0.2, 1.0, abs(v_p.y)));
        rgb = tint * m * alpha;
      } else if (kind < 24.5) {
        vec2 q = vec2(v_p.x + v_p.y * v_p.y * 0.3, v_p.y);
        float d = length(vec2(q.x * 1.9, q.y));
        float m = 1.0 - smoothstep(0.75, 0.9, d);
        rgb = mix(tint * 0.6, tint, smoothstep(-0.6, 0.6, v_p.y)) * m * alpha;
        a = m * alpha;
      } else if (kind < 25.5) {
        float m = max(0.0, 1.0 - length(v_p));
        a = m * m * (3.0 - 2.0 * m) * alpha;
        rgb = tint * a;
      } else if (kind < 26.5) {
        float d = length(v_p);
        float m = smoothstep(0.72, 0.94, d) * (1.0 - smoothstep(0.94, 1.0, d));
        float ang = ATAN2(v_p.y, v_p.x);
        rgb = tint * m * alpha * (0.6 + 0.4 * sin(ang * 6.0 + u_time * 5.0));
      } else if (kind < 27.5) {
        vec2 p = v_p * 1.35;
        float d = length(p);
        vec2 way = p / max(d, 0.001);
          float rays = noise(way * 2.6 + vec2(u_time * 0.5, 4.0)) * 0.6 + noise(way * 7.0 + vec2(9.0, u_time * 0.9)) * 0.4;
        float edge = smoothstep(0.985, 1.0, d);
        float corona = edge * exp(-(d - 1.0) * (22.0 - rays * 12.0)) * (0.4 + rays * 0.8);
        float inner = (1.0 - edge);
        float lip = smoothstep(0.93, 1.0, d) * inner;
        float rimLight = exp(-abs(d - 1.0) * 60.0);
        a = inner * 0.5 * alpha * smoothstep(0.1, 0.9, d + 0.35);
        rgb = (tint * (corona + rimLight * 0.9 + lip * 0.25)) * alpha * (1.0 - smoothstep(1.25, 1.35, d));
      } else {
        float d = length(v_p);
        float px = grad;
        float m = 1.0 - smoothstep(0.5 - px, 0.5 + px, d);
        float rim = 1.0 - smoothstep(0.8 - px, 0.86 + px, d);
        a = rim * alpha;
        rgb = mix(vec3(0.02, 0.01, 0.05), tint, m) * a;
        rgb = rgb + tint * max(0.0, 1.0 - d) * 0.25 * alpha * (1.0 - rim);
      }
      COLOR = vec4(rgb * u_dim, a);
    `,
  });
  material.setFloat("u_time", 0);
  material.setFloat("u_contrast", 0);
  material.setFloat("u_dim", 1);
  return material;
}
