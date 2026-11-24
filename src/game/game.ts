import type { Game, GameContext, GameMeta } from "../oryn/context";
import { onSettings, settings, updateSettings } from "../oryn/settings";
import { Sound } from "./audio/sound";
import { Controls } from "./controls";
import { Progress, today } from "./progress";
import { DIFFICULTIES, tuneDifficulties } from "./sim/difficulty";
import { readParams } from "./sim/params";
import { hashSeed } from "./sim/rng";
import { DAILY_ROUNDS, type Mode, Run } from "./sim/run";
import { STAGES } from "./sim/stages";
import { type Control, type Event, FIELD } from "./sim/types";
import { Ui } from "./ui/ui";
import { endingScreen, endScreen, optionsScreen, pauseScreen, perkScreen, titleScreen } from "./ui/screens";
import { View } from "./view/view";

export const meta: GameMeta = { title: "Moth Hour" };

const STEP = 1 / 120;
const MODE_NAMES: Record<Mode, string> = { night: "Night", endless: "Endless", daily: "Daily night" };
const THEME_IDS = STAGES.map((stage) => stage.id);
const IDLE: Control = { x: 0, y: 0, slow: false, eclipse: false, target: null };
type State = "title" | "fly" | "pause" | "perk" | "dying" | "ending" | "end";

export async function createGame(ctx: GameContext): Promise<Game> {
  const { scene, engine, canvas, input, look, assets, audio, tuning, metric } = ctx;
  // The screen-space effects would draw every painted card a second time; the game keeps bloom and edges only.
  look.setPixel({ bloom: true, msaa: true, fxaa: true, grain: true });
  scene.getMeshByName("sky")?.setEnabled(false);

  const read = (id: string, fallback: number) => tuning.number(id, fallback);
  const params = readParams(read);
  tuneDifficulties(read);
  const progress = new Progress();
  const view = new View(scene, assets.url);
  onSettings(({ quality }) => {
    const ratio = { low: 0.8, medium: 1.5, high: 2 }[quality];
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, ratio));
    view.frame.fit();
  });
  const overlay = document.querySelector<HTMLElement>("#oryn-ui")!;
  const ui = new Ui(overlay);
  const sound = new Sound(audio, assets.url);
  const controls = new Controls(input, canvas, view.frame, () => tuning.number("touch_gain", 1.18));
  input.touch.configure({ stick: false, buttons: [{ action: "jump", label: "Eclipse", icon: ui.touchMoon.node }] });
  for (const [family, file] of [["Moth Display", "PlayfairDisplay"], ["Moth Text", "Quicksand"]]) {
    const face = new FontFace(family, `url("${assets.url(`fonts/${file}-Variable.ttf`)}")`, { weight: family === "Moth Display" ? "400 900" : "300 700" });
    document.fonts.add(face);
    void face.load().catch(() => undefined);
  }

  let state: State = "title";
  let run = new Run("night", DIFFICULTIES[1], params, 1);
  let left = 0;
  let stop = 0;
  let timer = 0;
  let place = 0;
  let arrive = 1;
  let quiet = 0;
  let endingY = 0;
  let lives = 3;

  const layout = () => {
    const a = view.frame.toScreen(FIELD.left, FIELD.top), b = view.frame.toScreen(FIELD.right, FIELD.bottom);
    ui.layout({ left: Math.max(0, a.x), right: Math.min(window.innerWidth, b.x), top: Math.max(0, a.y), bottom: Math.min(window.innerHeight, b.y) }, (window.innerWidth - (b.x - a.x)) / 2 < 120, input.device === "touch");
  };
  const reframe = () => requestAnimationFrame(() => { view.frame.fit(); layout(); });
  window.addEventListener("resize", reframe);
  input.onDevice(() => { ui.setDevice(input.device); layout(); });

  function applyOptions() {
    view.options.contrast = progress.data.options.contrast;
    view.options.calmFlashes = progress.data.options.calmFlashes;
  }

  function setState(next: State) {
    state = next;
    timer = 0;
    const flying = next === "fly" || next === "dying";
    ui.showHud(flying);
    input.touch.setEnabled(flying);
    if (next !== "fly") controls.release();
  }

  function title() {
    setState("title");
    run = new Run("night", DIFFICULTIES[progress.data.difficulty], params, 1);
    goPlace(0);
    view.fx.clear();
    ui.quiet();
    void sound.music("garden");
    sound.mix([0.9, 0, 0]);
    const difficulty = DIFFICULTIES[progress.data.difficulty];
    ui.open(titleScreen({
      touch: input.device === "touch", difficulty: progress.data.difficulty, stage: progress.data.stage,
      best: progress.data.best[progress.bestKey("night", difficulty.id, "")] ?? 0,
      onDifficulty: (i) => { progress.data.difficulty = i; progress.save(); sound.play("click"); },
      onFly: (mode) => start(mode),
      onStage: (i) => start("night", i),
      onOptions: () => options(title),
    }));
  }

  function options(back: () => void) {
    sound.play("click");
    ui.open(optionsScreen(progress.data.options, () => { applyOptions(); progress.save(); sound.play("click"); }, () => { sound.play("click"); back(); }));
  }

  function start(mode: Mode, stage = 0) {
    const difficulty = mode === "daily" ? DIFFICULTIES[1] : DIFFICULTIES[progress.data.difficulty];
    const seed = mode === "daily" ? hashSeed(`moth-${today()}`) : Math.floor(Math.random() * 2 ** 31);
    run = new Run(mode, difficulty, params, seed, stage);
    if (progress.data.options.extraLife) {
      run.world.lives += 2;
      run.practice = true;
    }
    lives = run.world.lives;
    left = stop = 0;
    ui.open(null);
    view.fx.clear();
    sound.play("start");
    if (place !== run.stage) goPlace(run.stage);
    setState("fly");
    announce();
    if (mode === "night" && stage === 0) ui.tip(input.device === "touch" ? "Drag anywhere to fly" : "Arrow keys, WASD or mouse to fly, Shift for slow and precise", 5);
  }

  function announce() {
    const { place: stage } = run;
    if (run.mode === "night") ui.say(stage.name, stage.line, 3.4);
    else ui.say(run.mode === "daily" ? `Light ${run.round + 1} of ${DAILY_ROUNDS}` : `Light ${run.round + 1}`, "", 1.8);
  }

  function goPlace(index: number) {
    place = index;
    arrive = 0;
    view.scenery.go(index);
    view.scenery.shown = 0;
    const stage = STAGES[index % STAGES.length];
    view.warm(Object.values(stage.foes).map((foe) => foe.model), stage.boss.model);
    view.scenery.preload(index + 1);
    sound.preload(THEME_IDS[Math.min(index + 1, THEME_IDS.length - 1)]);
  }

  function pause() {
    if (state !== "fly") return;
    setState("pause");
    sound.mix([0.5, 0, 0], 0.5);
    showPause();
  }

  function showPause() {
    ui.open(pauseScreen({ onResume: resume, onOptions: () => options(showPause), onLeave: title, onRestart: () => start(run.mode) }));
  }

  function resume() {
    ui.open(null);
    sound.play("click");
    setState("fly");
    mixForStep();
  }

  function mixForStep() {
    if (run.step === "boss") sound.mix([0.8, 0.85, 0.95], 2);
    else if (run.step === "waves") sound.mix([0.85, 0.8, 0], 3);
    else sound.mix([0.95, 0.3, 0], 2);
  }

  function gradeOf() {
    const { world } = run;
    const base = run.mode === "night" ? (run.practice ? 1 : 3) : 3;
    const value = base - Math.min(3, world.hits) + (world.grazes > 900 ? 2 : world.grazes > 450 ? 1 : 0);
    return Math.max(0, Math.min(4, value));
  }

  function finish(won: boolean) {
    const { world } = run;
    const key = progress.bestKey(run.mode, run.difficulty.id, today());
    const isBest = !run.practice && progress.record(key, world.score);
    if (run.mode === "night") progress.data.stage = Math.max(progress.data.stage, run.stage);
    progress.save();
    const reached = run.mode === "night" ? (won ? "You flew the whole night." : `The night ended in ${run.place.name.replace("The ", "the ")}.`) : won ? "Every light of today is behind you." : `You passed ${run.round} ${run.round === 1 ? "light" : "lights"}.`;
    const screen = endScreen({
      won, mode: run.mode, title: won ? (run.mode === "night" ? "The moth reached the moon" : "The day is done") : "The light was faster",
      line: reached, score: world.score, grazes: world.grazes, hits: world.hits, grade: gradeOf(), isBest, practice: run.practice,
      again: run.mode === "night" && run.stage > 0 && !won ? run.stage : null,
    }, () => start(run.mode), (stage) => start("night", stage), title);
    setState("end");
    ui.open(screen);
    sound.mix([0.8, 0, 0], 2);
  }

  function onEvent(event: Event) {
    view.onEvent(event);
    switch (event.kind) {
      case "graze":
        sound.graze();
        if (run.world.grazes > 6 && progress.hint("graze")) ui.tip("Flying close to the light gathers dust and points", 5);
        return;
      case "foeDown": return sound.play("down");
      case "pickup": return sound.play("dust");
      case "ready":
        sound.play("ready");
        if (progress.hint("ready")) ui.tip(input.device === "touch" ? "The moon is full. Touch it: lights near you turn to dust" : `The moon is full. ${input.device === "gamepad" ? "A" : "Space"}: lights near you turn to dust`, 6);
        return;
      case "eclipse": if (event.on) sound.play("eclipse"); return;
      case "beamWarn": return sound.play("warn");
      case "beamFire": return sound.play("fire");
      case "hit":
        sound.play("hit");
        stop = tuning.number("hit_stop_seconds", 0.3);
        if (run.world.lives <= 0) dying();
        return;
      case "phase":
        sound.play("tell");
        ui.say(event.name, run.mode === "night" && event.index === 0 ? run.world.boss!.type.name : "", 1.9);
        return;
      case "phaseDown":
        sound.play("phase");
        if (event.bonus) ui.flashBonus(`${event.clean ? "Untouched  " : ""}+${event.bonus.toLocaleString("en-US")}`);
        stop = Math.max(stop, 0.08);
        return;
      case "bossDown":
        sound.play("boss");
        stop = 0.16;
        return;
    }
  }

  function dying() {
    setState("dying");
    sound.mix([0.4, 0, 0], 1.5);
  }

  let step = run.step;
  function followRun() {
    if (run.step === step) return;
    step = run.step;
    switch (step) {
      case "intro":
        announce();
        mixForStep();
        return;
      case "waves": mixForStep(); return;
      case "boss": mixForStep(); return;
      case "cleared":
        mixForStep();
        if (run.mode === "night") {
          progress.data.stage = Math.max(progress.data.stage, Math.min(STAGES.length - 1, run.stage + 1));
          progress.save();
          ui.say(run.stage === STAGES.length - 1 ? "" : "The way is free", "", 2.6);
        }
        return;
      case "perk":
        setState("perk");
        run.world.shots.length = 0;
        sound.play("perk");
        ui.open(perkScreen(run.offer, (perk) => {
          sound.play("click");
          ui.open(null);
          run.take(perk);
          lives = Math.max(lives, run.world.lives);
          step = run.step;
          setState("fly");
          announce();
          mixForStep();
        }));
        return;
      case "won":
        if (run.mode !== "night") return finish(true);
        setState("ending");
        run.world.shots.length = 0;
        endingY = run.world.moth.y;
        ui.showHud(false);
        ui.open(endingScreen(["All night the moth flew past every light.", "The last one let it land."]));
        sound.mix([1, 0.4, 0], 3);
        return;
    }
  }

  function hudState() {
    const { world } = run;
    const { boss } = world;
    return {
      score: world.score, chain: world.chainFactor, grazes: world.grazes, lives: Math.max(0, world.lives), maxLives: lives,
      meter: world.eclipse > 0 ? world.eclipse / world.eclipseTime : world.meter / params.meterFull, ready: world.eclipseReady,
      place: run.mode === "night" ? run.place.name : MODE_NAMES[run.mode],
      mode: run.mode === "night" ? run.difficulty.name : run.mode === "daily" ? `Light ${Math.min(run.round + 1, DAILY_ROUNDS)} of ${DAILY_ROUNDS}` : `Light ${run.round + 1}, ${run.difficulty.name}`,
      perks: world.perks,
      boss: boss && !boss.done ? { name: boss.type.name, phase: boss.phase.name, hp: boss.hp / boss.maxHp, left: boss.type.phases.length - boss.index, count: boss.type.phases.length, time: boss.time } : null,
    };
  }

  /** Swaps the painted place behind a short mist when the run has moved on. */
  function travel(dt: number) {
    if (place !== run.stage && state !== "title") {
      arrive = Math.max(0, arrive - dt * 1.6);
      if (arrive <= 0 && view.scenery.ready(run.stage % STAGES.length)) goPlace(run.stage);
    } else if (view.scenery.ready(place % STAGES.length)) arrive = Math.min(1, arrive + dt * 0.8);
    view.scenery.shown = arrive * arrive * (3 - 2 * arrive);
    void sound.music(THEME_IDS[(state === "title" ? 0 : run.stage) % THEME_IDS.length]);
  }

  ui.onPause = () => (state === "fly" ? pause() : state === "pause" ? resume() : undefined);
  let loud = settings.volume || 0.8;
  ui.onSound = () => {
    if (settings.volume > 0) loud = settings.volume;
    updateSettings({ volume: settings.volume > 0 ? 0 : loud });
  };
  onSettings(({ volume }) => ui.setSound(volume > 0));
  document.addEventListener("visibilitychange", () => document.hidden && pause());

  await progress.load();
  applyOptions();
  layout();
  void sound.load().catch((error) => console.warn("Sound is off", error));
  title();

  const test = new URLSearchParams(location.search);
  if (test.has("stage")) start("night", Number(test.get("stage")));
  if (import.meta.env.DEV) Object.assign(window, { moth: { get run() { return run; }, get state() { return state; }, view, start, ui, controls, engine, finish, bot: null as null | ((run: Run) => Partial<Control>) } });

  return {
    update(rawDt) {
      const dt = Math.min(rawDt, 0.05);
      timer += dt;
      if (input.pressed("pause")) { if (state === "fly") pause(); else if (state === "pause") resume(); }
      if (input.device === "gamepad" && ui.opened) {
        if (input.pressed("moveRight") || input.pressed("moveDown")) ui.steer("ArrowRight");
        if (input.pressed("moveLeft") || input.pressed("moveUp")) ui.steer("ArrowLeft");
        if (input.pressed("jump")) ui.confirm();
      }
      const woke = controls.takeWake();
      if (state === "title" && timer > 0.6 && (woke || (input.device === "gamepad" && input.pressed("jump"))) && !document.querySelector(".mh-opts")) start("night");
      travel(dt);

      let control = controls.read(dt, run.world.moth);
      if (import.meta.env.DEV) {
        const bot = (window as unknown as { moth: { bot: null | ((run: Run) => Partial<Control>) } }).moth.bot;
        if (bot && state === "fly") control = { ...IDLE, ...bot(run) };
      }
      const { world } = run;
      stop = Math.max(0, stop - dt);
      if (state === "fly" && stop <= 0) {
        left += dt;
        let first = true;
        while (left >= STEP) {
          run.tick(STEP, first ? control : { ...control, eclipse: false });
          first = false;
          left -= STEP;
        }
      } else if (state === "title") {
        quiet += dt;
        world.moth.x = Math.sin(quiet * 0.7) * 1.3;
        world.moth.y = 1.1 + Math.sin(quiet * 1.1) * 0.5;
        world.moth.vx = Math.cos(quiet * 0.7) * 0.9;
        world.moth.vy = Math.cos(quiet * 1.1) * 0.5;
      } else if (state === "ending") {
        world.moth.x += -world.moth.x * Math.min(1, dt * 0.9);
        endingY += (0.4 - endingY) * Math.min(1, dt * 0.5);
        world.moth.y = endingY;
        world.moth.vx = world.moth.vy = 0;
        if (timer > 11.5) finish(true);
      } else if (state === "dying" && timer > 1.9) finish(false);
      for (const event of world.events) onEvent(event);
      world.events.length = 0;
      if (state === "fly") followRun();

      const flying = state === "fly" || state === "dying";
      view.draw(dt, world, state === "fly" && stop <= 0 ? left : 0, {
        place, title: state === "title", scrollSpeed: state === "pause" || state === "perk" ? 0.25 : state === "ending" ? 2.2 : stop > 0 ? 0.1 : 1,
        hitPoint: flying, mothAlpha: state === "end" ? 0 : state === "ending" ? Math.max(0, Math.min(1, (11 - timer) / 2.5)) : 1,
      });
      view.scenery.moonAway = state !== "title" && run.stage === STAGES.length - 1 && (world.boss || run.step === "boss" || state === "ending") ? 1 : 0;
      view.scenery.moonNear = state === "ending" ? Math.min(1, timer / 8.5) : state === "end" ? view.scenery.moonNear : 0;
      ui.update(dt, flying ? hudState() : null);

      metric("state", state);
      metric("step", run.step);
      metric("stage", run.stage);
      metric("score", world.score);
      metric("lives", world.lives);
      metric("grazes", world.grazes);
      metric("bullets", world.bullets.count);
      metric("meter", Math.round(world.meter));
    },
  };
}
