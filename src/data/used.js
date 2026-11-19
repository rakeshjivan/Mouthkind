// ─── What I used ───────────────────────────────────────────────────────────
// A quick log of what people use for their mouth, so their own dry mouth
// scores can be seen before and after starting something. It shows a
// pattern, not proof: other things change at the same time.

export const USED = [
  { v: "gc-dmg", label: "GC Dry Mouth Gel", product: "gc-dmg" },
  { v: "gc-tmp", label: "GC Tooth Mousse™ Plus", product: "gc-tmp" },
  { v: "gc-tm", label: "GC Tooth Mousse™", product: "gc-tm" },
  { v: "hf", label: "High-fluoride toothpaste", product: "neutrafluor" },
  { v: "tray", label: "Fluoride trays" },
  { v: "rinse", label: "Bicarb or salt water rinse" },
  { v: "gum", label: "Sugar-free gum or xylitol" },
  { v: "water", label: "Water bottle with me all day" },
  { v: "jaw", label: "Jaw exercises" },
];
export const usedLabel = (v) => USED.find((u) => u.v === v)?.label || v;

const DAY = 86400000;
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * For each thing used on 3+ days: average SIP score in the 6 weeks before it was
 * first used vs since (needs 2+ readings each side). Returns insights, biggest change first.
 */
export function usedInsights(entries) {
  const used = entries.filter((e) => e.kind === "used");
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);
  const out = [];
  for (const u of USED) {
    const days = used.filter((e) => (e.items || []).includes(u.v)).map((e) => e.ts).sort((a, b) => a - b);
    if (new Set(days.map((t) => new Date(t).toDateString())).size < 3) continue;
    const first = days[0];
    const before = sips.filter((s) => s.ts < first && s.ts >= first - 42 * DAY).map((s) => s.sip);
    const after = sips.filter((s) => s.ts >= first).map((s) => s.sip);
    if (before.length < 2 || after.length < 2) continue;
    const b = Math.round(mean(before) * 10) / 10, a = Math.round(mean(after) * 10) / 10;
    out.push({ v: u.v, label: u.label, first, before: b, after: a, change: Math.round((a - b) * 10) / 10 });
  }
  return out.sort((x, y) => x.change - y.change);
}

/** Which days each thing was used, for the strip under the charts. */
export function usedDays(entries) {
  const map = {};
  for (const e of entries) if (e.kind === "used") for (const v of e.items || []) (map[v] ??= []).push(e.ts);
  return map;
}
