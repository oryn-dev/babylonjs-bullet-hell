import { saves } from "../oryn/saves";
import type { Mode } from "./sim/run";

export interface Options {
  contrast: boolean;
  calmFlashes: boolean;
  extraLife: boolean;
}

interface Stored {
  best: Record<string, number>;
  stage: number;
  difficulty: number;
  options: Options;
  hints: string[];
}

const SLOT = "moth";

/** What stays between nights; the game runs the same when saves are out of reach. */
export class Progress {
  data: Stored = { best: {}, stage: 0, difficulty: 0, options: { contrast: false, calmFlashes: false, extraLife: false }, hints: [] };
  private loaded = false;

  async load() {
    try {
      const stored = await saves.load<Partial<Stored>>(SLOT);
      if (stored) this.data = { ...this.data, ...stored, options: { ...this.data.options, ...stored.options } };
      this.loaded = true;
    } catch {
      // Playing on without a store is fine.
    }
  }

  save() {
    if (this.loaded) void saves.save(SLOT, this.data).catch(() => undefined);
  }

  bestKey(mode: Mode, difficulty: string, day: string) {
    return mode === "daily" ? `daily-${day}` : `${mode}-${difficulty}`;
  }

  /** True when the score is a new best. */
  record(key: string, score: number) {
    const before = this.data.best[key] ?? 0;
    if (score <= before) return false;
    if (key.startsWith("daily-")) for (const old of Object.keys(this.data.best)) if (old.startsWith("daily-")) delete this.data.best[old];
    this.data.best[key] = score;
    this.save();
    return before > 0;
  }

  hint(id: string) {
    if (this.data.hints.includes(id)) return false;
    this.data.hints.push(id);
    this.save();
    return true;
  }
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
