import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { FIELD } from "../sim/types";

export const DISTANCE = 30;

/** Fits the field into any window: full height in landscape, full width in portrait with room for the thumb below. */
export class Frame {
  readonly camera: TargetCamera;
  halfWidth = 10;
  halfHeight = 9;
  portrait = false;
  /** Pixels per field unit. */
  scale = 50;
  private shakeX = 0;
  private shakeY = 0;
  private baseY = 0;

  constructor(private scene: Scene) {
    this.camera = new TargetCamera("camera", new Vector3(0, 0, -DISTANCE), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.minZ = 1;
    this.camera.maxZ = 220;
    scene.activeCamera = this.camera;
    this.fit();
  }

  fit() {
    const engine = this.scene.getEngine();
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    const halfHeight = Math.max(FIELD.height / 2 + 0.25, (FIELD.width / 2 + 0.12) / aspect);
    const spare = halfHeight * 2 - FIELD.height;
    this.portrait = aspect < 0.68;
    this.halfHeight = halfHeight;
    this.halfWidth = halfHeight * aspect;
    this.camera.fov = 2 * Math.atan(halfHeight / DISTANCE);
    // In portrait the spare height goes a third above (score) and two thirds below (thumb).
    this.baseY = this.portrait ? -spare * 0.5 + Math.min(spare * 0.36, 3.4) : 0;
    this.scale = window.innerHeight / (halfHeight * 2);
  }

  shake(x: number, y: number) {
    this.shakeX = x;
    this.shakeY = y;
  }

  update() {
    this.camera.position.x = this.shakeX;
    this.camera.position.y = this.baseY + this.shakeY;
  }

  get centerY() {
    return this.baseY;
  }

  /** Screen pixels to field units. */
  toField(clientX: number, clientY: number) {
    return {
      x: (clientX / window.innerWidth - 0.5) * 2 * this.halfWidth,
      y: this.baseY - (clientY / window.innerHeight - 0.5) * 2 * this.halfHeight,
    };
  }

  /** Field units to screen pixels. */
  toScreen(x: number, y: number) {
    return {
      x: (x / (2 * this.halfWidth) + 0.5) * window.innerWidth,
      y: (0.5 - (y - this.baseY) / (2 * this.halfHeight)) * window.innerHeight,
    };
  }
}
