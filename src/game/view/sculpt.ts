import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";
import { linear, type Rgb } from "./color";
import { makeShader } from "./shader";

/** Where a shape goes: position, rotation (radians, applied z x y) and scale. */
export interface Put {
  at?: [number, number, number];
  turn?: [number, number, number];
  scale?: number | [number, number, number];
}

type V3 = [number, number, number];

/** Collects shapes with painted vertices into one mesh. Colours are hex; `light` 0..n makes a shape shine by itself. */
export class Sculpt {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];

  /** A turned profile around the y axis: [radius, y, colour, light][]. */
  lathe(profile: [number, number, string, number?][], put: Put = {}, sides = 24, arc = 1) {
    const rows: { p: V3; n: V3; c: Rgb; l: number }[][] = [];
    for (let i = 0; i < profile.length; i++) {
      const [r, y, hex, light = 0] = profile[i];
      const before = profile[Math.max(0, i - 1)], after = profile[Math.min(profile.length - 1, i + 1)];
      const dr = after[0] - before[0], dy = after[1] - before[1], len = Math.hypot(dr, dy) || 1;
      const row = [];
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2 * arc, c = Math.cos(a), s = Math.sin(a);
        row.push({ p: [c * r, y, s * r] as V3, n: [(c * dy) / len, -dr / len, (s * dy) / len] as V3, c: linear(hex), l: light });
      }
      rows.push(row);
    }
    this.grid(rows, put);
    return this;
  }

  sphere(r: number, hex: string, put: Put = {}, light = 0, sides = 16) {
    const profile: [number, number, string, number][] = [];
    for (let i = 0; i <= sides / 2; i++) {
      const a = (i / (sides / 2)) * Math.PI - Math.PI / 2;
      profile.push([Math.cos(a) * r + 0.0001, Math.sin(a) * r, hex, light]);
    }
    return this.lathe(profile, put, sides);
  }

  /** A ring of round section, lying in the x-y plane. */
  ring(radius: number, thick: number, hex: string, put: Put = {}, light = 0, sides = 36, round = 8, arc = 1) {
    const rows: { p: V3; n: V3; c: Rgb; l: number }[][] = [];
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 * arc, row = [];
      for (let k = 0; k <= round; k++) {
        const b = (k / round) * Math.PI * 2, d = radius + Math.cos(b) * thick;
        row.push({ p: [Math.cos(a) * d, Math.sin(a) * d, Math.sin(b) * thick] as V3, n: [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)] as V3, c: linear(hex), l: light });
      }
      rows.push(row);
    }
    this.grid(rows, put);
    return this;
  }

  box(w: number, h: number, d: number, hex: string, put: Put = {}, light = 0) {
    const faces: [V3, V3, V3][] = [[[0, 0, -1], [1, 0, 0], [0, 1, 0]], [[0, 0, 1], [-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, 1], [0, 1, 0]], [[-1, 0, 0], [0, 0, -1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, -1]]];
    for (const [n, u, v] of faces) {
      const row = (t: number) => [-1, 1].map((s) => ({ p: [0, 1, 2].map((k) => ((n[k] + u[k] * s + v[k] * t) * [w, h, d][k]) / 2) as V3, n, c: linear(hex), l: light }));
      this.grid([row(-1), row(1)], put);
    }
    return this;
  }

  /** A flat or cupped blade from a root outwards along y: widths along its length. */
  blade(length: number, widths: number[], hex: [string, string], put: Put = {}, cup = 0.2, light = 0) {
    const rows: { p: V3; n: V3; c: Rgb; l: number }[][] = [];
    const a = linear(hex[0]), b = linear(hex[1]);
    widths.forEach((w, i) => {
      const t = i / (widths.length - 1);
      const c = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t) as Rgb;
      rows.push([-1, -0.5, 0, 0.5, 1].map((s) => ({ p: [s * w, t * length, -(1 - s * s) * cup * w - t * t * cup * length] as V3, n: normal([s * 0.5, t * 0.3, -1]), c, l: light })));
    });
    this.grid(rows, put);
    return this;
  }

  /** A straight bar from a to b. */
  bar(a: V3, b: V3, r: number, hex: string, light = 0, r2 = r) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]);
    const yaw = Math.atan2(d[0], d[2]), pitch = Math.acos(d[1] / len);
    return this.lathe([[r, 0, hex, light], [r2, len, hex, light]], { at: a, turn: [pitch, yaw, 0] }, 8);
  }

  private grid(rows: { p: V3; n: V3; c: Rgb; l: number }[][], put: Put) {
    const start = this.positions.length / 3, cols = rows[0].length;
    for (const row of rows) for (const v of row) {
      const p = place(v.p, put, true), n = normal(place(v.n, put, false));
      this.positions.push(...p);
      this.normals.push(...n);
      this.colors.push(...v.c, v.l);
    }
    for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < cols - 1; k++) {
      const a = start + i * cols + k;
      this.indices.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
    }
  }

  build(name: string, scene: Scene, material: ShaderMaterial) {
    const mesh = new Mesh(name, scene);
    const data = new VertexData();
    data.positions = this.positions;
    data.normals = this.normals;
    data.colors = this.colors;
    data.indices = this.indices;
    data.applyToMesh(mesh);
    mesh.hasVertexAlpha = false;
    mesh.material = material;
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    return mesh;
  }
}

function place(p: V3, put: Put, point: boolean): V3 {
  const s = point ? (typeof put.scale === "number" ? [put.scale, put.scale, put.scale] : (put.scale ?? [1, 1, 1])) : [1, 1, 1];
  let [x, y, z] = [p[0] * s[0], p[1] * s[1], p[2] * s[2]];
  const [rx, ry, rz] = put.turn ?? [0, 0, 0];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const at = point ? (put.at ?? [0, 0, 0]) : [0, 0, 0];
  return [x + at[0], y + at[1], z + at[2]];
}

function normal(v: V3): V3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Painted light: three soft steps from moonlight above, a warm bounce below and a silver edge. */
export function makePaint(scene: Scene) {
  const material = makeShader(scene, "mothPaint", {
    attributes: { position: "vec3", normal: "vec3", color: "vec4" },
    varyings: { v_n: "vec3", v_c: "vec4", v_o: "vec3" },
    uniforms: { u_moon: "vec3", u_moonColor: "vec3", u_under: "vec3", u_edge: "vec3", u_dim: "float", u_time: "float" },
    vertex: `
      POSITION = u_viewProjection * u_world * vec4(a_position, 1.0);
      v_n = (u_world * vec4(a_normal, 0.0)).xyz;
      v_c = a_color;
      v_o = a_position;
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
    `,
    fragment: `
      vec3 n = normalize(v_n);
      if (n.z > 0.0) {
        n = vec3(n.x, n.y, -n.z * 0.4);
      }
      float stroke = noise(v_o.xy * vec2(5.0, 17.0) + v_o.zx * 6.0) - 0.5;
      float l = dot(n, u_moon) * 0.5 + 0.5 + stroke * 0.22;
      float band = smoothstep(0.3, 0.42, l) * 0.34 + smoothstep(0.52, 0.62, l) * 0.34 + smoothstep(0.76, 0.84, l) * 0.42;
      float under = clamp(-n.y * 0.6 + 0.35, 0.0, 1.0);
      float facing = clamp(-n.z, 0.0, 1.0);
      float edge = pow(1.0 - facing, 2.6) * clamp(n.y * 0.6 + 0.6, 0.0, 1.0);
      vec3 base = v_c.rgb * (1.0 + stroke * 0.34);
      vec3 c = base * (u_moonColor * (0.2 + band) + u_under * under) + u_edge * edge * 0.5;
      float shine = v_c.a;
      c = mix(c, v_c.rgb * (0.62 + 0.75 * facing * facing + stroke * 0.12) * shine, clamp(shine, 0.0, 1.0));
      COLOR = vec4(c * u_dim, 1.0);
    `,
  });
  material.setVector3("u_moon", new Vector3(-0.35, 0.8, -0.5).normalize());
  material.setVector3("u_moonColor", new Vector3(1.1, 1.3, 1.9));
  material.setVector3("u_under", new Vector3(0.9, 0.42, 0.2));
  material.setVector3("u_edge", new Vector3(0.32, 0.42, 0.75));
  material.setFloat("u_dim", 1);
  material.setFloat("u_time", 0);
  return material;
}
