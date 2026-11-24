// ─── Today's routine: the plan as ticks, morning · through the day · night ──────
// Built from the plan items the engine has already chosen, so it never recommends
// anything the plan doesn't. Ticks are saved as one "used" entry per day (id rt_YYYY-MM-DD),
// so ticking a product also counts as using it, for the plan and the Progress tab.

export const SLOTS = [
  { id: "morning", label: "Morning", now: "This morning", from: 0 },
  { id: "day", label: "Through the day", now: "Through the day", from: 11 },
  { id: "night", label: "Tonight", now: "Tonight, before bed", from: 17 },
];

/** Which part of the day it is now. */
export const slotNow = (d = new Date()) => (d.getHours() >= 17 ? "night" : d.getHours() >= 11 ? "day" : "morning");

const ymd = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const routineId = (t = Date.now()) => `rt_${ymd(t)}`;

/**
 * The routine for this plan: [{ id, slot, text, product?, why? }].
 * `why` is the plan item to open for the reason and sources.
 */
export function buildRoutine(plan = [], { noTeeth = false } = {}) {
  const item = (id) => plan.find((i) => i.id === id || i.id === `decay.${id}` || i.id === `risk.${id}`);
  const out = [];
  const add = (slot, id, text, product, why) => out.push({ id: `${slot}.${id}`, slot, text, product, why: why?.id });

  if (noTeeth) {
    add("morning", "dentures", "Clean your dentures and rinse your mouth", null, item("dentures"));
    if (item("gel")) add("day", "gel", "GC Dry Mouth Gel before meals", "gc-dmg", item("gel"));
    const kid = plan.find((i) => i.id === "kidneyFluid");
    if (kid) add("day", "water", "Sugar-free sweets or sips, within your fluid limit", null, kid);
    else if (item("water") || item("gel")) add("day", "water", "Sip water often", null, item("water"));
    add("night", "dentures", "Take your dentures out, clean them and leave them out overnight", null, item("dentures"));
    if (item("gel")) add("night", "gel", "GC Dry Mouth Gel at bedtime", "gc-dmg", item("gel"));
    return out;
  }

  // Toothpaste: high-fluoride if the plan has it, otherwise OraNurse if it's there, otherwise everyday fluoride.
  const hf = item("hf") || item("rtFluoride");
  const ora = item("oranurse");
  const paste = hf ? { text: "Brush with high-fluoride toothpaste (5,000 ppm). Spit, don't rinse", product: "hf-paste", why: hf }
    : ora ? { text: "Brush gently with OraNurse and a soft brush", product: "oranurse", why: ora }
    : { text: "Brush with fluoride toothpaste. Spit, don't rinse", product: null, why: null };
  const tmp = item("tmp"), tm = item("tm"), gel = item("gel"), rinse = item("rinse"), water = item("water"), kid = plan.find((i) => i.id === "kidneyFluid");

  add("morning", "brush", paste.text, paste.product, paste.why);
  if (tmp) add("morning", "tmp", "GC Tooth Mousse™ Plus after brushing", "gc-tmp", tmp);

  if (gel) add("day", "gel", "GC Dry Mouth Gel before meals", "gc-dmg", gel);
  if (tm) add("day", "tm", "GC Tooth Mousse™ after a meal or snack", "gc-tm", tm);
  if (rinse) add("day", "rinse", "Rinse with salt and bicarbonate water, 4 times today", "rinse-home", rinse);
  if (kid) add("day", "water", "Sugar-free gum or sips, within your fluid limit", null, kid);
  else if (water || gel) add("day", "water", "Sip water often", null, water);

  add("night", "brush", paste.text, paste.product, paste.why);
  if (tmp) add("night", "tmp", "GC Tooth Mousse™ Plus, then nothing to eat or drink", "gc-tmp", tmp);
  if (gel) add("night", "gel", "GC Dry Mouth Gel at bedtime", "gc-dmg", gel);
  return out;
}

/** Today's ticks: the ids done. */
export const ticksToday = (entries = [], now = Date.now()) => entries.find((e) => e.id === routineId(now))?.done || [];

/** The entry to save after ticking `id` on or off. */
export function tickEntry(entries, routine, id, now = Date.now()) {
  const done = new Set(ticksToday(entries, now));
  done.has(id) ? done.delete(id) : done.add(id);
  const ids = [...done];
  const items = [...new Set(routine.filter((r) => ids.includes(r.id) && r.product).map((r) => r.product))];
  return { id: routineId(now), ts: now, kind: "used", items, done: ids, from: "routine" };
}

/** Each slot with its items, how many are done, and whether it's the one to open now. */
export function routineView(routine, done = [], now = new Date()) {
  const cur = slotNow(now);
  const order = SLOTS.map((s) => s.id);
  const has = (id) => routine.some((r) => r.slot === id);
  // Nothing to do in this part of the day: the next part with something in it is "now" (tonight after the morning).
  const at = order.indexOf(cur);
  const live = has(cur) ? cur : order.slice(at + 1).find(has) || [...order.slice(0, at)].reverse().find(has);
  return SLOTS.map((s) => {
    const items = routine.filter((r) => r.slot === s.id).map((r) => ({ ...r, done: done.includes(r.id) }));
    const n = items.filter((r) => r.done).length;
    return { ...s, items, n, total: items.length, all: items.length > 0 && n === items.length,
      current: s.id === live, next: s.id === live && live !== cur, past: order.indexOf(s.id) < order.indexOf(live) };
  }).filter((s) => s.total);
}
