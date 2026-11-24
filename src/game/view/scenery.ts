import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import atlas from "./atlas.json";
import { Batch, PREMULTIPLIED } from "./batch";
import { linear, type Rgb } from "./color";
import { DISTANCE, type Frame } from "./frame";
import { type Layer, type Place, PLACES } from "./places";
import { makeShader } from "./shader";
import { createRng } from "../sim/rng";

const RECTS = atlas as unknown as Record<string, [number, number, number, number, number]>;
const SKY_Z = 110;

interface Card {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  span: number;
  uv: [number, number, number, number];
  layer: Layer;
  phase: number;
  turn: number;
}

/** The painted world behind the field: a sky, a moon and cards at real depths that sink past as the moth climbs. */
export class Scenery {
  scroll = 0;
  /** 0 hides the place in its own mist; used between stages. */
  shown = 0;
  /** 1 lifts the moon out of the picture, for the stage where it is the boss. */
  moonAway = 0;
  private moonLift = 0;
  /** 0 to 1: the moon comes to the middle and fills the sky, for the ending. */
  moonNear = 0;
  private cards: Card[] = [];
  private place: Place = PLACES[0];
  private batch: Batch;
  private cardMaterial: ShaderMaterial;
  private skyMaterial: ShaderMaterial;
  private sky: Mesh;
  private veil: Mesh;
  private veilMaterial: ShaderMaterial;
  private textures = new Map<string, Texture>();
  private time = 0;
  private moonSize = 4;
  private moonAt: [number, number] = [0, 0];
  private leanX = 0;
  private leanY = 0;
  private started = 0;

  constructor(private scene: Scene, private frame: Frame, private load: (path: string) => string) {
    this.skyMaterial = makeSky(scene);
    this.sky = quad(scene, "backdrop");
    this.sky.material = this.skyMaterial;
    this.sky.position.z = SKY_Z;
    this.sky.alphaIndex = 0;

    this.cardMaterial = makeCards(scene);
    this.batch = new Batch(scene, "scenery", 420, this.cardMaterial, 0);
    this.batch.mesh.alphaIndex = 10;

    this.veilMaterial = makeVeil(scene);
    this.veil = quad(scene, "veil");
    this.veil.material = this.veilMaterial;
    this.veil.alphaIndex = 50;
    for (const mesh of [this.sky, this.veil]) mesh.renderingGroupId = 0;
    this.skyMaterial.setTexture("moonTex", this.texture("moon"));
    this.go(0);
  }

  ready(place: number) {
    return this.texture(sheetOf(PLACES[place])).isReady();
  }

  private texture(id: string) {
    let texture = this.textures.get(id);
    if (!texture) {
      texture = new Texture(this.load(`art/${id}.webp`), this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
      texture.anisotropicFilteringLevel = 2;
      texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      this.textures.set(id, texture);
    }
    return texture;
  }

  preload(place: number) {
    if (PLACES[place]) this.texture(sheetOf(PLACES[place]));
  }

  go(index: number) {
    const place = (this.place = PLACES[index % PLACES.length]);
    this.cardMaterial.setTexture("tex", this.texture(sheetOf(place)));
    const { sky } = place;
    this.skyMaterial.setVector3("u_top", v3(linear(sky.top)));
    this.skyMaterial.setVector3("u_mid", v3(linear(sky.mid)));
    this.skyMaterial.setVector3("u_low", v3(linear(sky.low)));
    this.skyMaterial.setVector3("u_cloud", v3(linear(sky.cloud)));
    this.skyMaterial.setVector3("u_lit", v3(linear(sky.lit)));
    this.skyMaterial.setFloat("u_stars", sky.stars);
    this.skyMaterial.setFloat("u_cover", sky.cover);
    this.veilMaterial.setVector3("u_color", v3(linear(place.veil)));
    this.moonSize = place.moon.size;
    this.moonAt = place.moon.at;
    this.cards = build(place);
    this.started = this.scroll;
  }

  update(dt: number, mothX: number, mothY: number, speed: number) {
    this.time += dt;
    this.scroll += dt * this.place.speed * speed;
    this.leanX += (mothX * 0.022 - this.leanX) * Math.min(1, dt * 3);
    this.leanY += (mothY * 0.012 - this.leanY) * Math.min(1, dt * 3);
    const { frame, place } = this;

    const far = (DISTANCE + SKY_Z) / DISTANCE;
    this.sky.scaling.set(frame.halfWidth * far * 1.04, frame.halfHeight * far * 1.04, 1);
    this.sky.position.y = frame.camera.position.y;
    this.skyMaterial.setFloat("u_time", this.time);
    this.skyMaterial.setFloat("u_aspect", frame.halfWidth / frame.halfHeight);
    this.skyMaterial.setFloat("u_scroll", this.scroll * 0.006);
    this.skyMaterial.setFloat("u_shown", this.shown);
    this.moonLift += (this.moonAway - this.moonLift) * Math.min(1, dt * 1.2);
    const near = this.moonNear * this.moonNear * (3 - 2 * this.moonNear);
    const moonScale = frame.portrait ? 0.66 : 1;
    this.skyMaterial.setVector3("u_moon", new Vector3(this.moonAt[0] * (frame.portrait ? 0.34 : 1) * (1 - near) - this.leanX * 0.05, this.moonAt[1] * (1 - near) + 0.2 * near + this.moonLift * 1.2 * (1 - near) - this.leanY * 0.05, this.moonSize * moonScale * (1 + near * (frame.portrait ? 0.5 : 1.1))));

    this.veil.scaling.set(frame.halfWidth * 1.3, frame.halfHeight * 1.3, 1);
    this.veil.position.set(0, frame.camera.position.y, 0.4);
    this.veilMaterial.setFloat("u_alpha", place.veilAlpha);
    this.veilMaterial.setFloat("u_portrait", frame.portrait ? 1 : 0);

    const [fr, fg, fb] = linear(place.fog);
    this.cardMaterial.setVector3("u_fog", new Vector3(fr, fg, fb));
    this.cardMaterial.setFloat("u_time", this.time);
    this.cardMaterial.setFloat("u_shown", this.shown);
    this.drawCards();
  }

  private drawCards() {
    const { batch, frame } = this;
    batch.begin();
    const centre = frame.camera.position.y;
    // A narrow window shows little beside the field, so the sides move in and their lamps burn lower.
    const narrow = frame.portrait ? 0.74 : 1, low = frame.portrait ? 0.35 : 1;
    for (const card of this.cards) {
      const { layer } = card;
      const depth = (DISTANCE + card.z) / DISTANCE;
      const halfH = frame.halfHeight * depth;
      let y = card.y - this.scroll;
      if (layer.hold !== undefined) y = layer.hold;
      else if (layer.once) {
        y = card.y - (this.scroll - this.started);
        if (y < centre - halfH - card.h) continue;
      } else {
        const start = -Math.max(halfH, 16 * depth) - card.h - 4;
        y = ((((y - start) % card.span) + card.span) % card.span) + start + centre;
      }
      if (layer.mode !== 4 && (y - card.h > centre + halfH || y + card.h < centre - halfH)) continue;
      const x = card.x * narrow + this.leanX * (card.z - 4) * 0.5 + (layer.drift ? Math.sin(this.time * 0.06 + card.phase) * layer.drift : 0);
      if (Math.abs(x) - card.w > frame.halfWidth * depth) continue;
      const turn = card.turn + (layer.spin ?? 0) * this.time + Math.sin(this.time * (layer.swing ?? 0.7) + card.phase) * (layer.sway ?? 0);
      const top = layer.hang ? card.h : 0;
      const lean = Math.sin(turn) * top;
      const bright = (layer.boost ? 0.45 + 0.55 * low : 1) * (layer.bright ?? 1) * (layer.flicker ? 1 - layer.flicker * (0.5 + 0.5 * Math.sin(this.time * 7 + card.phase * 9)) : 1);
      let grow = 1, shine = 1;
      if (layer.firework) {
        const t = (this.time / layer.firework + card.phase) % 1;
        grow = 0.15 + 0.85 * (1 - (1 - t) ** 4);
        shine = Math.min(1, t * 12) * Math.max(0, 1 - t * 1.5) ** 1.4;
        if (shine <= 0) continue;
      }
      const cardY = y - this.leanY * (card.z - 4) * 0.5;
      batch.add(x + lean, cardY, card.z, turn, card.w * grow, card.h * grow, layer.mode ?? 0, (layer.alpha ?? 1) * shine, card.uv[0], card.uv[1], card.uv[2], card.uv[3], layer.fog, bright, layer.tint ?? 0, (layer.boost ?? 0) * low);
      if (layer.glow) {
        const [size, power, at] = layer.glow;
        const gx = (layer.glowX ?? 0) * card.w * (card.uv[2] < 0 ? -1 : 1);
        const beat = power * low * (0.9 + 0.1 * Math.sin(this.time * 2.3 + card.phase * 5));
        batch.add(x + lean * (1 - at) * 0.5 + gx + lean * 0.5, cardY + at * card.h, card.z - 0.05, 0, size / 2, size / 2, 2, 1, 0, 0, 1, 1, 0, beat, layer.tint ?? 0, 0);
      }
    }
    batch.end();
  }
}

const sheetOf = (place: Place) => place.sheet ?? place.id;

function build(place: Place): Card[] {
  const rng = createRng(place.seed);
  const cards: Card[] = [];
  for (const layer of place.layers) {
    const rect = RECTS[`${sheetOf(place)}.${layer.part}`] ?? [0, 0, 1, 1, layer.ratio ?? 1];
    const ratio = layer.ratio ?? rect[4];
    layer.at.forEach((x, column) => {
      const sides = layer.single ? [1] : [-1, 1];
      for (const side of sides) {
        const depth = (DISTANCE + layer.z) / DISTANCE;
        const n = layer.once ? 1 : Math.max(1, Math.ceil(((layer.spanMin ?? 46) * depth) / layer.every));
        for (let i = 0; i < n; i++) {
          const size = layer.size * (1 + (rng() - 0.5) * 2 * (layer.vary ?? 0));
          const h = size / 2, w = (size * ratio) / 2;
          const anchor = layer.anchor ?? 0;
          const flip = layer.flip ? side > 0 : layer.random ? rng() < 0.5 : false;
          const jitterX = (rng() - 0.5) * 2 * (layer.jitter?.[0] ?? 0), jitterY = (rng() - 0.5) * 2 * (layer.jitter?.[1] ?? 0);
          cards.push({
            x: (layer.single ? x : side * (x - anchor * w)) + jitterX,
            y: layer.once ? layer.y ?? 0 : i * layer.every + jitterY + (side > 0 ? layer.every * (layer.offset ?? 0.5) : 0) + column * layer.every * 0.37 + (layer.y ?? 0),
            z: layer.z + i * 0.01 + column * 0.03, w, h,
            span: n * layer.every,
            uv: [flip ? rect[0] + rect[2] : rect[0], rect[1], flip ? -rect[2] : rect[2], rect[3]],
            layer, phase: rng() * 6.283, turn: layer.turn ? (rng() - 0.5) * 2 * layer.turn : 0,
          });
        }
      }
    });
  }
  return cards.sort((a, b) => b.z - a.z);
}

const v3 = (c: Rgb) => new Vector3(c[0], c[1], c[2]);

function quad(scene: Scene, name: string) {
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.applyToMesh(mesh);
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.isPickable = false;
  return mesh;
}

const NOISE = `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 w = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
  }
  float fbm(vec2 p) {
    float v = noise(p) * 0.5;
    v = v + noise(p * 2.03 + vec2(3.1, 1.7)) * 0.27;
    v = v + noise(p * 4.11 + vec2(7.7, 4.2)) * 0.15;
    v = v + noise(p * 8.3 + vec2(1.3, 9.1)) * 0.08;
    return v;
  }
`;

function makeSky(scene: Scene) {
  return makeShader(scene, "mothSky", {
    attributes: { position: "vec3" },
    varyings: { v_p: "vec2" },
    uniforms: { u_top: "vec3", u_mid: "vec3", u_low: "vec3", u_cloud: "vec3", u_lit: "vec3", u_moon: "vec3", u_time: "float", u_aspect: "float", u_scroll: "float", u_stars: "float", u_cover: "float", u_shown: "float" },
    samplers: ["moonTex"],
    blend: PREMULTIPLIED,
    vertex: `
      POSITION = u_viewProjection * u_world * vec4(a_position, 1.0);
      v_p = a_position.xy;
    `,
    shared: NOISE,
    fragment: `
      vec2 p = vec2(v_p.x * u_aspect, v_p.y);
      float h = v_p.y * 0.5 + 0.5;
      vec3 c = mix(u_low, u_mid, smoothstep(0.0, 0.48, h));
      c = mix(c, u_top, smoothstep(0.42, 1.0, h));
      vec2 m = p - vec2(u_moon.x * u_aspect, u_moon.y);
      float md = length(m) / u_moon.z;
      float halo = exp(-max(md - 1.0, 0.0) * 1.5) * 0.4 + exp(-max(md - 1.0, 0.0) * 0.42) * 0.16;

      vec2 sp = p * 26.0 + vec2(0.0, u_scroll * 40.0);
      vec2 cell = floor(sp);
      float r = hash(cell);
      vec2 off = vec2(hash(cell + vec2(17.0, 3.0)), hash(cell + vec2(5.0, 41.0))) * 0.7 + 0.15;
      float sd = length(fract(sp) - off);
      float twinkle = 0.6 + 0.4 * sin(u_time * (1.0 + r * 3.0) + r * 60.0);
      float star = (1.0 - smoothstep(0.0, 0.1 * r, sd)) * step(0.62, r) * twinkle * u_stars;

      vec2 q = vec2(p.x * 0.8, p.y * 1.7) + vec2(u_time * 0.006, u_scroll * 2.4);
      float warp = fbm(q * 1.3 + vec2(0.0, u_time * 0.004));
      vec2 q2 = q + vec2(warp * 0.9, warp * 0.5);
      float f = fbm(q2 * 1.25);
      float lit = fbm(q2 * 1.25 + vec2(-0.06, 0.1));
      float body = smoothstep(0.62 - u_cover * 0.36, 0.92 - u_cover * 0.3, f);
      float edge = clamp((f - lit) * 4.0 + 0.35, 0.0, 1.0);
      float strokes = noise(vec2(p.x * 9.0 + warp * 7.0, p.y * 42.0 + warp * 18.0)) - 0.5;
      vec3 cloud = mix(u_cloud, u_lit, edge * (0.25 + 0.75 * exp(-md * 0.5)) + strokes * 0.16);

      vec2 uv = m / u_moon.z * 0.5 + 0.5;
      vec3 moonColor = pow(max(TEX(moonTex, clamp(uv, vec2(0.0, 0.0), vec2(1.0, 1.0))).rgb, vec3(0.0, 0.0, 0.0)), vec3(2.2, 2.2, 2.2));
      float disc = 1.0 - smoothstep(0.985, 1.0, md);
      c = c + vec3(0.8, 0.86, 1.0) * star * (1.0 - disc);
      c = mix(c, moonColor * 1.15, disc);
      c = c + u_lit * halo * (1.0 - disc * 0.7);
      c = mix(c, cloud, body * 0.82);
      c = c * (1.0 + strokes * 0.2);
      float haze = (1.0 - smoothstep(0.0, 0.55, h));
      c = mix(c, u_low, haze * 0.55);
      c = mix(u_low * 0.5, c, u_shown);
      c = c + (hash(v_p * 900.0) - 0.5) * 0.004;
      COLOR = vec4(max(c, vec3(0.0, 0.0, 0.0)), 1.0);
    `,
  });
}

function makeCards(scene: Scene) {
  return makeShader(scene, "mothCards", {
    attributes: { position: "vec3", world0: "vec4", world1: "vec4", world2: "vec4", world3: "vec4" },
    varyings: { v_uv: "vec2", v_p: "vec2", v_look: "vec4", v_kind: "vec2" },
    uniforms: { u_fog: "vec3", u_time: "float", u_shown: "float" },
    samplers: ["tex"],
    blend: PREMULTIPLIED,
    vertex: `
      float c = cos(a_world0.w);
      float s = sin(a_world0.w);
      vec2 q = vec2(a_position.x * a_world1.x, a_position.y * a_world1.y);
      vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
      POSITION = u_viewProjection * vec4(a_world0.xyz + vec3(r, 0.0), 1.0);
      v_p = a_position.xy;
      v_uv = vec2(a_world2.x + (a_position.x * 0.5 + 0.5) * a_world2.z, a_world2.y + (0.5 - a_position.y * 0.5) * a_world2.w);
      v_look = a_world3;
      v_kind = a_world1.zw;
    `,
    fragment: `
      vec4 t = TEX(tex, v_uv);
      vec3 rgb = pow(max(t.rgb, vec3(0.0, 0.0, 0.0)), vec3(2.2, 2.2, 2.2));
      float a = t.a;
      float lum = max(rgb.r, max(rgb.g, rgb.b));
      rgb = rgb * (1.0 + v_look.w * smoothstep(0.35, 0.9, lum));
      rgb = rgb * v_look.y;
      rgb = mix(rgb, u_fog, v_look.x * (1.0 - smoothstep(0.4, 1.2, lum * v_look.w)));
      float m = max(0.0, 1.0 - length(v_p));
      float soft = m * m * (3.0 - 2.0 * m);
      if (v_kind.x > 0.5) {
        a = soft;
        rgb = u_fog * v_look.y;
      }
      if (v_kind.x > 3.5) {
        float along = abs(v_p.y);
        float w = 0.08 + 0.9 * along;
        float ray = max(0.0, 1.0 - abs(v_p.x) / w);
        rgb = vec3(0.5, 0.85, 0.95) * ray * ray * (1.0 - along) * v_look.y;
        COLOR = vec4(rgb * v_kind.y * u_shown, 0.0);
      } else if (v_kind.x > 2.5) {
        a = t.a;
        rgb = pow(max(t.rgb, vec3(0.0, 0.0, 0.0)), vec3(2.2, 2.2, 2.2));
        COLOR = vec4(rgb * a * v_kind.y * u_shown, 0.0);
      } else if (v_kind.x > 1.5) {
        rgb = mix(vec3(1.0, 0.5, 0.16), vec3(0.45, 0.6, 1.0), v_look.z) * v_look.y * pow(m, 2.4);
        a = 0.0;
        COLOR = vec4(rgb * v_kind.y * u_shown, 0.0);
      } else {
        a = a * v_kind.y * u_shown;
        COLOR = vec4(rgb * a, a);
      }
    `,
  });
}

function makeVeil(scene: Scene) {
  return makeShader(scene, "mothVeil", {
    attributes: { position: "vec3" },
    varyings: { v_w: "vec2" },
    uniforms: { u_color: "vec3", u_alpha: "float", u_portrait: "float" },
    blend: PREMULTIPLIED,
    vertex: `
      vec4 w = u_world * vec4(a_position, 1.0);
      POSITION = u_viewProjection * w;
      v_w = w.xy;
    `,
    fragment: `
      float x = 1.0 - smoothstep(4.9, 6.9, abs(v_w.x));
      float y = (1.0 - smoothstep(7.6, 10.2, abs(v_w.y)));
      float m = mix(x, y * x, u_portrait);
      float a = u_alpha * m;
      COLOR = vec4(u_color * a, a);
    `,
  });
}
