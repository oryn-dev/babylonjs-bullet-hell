import type { Params } from "./params";
import { generateBoss, generateWaves } from "./gauntlet";
import { createRng, type Rng } from "./rng";
import { STAGES } from "./stages";
import { type Control, type Difficulty, type Perk, PERKS, type StageType, type Wave } from "./types";
import { World } from "./world";

export type Mode = "night" | "endless" | "daily";
export type Step = "intro" | "waves" | "boss" | "cleared" | "perk" | "won" | "lost";

const INTRO = 2.6;
const CLEARED = 3.4;
export const DAILY_ROUNDS = 8;
const PERK_EVERY = 4;

/** One flight: the order of waves, bosses and choices in every mode. */
export class Run {
  readonly world: World;
  step: Step = "intro";
  stage = 0;
  round = 0;
  time = 0;
  offer: Perk[] = [];
  seconds = 0;
  /** Started past the first stage or with an extra life; such a run stays off the boards. */
  practice = false;
  private rng: Rng;
  private pending: { wave: Wave; left: number; next: number; sent: number }[] = [];
  private waveTypes: StageType = STAGES[0];

  constructor(readonly mode: Mode, readonly difficulty: Difficulty, readonly params: Params, readonly seed: number, startStage = 0) {
    this.world = new World(params, difficulty, seed);
    this.rng = createRng(seed ^ 0x5bd1e995);
    this.stage = mode === "night" ? startStage : 0;
    this.practice = startStage > 0;
    this.enter("intro");
  }

  get place(): StageType {
    return STAGES[this.stage % STAGES.length];
  }

  get playing() {
    return this.step === "intro" || this.step === "waves" || this.step === "boss" || this.step === "cleared";
  }

  tick(dt: number, control: Control) {
    if (!this.playing) return;
    this.time += dt;
    this.seconds += dt;
    const ease = this.practice ? 0 : Math.max(0, Math.min(1, 3 - (2 * this.seconds) / this.params.startSeconds));
    this.world.setEase(ease);
    if (this.step === "waves") this.time -= dt * (1 - this.difficulty.startPace) * ease;
    this.world.step(dt, control);
    if (!this.world.moth.alive) return this.enter("lost");
    switch (this.step) {
      case "intro":
        if (this.time > INTRO) this.enter("waves");
        return;
      case "waves":
        this.sendWaves(dt);
        if (!this.pending.length && !this.world.foes.length && this.time > 1) this.enter("boss");
        return;
      case "boss":
        if (this.world.boss?.done) this.enter("cleared");
        return;
      case "cleared":
        if (this.time > (this.mode === "night" ? CLEARED : 1.6)) this.afterClear();
        return;
    }
  }

  take(perk: Perk) {
    if (this.step !== "perk") return;
    this.world.addPerk(perk);
    if (this.mode === "night") this.stage += 1;
    this.enter("intro");
  }

  private enter(step: Step) {
    this.step = step;
    this.time = 0;
    const { world } = this;
    switch (step) {
      case "intro":
        world.boss = null;
        if (this.mode !== "night") this.setRound();
        return;
      case "waves": {
        const waves = this.mode === "night" ? this.place.waves : this.roundWaves();
        this.pending = waves.map((wave) => ({ wave, left: wave.n ?? 1, next: wave.at, sent: 0 }));
        return;
      }
      case "boss":
        world.startBoss(this.mode === "night" ? this.place.boss : generateBoss(this.rng, this.stage));
        return;
    }
  }

  /** Endless and Daily grow a little harder every round; Daily starts the same for everyone. */
  private setRound() {
    const grow = this.mode === "daily" ? 0.028 : 0.04;
    const { density, speed, rate } = this.difficulty;
    const step = Math.min(this.round, 12) * grow;
    this.world.setLevel(density * (0.85 + step * 0.8), speed * (0.9 + step * 0.4), rate * (0.92 + step * 0.4));
    this.stage = Math.floor(this.round / 2) % STAGES.length;
  }

  private roundWaves() {
    const { stage, waves } = generateWaves(this.rng, this.stage);
    this.waveTypes = STAGES[stage];
    return waves;
  }

  private sendWaves(dt: number) {
    const types = this.mode === "night" ? this.place : this.waveTypes;
    // An empty sky never makes anyone wait: the clock runs on to the next wave.
    const quiet = !this.world.foes.length && !this.pending.some((p) => p.sent);
    const next = Math.min(...this.pending.map((p) => p.next));
    if (quiet && this.pending.length && next - this.time > 1.6) this.time += dt * 3;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const entry = this.pending[i];
      const { wave } = entry;
      while (entry.left > 0 && this.time >= entry.next) {
        const k = entry.sent++;
        const flip = Boolean(wave.mirror) && ((wave.n ?? 1) === 1 || wave.n! > 2 && wave.path[0][1] < -6.5 ? true : k % 2 === 1);
        this.world.addFoe(types.foes[wave.foe], wave.path, [(wave.step?.[0] ?? 0) * k, (wave.step?.[1] ?? 0) * k], flip);
        entry.left -= 1;
        entry.next += wave.gap ?? 1;
      }
      if (entry.left <= 0) this.pending.splice(i, 1);
    }
  }

  private afterClear() {
    if (this.mode === "night") {
      if (this.stage >= STAGES.length - 1) return this.enter("won");
      return this.choose();
    }
    this.round += 1;
    if (this.mode === "daily" && this.round >= DAILY_ROUNDS) return this.enter("won");
    if (this.round % PERK_EVERY === 0) return this.choose();
    this.enter("intro");
  }

  private choose() {
    const pool = PERKS.filter((perk) => this.world.count(perk) < 2);
    this.offer = [];
    while (this.offer.length < 3 && pool.length) this.offer.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
    this.enter("perk");
  }
}
