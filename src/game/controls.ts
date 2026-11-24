import type { Input } from "../oryn/input";
import { platform } from "../oryn/platform";
import type { Control } from "./sim/types";
import type { Frame } from "./view/frame";

const CLEAR_ABOVE_FINGER = 1.5;

/** Keys, mouse, gamepad and finger as one wish for the moth. */
export class Controls {
  readonly state: Control = { x: 0, y: 0, slow: false, eclipse: false, target: null };
  /** The player moved or tapped the world since the last read; it starts the run on the title. */
  private woke = false;
  private shift = false;
  private finger: { id: number; x: number; y: number; offX: number; offY: number } | null = null;
  private mouse: { x: number; y: number } | null = null;
  private moth = { x: 0, y: 0 };

  constructor(private input: Input, canvas: HTMLCanvasElement, private frame: Frame, private sensitivity: () => number) {
    window.addEventListener("keydown", (event) => { if (event.key === "Shift") this.shift = true; });
    window.addEventListener("keyup", (event) => { if (event.key === "Shift") this.shift = false; });
    window.addEventListener("blur", () => this.release());
    canvas.addEventListener("pointerdown", (event) => {
      this.woke = true;
      if (!touches(event) || this.finger) return;
      const at = frame.toField(event.clientX, event.clientY);
      this.finger = { id: event.pointerId, x: at.x, y: at.y, offX: this.moth.x - at.x, offY: this.moth.y - at.y };
    });
    canvas.addEventListener("pointermove", (event) => {
      if (touches(event)) {
        if (this.finger?.id !== event.pointerId) return;
        const at = frame.toField(event.clientX, event.clientY);
        // A little more than the finger moves, so the whole field is in reach of one thumb.
        const gain = this.sensitivity() - 1;
        this.finger.offX += (at.x - this.finger.x) * gain;
        this.finger.offY += (at.y - this.finger.y) * gain;
        this.finger.x = at.x;
        this.finger.y = at.y;
        return;
      }
      if (Math.abs(event.movementX) + Math.abs(event.movementY) > 0) this.mouse = frame.toField(event.clientX, event.clientY);
    });
    const up = (event: PointerEvent) => { if (this.finger?.id === event.pointerId) this.finger = null; };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }

  release() {
    this.finger = null;
    this.mouse = null;
    this.shift = false;
  }

  takeWake() {
    const axis = this.input.axis();
    const woke = this.woke || Math.hypot(axis.x, axis.y) > 0.4;
    this.woke = false;
    return woke;
  }

  read(dt: number, moth: { x: number; y: number }): Control {
    const { input, state } = this;
    this.moth = moth;
    const axis = input.axis();
    state.x = axis.x;
    state.y = axis.y;
    state.slow = this.shift || input.held("interact");
    state.eclipse = input.pressed("jump") || input.pressed("action") || input.pressed("secondary");
    if (axis.x || axis.y) this.mouse = null;
    state.target = null;
    if (this.finger) {
      this.keepAboveFinger(dt);
      state.target = { x: this.finger.x + this.finger.offX, y: this.finger.y + this.finger.offY };
      this.limitReach(state.target);
    } else if (this.mouse && input.device === "keyboard") state.target = this.mouse;
    return state;
  }

  /** The moth slides up until the fingertip no longer covers it. */
  private keepAboveFinger(dt: number) {
    const finger = this.finger!;
    const need = Math.min(2.6, Math.max(CLEAR_ABOVE_FINGER, 62 / this.frame.scale));
    if (Math.abs(finger.offX) < 1.4 && finger.offY < need) finger.offY += (need - finger.offY) * Math.min(1, dt * 5);
  }

  /** Pushing past an edge moves the grip along, so turning back answers at once. */
  private limitReach(target: { x: number; y: number }) {
    const x = Math.min(5.6, Math.max(-5.6, target.x)), y = Math.min(7.6, Math.max(-8.1, target.y));
    this.finger!.offX += x - target.x;
    this.finger!.offY += y - target.y;
    target.x = x;
    target.y = y;
  }
}

/** In the studio's phone preview a mouse stands in for a finger. */
function touches(event: PointerEvent) {
  return event.pointerType === "touch" || platform.device === "phone";
}
