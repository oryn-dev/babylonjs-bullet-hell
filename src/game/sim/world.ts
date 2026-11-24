import { Bullets } from "./bullets";
import { aimAngle, EmitterSet, type LiveBeam, type Muzzle } from "./emitters";
import { samplePath } from "./path";
import type { Params } from "./params";
import { createRng, type Rng } from "./rng";
import { type BossType, type Burst, type Control, type Difficulty, type Event, FIELD, type FoeType, type Key, type Perk, type Phase } from "./types";

const BULLETS = 2400;
const SHOTS = 260;
const DUST = 700;
const EDGE = 0.45;

export interface Foe {
  id: number;
  type: FoeType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  mirror: boolean;
  path: Key[];
  hp: number;
  age: number;
  flash: number;
  emitters: EmitterSet;
}

export interface Boss {
  type: BossType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  index: number;
  phase: Phase;
  time: number;
  /** Seconds of the tell left; the boss is untouchable and silent until it ends. */
  tell: number;
  clean: boolean;
  flash: number;
  emitters: EmitterSet;
  homeFrom: { x: number; y: number };
  done: boolean;
}

export interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  auto: boolean;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

/** The whole fight without a picture: everything the view draws is read from here. */
export class World {
  readonly bullets = new Bullets(BULLETS);
  readonly beams: LiveBeam[] = [];
  readonly foes: Foe[] = [];
  readonly shots: Shot[] = [];
  readonly dust: Dust[] = [];
  readonly events: Event[] = [];
  boss: Boss | null = null;
  time = 0;

  readonly moth = { x: 0, y: -5, vx: 0, vy: 0, slow: false, safe: 0, alive: true };
  lives: number;
  score = 0;
  grazes = 0;
  chain = 0;
  hits = 0;
  meter = 0;
  eclipse = 0;
  eclipseX = 0;
  eclipseY = 0;
  perks: Perk[] = [];
  /** Checks fly with it: nothing the moth does hurts anyone and a hit is only counted. */
  harmlessShots = false;

  private fireIn = 0;
  private nextId = 1;
  private muzzle: Muzzle;
  private level: { density: number; speed: number; rate: number };
  /** 1 while a flight begins, 0 once it has its full strength. */
  private ease = 0;
  private lastReady = false;
  rng: Rng;

  constructor(readonly params: Params, readonly difficulty: Difficulty, seed: number) {
    this.rng = createRng(seed);
    this.lives = difficulty.lives;
    this.level = { density: difficulty.density, speed: difficulty.speed, rate: difficulty.rate };
    this.muzzle = {
      rng: () => this.rng(),
      aim: this.moth,
      density: difficulty.density * params.bulletDensity,
      speed: difficulty.speed * params.bulletSpeed,
      rate: difficulty.rate,
      rank: 0,
      shoot: (x, y, angle, speed, spec, safe) => {
        if (safe && this.tooClose(x, y)) return;
        this.bullets.spawn(x, y, angle, speed, spec);
      },
      beam: (beam) => {
        this.beams.push(beam);
        this.events.push({ kind: "beamWarn" });
      },
      volley: (x, y, color) => this.events.push({ kind: "volley", x, y, color }),
    };
  }

  setLevel(density: number, speed: number, rate: number) {
    this.level = { density, speed, rate };
    this.setEase(this.ease);
  }

  setEase(ease: number) {
    this.ease = ease;
    const { params, difficulty, level, muzzle } = this;
    muzzle.density = level.density * params.bulletDensity * (1 + (difficulty.startBullets - 1) * ease);
    muzzle.speed = level.speed * params.bulletSpeed * (1 + (difficulty.startSpeed - 1) * ease);
    muzzle.rate = level.rate * (1 + (difficulty.startRate - 1) * ease);
  }

  get rank() {
    return this.difficulty.rank;
  }

  get chainFactor() {
    return Math.min(this.params.chainMax, 1 + this.chain * this.params.chainStep);
  }

  get grazeRadius() {
    return this.params.grazeRadius * (1 + 0.35 * this.count("graze"));
  }

  get eclipseReady() {
    return this.meter >= this.params.meterFull && this.eclipse <= 0;
  }

  count(perk: Perk) {
    let n = 0;
    for (const p of this.perks) if (p === perk) n++;
    return n;
  }

  addPerk(perk: Perk) {
    this.perks.push(perk);
    if (perk === "life") this.lives += 1;
  }

  addFoe(type: FoeType, path: Key[], shift: [number, number] = [0, 0], mirror = false) {
    const foe: Foe = {
      id: this.nextId++, type, path, mirror, baseX: shift[0], baseY: shift[1], x: 0, y: 0,
      hp: type.hp * this.difficulty.hp, age: 0, flash: 0, emitters: new EmitterSet(type.emits, this.rank),
    };
    this.placeFoe(foe);
    this.foes.push(foe);
    return foe;
  }

  startBoss(type: BossType, from = 0) {
    const phase = type.phases[from];
    this.boss = {
      type, x: 0, y: 12, hp: 1, maxHp: 1, index: from - 1, phase, time: 0, tell: 0, clean: true, flash: 0,
      emitters: new EmitterSet([], 0), homeFrom: { x: 0, y: 12 }, done: false,
    };
    this.events.push({ kind: "bossIn", name: type.name });
    this.nextPhase();
  }

  /** One fixed step. */
  step(dt: number, control: Control) {
    this.time += dt;
    this.stepMoth(dt, control);
    if (control.eclipse) this.tryEclipse();
    this.stepEclipse(dt);
    this.stepFoes(dt);
    this.stepBoss(dt);
    this.stepShots(dt);
    this.stepBullets(dt);
    this.stepBeams(dt);
    this.stepDust(dt);
    if (this.eclipseReady !== this.lastReady) {
      this.lastReady = this.eclipseReady;
      if (this.lastReady) this.events.push({ kind: "ready" });
    }
  }

  /** Everything hostile turns into dust that flies to the moth. */
  sweep(x: number, y: number, radius = 99, worth = 1) {
    const { bullets } = this;
    for (let i = bullets.count - 1; i >= 0; i--) {
      if (Math.hypot(bullets.x[i] - x, bullets.y[i] - y) > radius) continue;
      this.toDust(i, worth);
    }
    if (radius > 50) this.beams.length = 0;
  }

  private toDust(i: number, worth = 1) {
    const { bullets } = this;
    if (worth) this.addDust(bullets.x[i], bullets.y[i], true);
    this.events.push({ kind: "swept", x: bullets.x[i], y: bullets.y[i] });
    bullets.remove(i);
  }

  private tooClose(x: number, y: number) {
    return Math.hypot(x - this.moth.x, y - this.moth.y) < this.params.safeRadius;
  }

  private stepMoth(dt: number, control: Control) {
    const { moth, params } = this;
    if (!moth.alive) return;
    moth.safe = Math.max(0, moth.safe - dt);
    moth.slow = control.slow;
    const fromX = moth.x, fromY = moth.y;
    if (control.target) {
      const dx = control.target.x - moth.x, dy = control.target.y - moth.y;
      const away = Math.hypot(dx, dy);
      const reach = (control.slow ? params.slowSpeed * 1.6 : params.pointerSpeed) * dt;
      const share = away > reach ? reach / away : 1;
      moth.x += dx * share;
      moth.y += dy * share;
    } else {
      const speed = control.slow ? params.slowSpeed : params.moveSpeed;
      moth.x += control.x * speed * dt;
      moth.y += control.y * speed * dt;
    }
    moth.x = Math.min(FIELD.right - EDGE, Math.max(FIELD.left + EDGE, moth.x));
    moth.y = Math.min(FIELD.top - EDGE * 2, Math.max(FIELD.bottom + EDGE, moth.y));
    moth.vx = (moth.x - fromX) / dt;
    moth.vy = (moth.y - fromY) / dt;

    this.fireIn -= dt;
    if (this.fireIn > 0 || this.harmlessShots) return;
    this.fireIn += params.fireEvery;
    const wide = control.slow ? 0.2 : 0.42;
    this.shoot(-wide, 0);
    this.shoot(wide, 0);
    const sides = this.count("sides");
    for (let k = 1; k <= sides; k++) {
      const lean = (control.slow ? 3 : 9) * k + 4;
      this.shoot(-wide - 0.3, -lean, 0.5);
      this.shoot(wide + 0.3, lean, 0.5);
    }
  }

  private shoot(dx: number, lean: number, strength = 1) {
    if (this.shots.length >= SHOTS) return;
    const a = (lean * Math.PI) / 180;
    this.shots.push({ x: this.moth.x + dx, y: this.moth.y + 0.45, vx: Math.sin(a) * this.params.shotSpeed, vy: Math.cos(a) * this.params.shotSpeed, damage: this.params.shotDamage * strength });
  }

  private tryEclipse() {
    if (!this.eclipseReady || !this.moth.alive) return;
    this.meter = 0;
    this.eclipse = this.eclipseTime;
    this.events.push({ kind: "eclipse", on: true, x: this.moth.x, y: this.moth.y });
  }

  get eclipseTime() {
    return this.params.eclipseSeconds + 0.9 * this.count("eclipse");
  }

  /** The dark disc opens fast and closes at the end. */
  get eclipseSize() {
    if (this.eclipse <= 0) return 0;
    const past = this.eclipseTime - this.eclipse;
    return this.params.eclipseRadius * Math.min(1, past / 0.35) ** 0.6 * Math.min(1, this.eclipse / 0.3);
  }

  private stepEclipse(dt: number) {
    if (this.eclipse <= 0) return;
    this.eclipse -= dt;
    this.eclipseX = this.moth.x;
    this.eclipseY = this.moth.y;
    this.moth.safe = Math.max(this.moth.safe, 0.25);
    const radius = this.eclipseSize;
    this.sweep(this.moth.x, this.moth.y, radius, 2);
    const damage = this.params.eclipseDps * dt;
    for (const foe of this.foes) if (Math.hypot(foe.x - this.moth.x, foe.y - this.moth.y) < radius + foe.type.radius) this.hurtFoe(foe, damage);
    this.hurtBoss(damage * 0.8);
    if (this.eclipse <= 0) this.events.push({ kind: "eclipse", on: false, x: this.moth.x, y: this.moth.y });
  }

  private placeFoe(foe: Foe) {
    const [x, y] = samplePath(foe.path, foe.age);
    foe.x = foe.baseX + (foe.mirror ? -x : x);
    foe.y = foe.baseY + y;
  }

  private stepFoes(dt: number) {
    for (let i = this.foes.length - 1; i >= 0; i--) {
      const foe = this.foes[i];
      foe.age += dt;
      foe.flash = Math.max(0, foe.flash - dt * 6);
      this.placeFoe(foe);
      const inside = Math.abs(foe.x) < FIELD.right + 0.3 && foe.y < FIELD.top + 0.3 && foe.y > -2.5;
      // A lamp that has sunk to the moth's height falls silent, so nothing is fired point-blank from behind.
      if (inside) foe.emitters.step(dt, foe, this.muzzle);
      if (foe.hp <= 0) {
        this.foes.splice(i, 1);
        this.score += Math.round(foe.type.score * this.difficulty.score * this.chainFactor);
        this.events.push({ kind: "foeDown", x: foe.x, y: foe.y, radius: foe.type.radius, score: foe.type.score });
        this.dropDust(foe.x, foe.y, foe.type.dust);
        this.douse(foe);
      } else if (foe.age > foe.path[foe.path.length - 1][0]) {
        this.foes.splice(i, 1);
        this.douse(foe);
      }
    }
  }

  private douse(owner: object) {
    for (let i = this.beams.length - 1; i >= 0; i--) if (this.beams[i].owner === owner) this.beams.splice(i, 1);
  }

  private hurtFoe(foe: Foe, damage: number) {
    if (this.harmlessShots) return;
    foe.hp -= damage;
    foe.flash = 1;
  }

  private nextPhase() {
    const boss = this.boss!;
    boss.index += 1;
    const phase = boss.type.phases[boss.index];
    boss.phase = phase;
    boss.maxHp = boss.hp = phase.hp * this.difficulty.hp;
    boss.time = phase.time;
    boss.tell = this.params.tellSeconds;
    boss.clean = true;
    boss.homeFrom = { x: boss.x, y: boss.y };
    boss.emitters = new EmitterSet(phase.emits, this.rank);
    this.events.push({ kind: "phase", name: phase.name, index: boss.index, count: boss.type.phases.length });
  }

  private stepBoss(dt: number) {
    const boss = this.boss;
    if (!boss || boss.done) return;
    boss.flash = Math.max(0, boss.flash - dt * 6);
    const path = boss.phase.move ?? [[0, 0, 5.2]];
    if (boss.tell > 0) {
      boss.tell -= dt;
      const t = Math.min(1, 1 - boss.tell / this.params.tellSeconds);
      const s = t * t * (3 - 2 * t);
      boss.x = boss.homeFrom.x + (path[0][1] - boss.homeFrom.x) * s;
      boss.y = boss.homeFrom.y + (path[0][2] - boss.homeFrom.y) * s;
      return;
    }
    const loop = path[path.length - 1][0];
    const [x, y] = samplePath(path, loop > 0 ? boss.emitters.time % loop : 0);
    boss.x = x;
    boss.y = y;
    boss.emitters.step(dt, boss, this.muzzle);
    boss.time -= dt;
    if (boss.hp > 0 && boss.time > 0) return;

    const beaten = boss.hp <= 0;
    const bonus = beaten ? Math.round((this.params.phaseBonus * (boss.clean ? 2 : 1) + boss.time * this.params.timeBonus) * this.difficulty.score) : 0;
    this.score += bonus;
    this.events.push({ kind: "phaseDown", x: boss.x, y: boss.y, clean: boss.clean && beaten, bonus });
    this.sweep(boss.x, boss.y, 99, beaten ? 1 : 0);
    if (beaten) this.dropDust(boss.x, boss.y, 16);
    if (boss.index + 1 < boss.type.phases.length) return this.nextPhase();
    boss.done = true;
    this.events.push({ kind: "bossDown", x: boss.x, y: boss.y });
  }

  private hurtBoss(damage: number) {
    const boss = this.boss;
    if (!boss || boss.done || boss.tell > 0 || this.harmlessShots) return;
    boss.hp -= damage;
    boss.flash = Math.min(1, boss.flash + 0.35);
  }

  private stepShots(dt: number) {
    const { shots, boss } = this;
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      let used = shot.y > FIELD.top + 0.6 || Math.abs(shot.x) > FIELD.right + 0.6;
      if (!used && boss && !boss.done && Math.hypot(shot.x - boss.x, shot.y - boss.y) < boss.type.radius) {
        this.hurtBoss(shot.damage);
        used = true;
        if (this.rng() < 0.4) this.events.push({ kind: "spark", x: shot.x, y: shot.y });
      }
      for (const foe of this.foes) {
        if (used) break;
        if (foe.hp <= 0 || Math.hypot(shot.x - foe.x, shot.y - foe.y) > foe.type.radius + 0.15) continue;
        this.hurtFoe(foe, shot.damage);
        used = true;
        this.events.push({ kind: "spark", x: shot.x, y: shot.y });
      }
      if (!used) continue;
      shots[i] = shots[shots.length - 1];
      shots.pop();
    }
  }

  private stepBullets(dt: number) {
    const { bullets, moth, params } = this;
    const calm = this.count("calm");
    const slow = params.calmScale ** calm;
    const graze = this.grazeRadius;
    const onBurst = (x: number, y: number, angle: number, burst: Burst) => this.burst(x, y, angle, burst);
    for (let i = bullets.count - 1; i >= 0; i--) {
      const away = calm ? Math.hypot(bullets.x[i] - moth.x, bullets.y[i] - moth.y) : 99;
      if (!bullets.step(i, away < params.calmRadius ? dt * slow : dt, moth, this.muzzle.speed, onBurst)) {
        bullets.remove(i);
        continue;
      }
      if (!moth.alive || bullets.harmless(i)) continue;
      const dx = bullets.x[i] - moth.x, dy = bullets.y[i] - moth.y;
      const distance = Math.hypot(dx, dy) - bullets.radius[i];
      if (distance < params.hitRadius && moth.safe <= 0) {
        this.hit();
        return;
      }
      if (!bullets.grazed[i] && distance < graze && this.eclipse <= 0) {
        bullets.grazed[i] = 1;
        this.graze(bullets.x[i], bullets.y[i]);
      }
    }
  }

  private graze(bx: number, by: number) {
    this.grazes += 1;
    this.chain += 1;
    this.score += Math.round(this.params.grazeScore * this.chainFactor * this.difficulty.score);
    this.fill(this.params.grazeMeter);
    this.events.push({ kind: "graze", x: this.moth.x, y: this.moth.y, bx, by, chain: this.chain });
  }

  private fill(amount: number) {
    if (this.eclipse > 0) return;
    this.meter = Math.min(this.params.meterFull, this.meter + amount * (1 + this.count("dust")));
  }

  private burst(x: number, y: number, angle: number, burst: Burst) {
    if (this.tooClose(x, y)) return;
    this.events.push({ kind: "burst", x, y, color: burst.color });
    const n = Math.max(1, Math.round(burst.n * Math.min(1.25, this.muzzle.density)));
    const base = (burst.angle ?? 0) + (burst.aim ? aimAngle({ x, y }, this.moth) : burst.spread ? angle : 0);
    for (let layer = 0; layer < (burst.layers ?? 1); layer++) {
      const speed = (burst.speed + layer * (burst.layerStep ?? 0.5)) * this.muzzle.speed;
      const half = burst.stagger && layer % 2 ? 180 / n : 0;
      for (let i = 0; i < n; i++) {
        const a = burst.spread ? (n === 1 ? 0 : (i / (n - 1) - 0.5) * burst.spread) : (i / n) * 360;
        this.bullets.spawn(x, y, base + a + half, speed, burst);
      }
    }
  }

  private stepBeams(dt: number) {
    const { beams, moth, params } = this;
    for (let i = beams.length - 1; i >= 0; i--) {
      const beam = beams[i];
      beam.age += dt;
      beam.x = beam.owner.x + beam.dx;
      beam.y = beam.owner.y + beam.dy;
      beam.angle += beam.sweep * dt * (beam.age > beam.warn ? 1 : 0.15);
      if (!beam.fired && beam.age >= beam.warn) {
        beam.fired = true;
        this.events.push({ kind: "beamFire" });
      }
      if (beam.age > beam.warn + beam.hold) {
        beams.splice(i, 1);
        continue;
      }
      if (!beam.fired || !moth.alive) continue;
      const distance = beamDistance(beam, moth.x, moth.y) - beam.width * 0.36;
      if (distance < params.hitRadius && moth.safe <= 0) {
        this.hit();
        return;
      }
      beam.grazeIn -= dt;
      if (distance < this.grazeRadius && beam.grazeIn <= 0 && this.eclipse <= 0) {
        beam.grazeIn = 0.16;
        this.graze(moth.x, moth.y + 0.3);
      }
    }
  }

  private hit() {
    const { moth } = this;
    this.hits += 1;
    this.chain = 0;
    this.lives -= 1;
    if (this.boss) this.boss.clean = false;
    this.events.push({ kind: "hit", x: moth.x, y: moth.y });
    this.sweep(moth.x, moth.y, this.params.clearRadius, 0);
    this.beams.length = 0;
    if (this.lives > 0) {
      moth.safe = this.params.invulnerable * (1 + (this.difficulty.startSafe - 1) * this.ease);
      this.meter = Math.max(this.meter, Math.min(this.params.meterFull, this.meter + 25));
    } else moth.alive = false;
  }

  private dropDust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.addDust(x, y, false);
  }

  private addDust(x: number, y: number, auto: boolean) {
    if (this.dust.length >= DUST) return;
    const a = this.rng() * Math.PI * 2, s = 0.6 + this.rng() * (auto ? 1.2 : 3);
    this.dust.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (auto ? 0 : 1.5), age: 0, auto });
  }

  private stepDust(dt: number) {
    const { dust, moth, params } = this;
    for (let i = dust.length - 1; i >= 0; i--) {
      const mote = dust[i];
      mote.age += dt;
      const dx = moth.x - mote.x, dy = moth.y - mote.y;
      const away = Math.hypot(dx, dy) || 1;
      if (moth.alive && mote.age > 0.35 && (mote.auto || away < params.magnetRadius || moth.y > 4)) {
        mote.auto = true;
        const pull = 10 + mote.age * 14;
        mote.vx += ((dx / away) * pull - mote.vx) * Math.min(1, dt * 7);
        mote.vy += ((dy / away) * pull - mote.vy) * Math.min(1, dt * 7);
      } else {
        mote.vx *= 1 - dt * 2.4;
        mote.vy += (-1.7 - mote.vy) * dt * 2;
      }
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      const taken = moth.alive && away < 0.5 && mote.age > 0.2;
      if (taken) {
        this.score += Math.round(params.dustScore * this.chainFactor * (1 + this.count("dust")) * this.difficulty.score);
        this.fill(params.dustMeter);
        this.events.push({ kind: "pickup", x: mote.x, y: mote.y });
      }
      if (taken || mote.y < FIELD.bottom - 0.8) {
        dust[i] = dust[dust.length - 1];
        dust.pop();
      }
    }
  }
}

export const BEAM_LENGTH = 26;

/** Distance from a point to a beam's centre line. */
export function beamDistance(beam: { x: number; y: number; angle: number }, px: number, py: number) {
  const a = (beam.angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const along = Math.max(0, Math.min(BEAM_LENGTH, (px - beam.x) * dx + (py - beam.y) * dy));
  return Math.hypot(px - beam.x - dx * along, py - beam.y - dy * along);
}
