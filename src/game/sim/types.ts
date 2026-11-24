export const FIELD = { left: -6, right: 6, bottom: -8.5, top: 8.5, width: 12, height: 17 };

export const SHAPES = ["orb", "petal", "star", "ring", "needle", "moon", "lamp"] as const;
export type Shape = (typeof SHAPES)[number];
export const COLORS = ["gold", "rose", "ice", "amber", "lilac", "jade"] as const;
export type Color = (typeof COLORS)[number];

/** Hit radius of each shape at size 1, as a share of what is drawn (about 60 %, in the player's favour). */
export const HIT_RADIUS: Record<Shape, number> = { orb: 0.15, petal: 0.1, star: 0.13, ring: 0.2, needle: 0.09, moon: 0.17, lamp: 0.34 };

/** Something a bullet does when it reaches an age. Angles are degrees, 0 is down, 90 is right. */
export interface Act {
  at: number;
  stop?: boolean;
  aim?: number;
  turn?: number;
  speed?: number;
  accel?: number;
  to?: number;
  curve?: number;
  curveFor?: number;
  color?: Color;
  burst?: Burst;
  die?: boolean;
}

export interface Burst {
  n: number;
  speed: number;
  layers?: number;
  layerStep?: number;
  spread?: number;
  aim?: boolean;
  angle?: number;
  shape: Shape;
  color: Color;
  size?: number;
  accel?: number;
  to?: number;
  curve?: number;
  curveFor?: number;
  acts?: Act[];
  /** Every second ring is turned by half a step. */
  stagger?: boolean;
}

export interface Emit {
  form?: "ring" | "fan" | "scatter" | "curtain" | "flower" | "poly";
  /** First volley, seconds after the owner starts. */
  at?: number;
  every?: number;
  times?: number;
  /** Volleys per burst and the pause after it, in seconds. */
  salvo?: [number, number];
  n: number;
  layers?: number;
  layerStep?: number;
  layerTurn?: number;
  speed: number;
  speedTo?: number;
  angle?: number;
  aim?: boolean;
  spread?: number;
  spin?: number;
  swing?: [number, number];
  petals?: number;
  depth?: number;
  from?: [number, number];
  orbit?: { r: number; spin: number; n: number; outward?: boolean };
  /** curtain: width of the way through and how far it walks per volley; the step is in field units. */
  gap?: number;
  gapStep?: number;
  edge?: "top" | "left" | "right";
  shape: Shape;
  color: Color;
  size?: number;
  accel?: number;
  to?: number;
  curve?: number;
  curveFor?: number;
  acts?: Act[];
  /** Lowest difficulty that has this emitter. */
  rank?: number;
  /** Count stays as written on every difficulty. */
  fixed?: boolean;
}

export interface Beam {
  beam: true;
  at?: number;
  every?: number;
  times?: number;
  n: number;
  angle?: number;
  aim?: boolean;
  spread?: number;
  spin?: number;
  /** Degrees a second while it burns. */
  sweep?: number;
  swing?: [number, number];
  warn: number;
  hold: number;
  width: number;
  color: Color;
  from?: [number, number];
  rank?: number;
}

export type Emitter = Emit | Beam;

export type Key = [time: number, x: number, y: number];

export interface FoeType {
  model: string;
  hp: number;
  radius: number;
  score: number;
  dust: number;
  emits: Emitter[];
}

export interface Wave {
  at: number;
  foe: string;
  path: Key[];
  n?: number;
  gap?: number;
  /** Shift of each following foe, in field units. */
  step?: [number, number];
  /** Every second foe flies the mirrored path. */
  mirror?: boolean;
}

export interface Phase {
  name: string;
  hp: number;
  time: number;
  emits: Emitter[];
  move?: Key[];
}

export interface BossType {
  id: string;
  name: string;
  model: string;
  radius: number;
  phases: Phase[];
}

export interface StageType {
  id: string;
  name: string;
  line: string;
  colors: [Color, Color];
  foes: Record<string, FoeType>;
  waves: Wave[];
  boss: BossType;
}

export interface Difficulty {
  id: string;
  name: string;
  lives: number;
  /** Emitters with a higher rank stay silent. */
  rank: number;
  density: number;
  speed: number;
  rate: number;
  hp: number;
  score: number;
  /** The first minute of a flight: factors on bullet count, speed and volley rate, safe time after a hit and pace of the waves. */
  startBullets: number;
  startSpeed: number;
  startRate: number;
  startSafe: number;
  startPace: number;
}

export interface Control {
  x: number;
  y: number;
  slow: boolean;
  eclipse: boolean;
  /** Where the pointer or finger wants the moth; wins over the axis. */
  target: { x: number; y: number } | null;
}

export const PERKS = ["graze", "calm", "sides", "life", "eclipse", "dust"] as const;
export type Perk = (typeof PERKS)[number];

export type Event =
  | { kind: "graze"; x: number; y: number; bx: number; by: number; chain: number }
  | { kind: "volley"; x: number; y: number; color: Color }
  | { kind: "burst"; x: number; y: number; color: Color }
  | { kind: "beamWarn" }
  | { kind: "beamFire" }
  | { kind: "spark"; x: number; y: number }
  | { kind: "foeDown"; x: number; y: number; radius: number; score: number }
  | { kind: "pickup"; x: number; y: number }
  | { kind: "ready" }
  | { kind: "hit"; x: number; y: number }
  | { kind: "eclipse"; on: boolean; x: number; y: number }
  | { kind: "bossIn"; name: string }
  | { kind: "phase"; name: string; index: number; count: number }
  | { kind: "phaseDown"; x: number; y: number; clean: boolean; bonus: number }
  | { kind: "bossDown"; x: number; y: number }
  | { kind: "swept"; x: number; y: number };
