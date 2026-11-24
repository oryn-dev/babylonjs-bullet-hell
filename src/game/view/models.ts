import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Sculpt } from "./sculpt";

const IRON = "#2a2744", IRON_LIGHT = "#4a4670", BRASS = "#8a5a2c", BRASS_LIGHT = "#d09a50", GOLD = "#ffc45c", FLAME = "#ffe6a8", AMBER = "#ff8a34";
const ROSE = "#c03a62", ROSE_LIGHT = "#ff8aa4", PLUM = "#4a2258", CREAM = "#f0dcc0", BONE = "#c8c4da", ICE = "#8fe0ff", JADE = "#48c898", LILAC = "#b490ff";
const TAU = Math.PI * 2;

/** Where a model shines, for the glow sprite behind it. */
export interface Model {
  root: TransformNode;
  glow: { color: string; size: number; y: number };
  animate(time: number, charge: number): void;
  dispose(): void;
}

type Build = (scene: Scene, paint: ShaderMaterial) => Model;

function model(scene: Scene, name: string, glow: Model["glow"], animate: (time: number, charge: number) => void, root = new TransformNode(name, scene)): Model {
  return { root, glow, animate, dispose: () => root.dispose(false, false) };
}

const still = () => undefined;
const around = (n: number, fn: (angle: number, i: number) => void) => { for (let i = 0; i < n; i++) fn((i / n) * TAU, i); };

function paperBody(r: number, tall: number, warm = GOLD, deep = AMBER): [number, number, string, number][] {
  const rows: [number, number, string, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, a = t * Math.PI * 0.9 + Math.PI * 0.05;
    const rib = i % 2 ? 1 : 0.965;
    rows.push([Math.sin(a) ** 0.8 * r * rib, -Math.cos(a) * r * tall, i % 2 ? warm : deep, 1.15 - Math.abs(t - 0.45) * 0.7]);
  }
  return rows;
}

const FOES: Record<string, Build> = {
  glow: (scene, paint) => {
    const m = model(scene, "glow", { color: GOLD, size: 1.7, y: 0 }, (t) => { m.root.rotation.z = Math.sin(t * 3) * 0.2; });
    new Sculpt().lathe(paperBody(0.36, 1.1, FLAME, GOLD), {}, 16).lathe([[0.02, 0.5, IRON], [0.2, 0.42, IRON_LIGHT], [0.22, 0.34, IRON]], {}, 12).lathe([[0.18, -0.36, IRON], [0.14, -0.44, IRON_LIGHT], [0.01, -0.5, IRON]], {}, 12)
      .bar([0, -0.48, 0], [0, -0.8, 0], 0.025, ROSE, 0.6).build("glow", scene, paint).parent = m.root;
    return m;
  },
  paper: (scene, paint) => {
    const m = model(scene, "paper", { color: GOLD, size: 3, y: 0 }, (t) => { m.root.rotation.z = Math.sin(t * 1.7) * 0.13; m.root.rotation.y = t * 0.5; });
    const s = new Sculpt().lathe(paperBody(0.8, 0.92), {}, 22);
    s.lathe([[0.05, 0.92, IRON], [0.36, 0.84, IRON_LIGHT], [0.42, 0.7, IRON], [0.4, 0.64, BRASS]], {}, 18).lathe([[0.38, -0.64, BRASS], [0.4, -0.7, IRON], [0.28, -0.8, IRON_LIGHT], [0.02, -0.82, IRON]], {}, 18);
    s.ring(0.14, 0.035, BRASS_LIGHT, { at: [0, 1.04, 0] }).bar([0, -0.8, 0], [0, -1.05, 0], 0.03, BRASS_LIGHT).lathe([[0.02, -1.0, ROSE], [0.11, -1.06, ROSE], [0.08, -1.5, ROSE_LIGHT], [0.01, -1.5, ROSE]], {}, 10);
    s.build("paper", scene, paint).parent = m.root;
    return m;
  },
  rose: (scene, paint) => {
    const m = model(scene, "rose", { color: ROSE_LIGHT, size: 3, y: 0 }, (t) => { m.root.rotation.z = t * 0.35; m.root.scaling.setAll(1 + Math.sin(t * 2.4) * 0.03); });
    const s = new Sculpt();
    for (const [ring, n, len, tilt] of [[0, 8, 0.95, 1.15], [1, 7, 0.78, 0.8], [2, 5, 0.56, 0.42]] as const) around(n, (a) => s.blade(len, [0.08, 0.26, 0.34, 0.3, 0.06], [ring ? "#7a1c44" : PLUM, ring === 2 ? ROSE_LIGHT : ROSE], { turn: [-Math.PI / 2 + tilt, 0, a + ring * 0.4], at: [0, 0, -ring * 0.16] }, 0.3));
    s.sphere(0.27, FLAME, { at: [0, 0, -0.5] }, 1.7);
    around(5, (a) => s.blade(1.15, [0.03, 0.12, 0.02], ["#143c38", "#2f7a64"], { turn: [0, 0, a + 0.3], at: [0, 0, 0.25] }, 0.1));
    s.build("rose", scene, paint).parent = m.root;
    return m;
  },
  rocket: (scene, paint) => {
    const m = model(scene, "rocket", { color: AMBER, size: 1.9, y: -0.4 }, (t) => { m.root.rotation.z = Math.sin(t * 2.6) * 0.12; m.root.rotation.y = t * 1.4; });
    new Sculpt().lathe([[0.01, 0.95, CREAM], [0.34, 0.42, ROSE], [0.27, 0.42, PLUM], [0.27, 0.2, ROSE], [0.27, 0.14, GOLD, 0.6], [0.27, -0.1, ROSE], [0.27, -0.16, GOLD, 0.6], [0.27, -0.4, ROSE], [0.2, -0.46, IRON], [0.12, -0.5, FLAME, 2]], {}, 16)
      .bar([0.24, 0.1, 0.1], [0.24, -1.3, 0.1], 0.04, BRASS).build("rocket", scene, paint).parent = m.root;
    return m;
  },
  cracker: (scene, paint) => {
    const m = model(scene, "cracker", { color: GOLD, size: 1.8, y: 0 }, (t) => { m.root.rotation.z = Math.sin(t * 5) * 0.5; });
    const s = new Sculpt().bar([0, 0.9, 0], [0, -0.7, 0], 0.03, BRASS);
    for (let i = 0; i < 6; i++) for (const side of [-1, 1]) s.lathe([[0.01, 0.2, GOLD, 1], [0.11, 0.18, ROSE], [0.11, -0.16, ROSE], [0.01, -0.18, PLUM]], { at: [side * 0.2, 0.55 - i * 0.25, 0], turn: [0, 0, side * 0.9] }, 10);
    s.sphere(0.17, FLAME, { at: [0, -0.82, 0] }, 2);
    s.build("cracker", scene, paint).parent = m.root;
    return m;
  },
  kite: (scene, paint) => {
    const root = new TransformNode("kite", scene);
    const tails: TransformNode[] = [];
    const s = new Sculpt().lathe([[0.02, -0.75, ROSE_LIGHT, 0.9], [0.34, -0.5, ROSE, 0.7], [0.48, -0.1, ROSE_LIGHT, 0.9], [0.5, 0.1, ROSE, 0.7], [0.42, 0.4, ROSE_LIGHT, 0.9], [0.3, 0.6, CREAM, 0.8]], { turn: [0, 0, 0], scale: [1, 1, 0.6] }, 18);
    s.ring(0.31, 0.06, BRASS_LIGHT, { at: [0, 0.62, 0], turn: [Math.PI / 2, 0, 0] });
    for (const side of [-1, 1]) { s.sphere(0.14, CREAM, { at: [side * 0.3, 0.32, -0.22] }, 0.8).sphere(0.07, "#140a20", { at: [side * 0.32, 0.33, -0.34] }); s.blade(0.6, [0.06, 0.24, 0.28, 0.04], [ROSE, GOLD], { at: [side * 0.42, 0, 0], turn: [0, 0, side * -1.9] }, 0.2, 0.35); }
    s.build("kite-body", scene, paint).parent = root;
    for (let i = 0; i < 3; i++) {
      const node = new TransformNode("tail", scene);
      node.parent = root;
      node.position.set((i - 1) * 0.16, -0.65, 0);
      new Sculpt().blade(1.1, [0.1, 0.2, 0.16, 0.22, 0.02], [ROSE, GOLD], { turn: [0, 0, Math.PI] }, 0.05, 0.3).build("tail", scene, paint).parent = node;
      tails.push(node);
    }
    return model(scene, "kite", { color: ROSE_LIGHT, size: 2.5, y: 0 }, (t) => { root.rotation.z = Math.sin(t * 2) * 0.22; tails.forEach((n, i) => (n.rotation.z = Math.sin(t * 5 + i * 1.3) * 0.4)); }, root);
  },
  mortar: (scene, paint) => {
    const m = model(scene, "mortar", { color: AMBER, size: 3, y: 0.5 }, (t) => { m.root.rotation.y = Math.sin(t) * 0.35; });
    const s = new Sculpt();
    for (const [x, y, r] of [[0, 0.1, 0.34], [-0.55, -0.05, 0.27], [0.55, -0.05, 0.27]] as const) s.lathe([[r * 0.3, 0.72, FLAME, 2], [r * 0.82, 0.74, AMBER, 1.2], [r, 0.72, BRASS_LIGHT], [r, 0.56, BRASS], [r * 0.92, 0.5, PLUM], [r * 0.92, 0.1, ROSE], [r * 0.92, 0.02, GOLD, 0.5], [r * 0.92, -0.4, PLUM], [r, -0.5, BRASS], [r, -0.62, BRASS]], { at: [x, y, 0], turn: [0, 0, -x * 0.35] }, 18);
    s.box(1.7, 0.2, 0.5, BRASS, { at: [0, -0.58, 0] }).box(1.5, 0.1, 0.6, BRASS_LIGHT, { at: [0, -0.46, 0] });
    s.build("mortar", scene, paint).parent = m.root;
    return m;
  },
  buoy: (scene, paint) => {
    const m = model(scene, "buoy", { color: ICE, size: 2.5, y: 0.5 }, (t) => { m.root.rotation.z = Math.sin(t * 1.6) * 0.28; });
    const s = new Sculpt().lathe([[0.02, -0.85, IRON], [0.4, -0.7, "#7a2638"], [0.66, -0.3, "#b04050"], [0.68, -0.12, CREAM], [0.6, 0.0, CREAM], [0.4, 0.06, IRON_LIGHT], [0.1, 0.08, IRON]], {}, 22);
    around(4, (a) => s.bar([Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42], [Math.cos(a) * 0.2, 0.75, Math.sin(a) * 0.2], 0.035, IRON_LIGHT));
    s.sphere(0.24, ICE, { at: [0, 0.48, 0] }, 1.7).lathe([[0.3, 0.74, IRON_LIGHT], [0.22, 0.86, IRON], [0.02, 1.02, IRON_LIGHT]], {}, 14);
    s.build("buoy", scene, paint).parent = m.root;
    return m;
  },
  gull: (scene, paint) => {
    const root = new TransformNode("gull", scene);
    new Sculpt().lathe([[0.02, -0.55, BONE], [0.17, -0.25, "#8e9cc4"], [0.2, 0.1, "#a6b2d6"], [0.14, 0.38, "#8e9cc4"], [0.02, 0.62, GOLD, 0.6]], { scale: [1, 1, 0.8] }, 14).sphere(0.16, FLAME, { at: [0, -0.5, -0.1] }, 2).build("gull", scene, paint).parent = root;
    const wings = [-1, 1].map((side) => {
      const node = new TransformNode("wing", scene);
      node.parent = root;
      new Sculpt().blade(1.0, [0.2, 0.28, 0.2, 0.02], ["#b4c0e0", "#4a5888"], { turn: [0, 0, side * -1.45], at: [side * 0.1, 0.05, 0] }, 0.12).build("wing", scene, paint).parent = node;
      return node;
    });
    return model(scene, "gull", { color: GOLD, size: 1.0, y: -0.4 }, (t) => { wings.forEach((w, i) => (w.rotation.y = (i ? 1 : -1) * (0.2 + Math.sin(t * 7) * 0.5))); }, root);
  },
  storm: (scene, paint) => {
    const m = model(scene, "storm", { color: GOLD, size: 3, y: 0 }, (t) => { m.root.rotation.z = Math.sin(t * 1.3) * 0.16; m.root.rotation.y = Math.sin(t * 0.8) * 0.5; });
    const s = new Sculpt().lathe([[0.02, -0.95, IRON], [0.5, -0.9, IRON], [0.56, -0.72, IRON_LIGHT], [0.4, -0.56, BRASS], [0.36, -0.5, BRASS_LIGHT]], {}, 20);
    s.lathe([[0.36, -0.5, AMBER, 0.9], [0.5, -0.2, GOLD, 1.2], [0.48, 0.15, FLAME, 1.4], [0.34, 0.42, GOLD, 1]], {}, 20);
    s.lathe([[0.4, 0.42, BRASS], [0.5, 0.48, IRON_LIGHT], [0.42, 0.62, IRON], [0.2, 0.74, IRON_LIGHT], [0.2, 0.86, BRASS], [0.02, 0.92, BRASS]], {}, 18);
    around(5, (a) => s.bar([Math.cos(a) * 0.56, -0.5, Math.sin(a) * 0.56], [Math.cos(a) * 0.5, 0.46, Math.sin(a) * 0.5], 0.035, IRON));
    s.ring(0.54, 0.03, IRON, { turn: [Math.PI / 2, 0, 0] }).ring(0.34, 0.035, IRON_LIGHT, { at: [0, 0.95, 0] }, 0, 24, 6, 0.5);
    s.build("storm", scene, paint).parent = m.root;
    return m;
  },
  gear: (scene, paint) => {
    const m = model(scene, "gear", { color: AMBER, size: 2.5, y: 0 }, (t) => { m.root.rotation.z = t * 1.1; m.root.rotation.x = Math.sin(t * 0.7) * 0.2; });
    const s = cog(new Sculpt(), 0.82, 10, 0.16);
    s.sphere(0.25, FLAME, { at: [0, 0, -0.1] }, 1.7).ring(0.3, 0.05, BRASS_LIGHT, { at: [0, 0, -0.1] });
    s.build("gear", scene, paint).parent = m.root;
    return m;
  },
  beetle: (scene, paint) => {
    const root = new TransformNode("beetle", scene);
    const s = new Sculpt().lathe([[0.02, -0.55, BRASS], [0.3, -0.35, BRASS_LIGHT], [0.38, 0, BRASS], [0.3, 0.28, BRASS_LIGHT], [0.16, 0.42, IRON], [0.2, 0.52, IRON_LIGHT], [0.02, 0.68, IRON]], { scale: [1, 1, 0.65] }, 16);
    s.bar([0, 0.4, -0.27], [0, -0.5, -0.24], 0.022, IRON).sphere(0.1, JADE, { at: [0.12, 0.54, -0.12] }, 1.8).sphere(0.1, JADE, { at: [-0.12, 0.54, -0.12] }, 1.8);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) s.bar([side * 0.3, 0.2 - i * 0.25, 0], [side * 0.62, 0.32 - i * 0.34, 0.1], 0.03, IRON_LIGHT);
    s.build("beetle", scene, paint).parent = root;
    const key = new TransformNode("key", scene);
    key.parent = root;
    key.position.set(0, -0.1, -0.35);
    new Sculpt().ring(0.13, 0.04, JADE, { at: [-0.15, 0, 0] }, 0.5).ring(0.13, 0.04, JADE, { at: [0.15, 0, 0] }, 0.5).build("key", scene, paint).parent = key;
    return model(scene, "beetle", { color: JADE, size: 1.6, y: 0.4 }, (t) => { key.rotation.z = t * 5; root.rotation.z = Math.PI + Math.sin(t * 4) * 0.15; }, root);
  },
  pendulum: (scene, paint) => {
    const root = new TransformNode("pendulum", scene);
    const s = new Sculpt().bar([0, 2.1, 0], [0, 0.5, 0], 0.045, BRASS_LIGHT);
    s.lathe([[0.02, -0.16, BRASS], [0.6, -0.12, BRASS_LIGHT], [0.78, 0, BRASS], [0.6, 0.12, BRASS_LIGHT], [0.02, 0.16, BRASS]], { turn: [Math.PI / 2, 0, 0] }, 28).ring(0.62, 0.05, IRON, { at: [0, 0, -0.1] }).sphere(0.32, JADE, { at: [0, 0, -0.1] }, 1.5);
    around(8, (a) => s.sphere(0.06, GOLD, { at: [Math.cos(a) * 0.47, Math.sin(a) * 0.47, -0.16] }, 1.2));
    s.build("pendulum", scene, paint).parent = root;
    return model(scene, "pendulum", { color: JADE, size: 2.8, y: 0 }, (t) => { root.rotation.z = Math.sin(t * 2.6) * 0.3; }, root);
  },
  star: (scene, paint) => {
    const m = model(scene, "star", { color: LILAC, size: 2.2, y: 0 }, (t) => { m.root.rotation.z = t * 0.7; m.root.rotation.y = Math.sin(t) * 0.4; });
    const s = new Sculpt();
    around(5, (a) => s.blade(0.72, [0.26, 0.2, 0.1, 0.01], [LILAC, "#f4ecff"], { turn: [0, 0, a] }, 0.35, 0.8).blade(0.72, [0.26, 0.2, 0.1, 0.01], [LILAC, "#f4ecff"], { turn: [0, Math.PI, a] }, 0.35, 0.8));
    s.sphere(0.24, "#fff4ff", {}, 1.8).ring(0.8, 0.02, BONE, {}, 0.5);
    s.build("star", scene, paint).parent = m.root;
    return m;
  },
  comet: (scene, paint) => {
    const m = model(scene, "comet", { color: GOLD, size: 2.1, y: 0 }, (t) => { m.root.rotation.z = t * 3; });
    const s = new Sculpt();
    s.sphere(0.26, FLAME, {}, 2);
    around(7, (a, i) => s.blade(i % 2 ? 0.55 : 0.75, [0.13, 0.16, 0.08, 0.01], [AMBER, GOLD], { turn: [0, 0.4, a] }, 0.2, 0.7));
    s.build("comet", scene, paint).parent = m.root;
    return m;
  },
  halo: (scene, paint) => {
    const root = new TransformNode("halo", scene);
    new Sculpt().sphere(0.42, "#e6e0ff", {}, 0.9, 20).build("halo-core", scene, paint).parent = root;
    const rings = [0.72, 0.9].map((r, i) => {
      const node = new TransformNode("ring", scene);
      node.parent = root;
      const s = new Sculpt().ring(r, 0.04, i ? LILAC : GOLD, {}, 0.7);
      around(i ? 6 : 4, (a) => s.sphere(0.085, i ? "#f4ecff" : FLAME, { at: [Math.cos(a) * r, Math.sin(a) * r, 0] }, 1.4));
      s.build("ring", scene, paint).parent = node;
      return node;
    });
    return model(scene, "halo", { color: LILAC, size: 3, y: 0 }, (t) => { rings[0].rotation.set(Math.sin(t) * 0.5, 0, t * 1.3); rings[1].rotation.set(0.5, t * 0.8, -t * 0.7); }, root);
  },
};

function cog(s: Sculpt, r: number, teeth: number, depth: number, hex = BRASS, light = BRASS_LIGHT) {
  s.ring(r * 0.78, r * 0.12, hex, { scale: [1, 1, 0.8] }, 0, 36, 8);
  around(teeth, (a) => s.box(r * 0.24, r * 0.26, depth, light, { at: [Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, 0], turn: [0, 0, a + Math.PI / 2] }));
  around(5, (a) => s.bar([Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, 0], [Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, 0], r * 0.07, light));
  return s;
}

const BOSSES: Record<string, Build> = {
  wick: (scene, paint) => {
    const root = new TransformNode("wick", scene);
    const s = new Sculpt();
    const side = (a: number, r: number, y: number): [number, number, number] => [Math.cos(a) * r, y, Math.sin(a) * r];
    s.lathe([[0.02, -1.75, IRON_LIGHT], [0.2, -1.62, IRON], [0.12, -1.5, IRON_LIGHT], [0.7, -1.36, IRON], [0.98, -1.28, IRON_LIGHT], [0.98, -1.16, IRON], [0.84, -1.1, BRASS]], {}, 8);
    s.lathe([[1.2, 0.72, BRASS], [1.48, 0.76, IRON_LIGHT], [1.4, 0.9, IRON], [0.95, 1.12, IRON_LIGHT], [0.6, 1.42, IRON], [0.42, 1.5, IRON_LIGHT], [0.46, 1.62, BRASS], [0.2, 1.78, BRASS_LIGHT], [0.14, 1.9, IRON], [0.02, 2.05, BRASS_LIGHT]], {}, 8);
    around(8, (a) => {
      s.bar(side(a, 0.86, -1.12), side(a, 1.24, 0.74), 0.06, IRON, 0, 0.07);
      s.sphere(0.1, BRASS_LIGHT, { at: side(a, 1.42, 0.78) }, 0, 10);
      s.blade(0.5, [0.1, 0.14, 0.02], [IRON, BRASS], { at: side(a, 1.42, 0.76), turn: [Math.PI * 0.9, Math.PI / 2 - a, 0] }, 0.2);
    });
    s.ring(0.95, 0.035, BRASS, { at: [0, -0.55, 0], turn: [Math.PI / 2, 0, 0] }).ring(1.12, 0.035, BRASS, { at: [0, 0.2, 0], turn: [Math.PI / 2, 0, 0] });
    s.ring(0.3, 0.06, IRON_LIGHT, { at: [0, 2.3, 0] });
    s.build("wick-frame", scene, paint).parent = root;
    const glass = new Sculpt().lathe([[0.8, -1.1, "#a83a1e", 0.7], [0.92, -0.7, "#e8742a", 0.85], [1.02, -0.2, AMBER, 0.95], [1.12, 0.3, "#d8662a", 0.8], [1.18, 0.74, "#7a2430", 0.6]], {}, 8);
    glass.build("wick-glass", scene, paint).parent = root;
    // The flame stands in front of the glass, so it reads as an eye that follows the moth.
    const flame = new TransformNode("flame", scene);
    flame.parent = root;
    flame.position.set(0, -0.3, -1.05);
    new Sculpt().lathe([[0.02, -0.42, GOLD, 1.6], [0.3, -0.26, GOLD, 1.9], [0.4, 0, FLAME, 2.2], [0.28, 0.32, FLAME, 2.2], [0.1, 0.66, GOLD, 1.8], [0.01, 0.85, AMBER, 1.3]], { scale: [1, 1, 0.4] }, 14).sphere(0.15, "#3a0c14", { at: [0, -0.06, -0.2], scale: [0.6, 1.2, 0.5] }).build("flame", scene, paint).parent = flame;
    const arms = [-1, 1].map((x) => {
      const node = new TransformNode("arm", scene);
      node.parent = root;
      node.position.set(x * 1.42, 0.72, 0);
      new Sculpt().bar([0, 0, 0], [0, -0.5, 0], 0.03, IRON_LIGHT).lathe(paperBody(0.36, 1.05), { at: [0, -0.9, 0] }, 14).lathe([[0.02, -0.46, IRON], [0.2, -0.52, IRON_LIGHT], [0.2, -0.6, IRON]], {}, 12).build("arm", scene, paint).parent = node;
      return node;
    });
    return model(scene, "wick", { color: "#ffa040", size: 5.2, y: -0.2 }, (t, charge) => {
      root.rotation.z = Math.sin(t * 0.9) * 0.06;
      root.rotation.y = Math.sin(t * 0.5) * 0.25;
      flame.scaling.set(1 + Math.sin(t * 9) * 0.05 + charge * 0.2, 1 + Math.sin(t * 13) * 0.08 + charge * 0.5, 1);
      flame.rotation.y = -root.rotation.y;
      arms.forEach((arm, i) => (arm.rotation.z = Math.sin(t * 1.6 + i) * 0.24));
    }, root);
  },
  pinwheel: (scene, paint) => {
    const root = new TransformNode("pinwheel", scene);
    const wheel = new TransformNode("wheel", scene), inner = new TransformNode("inner", scene);
    wheel.parent = inner.parent = root;
    const s = new Sculpt().ring(1.55, 0.09, BRASS, {}).ring(1.05, 0.05, BRASS_LIGHT, {});
    around(12, (a) => {
      const c = Math.cos(a), n = Math.sin(a);
      s.lathe([[0.02, 0.5, CREAM], [0.16, 0.26, ROSE], [0.13, 0.26, PLUM], [0.13, -0.05, ROSE], [0.13, -0.1, GOLD, 0.8], [0.13, -0.3, ROSE], [0.07, -0.36, FLAME, 2]], { at: [c * 1.6, n * 1.6, -0.1], turn: [0, 0, a] }, 10);
      s.bar([c * 0.4, n * 0.4, 0], [c * 1.52, n * 1.52, 0], 0.045, BRASS);
    });
    s.build("wheel", scene, paint).parent = wheel;
    const fan = new Sculpt();
    around(16, (a, i) => fan.blade(1.02, [0.08, 0.17, 0.26, 0.2], [i % 2 ? PLUM : "#8a1e4a", i % 2 ? ROSE : GOLD], { turn: [0.16, 0, a], at: [0, 0, -0.22] }, 0.25, i % 2 ? 0 : 0.25));
    fan.build("fan", scene, paint).parent = inner;
    const face = new Sculpt().sphere(0.46, CREAM, { at: [0, 0, -0.5], scale: [1, 1, 0.45] }, 0.35, 20).ring(0.48, 0.05, BRASS_LIGHT, { at: [0, 0, -0.5] });
    for (const x of [-1, 1]) face.sphere(0.12, "#2a0c28", { at: [x * 0.17, 0.06, -0.68], scale: [1.1, 0.45, 0.4], turn: [0, 0, x * -0.35] }).sphere(0.09, ROSE, { at: [x * 0.26, -0.12, -0.63], scale: [1.2, 0.7, 0.3] }, 0.5);
    face.sphere(0.07, ROSE, { at: [0, -0.19, -0.7], scale: [1.1, 0.6, 0.4] }, 0.4);
    face.build("face", scene, paint).parent = root;
    return model(scene, "pinwheel", { color: "#ff6a6a", size: 5, y: 0 }, (t, charge) => {
      wheel.rotation.z = t * 1.1 + charge * 3;
      inner.rotation.z = -t * 0.6;
      root.rotation.y = Math.sin(t * 0.7) * 0.22;
      root.rotation.x = Math.sin(t * 0.9) * 0.1;
    }, root);
  },
  keeper: (scene, paint) => {
    const root = new TransformNode("keeper", scene);
    const s = new Sculpt();
    s.lathe([[0.9, -2.2, "#4a5678"], [0.94, -1.5, "#8490b0"], [1.3, -1.36, IRON_LIGHT], [1.36, -1.24, IRON], [1.0, -1.16, IRON_LIGHT], [1.0, -1.0, "#a83244"]], {}, 24);
    s.lathe([[1.06, 0.86, "#a83244"], [1.34, 0.9, IRON_LIGHT], [1.2, 1.1, "#a83244"], [0.8, 1.45, "#c8485a"], [0.3, 1.7, "#8a2438"], [0.2, 1.76, BRASS], [0.24, 1.9, BRASS_LIGHT], [0.02, 2.06, BRASS]], {}, 24);
    around(8, (a) => s.bar([Math.cos(a) * 1.0, -1.0, Math.sin(a) * 1.0], [Math.cos(a) * 1.05, 0.88, Math.sin(a) * 1.05], 0.05, IRON));
    around(14, (a) => s.bar([Math.cos(a) * 1.34, -1.26, Math.sin(a) * 1.34], [Math.cos(a) * 1.4, -0.82, Math.sin(a) * 1.4], 0.025, IRON_LIGHT));
    s.ring(1.4, 0.035, IRON_LIGHT, { at: [0, -0.82, 0], turn: [Math.PI / 2, 0, 0] });
    s.build("keeper-room", scene, paint).parent = root;
    const lens = new TransformNode("lens", scene);
    lens.parent = root;
    const l = new Sculpt().sphere(0.4, "#fff4d0", {}, 2.2, 18);
    for (const [r, y] of [[0.78, 0], [0.7, 0.3], [0.7, -0.3], [0.52, 0.58], [0.52, -0.58]] as const) l.ring(r, 0.07, ICE, { at: [0, y, 0], turn: [Math.PI / 2, 0, 0] }, 0.75);
    for (const x of [-1, 1]) l.ring(0.42, 0.07, GOLD, { at: [0, 0, x * 0.75] }, 1.3).ring(0.24, 0.06, FLAME, { at: [0, 0, x * 0.8] }, 1.6);
    l.build("lens", scene, paint).parent = lens;
    return model(scene, "keeper", { color: "#ffe0a0", size: 5.4, y: 0 }, (t, charge) => {
      lens.rotation.y = t * (1.2 + charge * 2);
      root.rotation.z = Math.sin(t * 0.8) * 0.03;
    }, root);
  },
  thirteen: (scene, paint) => {
    const root = new TransformNode("thirteen", scene);
    const gears = [[-1.25, 1.2, 1.0, 12, 1], [1.35, 1.05, 0.85, 10, -1.2], [1.3, -1.25, 0.95, 12, 1], [-1.3, -1.15, 0.8, 10, -1.25]].map(([x, y, r, n, w]) => {
      const node = new TransformNode("cog", scene);
      node.parent = root;
      node.position.set(x, y, 0.5);
      cog(new Sculpt(), r, n, 0.2, "#5a3a26", BRASS).build("cog", scene, paint).parent = node;
      return { node, w };
    });
    const s = new Sculpt().lathe([[0.02, -0.14, "#e8dcc0"], [1.45, -0.12, "#f2e8cc"], [1.5, -0.1, BRASS], [1.72, -0.14, BRASS_LIGHT], [1.78, 0, BRASS], [1.6, 0.2, IRON], [0.02, 0.22, IRON]], { turn: [-Math.PI / 2, 0, 0], scale: 1 }, 48);
    // Thirteen marks; the last one shines.
    for (let i = 0; i < 13; i++) { const a = (i / 13) * TAU + Math.PI / 2; s.box(0.09, i === 0 ? 0.36 : 0.24, 0.06, i === 0 ? JADE : IRON, { at: [Math.cos(a) * 1.2, Math.sin(a) * 1.2, -0.17], turn: [0, 0, a - Math.PI / 2] }, i === 0 ? 1.5 : 0); }
    s.ring(0.86, 0.02, BRASS, { at: [0, 0, -0.14] });
    s.build("face", scene, paint).parent = root;
    const hands = [[0.72, 0.09], [1.12, 0.06]].map(([len, w]) => {
      const node = new TransformNode("hand", scene);
      node.parent = root;
      node.position.z = -0.24;
      new Sculpt().blade(len, [w, w * 1.2, w * 1.9, 0.01], ["#241a34", "#241a34"], {}, 0.1).ring(w * 1.7, 0.03, "#241a34", { at: [0, len * 0.55, 0] }).build("hand", scene, paint).parent = node;
      return node;
    });
    new Sculpt().sphere(0.16, JADE, { at: [0, 0, -0.3] }, 1.5).ring(0.2, 0.05, BRASS_LIGHT, { at: [0, 0, -0.28] }).build("pin", scene, paint).parent = root;
    return model(scene, "thirteen", { color: "#ffb060", size: 5.2, y: 0 }, (t, charge) => {
      const tick = Math.floor(t * 1.2) + Math.min(1, (t * 1.2 % 1) * 6);
      hands[1].rotation.z = -tick * 0.42 - charge * 6;
      hands[0].rotation.z = -tick * 0.06 + charge * 4;
      gears.forEach(({ node, w }) => (node.rotation.z = tick * 0.3 * w));
      root.rotation.y = Math.sin(t * 0.6) * 0.18;
    }, root);
  },
  moon: (scene) => {
    // The moon itself is drawn by the actors with its own painted texture.
    const root = new TransformNode("moon", scene);
    return model(scene, "moon", { color: "#c8d4ff", size: 7, y: 0 }, still, root);
  },
};

export function buildFoe(name: string, scene: Scene, paint: ShaderMaterial) {
  return (FOES[name] ?? FOES.glow)(scene, paint);
}

export function buildBoss(name: string, scene: Scene, paint: ShaderMaterial) {
  return (BOSSES[name] ?? BOSSES.wick)(scene, paint);
}

