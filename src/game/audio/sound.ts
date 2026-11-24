import type { AudioEngineV2 } from "@babylonjs/core/AudioV2/abstractAudio/audioEngineV2";
import type { StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";
import score from "./score.json";

const EFFECTS = { down: 0.5, hit: 0.9, eclipse: 0.8, ready: 0.55, phase: 0.8, boss: 0.95, tell: 0.5, warn: 0.32, fire: 0.4, dust: 0.16, click: 0.4, perk: 0.6, start: 0.6 };
export type Effect = keyof typeof EFFECTS;
const MIN_GAP: Partial<Record<Effect, number>> = { down: 0.05, dust: 0.05, warn: 0.12, fire: 0.12 };
const LAYERS = ["a", "b", "c"] as const;
const NOTE_LOW = 60;
const NOTE_HIGH = 91;

type Theme = { seconds: number; beat: number; chords: number[][] };
const THEMES = score as unknown as Record<string, Theme>;

/** Music in three layers that follow the fight, and one note of its chord for every graze. */
export class Sound {
  private effects = new Map<Effect, StaticSound>();
  private notes = new Map<number, StaticSound>();
  private last = new Map<string, number>();
  private theme: { id: string; layers: StaticSound[]; started: number } | null = null;
  private loading = new Map<string, Promise<StaticSound[]>>();
  private wanted = "";
  private levels = [0.8, 0, 0];
  private step = 0;

  constructor(private audio: AudioEngineV2, private url: (path: string) => string) {}

  async load() {
    await Promise.all((Object.keys(EFFECTS) as Effect[]).map(async (name) => {
      this.effects.set(name, await this.audio.createSoundAsync(name, this.url(`audio/${name}.mp3`), { volume: EFFECTS[name], maxInstances: 4 }));
    }));
    const base = await this.audio.createSoundAsync("note", this.url("audio/note.mp3"), { volume: 0.3, maxInstances: 5 });
    for (let midi = NOTE_LOW; midi <= NOTE_HIGH; midi++) {
      const note = await base.cloneAsync();
      note.pitch = (midi - 72) * 100;
      this.notes.set(midi, note);
    }
  }

  play(name: Effect) {
    const now = performance.now() / 1000;
    if (now - (this.last.get(name) ?? -9) < (MIN_GAP[name] ?? 0.02)) return;
    this.last.set(name, now);
    this.effects.get(name)?.play();
  }

  /** Climbs through the chord that sounds now; a pause starts again at the bottom. */
  graze() {
    const now = performance.now() / 1000;
    const since = now - (this.last.get("graze") ?? -9);
    if (since < 0.045) return;
    this.last.set("graze", now);
    this.step = since > 0.7 ? 0 : this.step + 1;
    const chord = this.chord();
    const turn = this.step % (chord.length * 4);
    const up = turn < chord.length * 2 ? turn : chord.length * 4 - 1 - turn;
    let midi = chord[up % chord.length] + 12 * Math.floor(up / chord.length) + 12;
    while (midi < NOTE_LOW + 4) midi += 12;
    while (midi > NOTE_HIGH) midi -= 12;
    this.notes.get(midi)?.play();
  }

  private chord() {
    const theme = this.theme && THEMES[this.theme.id];
    if (!theme) return [60, 64, 67, 71];
    const at = (this.audio.currentTime - this.theme!.started) % theme.seconds;
    return theme.chords[Math.floor((at / theme.seconds) * theme.chords.length) % theme.chords.length];
  }

  /** Cross-fades to another place's music. */
  async music(id: string) {
    if (this.wanted === id) return;
    this.wanted = id;
    const layers = await this.layers(id).catch(() => null);
    if (!layers || this.wanted !== id) return;
    const before = this.theme?.layers;
    before?.forEach((layer) => {
      layer.setVolume(0, { duration: 2 });
      setTimeout(() => this.theme?.layers !== before && layer.stop(), 2300);
    });
    const { seconds } = THEMES[id];
    layers.forEach((layer) => {
      layer.volume = 0;
      layer.play({ loop: true, loopStart: 0.25, loopEnd: 0.25 + seconds, startOffset: 0.25 });
    });
    this.theme = { id, layers, started: this.audio.currentTime };
    this.mix(this.levels, 2.5);
  }

  /** Loudness of base, pulse and boss layer. */
  mix(levels: number[], seconds = 1.2) {
    this.levels = levels;
    this.theme?.layers.forEach((layer, i) => layer.setVolume(levels[i] * 0.62, { duration: seconds }));
  }

  preload(id: string) {
    void this.layers(id).catch(() => undefined);
  }

  private layers(id: string) {
    let promise = this.loading.get(id);
    if (!promise) {
      promise = Promise.all(LAYERS.map((layer) => this.audio.createSoundAsync(`${id}-${layer}`, this.url(`audio/music/${id}-${layer}.mp3`), { volume: 0 })));
      this.loading.set(id, promise);
    }
    return promise;
  }
}
