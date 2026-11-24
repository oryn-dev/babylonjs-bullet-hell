import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";

/*
 * Every shader is written once in a small GLSL dialect and rewritten as WGSL for WebGPU, so nothing has to be
 * compiled from GLSL at run time. a_ attribute, v_ varying, u_ uniform, TEX(name, uv) reads a texture.
 * No ternaries, no swizzle writes, every local gets a value where it is declared.
 */
type Kind = "float" | "vec2" | "vec3" | "vec4" | "mat4";
const WGSL: Record<Kind, string> = { float: "f32", vec2: "vec2f", vec3: "vec3f", vec4: "vec4f", mat4: "mat4x4f" };

export interface ShaderSpec {
  attributes: Record<string, Kind>;
  varyings: Record<string, Kind>;
  uniforms?: Record<string, Kind>;
  samplers?: string[];
  shared?: string;
  vertex: string;
  fragment: string;
  blend?: number;
}

function wgsl(source: string, stage: "vertex" | "fragment" | "shared") {
  return source
    .replace(/\b(float|vec2|vec3|vec4)\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (_, result: Kind, name: string, params: string) => {
      const list = params.split(",").map((part) => part.trim().split(/\s+/)).map(([kind, id]) => `${id}: ${WGSL[kind as Kind]}`);
      return `fn ${name}(${list.join(", ")}) -> ${WGSL[result]} {`;
    })
    .replace(/(^|[;{}\s])(float|vec2|vec3|vec4)\s+(\w+)\s*=/g, (_, before: string, kind: Kind, id: string) => `${before}var ${id}: ${WGSL[kind]} =`)
    .replace(/\b(vec2|vec3|vec4)\(/g, (_, kind: Kind) => `${WGSL[kind]}(`)
    .replace(/\bfloat\(/g, "f32(")
    .replace(/\bTEX\((\w+),/g, "textureSample($1, $1Sampler,")
    .replace(/\bu_(\w+)/g, (_, id: string) => `uniforms.${id === "world" || id === "viewProjection" ? id : `u_${id}`}`)
    .replace(/\ba_(\w+)/g, "vertexInputs.$1")
    .replace(/\bv_(\w+)/g, stage === "vertex" ? "vertexOutputs.v_$1" : "fragmentInputs.v_$1")
    .replace(/\bPOSITION\b/g, "vertexOutputs.position")
    .replace(/\bCOLOR\b/g, "fragmentOutputs.color")
    .replace(/\bATAN2\(/g, "atan2(");
}

function glsl(source: string) {
  return source
    .replace(/\bTEX\((\w+),/g, "texture2D($1,")
    .replace(/\bu_(world|viewProjection)\b/g, "$1")
    .replace(/\ba_(\w+)/g, "$1")
    .replace(/\bPOSITION\b/g, "gl_Position")
    .replace(/\bCOLOR\b/g, "gl_FragColor")
    .replace(/\bATAN2\(/g, "atan(");
}

export function makeShader(scene: Scene, name: string, spec: ShaderSpec) {
  const gpu = scene.getEngine().isWebGPU;
  const uniforms: Record<string, Kind> = { viewProjection: "mat4", world: "mat4", ...spec.uniforms };
  const lines = (entries: Record<string, Kind>, line: (id: string, kind: Kind) => string) => Object.entries(entries).map(([id, kind]) => line(id, kind)).join("\n");
  const samplers = spec.samplers ?? [];
  const shared = spec.shared ?? "";
  if (gpu) {
    const head = [
      lines(uniforms, (id, kind) => `uniform ${id}: ${WGSL[kind]};`),
      lines(spec.varyings, (id, kind) => `varying ${id}: ${WGSL[kind]};`),
      samplers.map((id) => `var ${id}Sampler: sampler; var ${id}: texture_2d<f32>;`).join("\n"),
      wgsl(shared, "shared"),
    ].join("\n");
    ShaderStore.ShadersStoreWGSL[`${name}VertexShader`] = `${lines(spec.attributes, (id, kind) => `attribute ${id}: ${WGSL[kind]};`)}\n${head}\n@vertex\nfn main(input: VertexInputs) -> FragmentInputs {\n${wgsl(spec.vertex, "vertex")}\n}`;
    ShaderStore.ShadersStoreWGSL[`${name}FragmentShader`] = `${head}\n@fragment\nfn main(input: FragmentInputs) -> FragmentOutputs {\n${wgsl(spec.fragment, "fragment")}\n}`;
  } else {
    const head = [
      "precision highp float;",
      lines(uniforms, (id, kind) => `uniform ${kind} ${id};`),
      lines(spec.varyings, (id, kind) => `varying ${kind} ${id};`),
      samplers.map((id) => `uniform sampler2D ${id};`).join("\n"),
      glsl(shared),
    ].join("\n");
    ShaderStore.ShadersStore[`${name}VertexShader`] = `${lines(spec.attributes, (id, kind) => `attribute ${kind} ${id};`)}\n${head}\nvoid main() {\n${glsl(spec.vertex)}\n}`;
    ShaderStore.ShadersStore[`${name}FragmentShader`] = `${head}\nvoid main() {\n${glsl(spec.fragment)}\n}`;
  }
  const material = new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    // Babylon adds world0 to world3 itself for a mesh with thin instances.
    attributes: Object.keys(spec.attributes).filter((id) => !id.startsWith("world")),
    uniforms: Object.keys(uniforms),
    samplers,
    needAlphaBlending: spec.blend !== undefined,
    shaderLanguage: gpu ? ShaderLanguage.WGSL : ShaderLanguage.GLSL,
  });
  material.backFaceCulling = false;
  if (spec.blend !== undefined) {
    material.alphaMode = spec.blend;
    material.disableDepthWrite = true;
  }
  return material;
}
