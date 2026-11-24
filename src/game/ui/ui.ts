import "./ui.css";
import type { Perk } from "../sim/types";
import { GRADES, ICONS, moonPath, moonSvg, PERK_INFO } from "./icons";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", html = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.innerHTML = html;
  return node;
}

export interface HudState {
  score: number;
  chain: number;
  grazes: number;
  lives: number;
  maxLives: number;
  meter: number;
  ready: boolean;
  place: string;
  mode: string;
  perks: Perk[];
  boss: { name: string; phase: string; hp: number; left: number; count: number; time: number } | null;
}

/** The waxing moon that stands for the Eclipse meter, on the HUD and as the touch button. */
class MoonMeter {
  readonly node = el("div", "mh-moon", `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#10163a" fill-opacity=".86"/><path fill="#eef2ff"/><circle cx="36" cy="38" r="7" fill="#10163a" opacity=".1"/><circle cx="62" cy="60" r="10" fill="#10163a" opacity=".1"/><circle cx="60" cy="30" r="5" fill="#10163a" opacity=".1"/></svg>`);
  private path = this.node.querySelector("path")!;
  private shown = -1;

  set(fill: number, full: boolean) {
    const step = Math.round(fill * 100);
    if (step === this.shown) return;
    this.shown = step;
    this.path.setAttribute("d", moonPath(fill));
    this.node.classList.toggle("full", full);
  }
}

export class Ui {
  readonly root = el("div", "mh");
  readonly touchMoon = new MoonMeter();
  onPause = () => undefined as void;
  onSound = () => undefined as void;
  private hud = el("div", "mh-hud away");
  private moon = new MoonMeter();
  private score = el("div", "mh-score num", "0");
  private chain = el("div", "mh-chain num");
  private grazes = el("div", "mh-grazes");
  private lives = el("div", "mh-lives");
  private place = el("div", "mh-place num");
  private mode = el("div", "mh-mode");
  private perks = el("div", "mh-perks");
  private moonBox = el("div", "mh-moonbox");
  private moonKey = el("span", "", "Space: Eclipse");
  private boss = el("div", "mh-boss away", `<div class="mh-bar"><b></b></div><div class="mh-bossline"><span></span><em></em><s></s><i class="mh-timer num"></i></div>`);
  private words = el("div", "mh-words", "<h2></h2><p></p>");
  private hint = el("div", "mh-hint", "<span></span>");
  private bonus = el("div", "mh-bonus num");
  private sound = el("button", "mh-icon", ICONS.sound);
  private pause = el("button", "mh-icon", ICONS.pause);
  private screen: HTMLElement | null = null;
  private wordsUntil = 0;
  private hintUntil = 0;
  private cache: Record<string, string | number> = {};
  private time = 0;

  constructor(parent: HTMLElement) {
    const left = el("div", "mh-left"), right = el("div", "mh-right"), buttons = el("div", "mh-buttons");
    left.append(this.score, this.chain, this.grazes, this.lives);
    right.append(this.place, this.mode, this.perks);
    this.moonBox.append(this.moon.node, this.moonKey);
    this.sound.setAttribute("aria-label", "Sound");
    this.pause.setAttribute("aria-label", "Pause");
    buttons.append(this.sound, this.pause);
    this.hud.append(left, right, this.moonBox, this.boss);
    this.root.append(this.hud, this.words, this.hint, this.bonus, buttons);
    parent.append(this.root);
    parent.classList.add("mh-touch");
    this.sound.onclick = () => this.onSound();
    this.pause.onclick = () => this.onPause();
    document.addEventListener("keydown", (event) => this.steer(event.key) && event.preventDefault());
  }

  layout(box: { left: number; right: number; top: number; bottom: number }, portrait: boolean, touch: boolean) {
    for (const [key, value] of Object.entries(box)) this.root.style.setProperty(`--field-${key}`, `${Math.round(value)}px`);
    this.root.classList.toggle("portrait", portrait);
    this.root.classList.toggle("touch", touch);
  }

  setSound(on: boolean) {
    this.sound.innerHTML = on ? ICONS.sound : ICONS.mute;
  }

  setDevice(device: string) {
    this.moonKey.textContent = device === "gamepad" ? "A: Eclipse" : "Space: Eclipse";
  }

  showHud(on: boolean) {
    this.hud.classList.toggle("away", !on);
    this.pause.hidden = !on;
  }

  update(dt: number, s: HudState | null) {
    this.time += dt;
    this.words.classList.toggle("show", this.time < this.wordsUntil);
    this.hint.classList.toggle("show", this.time < this.hintUntil);
    if (!s) return;
    this.text("score", this.score, Math.round(s.score).toLocaleString("en-US"));
    this.text("chain", this.chain, s.chain > 1.005 ? `× ${s.chain.toFixed(2)}` : "");
    this.text("grazes", this.grazes, `${s.grazes} grazed`);
    this.text("place", this.place, s.place);
    this.text("mode", this.mode, s.mode);
    this.moon.set(s.meter, s.ready);
    this.touchMoon.set(s.meter, s.ready);
    if (this.cache.ready !== Number(s.ready)) {
      this.cache.ready = Number(s.ready);
      this.moonBox.classList.toggle("ready", s.ready);
      this.touchMoon.node.parentElement?.classList.toggle("ready", s.ready);
    }
    const lives = `${s.lives}/${Math.max(s.maxLives, s.lives)}`;
    if (this.cache.lives !== lives) {
      this.cache.lives = lives;
      this.lives.innerHTML = Array.from({ length: Math.max(s.maxLives, s.lives) }, (_, i) => `<i class="${i < s.lives ? "" : "gone"}">${ICONS.moth}</i>`).join("");
    }
    const perks = s.perks.join();
    if (this.cache.perks !== perks) {
      this.cache.perks = perks;
      this.perks.innerHTML = s.perks.map((p) => `<i title="${PERK_INFO[p].name}">${PERK_INFO[p].art}</i>`).join("");
    }
    this.boss.classList.toggle("away", !s.boss);
    if (s.boss) {
      const [bar] = this.boss.getElementsByTagName("b");
      bar.style.transform = `scaleX(${Math.max(0, s.boss.hp).toFixed(3)})`;
      this.text("bossname", this.boss.querySelector("span")!, s.boss.name);
      this.text("bossphase", this.boss.querySelector("em")!, s.boss.phase === s.boss.name ? "" : s.boss.phase);
      this.text("bosstime", this.boss.querySelector(".mh-timer")!, String(Math.max(0, Math.ceil(s.boss.time))));
      const dots = `${s.boss.left}/${s.boss.count}`;
      if (this.cache.dots !== dots) {
        this.cache.dots = dots;
        this.boss.querySelector("s")!.innerHTML = s.boss.count > 1 ? Array.from({ length: s.boss.count }, (_, i) => `<i class="${i < s.boss!.left ? "" : "out"}"></i>`).join("") : "";
      }
    }
  }

  say(title: string, line: string, seconds: number) {
    this.words.querySelector("h2")!.textContent = title;
    this.words.querySelector("p")!.textContent = line;
    this.wordsUntil = this.time + seconds;
  }

  tip(text: string, seconds = 4.5) {
    this.hint.querySelector("span")!.textContent = text;
    this.hintUntil = this.time + seconds;
  }

  flashBonus(text: string) {
    this.bonus.textContent = text;
    this.bonus.classList.remove("show");
    void this.bonus.offsetWidth;
    this.bonus.classList.add("show");
  }

  quiet() {
    this.wordsUntil = this.hintUntil = 0;
  }

  /** Puts up a screen; `null` takes it away. */
  open(node: HTMLElement | null) {
    this.screen?.remove();
    this.screen = node;
    if (!node) return;
    this.root.insertBefore(node, this.root.querySelector(".mh-buttons"));
    node.querySelector<HTMLElement>("[data-first]")?.focus({ preventScroll: true });
  }

  get opened() {
    return this.screen !== null;
  }

  /** Arrow keys and gamepad walk through the buttons of the open screen. */
  steer(key: string): boolean {
    if (!this.screen || this.screen.classList.contains("mh-title")) return false;
    const list = [...this.screen.querySelectorAll<HTMLElement>("button, input")];
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (/^[1-9]$/.test(key)) {
      const card = this.screen.querySelectorAll<HTMLElement>(".mh-card")[Number(key) - 1];
      card?.click();
      return Boolean(card);
    }
    if (document.activeElement instanceof HTMLInputElement && /ArrowLeft|ArrowRight/.test(key)) return false;
    if (/ArrowRight|ArrowDown/.test(key)) list[(at + 1) % list.length]?.focus();
    else if (/ArrowLeft|ArrowUp/.test(key)) list[(at - 1 + list.length) % list.length]?.focus();
    else return false;
    return true;
  }

  confirm() {
    if (this.screen && !this.screen.classList.contains("mh-title")) (document.activeElement as HTMLElement | null)?.click?.();
  }

  private text(key: string, node: Element, value: string) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    node.textContent = value;
  }
}

export function button(label: string, className: string, onClick: () => void, first = false) {
  const node = el("button", `mh-btn ${className}`, label);
  node.type = "button";
  if (first) node.dataset.first = "";
  node.onclick = onClick;
  return node;
}

export { GRADES, ICONS, moonSvg, PERK_INFO };
