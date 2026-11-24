import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { PREMULTIPLIED } from "./batch";
import { makeShader } from "./shader";

interface Part {
  /** In the 1024 sheet. */
  rect: [number, number, number, number];
  root: [number, number];
  scale: number;
}

const FORE: Part = { rect: [0, 0, 512, 512], root: [12, 412], scale: 462 };
const HIND: Part = { rect: [512, 0, 512, 512], root: [12, 70], scale: 400 };
const BODY: Part = { rect: [0, 512, 512, 512], root: [256, 278], scale: 400 };

/** The moth: four painted wings that really turn, and a body. */
export class MothView {
  readonly root: TransformNode;
  private tilt: TransformNode;
  private fore: TransformNode[] = [];
  private hind: TransformNode[] = [];
  private material: ShaderMaterial;
  private beat = 0;
  private bank = 0;
  private lift = 0;

  constructor(scene: Scene, url: string) {
    const texture = new Texture(url, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 4;
    this.material = makeShader(scene, "mothWing", {
      attributes: { position: "vec3", uv: "vec2" },
      varyings: { v_uv: "vec2", v_side: "float" },
      uniforms: { u_tint: "vec4", u_dim: "float" },
      samplers: ["tex"],
      blend: PREMULTIPLIED,
      vertex: `
        vec4 n = u_world * vec4(0.0, 0.0, -1.0, 0.0);
        POSITION = u_viewProjection * u_world * vec4(a_position, 1.0);
        v_uv = a_uv;
        v_side = clamp(-n.z / 0.7, 0.0, 1.0) * 0.5 + 0.5 + n.y * 0.2;
      `,
      fragment: `
        vec4 t = TEX(tex, v_uv);
        vec3 rgb = pow(max(t.rgb, vec3(0.0, 0.0, 0.0)), vec3(2.2, 2.2, 2.2)) * u_tint.rgb * v_side;
        float a = t.a * u_tint.a;
        COLOR = vec4(rgb * a * u_dim, a);
      `,
    });
    this.material.setTexture("tex", texture);
    this.material.setFloat("u_dim", 1);
    this.root = new TransformNode("moth", scene);
    this.tilt = new TransformNode("moth-tilt", scene);
    this.tilt.parent = this.root;
    for (const side of [1, -1]) {
      this.hind.push(this.wing(scene, HIND, side, "hindwing", 0.02, [0.03, -0.06], 11));
      this.fore.push(this.wing(scene, FORE, side, "forewing", -0.02, [0.02, 0.08], 12));
    }
    const body = card(scene, BODY, "moth-body", this.material, 13);
    body.parent = this.tilt;
    body.position.z = -0.06;
    this.root.scaling.setAll(0.8);
  }

  private wing(scene: Scene, part: Part, side: number, name: string, z: number, at: [number, number], order: number) {
    const hinge = new TransformNode(name, scene);
    hinge.parent = this.tilt;
    hinge.position.set(side * at[0], at[1], z);
    const mesh = card(scene, part, name, this.material, order);
    mesh.parent = hinge;
    mesh.scaling.x = side;
    return hinge;
  }

  update(dt: number, x: number, y: number, vx: number, vy: number, opts: { slow: boolean; visible: boolean; alpha: number; glow: number; still?: boolean }) {
    this.root.setEnabled(opts.visible);
    if (!opts.visible) return;
    this.root.position.set(x, y, -0.3);
    const pace = opts.slow ? 8.5 : 11.5 + Math.max(0, vy) * 0.35;
    this.beat += dt * pace;
    this.bank += (Math.max(-1, Math.min(1, vx / 9)) - this.bank) * Math.min(1, dt * 10);
    this.lift += (Math.max(-1, Math.min(1, vy / 9)) - this.lift) * Math.min(1, dt * 8);
    this.tilt.rotation.set(-0.2 - this.lift * 0.25, -this.bank * 0.5, -this.bank * 0.28);
    const open = opts.slow ? 0.3 : 0.42;
    const flap = Math.sin(this.beat) * open + 0.32;
    const lag = Math.sin(this.beat - 0.7) * open * 0.8 + 0.28;
    this.fore.forEach((hinge, i) => {
      const side = i ? -1 : 1;
      hinge.rotation.y = side * flap;
      hinge.rotation.z = side * (0.08 - this.lift * 0.16);
    });
    this.hind.forEach((hinge, i) => {
      const side = i ? -1 : 1;
      hinge.rotation.y = side * lag;
      hinge.rotation.z = side * (-0.06 + this.lift * 0.14 + Math.sin(this.beat * 0.5) * 0.03);
    });
    const g = 1.05 + opts.glow * 0.6;
    this.material.setVector4("u_tint", new Vector4(g * 0.92, g * 0.97, g * 1.1, opts.alpha));
  }
}

function card(scene: Scene, part: Part, name: string, material: ShaderMaterial, order: number) {
  const [rx, ry, rw, rh] = part.rect, [ox, oy] = part.root, s = part.scale;
  const x0 = -ox / s, x1 = (rw - ox) / s, y0 = -(rh - oy) / s, y1 = oy / s;
  const u0 = rx / 1024, u1 = (rx + rw) / 1024, v0 = ry / 1024, v1 = (ry + rh) / 1024;
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0];
  data.uvs = [u0, v1, u1, v1, u1, v0, u0, v0];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.applyToMesh(mesh);
  mesh.material = material;
  mesh.renderingGroupId = 1;
  mesh.alphaIndex = order;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  return mesh;
}
