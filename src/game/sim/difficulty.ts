import type { ReadNumber } from "./params";
import type { Difficulty } from "./types";

export const DIFFICULTIES: Difficulty[] = [
  { id: "dusk", name: "Dusk", lives: 5, rank: 0, density: 0.95, speed: 0.84, rate: 0.95, hp: 0.82, score: 0.6, startBullets: 0.4, startSpeed: 0.85, startRate: 0.38, startSafe: 2.6, startPace: 0.65 },
  { id: "night", name: "Night", lives: 4, rank: 1, density: 1.4, speed: 1, rate: 1.2, hp: 1, score: 1, startBullets: 0.4, startSpeed: 0.95, startRate: 0.5, startSafe: 2.2, startPace: 0.7 },
  { id: "deep", name: "Deep Night", lives: 3, rank: 2, density: 1.75, speed: 1.1, rate: 1.35, hp: 1.1, score: 1.6, startBullets: 1, startSpeed: 1, startRate: 1, startSafe: 1, startPace: 1 },
];

const FIELDS = ["lives", "density", "speed", "rate", "hp", "score"] as const;
const START = { startBullets: "start_bullets", startSpeed: "start_speed", startRate: "start_rate", startSafe: "start_safe", startPace: "start_pace" } as const;

/** Takes the numbers of all three difficulties from the tuning file. */
export function tuneDifficulties(read: ReadNumber) {
  for (const difficulty of DIFFICULTIES) {
    for (const field of FIELDS) difficulty[field] = read(`${difficulty.id}_${field}`, difficulty[field]);
    for (const field of Object.keys(START) as (keyof typeof START)[]) difficulty[field] = read(`${difficulty.id}_${START[field]}`, difficulty[field]);
  }
}
