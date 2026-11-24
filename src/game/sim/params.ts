/** Reads a gameplay number by its knob id; the game passes tuning.number, the checks read game/tuning.json. */
export type ReadNumber = (id: string, fallback: number) => number;

export function readParams(read: ReadNumber) {
  return {
    moveSpeed: read("moth_speed", 8.6),
    slowSpeed: read("moth_slow_speed", 3.7),
    pointerSpeed: read("pointer_speed", 18),
    hitRadius: read("hit_radius", 0.09),
    grazeRadius: read("graze_radius", 0.72),
    fireEvery: read("fire_every", 0.085),
    shotDamage: read("shot_damage", 1),
    shotSpeed: read("shot_speed", 26),
    invulnerable: read("invulnerable_seconds", 2.4),
    startSeconds: read("start_seconds", 60),
    clearRadius: read("hit_clear_radius", 7),
    safeRadius: read("spawn_safe_radius", 1.9),
    meterFull: read("meter_full", 100),
    grazeMeter: read("graze_meter", 1.5),
    dustMeter: read("dust_meter", 0.5),
    eclipseSeconds: read("eclipse_seconds", 2.8),
    eclipseRadius: read("eclipse_radius", 5.2),
    eclipseDps: read("eclipse_dps", 42),
    magnetRadius: read("dust_magnet_radius", 2.2),
    grazeScore: read("graze_score", 60),
    dustScore: read("dust_score", 25),
    chainStep: read("chain_step", 0.02),
    chainMax: read("chain_max", 5),
    phaseBonus: read("phase_bonus", 4000),
    timeBonus: read("phase_time_bonus", 150),
    calmRadius: read("calm_radius", 2.6),
    calmScale: read("calm_scale", 0.68),
    tellSeconds: read("boss_tell_seconds", 1.6),
    bulletSpeed: read("bullet_speed", 1),
    bulletDensity: read("bullet_density", 1),
  };
}

export type Params = ReturnType<typeof readParams>;
