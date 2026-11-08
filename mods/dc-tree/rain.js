// Digital rain, drawn natively: each column is three stacked text layers (a white-hot
// head, a green trail, a dark tail) whose frames are the drop at every step, all on
// Herdr's shared frames() clock, so nothing runs in the script while it falls.
// A copy lives in dc-agents/rain.js (mods can't import from each other).

import { div } from "gpui-kit";

// Half-width katakana, mirrored in spirit, plus digits and a few symbols.
export const GLYPHS = "★✦◆◇◈▣▤▥0123456789Z:=*+-<>¦";

// A small seeded generator, so a column looks the same after every re-render.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}
export const glyph = (r) => GLYPHS[Math.floor(r() * GLYPHS.length)];

// One column: { head, trail, tail } frame lists, each frame a rows-line string.
export function column(rows, seed, trailLen = 7) {
  const r = rng(seed);
  const gap = 4 + Math.floor(r() * rows * 1.5);
  const steps = rows + trailLen + gap;
  const chars = Array.from({ length: rows }, () => glyph(r));
  const head = [], trail = [], tail = [];
  for (let f = 0; f < steps; f++) {
    // glyphs keep mutating as the code falls
    for (let k = 0; k < 2; k++) chars[Math.floor(r() * rows)] = glyph(r);
    const h = f;   // head row this step
    const line = (pick) => chars.map((c, i) => (pick(h - i) ? c : " ")).join("\n");
    head.push(line((d) => d === 0));
    trail.push(line((d) => d >= 1 && d <= 3));
    tail.push(line((d) => d >= 4 && d < trailLen));
  }
  return { head, trail, tail };
}

// The rain over a width x height box: absolute columns, `size` px glyphs.
// `still`: a frozen frame (the rain is paused), cheaper than animating.
export function rain({ width, height, size = 12, seed = 1, speed = 85, colors, still = false }) {
  const colW = Math.round(size * 1.05);
  const rows = Math.max(3, Math.floor(height / (size + 1)));
  const cols = Math.max(1, Math.floor(width / colW));
  const out = [];
  for (let i = 0; i < cols; i++) {
    const c = column(rows, seed * 7919 + i * 104729, 5 + (i * 3) % 6);
    const ms = speed + ((i * 37) % 5) * 18;   // columns fall at slightly different speeds
    const at = (i * 13) % c.head.length;       // a frozen frame per column
    const layer = (list, color, bold) => {
      const el = div().absolute().top(0).left(i * colW).w(colW).text_size(size).line_height(`${size + 1}px`)
        .font_family("JetBrains Mono").whitespace_nowrap().text_color(color)
        .when(Boolean(bold), (e) => e.font_semibold());
      return still ? el.child(list[at]) : el.child(list[at]).frames(list, ms);
    };
    out.push(layer(c.tail, colors.tail), layer(c.trail, colors.trail), layer(c.head, colors.head, true));
  }
  return out;
}
