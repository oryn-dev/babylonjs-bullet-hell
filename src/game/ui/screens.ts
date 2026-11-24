import { settings, updateSettings } from "../../oryn/settings";
import { DIFFICULTIES } from "../sim/difficulty";
import type { Mode } from "../sim/run";
import { STAGES } from "../sim/stages";
import type { Perk } from "../sim/types";
import type { Options } from "../progress";
import { button, el, GRADES, moonSvg, PERK_INFO } from "./ui";

export function titleScreen(o: { touch: boolean; difficulty: number; best: number; stage: number; onDifficulty(i: number): void; onFly(mode: Mode): void; onOptions(): void; onStage(i: number): void }) {
  const screen = el("div", "mh-screen mh-title");
  const head = el("div", "", `<h1><span>M<i>${moonSvg(1)}</i>th</span> <span>H<i>${moonSvg(0.42)}</i>ur</span></h1><p class="sub">Every light wants you. Fly between them.</p>`);
  const foot = el("div", "foot"), stack = el("div", "foot stack");
  const pills = el("div", "mh-pills");
  DIFFICULTIES.forEach((d, i) => {
    const pill = button(d.name, i === o.difficulty ? "on" : "", () => {
      pills.querySelectorAll("button").forEach((b, k) => b.classList.toggle("on", k === i));
      o.onDifficulty(i);
    });
    pills.append(pill);
  });
  const fly = button("Fly tonight", "main", () => o.onFly("night"), true);
  const modes = el("div", "mh-row");
  modes.append(button("Endless", "", () => o.onFly("endless")), button("Daily night", "", () => o.onFly("daily")), button("Options", "", o.onOptions));
  stack.append(fly, pills, modes);
  if (o.stage > 0) modes.prepend(button(`From ${STAGES[o.stage].name.replace("The ", "the ")}`, "", () => o.onStage(o.stage)));
  const how = o.touch ? "Drag anywhere. The moth shoots by itself. Only the glowing point in its middle can be hit, so fly close." : "Arrow keys, WASD or mouse. The moth shoots by itself. Only the glowing point in its middle can be hit, so fly close. Shift flies slowly.";
  foot.append(stack, el("p", "how", `${how}${o.best ? ` Best night: ${o.best.toLocaleString("en-US")}.` : ""}`));
  screen.append(head, foot);
  return screen;
}

export function pauseScreen(o: { onResume(): void; onOptions(): void; onLeave(): void; onRestart(): void }) {
  const screen = el("div", "mh-screen", "<h2>The night holds its breath</h2>");
  const row = el("div", "mh-row");
  row.append(button("Fly on", "main", o.onResume, true));
  const more = el("div", "mh-row");
  more.append(button("Start over", "", o.onRestart), button("Options", "", o.onOptions), button("Title", "", o.onLeave));
  screen.append(row, more);
  return screen;
}

export function optionsScreen(options: Options, onChange: () => void, onBack: () => void) {
  const screen = el("div", "mh-screen", "<h2>Options</h2>");
  const list = el("div", "mh-opts");
  const volume = el("label", "mh-opt", "<span>Sound</span>");
  const range = el("input", "mh-range");
  Object.assign(range, { type: "range", min: "0", max: "100", value: String(Math.round(settings.volume * 100)) });
  range.oninput = () => updateSettings({ volume: Number(range.value) / 100 });
  volume.append(range);
  list.append(volume);
  const toggle = (key: keyof Options, label: string, line: string) => {
    const node = el("button", "mh-opt", `<span>${label}<small>${line}</small></span><u></u>`);
    node.type = "button";
    node.setAttribute("role", "switch");
    const show = () => node.setAttribute("aria-checked", String(options[key]));
    node.onclick = () => { options[key] = !options[key]; show(); onChange(); };
    show();
    list.append(node);
  };
  toggle("contrast", "Clear bullets", "Wider dark rim, no glow around them.");
  toggle("calmFlashes", "Fewer flashes", "Softer flashes and less shaking.");
  toggle("extraLife", "Two more lives", "Such nights do not count as a best score.");
  const quality = el("button", "mh-opt", `<span>Picture quality<small>Lower runs smoother on older phones.</small></span><b></b>`);
  quality.type = "button";
  const names = { low: "Low", medium: "Medium", high: "High" } as const;
  const showQuality = () => (quality.querySelector("b")!.textContent = names[settings.quality]);
  quality.onclick = () => { updateSettings({ quality: settings.quality === "low" ? "medium" : settings.quality === "medium" ? "high" : "low" }); showQuality(); };
  showQuality();
  list.append(quality);
  screen.append(list, button("Back", "", onBack, true));
  return screen;
}

export function perkScreen(offer: Perk[], onTake: (perk: Perk) => void) {
  const screen = el("div", "mh-screen", "<h2>Choose a wing dust</h2>");
  const cards = el("div", "mh-cards");
  offer.forEach((perk, i) => {
    const info = PERK_INFO[perk];
    const card = el("button", "mh-card", `<i>${info.art}</i><b>${info.name}</b><span>${info.line}</span>`);
    card.type = "button";
    if (i === 1) card.dataset.first = "";
    card.onclick = () => onTake(perk);
    cards.append(card);
  });
  screen.append(cards);
  return screen;
}

export interface EndInfo {
  won: boolean;
  mode: Mode;
  title: string;
  line: string;
  score: number;
  grazes: number;
  hits: number;
  grade: number;
  isBest: boolean;
  practice: boolean;
  /** Stage to start from again, or null. */
  again: number | null;
}

export function endScreen(o: EndInfo, onAgain: () => void, onStage: (stage: number) => void, onTitle: () => void) {
  const screen = el("div", "mh-screen", `<h2>${o.title}</h2><p class="line">${o.line}</p>`);
  if (o.won) screen.prepend(el("div", "mh-grade", moonSvg(GRADES[o.grade].fill)));
  const stat = (value: string, label: string, big = false) => `<div class="${big ? "big" : ""}"><b>${value}</b><span>${label}</span></div>`;
  screen.append(el("div", "mh-stats", stat(o.score.toLocaleString("en-US"), "Score", true) + stat(String(o.grazes), "Grazed") + stat(String(o.hits), o.hits === 1 ? "Life lost" : "Lives lost") + (o.won ? stat(GRADES[o.grade].name, "Grade") : "")));
  if (o.isBest) screen.append(el("p", "mh-new", "Your best night so far"));
  const row = el("div", "mh-row");
  row.append(button("Fly again", "main", onAgain, true));
  const more = el("div", "mh-row");
  if (o.again !== null) more.append(button(`From ${STAGES[o.again].name.replace("The ", "the ")}`, "", () => onStage(o.again!)));
  more.append(button("Title", "", onTitle));
  screen.append(row, more);
  return screen;
}

export function endingScreen(lines: string[]) {
  const screen = el("div", "mh-screen mh-ending");
  lines.forEach((line, i) => setTimeout(() => screen.replaceChildren(el("p", "", line)), i * 5200 + 900));
  return screen;
}
