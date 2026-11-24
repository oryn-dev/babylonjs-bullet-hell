import type { Perk } from "../sim/types";

const svg = (body: string, box = 48) => `<svg viewBox="0 0 ${box} ${box}" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  moth: svg(`<path d="M24 21C17 9 8 6 3 8c0 9 5 15 13 17-4 2-7 7-6 13 5 2 10-1 14-9 4 8 9 11 14 9 1-6-2-11-6-13 8-2 13-8 13-17-5-2-14 1-21 13Z" fill="currentColor"/>`),
  pause: svg(`<path d="M17 12v24M31 12v24" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`),
  sound: svg(`<path d="M8 19v10h7l10 8V11l-10 8H8Z" fill="currentColor"/><path d="M31 17c4 4 4 10 0 14M36 12c7 7 7 17 0 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`),
  mute: svg(`<path d="M8 19v10h7l10 8V11l-10 8H8Z" fill="currentColor"/><path d="m32 19 10 10M42 19 32 29" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`),
  gear: svg(`<path d="M8 15h18M34 15h6M8 33h6M22 33h18" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/><circle cx="30" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="3.6"/><circle cx="18" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="3.6"/>`),
};

const ring = (r: number, o = 1, w = 2.4) => `<circle cx="48" cy="48" r="${r}" fill="none" stroke="currentColor" stroke-width="${w}" opacity="${o}"/>`;
const mothBody = `<path d="M48 46C39 30 28 26 21 28c0 12 7 20 17 23-5 3-9 9-8 17 7 3 13-2 18-12 5 10 11 15 18 12 1-8-3-14-8-17 10-3 17-11 17-23-7-2-18 2-27 18Z" fill="currentColor"/>`;

export const PERK_INFO: Record<Perk, { name: string; line: string; art: string }> = {
  graze: { name: "Silk Reach", line: "Graze from further away.", art: svg(`${ring(40, 0.35)}${ring(33, 0.6)}<g transform="translate(19 19) scale(.6)">${mothBody}</g><circle cx="80" cy="24" r="6" fill="#ffc45c"/><circle cx="14" cy="58" r="6" fill="#ff5f8f"/>`, 96) },
  calm: { name: "Still Air", line: "Light slows down near you.", art: svg(`<g transform="translate(19 19) scale(.6)">${mothBody}</g><path d="M10 26c10-6 18 6 28 0s18 6 28 0 14 2 20 0M10 74c10-6 18 6 28 0s18 6 28 0 14 2 20 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7"/>`, 96) },
  sides: { name: "Split Dust", line: "Two more streams, to both sides.", art: svg(`<g transform="translate(19 38) scale(.6)">${mothBody}</g><path d="M42 36V8M54 36V8M32 40 18 12M64 40l14-28" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`, 96) },
  life: { name: "Second Cocoon", line: "One more life.", art: svg(`<path d="M48 10c14 10 18 24 18 40S60 82 48 86C36 82 30 66 30 50s4-30 18-40Z" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M33 34c10 6 20 6 30 0M30 50c12 7 24 7 36 0M33 66c10 6 20 6 30 0" fill="none" stroke="currentColor" stroke-width="3" opacity=".6"/><g transform="translate(28.800 30) scale(.4)">${mothBody}</g>`, 96) },
  eclipse: { name: "Long Shadow", line: "Eclipse lasts longer.", art: svg(`<circle cx="48" cy="48" r="26" fill="#05060f"/>${ring(27, 1, 3)}<path d="M48 4v10M48 82v10M4 48h10M82 48h10M17 17l7 7M72 72l7 7M79 17l-7 7M24 72l-7 7" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`, 96) },
  dust: { name: "Heavy Dust", line: "Grazing and dust count double.", art: svg(`<path d="M48 8c3 22 8 27 30 30-22 3-27 8-30 30-3-22-8-27-30-30 22-3 27-8 30-30Z" fill="currentColor"/><path d="M76 58c1.600 11 4 13.500 14 15-10 1.500-12.400 4-14 15-1.600-11-4-13.500-14-15 10-1.500 12.400-4 14-15Z" fill="#ffc45c"/><circle cx="22" cy="72" r="5" fill="#ff5f8f"/>`, 96) },
};

/** The lit part of a moon disc from new (0) to full (1), growing from the right. */
export function moonPath(fill: number, r = 46, c = 50) {
  const f = Math.min(1, Math.max(0, fill));
  const rx = Math.abs(1 - 2 * f) * r;
  return `M${c} ${c - r}A${r} ${r} 0 0 1 ${c} ${c + r}A${rx.toFixed(2)} ${r} 0 0 ${f < 0.5 ? 0 : 1} ${c} ${c - r}Z`;
}

export function moonSvg(fill: number) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#141a3a"/><path d="${moonPath(fill)}" fill="#eef2ff"/></svg>`;
}

/** The grade of a night, as a moon. */
export const GRADES = [
  { fill: 0.04, name: "New Moon" },
  { fill: 0.26, name: "Crescent" },
  { fill: 0.5, name: "Half Moon" },
  { fill: 0.76, name: "Gibbous" },
  { fill: 1, name: "Full Moon" },
];
