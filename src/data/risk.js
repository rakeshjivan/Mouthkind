import { medicineById } from "./medicines.js";
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

export const RISK_VERSION = 2;

// ── Questions ───────────────────────────────────────────────────────────────
// "one": pick one option. "many": tick any. Every option carries its points.
// What people take medicines for, in their words. Each maps to the medicine group most
// medicines for that purpose fall in (`g`), used when no medicine names are given for it.
// null = most medicines for this purpose don't dry the mouth.
export const MED_PURPOSES = [
  { v: "mood", label: "Depression, anxiety or low mood", g: "antidep" },
  { v: "mental", label: "Bipolar, schizophrenia or psychosis", g: "antipsych" },
  { v: "sleep", label: "Sleep", g: "sleep" },
  { v: "pain", label: "Strong or long-term pain", hint: "Not just paracetamol or ibuprofen now and then", g: "opioid" },
  { v: "nerve", label: "Epilepsy or nerve pain", g: "seizure" },
  { v: "bp", label: "Blood pressure, heart or fluid", g: "bp" },
  { v: "bladder", label: "Bladder urgency or leaking", g: "bladder" },
  { v: "prostate", label: "Prostate", g: "prostate" },
  { v: "breathing", label: "Asthma or COPD", g: "inhaler" },
  { v: "allergy", label: "Allergies or hay fever, most days", g: "allergy" },
  { v: "weight", label: "Weight loss", hint: "e.g. Ozempic, Wegovy, Mounjaro, Duromine", g: "glp1" },
  { v: "diabetes", label: "Diabetes", g: null },
  { v: "stomach", label: "Nausea, travel sickness or stomach cramps", g: "gut" },
  { v: "adhd", label: "ADHD", g: "stimulant" },
  { v: "parkinsons", label: "Parkinson's", g: "parkinson" },
  { v: "migraine", label: "Migraine", g: "migraine" },
  { v: "muscle", label: "Muscle spasm", g: "relaxant" },
  { v: "acne", label: "Acne (isotretinoin)", g: "acne" },
  { v: "smoking", label: "Quitting smoking", g: "smoking" },
  { v: "other", label: "Something else", g: null },
];

// The count question is only asked when no medicine names were given.
function needsCount(a) {
  const f = a.medFor || [];
  return f.length > 0 && !(a.medList || []).length;
}

// Medicine count → the answer on the count question.
const countBand = (n) => (n <= 0 ? "0" : n <= 2 ? "1" : n <= 4 ? "3" : n <= 9 ? "5" : "10");

/**
 * Work out the medicine answers from what people take medicines for and the names they gave:
 * - a purpose with a named medicine → that medicine's own group (or none, if it doesn't dry the mouth)
 * - a purpose with no named medicine → the purpose's usual group
 * - the count → the number of names (at least one per purpose ticked), or the count question if no names
 * Answers saved before this screen existed (medTypes ticked directly) are left as they were.
 */
export function deriveMeds(a, lookup) {
  if (!a.medFor) return a;
  const out = { ...a };
  const f = a.medFor.filter((v) => MED_PURPOSES.some((p) => p.v === v));
  const list = (a.medList || []).map((x) => (x.id && lookup ? lookup(x.id) : null));
  const groups = new Set(), extra = {};
  for (const m of list) if (m?.c && m.c !== "rep") { const [q, v] = m.c.split("."); (q === "medTypes" ? groups : (extra[q] ??= new Set())).add(v); }
  for (const v of f) {
    const named = list.some((m) => m?.p?.includes(v));
    const g = MED_PURPOSES.find((p) => p.v === v).g;
    if (!named && g) groups.add(g);
  }
  out.medTypes = [...groups];
  const rep = list.filter((m) => m?.c === "rep").length;
  out.medRep = rep ? String(Math.min(rep, 3)) : undefined;
  for (const [q, set] of Object.entries(extra)) out[q] = [...new Set([...(a[q] || []), ...set])];
  const n = (a.medList || []).length;
  out.meds = n ? countBand(Math.max(n, f.filter((v) => v !== "other").length)) : f.length ? a.meds : "0";
  return out;
}

export const RISK_QUESTIONS = [
  {
    id: "conditions", type: "many", section: "Health", text: "Do you have any of these?", none: "None of these",
    options: [
      { v: "sjogren", label: "Sjögren's syndrome", pts: 35, major: true, why: "Sjögren's syndrome damages the glands that make saliva and tears.", refs: ["shiboski2017", "vonbultz2007"] },
      { v: "autoimmune", label: "Rheumatoid arthritis, lupus or scleroderma", pts: 6, why: "These conditions can affect the salivary glands, and are often linked with Sjögren's.", refs: ["vonbultz2007", "villa2015"] },
      { v: "diabetes", label: "Diabetes", pts: 6, why: "Dry mouth is common in diabetes, especially when blood sugar runs high.", refs: ["huang2025", "vonbultz2007"] },
      { v: "kidney", label: "Kidney disease or dialysis", pts: 6, why: "Up to three in four people on dialysis have a dry mouth, from fluid limits, medicines and the disease itself.", refs: ["laheij2021"] },
      { v: "heart", label: "Heart disease or high blood pressure", as: "Heart disease or high blood pressure", pts: 2, limited: true, why: "Mostly through the medicines used to treat it — fluid tablets and some blood pressure tablets reduce saliva." },
      { v: "stroke", label: "Stroke", pts: 3, limited: true, why: "A stroke can affect swallowing and mouth control, and often brings several new medicines." },
      { v: "parkinsons", label: "Parkinson's disease", pts: 4, why: "Dry mouth is common in Parkinson's, partly from the medicines used to treat it.", refs: ["martimbianco2021"] },
      { v: "dementia", label: "Dementia or Alzheimer's", pts: 4, limited: true, why: "Drinking less and the medicines used make a dry mouth more likely." },
      { v: "mood", label: "Depression or anxiety", pts: 4, why: "Anxiety reduces saliva, and the medicines for these conditions often do too.", refs: ["villa2015", "wolff2017"] },
      { v: "thyroid", label: "Thyroid disease", pts: 2, why: "Thyroid problems are linked with lower saliva flow.", refs: ["naik2018"], limited: true },
      { v: "hiv", label: "HIV", pts: 5, why: "HIV can affect the salivary glands, and dry mouth is common in people living with HIV.", refs: ["mkonyi2025", "vonbultz2007"] },
      { v: "hepc", label: "Hepatitis C", pts: 4, why: "Hepatitis C is linked with a Sjögren's-like dryness of the mouth and eyes.", refs: ["cacoub2017", "vonbultz2007"] },
      { v: "sarcoid", label: "Sarcoidosis", pts: 6, why: "Sarcoidosis can inflame the salivary glands.", refs: ["vonbultz2007"] },
      { v: "longcovid", label: "Long COVID", pts: 2, why: "Dry mouth and taste changes can linger after COVID-19.", refs: ["avais2025"] },
      { v: "reflux", label: "Reflux, or vomiting often", as: "Reflux or frequent vomiting", pts: 2, acid: true, limited: true, why: "Stomach acid wears teeth, and repeated vomiting can leave the mouth dry." },
      { v: "eating", label: "An eating disorder, now or in the past", as: "Eating disorder", pts: 4, acid: true, limited: true, why: "Vomiting, restricted fluids and some medicines can dry the mouth and wear the teeth." },
      { v: "pregnant", label: "I'm pregnant", as: "Pregnancy", pts: 2, limited: true, why: "Many people notice a drier mouth in pregnancy, and gums become more sensitive.", refs: ["nazir2026"] },
      { v: "pregnantSick", label: "I'm pregnant, with morning sickness or vomiting", as: "Pregnancy with morning sickness", pts: 3, acid: true, limited: true, why: "Vomiting brings stomach acid onto the teeth and leaves the mouth dry.", refs: ["nazir2026", "adaPregnancy"] },
      { v: "menopause", label: "Menopause (now or in the past)", pts: 3, why: "Falling oestrogen is linked with less saliva and more tooth decay.", refs: ["arealquecuty2025"] },
    ],
  },
  {
    id: "medFor", type: "many", section: "Medicines", text: "Do you take any medicines for these conditions?",
    hint: "Tick any that apply. Include tablets, inhalers, injections or patches you use most days.",
    none: "I don't take regular medicines",
    options: MED_PURPOSES.map(({ v, label, hint }) => ({ v, label, hint, pts: 0 })),
  },
  {
    id: "medList", type: "lookup", section: "Medicines", text: "Add your medicine names",
    hint: "Optional, but it makes your result more accurate. Copy them from your pharmacy labels — brand or generic names both work.",
    when: (a) => (a.medFor || []).length > 0,
  },
  {
    id: "meds", type: "one", section: "Medicines", text: "How many different medicines do you take regularly?", when: needsCount,
    hint: "Count tablets, inhalers, patches and injections from your doctor, and anything from the pharmacy you take most days.",
    options: [
      { v: "0", label: "None", pts: 0 },
      { v: "1", label: "1 or 2", as: "1 or 2 regular medicines", pts: 3, why: "Each regular medicine adds a little to the chance of a dry mouth.", refs: ["wolff2017"] },
      { v: "3", label: "3 or 4", as: "3 or 4 regular medicines", pts: 7, why: "The more medicines you take, the more likely a dry mouth is.", refs: ["wolff2017", "villa2016"] },
      { v: "5", label: "5 to 9", as: "5 to 9 regular medicines", pts: 14, why: "Taking five or more medicines (polypharmacy) is one of the strongest everyday causes of dry mouth.", refs: ["wolff2017", "villa2016"] },
      { v: "10", label: "10 or more", as: "10 or more regular medicines", pts: 20, why: "Ten or more medicines makes a dry mouth very likely.", refs: ["wolff2017", "villa2016"] },
    ],
  },
  // The medicine groups share one answer (medTypes), shown over two screens.
  {
    id: "medTypes", key: "medMind", hidden: true, type: "many", section: "Medicines", text: "Do you take any of these for mood, sleep, pain or nerves?",
    hint: "Groups that match the medicines you added are already ticked.", none: "None of these, or not sure",
    options: [
      { v: "tca", label: "Older antidepressants, or amitriptyline for pain or sleep", hint: "e.g. amitriptyline (Endep), nortriptyline, doxepin", pts: 8, why: "Tricyclic medicines strongly block the nerves that drive saliva.", refs: ["wolff2017"] },
      { v: "antidep", label: "Other antidepressants", hint: "e.g. sertraline, escitalopram, venlafaxine, duloxetine, mirtazapine", pts: 5, why: "Dry mouth is one of the most common side effects of antidepressants.", refs: ["wolff2017"] },
      { v: "antipsych", label: "Antipsychotics or lithium", hint: "e.g. quetiapine, olanzapine, risperidone, clozapine, lithium", pts: 8, why: "These medicines commonly reduce saliva.", refs: ["wolff2017"] },
      { v: "sleep", label: "Sleeping tablets or anxiety tablets", hint: "e.g. temazepam, diazepam, alprazolam, zolpidem, zopiclone", pts: 4, why: "Benzodiazepines and other sleeping tablets can reduce saliva.", refs: ["wolff2017"] },
      { v: "antihist", label: "Drowsy antihistamines", hint: "e.g. promethazine (Phenergan), doxylamine (Restavit), cyproheptadine", pts: 5, why: "Sedating antihistamines block the nerves that drive saliva.", refs: ["wolff2017"] },
      { v: "opioid", label: "Strong pain relief, methadone or buprenorphine", hint: "e.g. oxycodone, tramadol, tapentadol, codeine, morphine", pts: 5, why: "Opioid medicines reduce saliva.", refs: ["wolff2017"] },
      { v: "seizure", label: "Epilepsy or nerve-pain medicines", hint: "e.g. pregabalin (Lyrica), gabapentin, carbamazepine, topiramate", pts: 3, why: "Several of these list dry mouth as a side effect.", refs: ["wolff2017"] },
      { v: "stimulant", label: "ADHD medicines", hint: "e.g. methylphenidate, dexamfetamine, lisdexamfetamine (Vyvanse)", pts: 4, why: "Stimulants and other ADHD medicines commonly cause dry mouth.", refs: ["wolff2017"] },
      { v: "parkinson", label: "Parkinson's medicines", hint: "e.g. levodopa, benztropine, pramipexole", pts: 5, why: "Several Parkinson's medicines reduce saliva.", refs: ["wolff2017"] },
      { v: "relaxant", label: "Muscle relaxants", hint: "e.g. baclofen, orphenadrine", pts: 3, why: "Some muscle relaxants reduce saliva.", refs: ["wolff2017"] },
      { v: "migraine", label: "Migraine tablets (triptans)", hint: "e.g. sumatriptan, rizatriptan", pts: 2, why: "Triptans can cause a dry mouth.", refs: [], limited: true },
      { v: "cannabis", label: "Medicinal cannabis", hint: "THC or THC/CBD products", pts: 5, why: "Cannabis commonly causes a dry mouth.", refs: ["wolff2017"] },
    ],
  },
  {
    id: "medTypes", key: "medBody", hidden: true, type: "many", section: "Medicines", text: "And any of these?",
    hint: "Groups that match the medicines you added are already ticked.", none: "None of these, or not sure",
    options: [
      { v: "bladder", label: "Bladder tablets for urgency or leaking", hint: "e.g. oxybutynin, solifenacin (Vesicare), tolterodine", pts: 10, why: "Bladder medicines that block acetylcholine cause dry mouth in nearly half of the people who take them.", refs: ["usmani2019", "wolff2017"] },
      { v: "glp1", label: "Weight-loss or diabetes injections (GLP-1)", hint: "e.g. Ozempic, Wegovy, Mounjaro, Trulicity, Saxenda", pts: 4, why: "Dry mouth is reported with these medicines, especially semaglutide, often alongside nausea, reflux and drinking less.", refs: ["massarotto2026", "mawardi2023", "alzawawi2026"] },
      { v: "weightloss", label: "Weight-loss tablets", hint: "e.g. phentermine (Duromine), Contrave", pts: 4, why: "Appetite suppressants commonly dry the mouth.", refs: ["wolff2017"] },
      { v: "bp", label: "Fluid tablets, or clonidine-type blood pressure tablets", hint: "e.g. furosemide (Lasix), clonidine, moxonidine, beta-blockers", pts: 4, why: "Fluid tablets and several blood pressure medicines reduce saliva.", refs: ["wolff2017", "villa2016"] },
      { v: "prostate", label: "Prostate or blood pressure alpha-blockers", hint: "e.g. tamsulosin, prazosin, terazosin", pts: 3, why: "Alpha-blockers can dry the mouth.", refs: ["wolff2017"] },
      { v: "inhaler", label: "Inhalers for asthma or COPD", hint: "e.g. tiotropium (Spiriva), umeclidinium, ipratropium, steroid inhalers", pts: 3, why: "Some inhalers dry the mouth directly.", refs: ["wolff2017"] },
      { v: "gut", label: "Medicines for stomach cramps, nausea or travel sickness", hint: "e.g. Buscopan, hyoscine (Kwells), prochlorperazine (Stemetil)", pts: 4, why: "These medicines block the nerves that drive saliva.", refs: ["wolff2017"] },
      { v: "acne", label: "Isotretinoin for acne", hint: "e.g. Roaccutane, Oratane", pts: 6, why: "About half of people taking isotretinoin get a dry mouth, and most get dry lips.", refs: ["alqahtani2026"] },
      { v: "smoking", label: "Quit-smoking tablets", hint: "e.g. varenicline (Champix), bupropion (Zyban)", pts: 2, why: "Both list dry mouth as a common side effect.", refs: ["wolff2017"] },
      { v: "allergy", label: "Non-drowsy antihistamines, most days", hint: "e.g. cetirizine, loratadine, fexofenadine", pts: 2, why: "Even non-drowsy antihistamines can dry the mouth a little.", refs: ["wolff2017"] },
      { v: "decong", label: "Cold and flu tablets or decongestants, most days", hint: "e.g. pseudoephedrine", pts: 2, why: "Decongestants dry the mouth while you take them.", refs: ["wolff2017"] },
    ],
  },
  // Medicines sometimes reported to dry the mouth (from the names given; never asked).
  {
    id: "medRep", hidden: true, type: "one", section: "Medicines", text: "",
    options: [
      { v: "1", label: "1 medicine sometimes linked to dry mouth", pts: 1, why: "Dry mouth has been reported with this medicine in Australia, though less is known about how often.", refs: ["choo2022"] },
      { v: "2", label: "2 medicines sometimes linked to dry mouth", pts: 2, why: "Dry mouth has been reported with these medicines in Australia, though less is known about how often.", refs: ["choo2022"] },
      { v: "3", label: "3 or more medicines sometimes linked to dry mouth", pts: 3, why: "Dry mouth has been reported with these medicines in Australia, though less is known about how often.", refs: ["choo2022"] },
    ],
  },
  {
    id: "cancer", type: "many", section: "Treatments", text: "Have you had any of these treatments?", none: "None of these",
    options: [
      { v: "rt_hn", label: "Radiotherapy to the head or neck", pts: 35, major: true, why: "Radiotherapy near the salivary glands often reduces saliva for good.", refs: ["mercadante2021"] },
      { v: "transplant", label: "Bone marrow or stem cell transplant", pts: 15, why: "Transplants, and graft-versus-host disease after them, often affect the salivary glands.", refs: ["mercadante2021"] },
      { v: "rai", label: "Radioactive iodine for thyroid cancer", pts: 12, why: "Radioactive iodine collects in the salivary glands and can damage them.", refs: ["sunavala2022"] },
      { v: "immuno", label: "Cancer immunotherapy", hint: "e.g. Keytruda (pembrolizumab), Opdivo (nivolumab), Yervoy", pts: 8, why: "Immunotherapy can trigger a Sjögren's-like dryness of the mouth and eyes, often underrecognised.", refs: ["bitoun2024"] },
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
      { v: "cannabis", label: "I use cannabis, prescribed or not", as: "Cannabis use", pts: 5, why: "Cannabis commonly causes a dry mouth.", refs: ["wolff2017"] },
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
    id: "sex", type: "one", section: "About you", text: "Which best describes your gender?",
    hint: "Options follow the Australian Bureau of Statistics standard.",
    options: [
      { v: "f", label: "Woman or female", as: "Woman or female", pts: 2, why: "Women report dry mouth more often than men.", refs: ["agostini2018"] },
      { v: "m", label: "Man or male", pts: 0 },
      { v: "nb", label: "Non-binary", pts: 0 },
      { v: "diff", label: "I use a different term", pts: 0 },
      { v: "x", label: "Prefer not to answer", pts: 0 },
    ],
  },
];
export const RISK_SECTIONS = [...new Set(RISK_QUESTIONS.map((q) => q.section))];

export const RISK_BANDS = [
  { id: "low", lo: 0, label: "Low", sub: "Few known risk factors for dry mouth.", tone: "good" },
  { id: "moderate", lo: 12, label: "Moderate", sub: "Some risk factors. Worth knowing the early signs.", tone: "amber" },
  { id: "high", lo: 25, label: "High", sub: "Several risk factors. A dry mouth is likely at some point.", tone: "orange" },
  { id: "veryhigh", lo: 45, label: "Very high", sub: "A dry mouth is very likely. Protect your teeth now.", tone: "red" },
];

/** Answers saved before pregnancy moved into the health list. */
function migrate(a) {
  a = deriveMeds(a, medicineById);
  if ((a.medTypes || []).includes("cannabis")) a = { ...a, medTypes: a.medTypes.filter((x) => x !== "cannabis"), habits: [...new Set([...(a.habits || []), "cannabis"])] };
  if (!a.pregnant || a.pregnant === "no") return a;
  const v = a.pregnant === "sick" ? "pregnantSick" : "pregnant";
  const { pregnant, ...rest } = a;
  return { ...rest, conditions: [...new Set([...(a.conditions || []), v])] };
}

// ── Medicines: how many, and which kinds ──────────────────────────────────
// Both matter. The number of regular medicines is an independent risk
// (polypharmacy; Villa 2016, Wolff 2017), and so is each kind known to dry the
// mouth. Anticholinergic burden scales simply add drug scores; for dry mouth
// the effect levels off, so here:
//   - the count always counts in full;
//   - the strongest drying medicine counts in full, the next at half, the
//     rest at a quarter each;
//   - all medicine points together stop at MED_CAP — below a single
//     near-certain cause (35), so medicines alone reach "high" and need another
//     factor (age, a condition) to reach "very high".
export const MED_CAP = 30;
const MED_WEIGHTS = [1, 0.5];
function combineMedicines(factors) {
  const count = factors.filter((f) => f.q === "meds");
  const kinds = factors.filter((f) => f.q === "medTypes" || f.q === "medRep").sort((x, y) => y.pts - x.pts);
  let left = MED_CAP;
  for (const f of count) { f.full = f.pts; f.pts = Math.min(f.pts, left); left -= f.pts; }
  kinds.forEach((f, i) => {
    f.full = f.pts;
    const w = MED_WEIGHTS[i] ?? 0.25;
    f.pts = Math.min(left, Math.max(1, Math.round(f.full * w)));
    left -= f.pts;
    if (f.pts < f.full) f.note = f.pts ? "Counted at part value: its effect overlaps with your other medicines." : "Already covered by your other medicines.";
  });
  for (let i = factors.length - 1; i >= 0; i--) if (factors[i].pts <= 0) factors.splice(i, 1);
}

// ── Conditions and their own medicines ─────────────────────────────────────
// A condition whose dryness comes partly from its medicines counts at half
// when a medicine for it has been named and counted. If no names are given,
// it keeps its full points, as a safety net for medicines the person doesn't know.
const COND_MED = { mood: "mood", parkinsons: "parkinsons", heart: "bp" };
function countConditionsOnce(factors, a) {
  const named = (a.medList || []).map((x) => (x.id ? medicineById(x.id) : null)).filter((m) => m && m.c && m.c !== "rep");
  for (const f of factors) {
    if (f.q !== "conditions" || !COND_MED[f.v]) continue;
    if (!named.some((m) => m.p?.includes(COND_MED[f.v]))) continue;
    f.full = f.pts; f.pts = Math.ceil(f.pts / 2);
    f.note = "Counted at half: the medicine you take for it is already counted.";
  }
}

/** The answers with medicines worked out, as scoring sees them. */
export const fullAnswers = (a = {}) => migrate(a);

/** Questions to show, given the answers so far. */
export const visibleRiskQuestions = (answers = {}) => RISK_QUESTIONS.filter((q) => !q.hidden && (!q.when || q.when(answers))).map((q) => (q.id === "medFor" ? orderPurposes(q, answers) : q));

// Conditions come first, so the medicine screen can lead with the conditions the person ticked.
const COND_PURPOSE = { mood: "mood", parkinsons: "parkinsons", heart: "bp", diabetes: "diabetes", reflux: "stomach", pregnantSick: "stomach" };
function orderPurposes(q, a) {
  const mine = [...new Set((a.conditions || []).map((c) => COND_PURPOSE[c]).filter(Boolean))];
  if (!mine.length) return q;
  const top = mine.map((v) => q.options.find((o) => o.v === v)).filter(Boolean).map((o) => ({ ...o, hint: "You said you have this" }));
  return { ...q, options: [...top, ...q.options.filter((o) => !mine.includes(o.v))] };
}

/** Score a set of answers: { score 0–100, band, factors (largest first), major } */
export function scoreRisk(answers = {}) {
  answers = migrate(answers);
  const factors = [];
  // Every question with points counts, including the medicine groups worked out from the
  // medicine screens and a count taken from the names given.
  for (const q of RISK_QUESTIONS) {
    if (!q.options) continue;
    const a = answers[q.id];
    const picked = q.type === "one" ? q.options.filter((o) => o.v === a) : q.options.filter((o) => (a || []).includes(o.v));
    for (const o of picked) if (o.pts > 0) factors.push({ q: q.id, v: o.v, label: o.as || o.label, pts: o.pts, why: o.why, refs: o.refs || [], major: !!o.major, limited: !!o.limited, acid: !!o.acid });
  }
  // Answers without a checked primary source count at half until one is found.
  for (const f of factors) if (f.limited && f.pts > 1) { f.full = f.pts; f.pts = Math.ceil(f.pts / 2); f.note = "Counted at half: the evidence for this is less certain."; }
  combineMedicines(factors);
  countConditionsOnce(factors, answers);
  factors.sort((x, y) => y.pts - x.pts);
  const score = Math.min(100, factors.reduce((s, f) => s + f.pts, 0));
  const major = factors.some((f) => f.major);
  let band = [...RISK_BANDS].reverse().find((b) => score >= b.lo);
  // A near-certain cause (head and neck radiotherapy, Sjögren's) is always "very high".
  if (major) band = RISK_BANDS[3];
  return { score, band, factors, major };
}

/** Practical next steps for this person's factors, most useful first. */
export function riskAdvice(result, answers = {}) {
  answers = migrate(answers);
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
  if (has("conditions", "pregnant") || has("conditions", "pregnantSick"))
    out.push({ id: "pregnant", title: "Looking after your mouth in pregnancy", body: "Tell your dentist you're pregnant — check-ups and most treatment are safe, and the second trimester is often the most comfortable time. Gums often swell and bleed more in pregnancy: keep brushing gently twice a day and clean between your teeth. Keep sweet snacks to mealtimes.", refs: ["adaPregnancy", "pbbTeeth"] });
  if (result.factors.some((f) => f.acid) || has("medTypes", "glp1"))
    out.push({ id: "acid", title: "After vomiting or reflux, don't brush straight away", body: "Rinse with water, then wait about an hour before brushing — acid softens enamel and brushing straight away wears it. In the meantime, smear on fluoride toothpaste or GC Tooth Mousse with a clean finger, or chew sugar-free gum.", refs: ["adaPregnancy", "pbbTeeth"], products: ["gc-tm"] });
  if (has("medTypes", "glp1"))
    out.push({ id: "glp1", title: "On a GLP-1 medicine", body: "Nausea, reflux and simply drinking less are common on these medicines, and all three dry the mouth. Keep sipping water through the day and mention dry mouth to your prescriber.", refs: ["massarotto2026", "alzawawi2026"] });
  if (has("cancer", "immuno"))
    out.push({ id: "immuno", title: "Tell your cancer team about dryness", body: "Dry mouth or dry eyes on immunotherapy can be an immune side effect that your team can treat. Report it early — don't wait for your next appointment.", refs: ["bitoun2024"] });
  if (has("conditions", "diabetes"))
    out.push({ id: "diabetes", title: "Keep blood sugar steady", body: "A dry mouth is more common when blood sugar runs high. Mention the dryness at your next diabetes check." , refs: ["huang2025"] });
  if (result.band.lo >= 25)
    out.push({ id: "dentist", title: "Tell your dentist", body: "Show them this result. With a high risk of dry mouth, more frequent check-ups and extra fluoride are usually worthwhile." });
  return out;
}

// ── Grouping for the visual breakdown ───────────────────────────────────────
// `act`: something the person can do something about (habits, set-up, a
// medicine review) — shown apart from things to be aware of.
export const RISK_GROUPS = [
  { id: "meds", label: "Medicines", qs: ["meds", "medTypes", "medRep"], act: true, actNote: "Ask your pharmacist or GP for a medicine review." },
  { id: "treat", label: "Cancer treatment", qs: ["cancer"], act: false },
  { id: "health", label: "Health conditions", qs: ["conditions"], act: false },
  { id: "sleep", label: "Sleep and breathing", qs: ["breathing"], act: true, actNote: "Your GP or sleep clinic can often help." },
  { id: "habits", label: "Daily habits", qs: ["habits", "water"], act: true, actNote: "Small changes here make a real difference." },
  { id: "about", label: "Age and gender", qs: ["age", "sex"], act: false },
];
export function riskBreakdown(result) {
  return RISK_GROUPS.map((g) => {
    const fs = result.factors.filter((f) => g.qs.includes(f.q));
    return { ...g, factors: fs, pts: fs.reduce((s, f) => s + f.pts, 0) };
  }).filter((g) => g.pts > 0);
}
