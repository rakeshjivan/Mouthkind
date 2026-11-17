// ─── Dry Mouth Risk Score ──────────────────────────────────────────────────
// A transparent points checklist of known risk factors for dry mouth
// (xerostomia) and low saliva flow (hyposalivation).
//
// NOT A VALIDATED INSTRUMENT. No published, validated dry mouth risk score
// exists to our knowledge. Points reflect the strength of the evidence for
// each factor (tier) and are set here, in one place, so they can be tuned —
// and, later, calibrated against stimulated and unstimulated flow rates.
//
//   Tier A  near-certain hyposalivation (35)      H&N radiotherapy, Sjögren's
//   Tier B  strong, consistent association (8–20) polypharmacy, antimuscarinics, transplant…
//   Tier C  moderate association (4–7)            many drug classes, diabetes, CPAP…
//   Tier D  weaker or contributory (2–3)          caffeine, sex, menopause…
//
// Sources: Wolff 2017 (WWOM VI medication list); Villa 2016 (mechanisms);
// Agostini 2018 (prevalence by age and sex); Huang 2025 (diabetes);
// Raoof 2023 (OSA, CPAP, MAD); Sunavala-Dossabhoy 2022 (radioiodine);
// Usmani 2019 (bladder antimuscarinics); Shiboski 2017 (Sjögren's);
// Villa 2015 (causes overview).
// `limited: true` = plausible and commonly listed, but no primary source yet
// checked for this app. Shown in the plan for clinical review.
// Mercadante 2021 (cancer therapy).

export const RISK_VERSION = 1;

// ── Questions ───────────────────────────────────────────────────────────────
// "one": pick one option. "many": tick any. Every option carries its points.
export const RISK_QUESTIONS = [
  {
    id: "age", type: "one", section: "About you", text: "How old are you?",
    options: [
      { v: "u40", label: "Under 40", pts: 0 },
      { v: "40", label: "40 to 64", as: "Age 40 to 64", pts: 3, why: "Dry mouth becomes more common with age, mostly because of medicines and health conditions.", refs: ["agostini2018", "villa2015"] },
      { v: "65", label: "65 to 79", as: "Age 65 to 79", pts: 6, why: "Dry mouth affects many people over 65 — more medicines, more conditions.", refs: ["agostini2018"] },
      { v: "80", label: "80 or over", as: "Age 80 or over", pts: 8, why: "Dry mouth is most common in people over 80.", refs: ["agostini2018"] },
    ],
  },
  {
    id: "sex", type: "one", section: "About you", text: "Are you…",
    options: [
      { v: "f", label: "Female", pts: 2, why: "Women report dry mouth more often than men.", refs: ["agostini2018"] },
      { v: "m", label: "Male", pts: 0 },
      { v: "x", label: "Prefer not to say", pts: 0 },
    ],
  },
  {
    id: "meds", type: "one", section: "Medicines", text: "How many different medicines do you take regularly?",
    hint: "Count tablets, inhalers, patches and injections from your doctor, and anything from the pharmacy you take most days.",
    options: [
      { v: "0", label: "None", pts: 0 },
      { v: "1", label: "1 or 2", as: "1 or 2 regular medicines", pts: 3, why: "Each regular medicine adds a little to the chance of a dry mouth.", refs: ["wolff2017"] },
      { v: "3", label: "3 or 4", as: "3 or 4 regular medicines", pts: 7, why: "The more medicines you take, the more likely a dry mouth is.", refs: ["wolff2017", "villa2016"] },
      { v: "5", label: "5 to 9", as: "5 to 9 regular medicines", pts: 14, why: "Taking five or more medicines (polypharmacy) is one of the strongest everyday causes of dry mouth.", refs: ["wolff2017", "villa2016"] },
      { v: "10", label: "10 or more", as: "10 or more regular medicines", pts: 20, why: "Ten or more medicines makes a dry mouth very likely.", refs: ["wolff2017", "villa2016"] },
    ],
  },
  {
    id: "medTypes", type: "many", section: "Medicines", text: "Do you take any of these?",
    hint: "Tick any that apply. Not sure? Check the box or ask your pharmacist.", none: "None of these, or not sure",
    options: [
      { v: "bladder", label: "Bladder tablets for urgency or leaking", hint: "e.g. oxybutynin, solifenacin, tolterodine", pts: 10, why: "Bladder medicines that block acetylcholine cause dry mouth in nearly half of the people who take them.", refs: ["usmani2019", "wolff2017"] },
      { v: "tca", label: "Older antidepressants, or amitriptyline for pain or sleep", hint: "e.g. amitriptyline, nortriptyline, doxepin", pts: 8, why: "Tricyclic medicines strongly reduce saliva.", refs: ["wolff2017"] },
      { v: "antidep", label: "Other antidepressants", hint: "e.g. sertraline, escitalopram, venlafaxine, duloxetine", pts: 5, why: "Many antidepressants list dry mouth as a common side effect.", refs: ["wolff2017"] },
      { v: "antipsych", label: "Antipsychotics or mood stabilisers", hint: "e.g. quetiapine, olanzapine, lithium", pts: 8, why: "These medicines commonly reduce saliva.", refs: ["wolff2017"] },
      { v: "antihist", label: "Antihistamines, or sleeping tablets", hint: "e.g. promethazine, diphenhydramine, zopiclone, temazepam", pts: 5, why: "Sedating antihistamines and sleep medicines dry the mouth.", refs: ["wolff2017"] },
      { v: "opioid", label: "Strong pain relief", hint: "e.g. oxycodone, tramadol, codeine, morphine", pts: 5, why: "Opioid pain medicines reduce saliva.", refs: ["wolff2017"] },
      { v: "bp", label: "Blood pressure or fluid tablets", hint: "e.g. furosemide, hydrochlorothiazide, metoprolol, clonidine", pts: 4, why: "Fluid tablets and several blood pressure medicines can reduce saliva.", refs: ["wolff2017", "villa2016"] },
      { v: "inhaler", label: "Inhalers for asthma or COPD", hint: "e.g. tiotropium (Spiriva), ipratropium, steroid inhalers", pts: 3, why: "Some inhalers dry the mouth directly.", refs: ["wolff2017"] },
      { v: "parkinson", label: "Parkinson's medicines", hint: "e.g. benztropine, levodopa", pts: 5, why: "Several Parkinson's medicines reduce saliva.", refs: ["wolff2017"] },
      { v: "seizure", label: "Epilepsy or nerve-pain medicines", hint: "e.g. pregabalin, gabapentin, carbamazepine", pts: 3, why: "Some of these list dry mouth as a side effect.", refs: ["wolff2017"] },
      { v: "stimulant", label: "ADHD medicines", hint: "e.g. methylphenidate, dexamfetamine, lisdexamfetamine", pts: 4, why: "Stimulants commonly cause dry mouth.", refs: ["wolff2017"] },
      { v: "relaxant", label: "Muscle relaxants", hint: "e.g. baclofen, orphenadrine", pts: 3, why: "Some muscle relaxants reduce saliva.", refs: ["wolff2017"] },
      { v: "decong", label: "Cold and flu tablets or decongestants, most days", hint: "e.g. pseudoephedrine", pts: 2, why: "Decongestants dry the mouth while you take them.", refs: ["wolff2017"] },
    ],
  },
  {
    id: "conditions", type: "many", section: "Health", text: "Do you have any of these?", none: "None of these",
    options: [
      { v: "sjogren", label: "Sjögren's syndrome", pts: 35, major: true, why: "Sjögren's syndrome damages the glands that make saliva and tears.", refs: ["shiboski2017"] },
      { v: "autoimmune", label: "Rheumatoid arthritis, lupus or scleroderma", pts: 6, why: "These conditions can affect the salivary glands, and are often linked with Sjögren's.", refs: ["villa2015", "shiboski2017"] },
      { v: "diabetes", label: "Diabetes", pts: 6, why: "Dry mouth is common in diabetes, especially when blood sugar runs high.", refs: ["huang2025"] },
      { v: "kidney", label: "Kidney disease or dialysis", pts: 6, why: "Fluid limits and kidney disease itself often cause a dry mouth.", refs: [], limited: true },
      { v: "parkinsons", label: "Parkinson's disease", pts: 4, why: "Parkinson's medicines often dry the mouth.", refs: ["wolff2017"], limited: true },
      { v: "dementia", label: "Dementia or Alzheimer's", pts: 4, why: "Lower fluid intake and medicines make dry mouth more likely.", refs: [], limited: true },
      { v: "mood", label: "Depression or anxiety", pts: 4, why: "Anxiety reduces saliva, and the medicines for these conditions often do too.", refs: ["villa2015", "wolff2017"] },
      { v: "hiv", label: "HIV", pts: 5, why: "HIV can affect the salivary glands, and some HIV medicines dry the mouth.", refs: ["villa2015"], limited: true },
      { v: "hepc", label: "Hepatitis C", pts: 4, why: "Hepatitis C is linked with salivary gland problems.", refs: [], limited: true },
      { v: "menopause", label: "Menopause (now or in the past)", pts: 3, why: "Hormone changes around menopause are linked with dry mouth.", refs: [], limited: true },
    ],
  },
  {
    id: "cancer", type: "many", section: "Health", text: "Have you had any of these treatments?", none: "None of these",
    options: [
      { v: "rt_hn", label: "Radiotherapy to the head or neck", pts: 35, major: true, why: "Radiotherapy near the salivary glands often reduces saliva for good.", refs: ["mercadante2021"] },
      { v: "transplant", label: "Bone marrow or stem cell transplant", pts: 15, why: "Transplants, and graft-versus-host disease after them, often affect the salivary glands.", refs: ["mercadante2021"] },
      { v: "rai", label: "Radioactive iodine for thyroid cancer", pts: 12, why: "Radioactive iodine collects in the salivary glands and can damage them.", refs: ["sunavala2022"] },
      { v: "chemo", label: "Chemotherapy, now or in the last 6 months", pts: 10, why: "Chemotherapy often thins and reduces saliva during and after treatment.", refs: ["mercadante2021"] },
    ],
  },
  {
    id: "breathing", type: "many", section: "Sleep and breathing", text: "Do any of these apply to you?", none: "None of these",
    options: [
      { v: "mouth", label: "I breathe through my mouth, day or night", as: "Mouth breathing", pts: 6, why: "Breathing through your mouth dries it out, especially overnight.", refs: [], limited: true },
      { v: "snore", label: "I snore, or have sleep apnoea", as: "Snoring or sleep apnoea", pts: 4, why: "Sleep apnoea is linked with waking up with a dry mouth.", refs: ["raoof2023"] },
      { v: "cpap", label: "I use a CPAP machine", as: "Using a CPAP machine", pts: 5, why: "Many CPAP users report a dry mouth, especially with mouth leaks.", refs: ["raoof2023"] },
      { v: "mad", label: "I wear a sleep apnoea or snoring splint", as: "Wearing a sleep apnoea splint", pts: 3, why: "Splints that hold the jaw forward can leave the mouth dry.", refs: ["raoof2023"] },
    ],
  },
  {
    id: "habits", type: "many", section: "Everyday habits", text: "Do any of these apply to you?", none: "None of these",
    options: [
      { v: "smoke", label: "I smoke", as: "Smoking", pts: 5, why: "Smoking is linked with a drier mouth and less saliva.", refs: [], limited: true },
      { v: "vape", label: "I vape", as: "Vaping", pts: 4, why: "Vaping liquids draw moisture from the mouth.", refs: [], limited: true },
      { v: "cannabis", label: "I use cannabis", as: "Cannabis use", pts: 5, why: "Cannabis commonly causes a dry mouth.", refs: ["wolff2017"] },
      { v: "alcohol", label: "I have more than 2 alcoholic drinks most days", as: "More than 2 alcoholic drinks most days", pts: 3, why: "Alcohol dries the mouth.", refs: [], limited: true },
      { v: "caffeine", label: "I have more than 3 coffees, teas or energy drinks a day", as: "More than 3 caffeinated drinks a day", pts: 2, why: "Caffeine can add to a dry mouth.", refs: [], limited: true },
    ],
  },
  {
    id: "water", type: "one", section: "Everyday habits", text: "How much water do you drink on a normal day?",
    hint: "Count water and other drinks that aren't alcohol or caffeine.",
    options: [
      { v: "low", label: "Less than 4 glasses", as: "Less than 4 glasses of water a day", pts: 4, why: "Not drinking enough leaves less fluid for saliva.", refs: [], limited: true },
      { v: "mid", label: "4 to 7 glasses", pts: 0 },
      { v: "high", label: "8 glasses or more", pts: 0 },
    ],
  },
];
export const RISK_SECTIONS = [...new Set(RISK_QUESTIONS.map((q) => q.section))];

export const RISK_BANDS = [
  { id: "low", lo: 0, label: "Low", sub: "Few known risk factors for dry mouth.", tone: "good" },
  { id: "moderate", lo: 10, label: "Moderate", sub: "Some risk factors. Worth knowing the early signs.", tone: "amber" },
  { id: "high", lo: 25, label: "High", sub: "Several risk factors. A dry mouth is likely at some point.", tone: "orange" },
  { id: "veryhigh", lo: 45, label: "Very high", sub: "A dry mouth is very likely. Protect your teeth now.", tone: "red" },
];

/** Score a set of answers: { score 0–100, band, factors (largest first), major } */
export function scoreRisk(answers = {}) {
  const factors = [];
  for (const q of RISK_QUESTIONS) {
    const a = answers[q.id];
    const picked = q.type === "one" ? q.options.filter((o) => o.v === a) : q.options.filter((o) => (a || []).includes(o.v));
    for (const o of picked) if (o.pts > 0) factors.push({ q: q.id, v: o.v, label: o.as || o.label, pts: o.pts, why: o.why, refs: o.refs || [], major: !!o.major, limited: !!o.limited });
  }
  factors.sort((x, y) => y.pts - x.pts);
  const score = Math.min(100, factors.reduce((s, f) => s + f.pts, 0));
  const major = factors.some((f) => f.major);
  let band = [...RISK_BANDS].reverse().find((b) => score >= b.lo);
  // A single near-certain cause is never "low" or "moderate".
  if (major && band.lo < 25) band = RISK_BANDS[2];
  return { score, band, factors, major };
}

/** Practical next steps for this person's factors, most useful first. */
export function riskAdvice(result, answers = {}) {
  const has = (q, v) => (answers[q] || []).includes?.(v) || answers[q] === v;
  const medPts = result.factors.filter((f) => f.q === "meds" || f.q === "medTypes").reduce((s, f) => s + f.pts, 0);
  const out = [];
  if (result.band.lo >= 10)
    out.push({ id: "track", title: "Check how dry your mouth actually is", body: "Risk factors don't always mean symptoms. The five-question dry mouth score (SIP) shows how much dryness is affecting you, and tracking it shows whether it's changing." });
  if (medPts >= 8)
    out.push({ id: "meds", title: "Ask for a medicine review", body: "Your pharmacist or GP may be able to change the dose, timing or type of a medicine that dries the mouth. Never stop a medicine without asking first.", refs: ["wolff2017"] });
  if (result.band.lo >= 10)
    out.push({ id: "teeth", title: "Protect your teeth", body: "Saliva protects teeth from decay. Use a fluoride toothpaste twice a day, spit and don't rinse, and ask your dentist whether you need a high-fluoride toothpaste. GC Tooth Mousse Plus after brushing adds calcium, phosphate and fluoride.", refs: ["agarwal2022"], products: ["gc-tmp"] });
  if (result.band.lo >= 25 || result.major)
    out.push({ id: "moist", title: "Keep your mouth moist", body: "Sip water often, and use a saliva gel such as GC Dry Mouth Gel before meals and at bedtime. Sugar-free gum can help your own saliva flow.", refs: ["mercadante2021", "nuchit2020"], products: ["gc-dmg"] });
  if (has("breathing", "cpap"))
    out.push({ id: "cpap", title: "Ask about your CPAP set-up", body: "A heated humidifier, a chin strap or a full-face mask can stop air drying your mouth overnight. Your sleep clinic can adjust it.", refs: ["raoof2023"] });
  if (has("breathing", "mouth"))
    out.push({ id: "nose", title: "Find out why you mouth-breathe", body: "A blocked nose, allergies or sleep apnoea are common causes. Your GP can check, and treating the cause helps the dryness." });
  if (has("habits", "smoke") || has("habits", "vape"))
    out.push({ id: "smoke", title: "Smoking and vaping", body: "Both dry the mouth. Quitting helps your saliva and your teeth — Quitline (13 78 48 in Australia, 0800 778 778 in New Zealand) is free." });
  if (has("water", "low") || has("habits", "caffeine") || has("habits", "alcohol"))
    out.push({ id: "drink", title: "Drink more water", body: "Keep a water bottle nearby and sip through the day. Cut back on alcohol and caffeine, and avoid mouthwashes that contain alcohol." });
  if (has("conditions", "diabetes"))
    out.push({ id: "diabetes", title: "Keep blood sugar steady", body: "A dry mouth is more common when blood sugar runs high. Mention the dryness at your next diabetes check." , refs: ["huang2025"] });
  if (result.band.lo >= 25)
    out.push({ id: "dentist", title: "Tell your dentist", body: "Show them this result. With a high risk of dry mouth, more frequent check-ups and extra fluoride are usually worthwhile." });
  return out;
}
