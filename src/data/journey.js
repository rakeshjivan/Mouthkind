// ─── The treatment journey ─────────────────────────────────────────────────
// "What happens when" for the mouth during and after cancer treatment, worked
// out from the treatments a person has and the dates they give.
//
// Timing:
// - Chemotherapy: first signs of mucositis 3–4 days after an infusion, worst
//   days 7–14, settling in the week after (NCI PDQ, health professional).
// - Head and neck radiotherapy: soreness builds from about the second week as
//   the dose adds up, can be worst at the end and for a week or two after,
//   then heals over the following weeks (Lalla 2008). Dryness can be lasting.
// - Dental work before radiotherapy so extraction sites can heal first, and a
//   lifelong risk of osteoradionecrosis after it (Peterson 2024, ISOO-MASCC-ASCO).
// - Red flags: Cancer Council Australia (2025).

export const TREATMENTS = [
  { v: "rt_hn", label: "Radiotherapy to the head or neck" },
  { v: "chemo", label: "Chemotherapy" },
  { v: "transplant", label: "Bone marrow or stem cell transplant" },
  { v: "immuno", label: "Immunotherapy", hint: "e.g. Keytruda, Opdivo" },
  { v: "rai", label: "Radioactive iodine" },
  { v: "bone", label: "Bone-strengthening injections or drips", hint: "e.g. denosumab (Xgeva, Prolia), zoledronic acid (Zometa)" },
  { v: "surgery", label: "Surgery to the mouth, jaw or throat" },
  { v: "other", label: "Another cancer treatment" },
];

export const STAGES = [
  { v: "before", label: "Not started yet" },
  { v: "during", label: "Having treatment now" },
  { v: "after", label: "Finished in the last year" },
  { v: "long", label: "Finished more than a year ago" },
];

const DAY = 86400000;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; };
const parse = (s) => (s ? startOfDay(new Date(`${s}T00:00:00`)) : null);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

/** Where the person is up to with radiotherapy: { stage, week?, weeksAfter? } */
export function rtStage(p, now = Date.now()) {
  const start = parse(p.rtStart), weeks = Number(p.rtWeeks) || 7;
  if (start) {
    const d = daysBetween(start, now);
    if (d < 0) return { stage: "before", daysToGo: -d };
    if (d < weeks * 7) return { stage: "during", week: Math.floor(d / 7) + 1, of: weeks };
    const after = d - weeks * 7;
    if (after < 28) return { stage: "justAfter", weeksAfter: Math.floor(after / 7) + 1 };
    if (after < 365) return { stage: "after", monthsAfter: Math.max(1, Math.round(after / 30)) };
    return { stage: "long" };
  }
  const s = p.stage || "during";
  return { stage: s === "after" ? "after" : s };
}

/** Days since the most recent chemotherapy dose, or null. */
export function chemoDay(p, now = Date.now()) {
  const dates = (p.chemoDates || []).map(parse).filter((d) => d != null && d <= startOfDay(now));
  if (!dates.length) return null;
  return daysBetween(Math.max(...dates), now);
}

export const inCancerCare = (p = {}) => (p.situation || []).includes("cancer");
export const hasTx = (p, v) => (p.treatments || []).includes(v);

/** Is treatment going on now (or just finished), so the daily mouth check matters? */
export function activeTreatment(p, now = Date.now()) {
  if (!inCancerCare(p)) return false;
  if (hasTx(p, "rt_hn")) { const s = rtStage(p, now).stage; if (s === "during" || s === "justAfter") return true; }
  if ((hasTx(p, "chemo") || hasTx(p, "transplant"))) { const d = chemoDay(p, now); if (d != null && d <= 21) return true; }
  return p.stage === "during";
}

/**
 * What to expect now and next. Returns { title, now: [..], next?: {title, items}, always: [..] }
 * Each item = { t: text, refs?: [] }.
 */
export function journey(p, now = Date.now()) {
  const out = { cards: [] };
  if (hasTx(p, "rt_hn")) out.cards.push(rtCard(p, now));
  if (hasTx(p, "chemo") || hasTx(p, "transplant")) out.cards.push(chemoCard(p, now));
  if (hasTx(p, "immuno")) out.cards.push({ id: "immuno", title: "Immunotherapy", when: "Any time during or after", items: [
    { t: "Immunotherapy can cause a dry mouth or dry eyes at any point, even months in. It's an immune side effect your team can treat.", refs: ["bitoun2024"] },
    { t: "Tell your team early if your mouth or eyes become dry — don't wait for your next appointment." },
  ] });
  if (hasTx(p, "rai")) out.cards.push({ id: "rai", title: "Radioactive iodine", when: "In the weeks after", items: [
    { t: "Radioactive iodine can make the salivary glands sore or swollen and the mouth dry, sometimes for good.", refs: ["sunavala2022"] },
    { t: "Do your dry mouth check now and again in a few months, so you can see any change." },
  ] });
  if (hasTx(p, "bone")) out.cards.push({ id: "bone", title: "Bone-strengthening medicines", when: "During and for years after", items: [
    { t: "These medicines protect bones, but rarely the jaw bone can fail to heal after a tooth is taken out (osteonecrosis of the jaw).", refs: ["yarom2019"] },
    { t: "See your dentist before starting if you can, so any problem teeth are treated first.", refs: ["yarom2019"] },
    { t: "Tell every dentist you take them, before any extraction or implant. Show them your dental alert card.", refs: ["yarom2019"] },
    { t: "Keep your teeth and gums healthy so extractions aren't needed: fluoride toothpaste twice a day and regular check-ups." },
  ], always: [{ t: "Tell your dentist or team within days about bone showing in the mouth, jaw pain, swelling, a loose tooth or a numb lip or chin.", refs: ["yarom2019"] }] });
  if (!out.cards.length) out.cards.push({ id: "general", title: "During cancer treatment", when: "Now", items: [
    { t: "See your dentist before treatment starts if you can, so any problems are fixed first.", refs: ["ccaMouth2025"] },
    { t: "Brush gently twice a day with a soft brush and fluoride toothpaste, and rinse several times a day.", refs: ["ccaMouth2025"] },
    { t: "Tell your treatment team about any mouth pain, sores or changes.", refs: ["ccaMouth2025"] },
  ] });
  return out;
}

function rtCard(p, now) {
  const s = rtStage(p, now);
  const base = { id: "rt", title: "Radiotherapy to the head or neck" };
  if (s.stage === "before") return { ...base, when: s.daysToGo ? `Starts in ${s.daysToGo} day${s.daysToGo === 1 ? "" : "s"}` : "Before you start", items: [
    { t: "See your dentist now. Any teeth that need to come out should come out before radiotherapy, ideally at least 2 weeks before, so the gum can heal.", refs: ["peterson2024"] },
    { t: "Ask your dentist about a high-fluoride toothpaste or fluoride trays, and start GC Tooth Mousse Plus at night.", refs: ["nciPdqHp", "featherstone2021"] },
    { t: "Do your dry mouth check and a pH test now. Having a starting point makes later changes easy to see." },
    { t: "Check how wide you can open your mouth (the finger test in Tools), so any stiffness later is spotted early.", refs: ["nciPdqHp"] },
  ], next: "Soreness usually begins around the second week of treatment." };
  if (s.stage === "during" && s.week <= 2) return { ...base, when: `Week ${s.week} of ${s.of}`, items: [
    { t: "Taste and saliva may start to change. This is expected.", refs: ["lalla2008"] },
    { t: "Start rinsing at least 4 times a day: ¼ teaspoon bicarbonate of soda in a cup of warm water. Swish, then spit.", refs: ["canberraHN", "elad2020"] },
    { t: "Keep brushing gently with a soft brush and mild fluoride toothpaste after meals and at bedtime.", refs: ["ccaMouth2025"] },
    { t: "Do the daily mouth check — it takes 10 seconds and shows your team how you're going." },
  ], next: "Soreness usually builds from about week 2 or 3 as the dose adds up." };
  if (s.stage === "during") return { ...base, when: `Week ${s.week} of ${s.of}`, items: [
    { t: "Soreness often builds now and can be worst towards the end of treatment. You're not doing anything wrong.", refs: ["lalla2008"] },
    { t: "Ask your team about pain relief, and take it before meals so eating is easier." },
    { t: "Choose soft, moist foods — soup, yoghurt, custard, mashed vegetables. Avoid spicy, acidic, crunchy and very hot foods.", refs: ["ccaMouth2025"] },
    { t: "Keep rinsing and brushing gently, even when it's sore. A clean mouth heals better.", refs: ["elad2020"] },
    { t: "Use GC Dry Mouth Gel before meals and at bedtime if your mouth is dry." },
  ], next: "Soreness can stay at its worst for a week or two after the last treatment, then heals." };
  if (s.stage === "justAfter") return { ...base, when: `${s.weeksAfter} week${s.weeksAfter === 1 ? "" : "s"} after treatment`, items: [
    { t: "Soreness can stay at its worst for a week or two after treatment ends, then heals over the following weeks.", refs: ["lalla2008"] },
    { t: "Keep up the rinses, gentle brushing and pain relief until it settles." },
    { t: "Your dentist should see you in the months after treatment. Book it now.", refs: ["peterson2024"] },
  ], next: "Dryness may slowly improve over months, but often doesn't fully go." };
  if (s.stage === "after") return { ...base, when: s.monthsAfter ? `About ${s.monthsAfter} month${s.monthsAfter === 1 ? "" : "s"} after` : "In the year after", items: [
    { t: "Dryness may improve slowly over months but often doesn't fully recover. Keep tracking it here." },
    { t: "Use fluoride every day — high-fluoride toothpaste or trays — and GC Tooth Mousse Plus at night. A dry mouth decays fast.", refs: ["nciPdqHp", "featherstone2021"] },
    { t: "Check how wide you can open once a month. If it's getting harder, ask about jaw exercises — they help once stiffness starts.", refs: ["shao2020"] },
    { t: "See your dentist every 3 to 6 months." },
  ], always: ORN };
  return { ...base, when: "For life", items: [
    { t: "Keep using fluoride every day. A mouth that's had radiotherapy stays at high risk of decay.", refs: ["nciPdqHp"] },
    { t: "Keep checking dryness and pH every few months." },
  ], always: ORN };
}

const ORN = [
  { t: "Tell every dentist you've had radiotherapy to the head or neck, before any extraction or surgery. The jaw bone heals poorly in the treated area (osteoradionecrosis), so it needs planning.", refs: ["peterson2024"] },
];

function chemoCard(p, now) {
  const d = chemoDay(p, now);
  const base = { id: "chemo", title: hasTx(p, "transplant") ? "Chemotherapy or transplant" : "Chemotherapy" };
  const always = [{ t: "A temperature of 38°C or more is an emergency during chemotherapy. Call your treatment team or go to the emergency department straight away.", refs: ["ccaMouth2025"] }];
  if (d == null) return { ...base, when: "Each cycle", items: [
    { t: "Mouth sores usually start 3 to 4 days after a dose and are worst between days 7 and 14, then settle.", refs: ["nciPdqHp"] },
    { t: "Add your treatment dates (Me › My treatment) and the app will tell you which days to watch." },
    { t: "Rinse at least 4 times a day and brush gently with a soft brush.", refs: ["canberraHN", "elad2020"] },
  ], always };
  if (d <= 2) return { ...base, when: `Day ${d} after treatment`, items: [
    { t: "Your mouth is usually fine for the first few days. Keep rinsing and brushing gently.", refs: ["nciPdqHp"] },
    { t: "Sores may start from about day 3 or 4." },
  ], always };
  if (d <= 14) return { ...base, when: `Day ${d} after treatment`, items: [
    { t: d < 7 ? "Sores may be starting now. The worst days are usually 7 to 14." : "These are usually the worst days for mouth sores (days 7 to 14).", refs: ["nciPdqHp"] },
    { t: "Do the daily mouth check, and use pain relief before meals if eating hurts." },
    { t: "Soft, moist, bland foods are easiest. Avoid spicy, acidic and crunchy foods.", refs: ["ccaMouth2025"] },
  ], always };
  return { ...base, when: `Day ${d} after treatment`, items: [
    { t: "Sores usually settle in the week after the worst days. Keep up the rinses until they've healed.", refs: ["nciPdqHp"] },
    { t: "Add your next treatment date when you know it." },
  ], always };
}
