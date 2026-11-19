// ─── The daily mouth check (10 seconds) ────────────────────────────────────
// For days of active cancer treatment. Five taps; a mucositis grade after the
// WHO scale (0–4: soreness → ulcers → liquids only → can't eat or drink), and
// red flags from Cancer Council Australia (2025): a temperature of 38°C or more
// on chemotherapy, pain that can't be controlled, can't eat or drink, bleeding
// that won't stop.

export const DAILY = [
  { id: "pain", text: "Mouth pain right now", options: [
    { v: 0, label: "None" }, { v: 2, label: "Mild" }, { v: 5, label: "Moderate" }, { v: 8, label: "Severe" },
  ] },
  { id: "control", text: "Is pain relief keeping it bearable?", when: (p, a) => a.pain === 8, options: [
    { v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "none", label: "Not taking any" },
  ] },
  { id: "eat", text: "Eating and drinking", options: [
    { v: "normal", label: "As usual" }, { v: "soft", label: "Soft foods only" }, { v: "liquid", label: "Liquids only" }, { v: "none", label: "Can't eat or drink" },
  ] },
  { id: "sores", text: "Sores or ulcers", options: [
    { v: "none", label: "None" }, { v: "sore", label: "Sore or red, no ulcers" }, { v: "ulcers", label: "Ulcers" }, { v: "bleed", label: "Bleeding that won't stop" },
  ] },
  { id: "urgent", text: "Swelling, breathing or swallowing", options: [
    { v: "none", label: "No problems" }, { v: "swell", label: "Face or neck swelling" }, { v: "breath", label: "Hard to breathe or swallow saliva" },
  ] },
  { id: "bone", text: "Bone showing in the mouth", when: (p) => (p.treatments || []).some((t) => t === "rt_hn" || t === "bone"), options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "unsure", label: "Not sure" },
  ] },
  { id: "dry", text: "Dryness", options: [
    { v: "none", label: "None" }, { v: "some", label: "Some" }, { v: "lot", label: "A lot" },
  ] },
  { id: "white", text: "White patches or coating", options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" },
  ] },
  { id: "fever", text: "Temperature of 38°C or more", when: (p) => (p.treatments || []).some((t) => t === "chemo" || t === "transplant"), options: [
    { v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "unsure", label: "Haven't checked" },
  ] },
];

export const dailyQuestions = (p = {}, a = {}) => DAILY.filter((q) => !q.when || q.when(p, a));

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
export function dailyTriage(a) {
  const now = [], today = [], tips = [];
  if (a.urgent === "breath") now.push("Trouble breathing or swallowing your own saliva is an emergency. Call 000 if you can't reach your team straight away.");
  if (a.urgent === "swell") now.push("Swelling of the face or neck can be a spreading infection and needs to be seen today.");
  if (a.fever === "yes") now.push("A temperature of 38°C or more during chemotherapy is an emergency.");
  if (a.eat === "none") now.push("Not being able to eat or drink needs help today — you can quickly become dehydrated.");
  if (a.sores === "bleed") now.push("Bleeding in the mouth that won't stop needs to be seen.");
  // Severe pain is expected at times (late radiotherapy, chemotherapy days 7–14). It's an
  // emergency when pain relief isn't keeping it bearable; otherwise the team should know today.
  if ((a.pain ?? 0) >= 8 && a.control !== "yes") now.push("Severe pain that pain relief isn't controlling needs treating now — you don't have to put up with it.");
  if ((a.pain ?? 0) >= 8 && a.control === "yes") today.push("Severe pain, even with pain relief — tell your team today so they can review it.");
  if (a.bone === "yes") today.push("Bone showing in the mouth needs to be seen by your dentist or team within days. Make sure no tooth is taken out nearby until they've checked.");
  if (a.bone === "unsure") today.push("If you can see something hard and white or yellow in the gum, show your dentist or team.");
  if (a.white === "yes") today.push("White patches can be thrush, which is easy to treat with drops or gel from your team. Taking warfarin? Tell them — miconazole gel can interact with it.");
  if (a.eat === "liquid") today.push("Liquids only for more than a day or two means you may need help with nutrition.");
  if ((a.pain ?? 0) >= 5 && (a.pain ?? 0) < 8) today.push("Moderate pain — ask about pain relief to take before meals.");
  if (a.sores === "ulcers") today.push("Ulcers are common during treatment. Let your team know so they can check them.");
  if (a.fever === "unsure") today.push("If you feel hot, shivery or unwell, check your temperature.");
  if (a.sores !== "none" || (a.pain ?? 0) > 0) tips.push("rinse", "gentle");
  if ((a.pain ?? 0) >= 2 || a.eat === "soft" || a.eat === "liquid") tips.push("soft");
  if (a.dry !== "none") tips.push("gel");
  return { level: now.length ? "now" : today.length ? "today" : "ok", now, today, tips: [...new Set(tips)] };
}

export const DAILY_TIPS = {
  rinse: { t: "Rinse at least 4 times a day with ¼ teaspoon bicarbonate of soda in a cup of warm water. Swish for 30 seconds, then spit.", refs: ["elad2020", "canberraHN"] },
  gentle: { t: "Keep brushing gently with a soft brush and mild fluoride toothpaste — a clean mouth heals better.", refs: ["elad2020", "ccaMouth2025"] },
  soft: { t: "Soft, moist foods are easiest: soup, yoghurt, custard, mashed vegetables. A straw can help. Avoid spicy, acidic, crunchy and very hot foods.", refs: ["ccaMouth2025"] },
  gel: { t: "GC Dry Mouth Gel before meals and at bedtime eases dryness. Sip water often.", refs: ["ccaMouth2025"] },
};

/** Done today? */
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
