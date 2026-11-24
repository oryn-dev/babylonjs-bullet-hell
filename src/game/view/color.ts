export type Rgb = [number, number, number];

/** A hex colour as linear light, which is what the screen pass expects. */
export function linear(hex: string, gain = 1): Rgb {
  return [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2 * gain) as Rgb;
}


/** In the order of COLORS: gold, rose, ice, amber, lilac, jade. */
export const BULLET_COLORS: Rgb[] = ["#ffb52e", "#ff3f7d", "#3fc8ff", "#ff7a1f", "#a66bff", "#2fe09a"].map((hex) => linear(hex));
export const BULLET_GLOW: Rgb[] = ["#ff8a1c", "#ff1f5c", "#1f8cff", "#ff4a10", "#7a3cff", "#10b878"].map((hex) => linear(hex));
export const SILVER = linear("#cfdcff");
