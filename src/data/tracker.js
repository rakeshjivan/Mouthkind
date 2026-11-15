// ─── The daily mouth log ───────────────────────────────────────────────────
// Soreness (oral mucositis) and dryness (xerostomia), the two most common
// mouth side effects of cancer treatment. Scores are 0–10 numeric rating
// scales, the patient-reported format used in mucositis and xerostomia
// research (OMDQ, Stiff 2006; MASCC/ISOO, Elad 2020; Mercadante 2021).

import { DAY, dayKey } from "../lib/store.js";

export const SORE_WORDS = [
  [0, "No soreness"], [1, "A little sore"], [3, "Sore"], [5, "Quite sore"], [7, "Very sore"], [9, "The worst it's been"],
];
export const DRY_WORDS = [
  [0, "Not dry"], [1, "A bit dry"], [4, "Quite dry"], [7, "Very dry"], [9, "Extremely dry"],
];
const wordFor = (list) => (v) => (v == null ? null : [...list].reverse().find(([n]) => v >= n)[1]);
export const soreWord = wordFor(SORE_WORDS);
export const dryWord = wordFor(DRY_WORDS);

// What the person has noticed. Ids match rules.js where a rule exists.
export const SORE_SIGNS = [
  { id: "sores", label: "Ulcers or raw spots" },
  { id: "white", label: "White patches" },
  { id: "red", label: "Red, shiny patches" },
  { id: "blisters", label: "Blood blisters" },
  { id: "bleeding", label: "Bleeding gums or mouth" },
  { id: "corners", label: "Cracked lip corners" },
  { id: "swallow", label: "It hurts to swallow" },
  { id: "taste", label: "Food tastes different" },
];
export const DRY_SIGNS = [
  { id: "sticky", label: "Thick or sticky saliva" },
  { id: "water", label: "Need water to swallow food" },
  { id: "night", label: "Wake up with a dry mouth" },
  { id: "talk", label: "Hard to talk for long" },
  { id: "burning", label: "Burning tongue" },
];
// Ordered from easiest to hardest; the last option is an emergency.
export const EAT_OPTIONS = [
  { v: "normal", label: "Eating as usual" },
  { v: "soft", label: "Soft food only" },
  { v: "liquids", label: "Only drinks or very runny food" },
  { v: "none", label: "Hardly eating or drinking" },
  { v: "saliva", label: "Can't swallow, not even saliva", danger: true },
];
export const eatWord = (v) => EAT_OPTIONS.find((o) => o.v === v)?.label;

export const MOUTH_AREAS = [
  { id: "lips", label: "Lips" },
  { id: "roof", label: "Roof of mouth" },
  { id: "cheekL", label: "Left cheek" },
  { id: "cheekR", label: "Right cheek" },
  { id: "tongue", label: "Tongue" },
  { id: "gums", label: "Gums" },
  { id: "throat", label: "Throat" },
];
export const areaWord = (id) => MOUTH_AREAS.find((a) => a.id === id)?.label;

/**
 * Patient-reported soreness level on the WHO oral toxicity pattern
 * (0 none · 1 soreness/redness · 2 ulcers, can eat solids · 3 ulcers, liquids
 * only · 4 can't eat or drink). Self-report, not a clinical grade.
 */
export function soreLevel(e) {
  if (!e || e.pain == null) return null;
  const ulcers = (e.symptoms || []).some((s) => s === "sores" || s === "blisters");
  if (e.eating === "none" || e.eating === "saliva") return 4;
  if (e.eating === "liquids") return 3;
  if (ulcers) return 2;
  if (e.pain > 0 || (e.symptoms || []).includes("red")) return 1;
  return 0;
}
export const SORE_LEVELS = ["No mouth soreness", "Sore or red, eating normally", "Sores or ulcers, still eating solid food", "Sores or ulcers, only managing drinks", "Can't eat or drink"];

// ─── Mouth care routine (MASCC/ISOO basic oral care; Elad 2015) ─────────────
export const CARE = [
  { id: "brush", label: "Brush gently, morning and night", note: "Soft brush, fluoride toothpaste. Spit, don't rinse." },
  { id: "rinse", label: "Rinse with a bland mouthwash", note: "Salt or bicarb in warm water, 4 to 6 times a day." },
  { id: "moist", label: "Keep your mouth moist", note: "Sip water through the day. Saliva gel before meals and bed." },
  { id: "lips", label: "Moisturise your lips", note: "A lip balm or gel, several times a day." },
  { id: "protect", label: "Protect your teeth at night", note: "High-fluoride toothpaste, or Tooth Mousse Plus after brushing." },
];

// ─── Relief: what helps, by need ───────────────────────────────────────────
// Each card: a title, a few plain steps, and where the advice comes from.
// `when(e)` decides if it is relevant to today's log.
export const RELIEF = [
  {
    id: "rinse", need: "sore", title: "A gentle mouth rinse",
    when: (e) => (e.pain ?? 0) >= 1,
    steps: ["Mix ¼ teaspoon of salt and ¼ teaspoon of bicarb soda in a cup of warm water.", "Swish gently and spit, 4 to 6 times a day and after meals.", "Make a fresh cup each day. Avoid mouthwashes with alcohol — they sting and dry the mouth."],
    refs: ["elad2020", "ccaMouth"],
  },
  {
    id: "pain", need: "sore", title: "Ask for pain relief early",
    when: (e) => (e.pain ?? 0) >= 4,
    steps: ["You don't have to put up with a sore mouth. Your team can prescribe numbing or anti-inflammatory mouthwashes and stronger pain relief.", "Pain relief taken 30 minutes before meals makes eating easier.", "Benzydamine mouthwash is often used during head and neck radiotherapy — ask whether it suits you."],
    refs: ["elad2020"],
  },
  {
    id: "food-sore", need: "eating", title: "Food that's kind to a sore mouth",
    when: (e) => (e.pain ?? 0) >= 3 || (e.eating && e.eating !== "normal"),
    steps: ["Soft, moist, lukewarm or cool food: yoghurt, custard, scrambled egg, soups, mashed vegetables, smoothies.", "Add sauces, gravy or butter to make food slide down.", "Avoid spicy, salty, acidic, crunchy and very hot food until your mouth heals.", "A straw can get drinks past sore spots."],
    refs: ["ccaMouth", "csnzMouth"],
  },
  {
    id: "dietitian", need: "eating", title: "Keeping your strength up",
    when: (e) => e.eating === "liquids" || e.eating === "none",
    steps: ["Small amounts often are easier than full meals.", "Ask your team about nutrition drinks and a dietitian — this is exactly what they help with.", "If you can't drink enough for a day, call your team: dehydration can make you unwell quickly."],
    refs: ["csnzMouth"],
  },
  {
    id: "sip", need: "dry", title: "Moisture through the day",
    when: (e) => (e.dryness ?? 0) >= 2,
    steps: ["Carry a water bottle and take small sips often.", "Spread a saliva gel such as GC Dry Mouth Gel over your tongue and cheeks before meals and at bedtime.", "Sugar-free gum or lozenges (xylitol) can help your own saliva flow, if your mouth isn't too sore."],
    refs: ["mercadante2021", "nuchit2020"], products: ["gc-dmg"],
  },
  {
    id: "night", need: "dry", title: "A better night",
    when: (e) => (e.dryness ?? 0) >= 4 || (e.dryExtras || []).includes("night"),
    steps: ["Put a saliva gel on just before sleep — it lasts longer than water.", "A humidifier in the bedroom helps if you breathe through your mouth.", "Keep water by the bed for when you wake."],
    refs: ["mercadante2021"], products: ["gc-dmg"],
  },
  {
    id: "sticky", need: "dry", title: "Thick, sticky saliva",
    when: (e) => (e.dryExtras || []).includes("sticky"),
    steps: ["Rinse with the salt and bicarb mouthwash to loosen it.", "Drink plenty — thick saliva often thins when you're well hydrated.", "Ask your team about a steam inhaler or nebulised saline if it's hard to clear."],
    refs: ["ccaMouth"],
  },
  {
    id: "teeth", need: "dry", title: "Protect your teeth",
    when: (e) => (e.dryness ?? 0) >= 3,
    steps: ["Without saliva, teeth decay much faster — sometimes within months.", "Use a high-fluoride toothpaste at night, spit and don't rinse.", "GC Tooth Mousse Plus after brushing puts back calcium, phosphate and fluoride.", "Keep sugary snacks and drinks to mealtimes."],
    refs: ["sim2019", "agarwal2022"], products: ["gc-tmp", "hf-paste"],
  },
  {
    id: "taste", need: "eating", title: "When food tastes wrong",
    when: (e) => (e.symptoms || []).includes("taste"),
    steps: ["Try stronger flavours — herbs, marinades — if food tastes bland.", "Plastic cutlery helps if food tastes metallic.", "Cold food often tastes better than hot.", "Taste usually comes back gradually after treatment ends."],
    refs: ["ccaMouth"],
  },
  {
    id: "lips", need: "sore", title: "Dry or cracked lips",
    when: (e) => (e.symptoms || []).includes("corners") || (e.dryness ?? 0) >= 5,
    steps: ["Use a lip balm or gel several times a day.", "Cracked corners that stay sore may be thrush — ask your team or GP; it's easily treated."],
    refs: ["hong2024"],
  },
];
export const NEEDS = [
  { id: "sore", label: "Sore mouth" },
  { id: "dry", label: "Dry mouth" },
  { id: "eating", label: "Eating" },
];
export const reliefFor = (e) => (e ? RELIEF.filter((r) => r.when(e)) : []);

// ─── Helpers over the log ──────────────────────────────────────────────────
export const dailyEntries = (entries) => entries.filter((e) => e.kind === "daily").sort((a, b) => a.ts - b.ts);
/** The latest daily log for each of the last n days (oldest first); null where nothing was logged. */
export function lastDays(entries, n, now = Date.now()) {
  const byDay = {};
  for (const e of dailyEntries(entries)) byDay[dayKey(e.ts)] = e;
  return Array.from({ length: n }, (_, i) => {
    const ts = now - (n - 1 - i) * DAY;
    return { ts, key: dayKey(ts), e: byDay[dayKey(ts)] || null };
  });
}
