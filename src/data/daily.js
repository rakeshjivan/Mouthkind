// ─── The symptom log (under a minute) ───────────────────────────────────────
// One log for everyone, opened from the Log button. The core six (dryness, pain,
// eating, sores, night waking, taste) every time; tooth and gum problems for anyone
// with teeth or dentures; red flags shown to those they apply to.
// Dryness and pain on 0–10 numeric rating scales (Hjermstad 2011); pain bands from
// Serlin 1995 (1–4 mild, 5–6 moderate, 7–10 severe). Sores and eating give a WHO-style
// oral mucositis grade (0–4). Red flags from Cancer Council Australia (2025): a
// temperature of 38°C or more on chemotherapy, pain that can't be controlled, can't eat
// or drink, bleeding that won't stop.

export const TEETH_FLAGS = [
  { v: "ache", label: "Toothache" },
  { v: "sensitive", label: "Sensitivity to hot or cold" },
  { v: "broken", label: "Broken tooth or filling" },
  { v: "gums", label: "Bleeding gums" },
  { v: "swell", label: "Gum swelling or a bad taste" },
  { v: "denture", label: "Denture rubbing" },
];

export const DAILY = [
  { id: "dryness", text: "How dry is your mouth right now?", scale: "dry", core: true, refs: ["hjermstad2011", "basch2022"], options: Array.from({ length: 11 }, (_, v) => ({ v, label: String(v) })) },
  { id: "pain", text: "Mouth pain right now", scale: "pain", core: true, refs: ["hjermstad2011", "serlin1995"], options: Array.from({ length: 11 }, (_, v) => ({ v, label: String(v) })) },
  { id: "control", text: "Is pain relief keeping it bearable?", when: (p, a) => (a.pain ?? 0) >= 7, options: [
    { v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "none", label: "Not taking any" },
  ] },
  { id: "eat", text: "Eating and drinking", core: true, options: [
    { v: "normal", label: "As usual" }, { v: "soft", label: "Soft foods only" }, { v: "liquid", label: "Liquids only" }, { v: "none", label: "Can't eat or drink" },
  ] },
  { id: "sores", text: "Sores or ulcers", core: true, options: [
    { v: "none", label: "None" }, { v: "sore", label: "Sore or red, no ulcers" }, { v: "ulcers", label: "Ulcers" }, { v: "bleed", label: "Bleeding that won't stop" },
  ] },
  { id: "night", text: "Did dryness wake you last night?", core: true, options: [
    { v: "no", label: "No" }, { v: "once", label: "Once" }, { v: "more", label: "More than once" },
  ] },
  { id: "taste", text: "Taste", core: true, options: [
    { v: "normal", label: "Normal" }, { v: "changed", label: "Changed" }, { v: "lost", label: "Hard to taste anything" },
  ] },
  { id: "teeth", text: "Anything new with your teeth or gums?", many: true, none: "Nothing new", options: TEETH_FLAGS },
  { id: "white", text: "White patches or coating", options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" },
  ] },
  { id: "fever", text: "Temperature of 38°C or more", safety: "A temperature of 38°C or more during chemotherapy is an emergency. Call your treatment team's 24-hour number now, or go to the emergency department.", when: (p) => (p.treatments || []).some((t) => t === "chemo" || t === "transplant"), options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "unsure", label: "Haven't checked" },
  ] },
  { id: "bone", text: "Bone showing in the mouth", when: (p) => (p.treatments || []).some((t) => t === "rt_hn" || t === "bone"), options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "unsure", label: "Not sure" },
  ] },
  { id: "urgent", text: "Swelling, breathing or swallowing", safety: "Trouble breathing, or can't swallow your own saliva: call 000. New swelling of the face or neck: see a doctor or dentist today.", options: [
    { v: "none", label: "No problems" }, { v: "swell", label: "Face or neck swelling" }, { v: "breath", label: "Hard to breathe or swallow saliva" },
  ] },
];

/** Dryness 0–10 as the older none/some/a lot, which the plan rules still read. */
export const dryWord = (n) => n == null ? undefined : n === 0 ? "none" : n >= 7 ? "lot" : "some";
export const teethFlags = (a = {}) => [].concat(a.teeth || []).filter((v) => v !== "none");

/** Triage for this person: cancer care, and chemotherapy or a transplant. */
export const triageFor = (a, p = {}, extra = {}) => dailyTriage(a, {
  ...extra,
  milk: [].concat(p.fu?.allergy?.v || []).includes("milk"),
  hb: [].concat(p.fu?.allergy?.v || []).includes("hb"),
  cancer: (p.situation || []).includes("cancer"),
  chemo: (p.situation || []).includes("cancer") && (p.treatments || []).some((t) => t === "chemo" || t === "transplant"),
  // Chemotherapy, radiotherapy (any site) and immunotherapy commonly dry the mouth (Jensen 2010).
  dryingTx: (p.situation || []).includes("cancer") && (!(p.treatments || []).length || (p.treatments || []).some((t) => ["chemo", "transplant", "rt_hn", "rt_other", "immuno", "rai"].includes(t))),
});

export const dailyQuestions = (p = {}, a = {}) => DAILY.filter((q) => !q.when || q.when(p, a));

/** Pain bands on the 0–10 scale. */
export const painBand = (n) => n == null ? null : n === 0 ? { id: "none", label: "No pain", tone: "good" }
  : n <= 4 ? { id: "mild", label: "Mild", tone: "good" } : n <= 6 ? { id: "moderate", label: "Moderate", tone: "amber" }
  : { id: "severe", label: "Severe", tone: "red" };

/** WHO-style oral mucositis grade, 0–4, from the person's own answers. */
export function mucositisGrade(a) {
  if (a.eat === "none") return 4;
  const ulcers = a.sores === "ulcers" || a.sores === "bleed";
  if (ulcers && a.eat === "liquid") return 3;
  if (ulcers) return 2;
  if (a.sores === "sore" || (a.pain ?? 0) > 0) return 1;
  return 0;
}

export const GRADES = [
  { g: 0, label: "No mouth sores", tone: "good" },
  { g: 1, label: "Sore, no ulcers", tone: "amber" },
  { g: 2, label: "Ulcers, still eating", tone: "orange" },
  { g: 3, label: "Ulcers, liquids only", tone: "red" },
  { g: 4, label: "Can't eat or drink", tone: "red" },
];

/**
 * What to do: { level: "now" | "today" | "ok", reasons: [..], tips: [ids] }
 * now   = contact the treatment team now or go to the emergency department
 * today = tell the team today
 */
export function dailyTriage(a, opts = {}) {
  const { cancer = true } = opts;
  const now = [], today = [], notes = [], tips = [];
  const pain = a.pain ?? 0;
  const team = cancer ? "your team" : "your dentist or doctor";
  if (a.urgent === "breath") now.push(`Trouble breathing or swallowing your own saliva is an emergency. Call 000 if you can't reach ${team} straight away.`);
  if (a.urgent === "swell") now.push("Swelling of the face or neck can be a spreading infection and needs to be seen today.");
  if (a.fever === "yes") now.push("A temperature of 38°C or more during chemotherapy is an emergency.");
  if (a.eat === "none") now.push("Not being able to eat or drink needs help today — you can quickly become dehydrated.");
  if (a.sores === "bleed") now.push("Bleeding in the mouth that won't stop needs to be seen.");
  if (cancer) {
    // Severe pain is expected at times (late radiotherapy, chemotherapy days 7–14). It's an
    // emergency when pain relief isn't keeping it bearable; otherwise the team should know today.
    if (pain >= 7 && a.control !== "yes") now.push("Severe pain that pain relief isn't controlling needs treating now — you don't have to put up with it.");
    if (pain >= 7 && a.control === "yes") today.push("Severe pain, even with pain relief — tell your team today so they can review it.");
    if (pain >= 5 && pain < 7) today.push("Moderate pain — ask about pain relief to take before meals.");
  } else {
    // Outside cancer care, severe mouth pain is usually a dental problem: same-day care, not an emergency
    // unless there's swelling, fever or trouble swallowing (asked separately).
    if (pain >= 7) today.push("Severe mouth pain should be seen by a dentist today. Go to an emergency department if your face or neck swells, or you have a fever or trouble swallowing.");
    if (pain >= 5 && pain < 7) notes.push("Moderate mouth pain — if it lasts more than a day or two, or keeps coming back, see your dentist.");
  }
  if (a.bone === "yes") today.push("Bone showing in the mouth needs to be seen by your dentist or team within days. Make sure no tooth is taken out nearby until they've checked.");
  if (a.bone === "unsure") today.push("If you can see something hard and white or yellow in the gum, show your dentist or team.");
  if (a.white === "yes") today.push(`White patches can be thrush, which is easy to treat with drops or gel from ${cancer ? "your team" : "your pharmacist, dentist or doctor"}. Taking warfarin? Tell them — miconazole gel can interact with it.`);
  if (a.eat === "liquid") today.push("Liquids only for more than a day or two means you may need help with nutrition.");
  if (a.sores === "ulcers") (cancer ? today : notes).push(cancer ? "Ulcers are common during treatment. Let your team know so they can check them." : "A mouth ulcer that hasn't healed within 2 weeks should be checked by your dentist or doctor.");
  if (a.fever === "unsure") today.push("If you feel hot, shivery or unwell, check your temperature.");
  if ((a.sores && a.sores !== "none") || pain > 0) tips.push("rinse", "gentle");
  if (pain >= 3 || a.eat === "soft" || a.eat === "liquid") tips.push("soft");
  const flags = teethFlags(a);
  const chemo = cancer && opts.chemo;
  if (flags.includes("swell")) today.push(chemo
    ? "Gum swelling or a bad taste can be an infection. Tell your team today, because infections need quick treatment during chemotherapy."
    : `Gum swelling or a bad taste can be a gum or tooth infection. ${cancer ? "Tell your team, and see" : "See"} your dentist today or tomorrow.`);
  if (flags.includes("ache")) notes.push("Toothache: book in with your dentist this week. If it's severe, or your face swells, go sooner.");
  if (flags.includes("sensitive")) notes.push("Sensitivity to hot or cold is often from worn enamel or exposed roots. Brush with a sensitive toothpaste and spit, don't rinse. If it lasts more than a week or two, or wakes you at night, see your dentist.");
  if (flags.includes("broken")) notes.push("A broken tooth or filling: book in with your dentist. Until then, sugar-free gum or dental wax can cover a sharp edge so it doesn't cut your cheek or tongue.");
  if (flags.includes("gums")) notes.push(chemo ? "Bleeding gums: keep brushing gently with a soft brush. If it won't stop, or you have bruising elsewhere, call your team." : "Bleeding gums usually mean the gums are inflamed. Keep brushing gently along the gumline, and ask your dentist or hygienist to check them.");
  if (flags.includes("denture")) notes.push("Denture rubbing: leave them out when you can, and see your dentist to ease the sore spot. A sore that hasn't healed in 2 weeks should be checked.");
  if (a.night === "more") notes.push(`Waking with a dry mouth: use ${opts.hb ? "a paraben-free saliva gel" : "GC Dry Mouth Gel"} at bedtime${opts.fluidLimit ? ", and keep any sips at night within your fluid limit" : " and keep water by the bed"}.`);
  const dry = a.dryness != null ? dryWord(a.dryness) : a.dry;
  const isDry = (dry && dry !== "none") || a.night === "once" || a.night === "more";
  // The GC routine: Dry Mouth Gel for a dry mouth and all cancer care; Tooth Mousse for those
  // and a Moderate or High decay risk, unless there are no natural teeth or a milk protein allergy.
  const tx = opts.dryingTx ?? cancer;
  if ((isDry || tx) && !opts.hb) tips.push("gel");
  if ((isDry || tx || !!opts.decayRisk) && !opts.noTeeth && !opts.milk) tips.push("tmp", "tm");
  // The GC routine order: Tooth Mousse Plus morning and night, then gel and Tooth Mousse through the day.
  const ORDER = ["rinse", "gentle", "tmp", "gel", "tm", "soft"];
  tips.sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
  return { level: now.length ? "now" : today.length ? "today" : "ok", now, today, notes, tips: [...new Set(tips)] };
}

export const DAILY_TIPS = {
  rinse: { t: "Rinse at least 4 times a day with ¼ teaspoon bicarbonate of soda in a cup of warm water. Swish for 30 seconds, then spit.", refs: ["elad2020", "canberraHN"] },
  gentle: { t: "Keep brushing gently with a soft brush and mild fluoride toothpaste — a clean mouth heals better.", refs: ["elad2020", "ccaMouth2025"] },
  soft: { t: "Soft, moist foods are easiest: soup, yoghurt, custard, mashed vegetables. A straw can help. Avoid spicy, acidic, crunchy and very hot foods.", refs: ["ccaMouth2025"] },
  gel: { t: "GC Dry Mouth Gel: spread a pea-sized amount over your tongue, cheeks and gums before meals, at bedtime and whenever your mouth feels dry. It lasts longer than sips of water.", refs: ["nuchit2020", "ccaMouth2025"], products: ["gc-dmg"] },
  tmp: { t: "Morning and night, after brushing: GC Tooth Mousse™ Plus. Smear a pea-sized amount over your teeth, then don't rinse, eat or drink for 30 minutes.", refs: ["featherstone2021", "agarwal2022"], products: ["gc-tmp"] },
  tm: { t: "Through the day: GC Tooth Mousse™ after meals or whenever your mouth feels dry. You can mix it with GC Dry Mouth Gel.", refs: ["featherstone2021"], products: ["gc-tm"] },
};

/** Done today? */
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
