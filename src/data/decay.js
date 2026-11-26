import { checkup } from "./dental.js";
// ─── Tooth Decay Risk ──────────────────────────────────────────────────────
// A patient-answered caries risk check, built on the CAMBRA framework
// (Featherstone 2021): disease indicators, risk factors and protective
// factors, weighed against each other. Only the items a patient can answer
// without an examination are used; the clinical ones (radiographs, visible
// plaque, bacterial tests) are left to the dentist.
//
// A SCREENING CHECK, NOT A VALIDATED INSTRUMENT. Even the best-validated tools (Cariogram,
// CAMBRA) reach only moderate accuracy (Hasyim 2026). Saliva tests add little to
// prediction in adults (Hayes 2017), so pH carries little weight here.
// Points are set here, in one place, for clinical
// review. No caries risk method has better than limited diagnostic accuracy,
// and recent caries experience is the strongest single predictor
// (Senneby 2015) — so it carries the most weight and, as in CAMBRA, puts a
// person at high risk on its own.
//
// Bands follow CAMBRA: low · moderate · high · very high ("extreme" in CAMBRA:
// high risk plus a very dry mouth).
//
// Dry mouth comes from the person's other checks when they have done them
// (dry mouth risk band, latest SIP score, pH pattern), so it isn't asked twice.
//
// Every scored answer cites a primary source (interdental cleaning, bridges, crowding and
// gaps were removed in 2026-11: no primary source linked them to decay).

export const DECAY_VERSION = 2; // 2: fillings and gums re-weighted, gum questions added, pH weight lowered

const NAT = (a) => a.teeth !== "none"; // has natural teeth

export const DECAY_QUESTIONS = [
  {
    id: "teeth", type: "one", section: "Your teeth", text: "Do you still have some of your own natural teeth?",
    hint: "Count any of your own teeth, including ones with fillings or crowns.",
    options: [
      { v: "yes", label: "Yes", pts: 0 },
      { v: "none", label: "No — full dentures or implants only", pts: 0 },
    ],
  },
  {
    id: "recent", type: "one", section: "Your teeth", when: NAT,
    text: "In the last 3 years, have you needed a filling, or been told you have decay?",
    hint: "Include early decay (white spots) and holes found at a check-up.",
    options: [
      { v: "no", label: "No", pts: 0 },
      { v: "one", label: "Yes, once", as: "Decay or a filling in the last 3 years", pts: 12, floor: "high",
        why: "Recent decay is the strongest sign that more is on the way — it shows the conditions for decay are there now.", refs: ["featherstone2021", "senneby2015"] },
      { v: "more", label: "Yes, more than once", as: "Decay or fillings more than once in 3 years", pts: 16, floor: "high",
        why: "Repeated decay shows the balance in your mouth is tipped towards decay.", refs: ["featherstone2021", "senneby2015"] },
      { v: "unsure", label: "Not sure — I haven't seen a dentist", as: "No recent check-up to know", pts: 4,
        why: "Decay is often painless at first, and people without regular check-ups have more untreated decay.", refs: ["clarkson1993", "hagman2021"] },
    ],
  },
  {
    id: "sugar", type: "one", section: "What you eat and drink", when: NAT,
    text: "How often do you have sugary or starchy snacks or drinks between meals?",
    hint: "Include sweet tea or coffee, juice, soft drink, biscuits, chips, lollies and cough lollies.",
    options: [
      { v: "rare", label: "Rarely or never", pts: 0 },
      { v: "1", label: "Once or twice a day", as: "Snacks or sweet drinks once or twice a day", pts: 3,
        why: "Every sugary snack or drink starts an acid attack on your teeth that lasts 20 to 30 minutes.", refs: ["moynihan2014"] },
      { v: "3", label: "3 or more times a day", as: "Snacks or sweet drinks 3 or more times a day", pts: 8,
        why: "More than three sugar hits a day between meals is one of the main causes of decay.", refs: ["featherstone2021", "moynihan2014"] },
      { v: "sip", label: "I sip sweet drinks or suck lollies through the day", as: "Sipping sweet drinks or sucking lollies through the day", pts: 10,
        why: "A steady supply of sugar keeps your teeth under acid attack for most of the day.", refs: ["featherstone2021", "moynihan2014"] },
    ],
  },
  {
    id: "brush", type: "one", section: "Cleaning", when: NAT,
    text: "How often do you brush with a fluoride toothpaste?",
    hint: "Most toothpastes have fluoride — look for “sodium fluoride” or “ppm” on the tube.",
    options: [
      { v: "2", label: "Twice a day or more", pts: 0 },
      { v: "1", label: "Once a day", as: "Brushing with fluoride once a day", pts: 4,
        why: "Fluoride toothpaste twice a day protects better than once.", refs: ["walsh2019", "featherstone2021"] },
      { v: "less", label: "Less than once a day", as: "Brushing less than once a day", pts: 7,
        why: "Brushing with fluoride toothpaste is the most important thing you can do to prevent decay.", refs: ["walsh2019"] },
      { v: "nof", label: "My toothpaste has no fluoride", as: "Toothpaste without fluoride", pts: 8,
        why: "Fluoride toothpaste prevents decay; toothpaste without it does not.", refs: ["walsh2019"] },
    ],
  },
  {
    id: "mouth", type: "many", section: "Your teeth", when: NAT, none: "None of these",
    text: "Do any of these apply to your teeth?",
    options: [
      { v: "roots", label: "My gums have shrunk back and the roots show", hint: "Teeth look longer, or feel sensitive near the gum", as: "Exposed roots", pts: 6,
        why: "Roots are softer than enamel and decay more easily, especially as we get older.", refs: ["featherstone2021", "duke2021", "chen2026"] },
      { v: "braces", label: "I have braces, or a wire retainer glued behind my teeth", as: "Braces or a fixed retainer", pts: 6,
        why: "Plaque collects around brackets and wires; about half of people with braces get early decay (white spots).", refs: ["salerno2024", "featherstone2021"] },
      { v: "partial", label: "I wear a partial denture (a plate with clasps)", as: "Partial denture", pts: 5,
        why: "Teeth that hold a partial denture get decay more often than other teeth.", refs: ["syed2026", "miyamoto2007"] },
      { v: "fillings", label: "I have lots of fillings or crowns", as: "Lots of fillings or crowns", pts: 5,
        why: "Past decay is the strongest predictor of future decay, and the edges of fillings and crowns can decay again.", refs: ["senneby2015", "arino2016", "pitiphat2002"] },
      { v: "grooves", label: "My dentist says I have deep grooves in my back teeth", as: "Deep grooves in the back teeth", pts: 3,
        why: "Deep pits and grooves trap food and plaque that a brush can't reach.", refs: ["featherstone2021"] },
    ],
  },
  {
    id: "gums", type: "many", section: "Your gums", when: NAT, none: "None of these",
    text: "Do either of these apply to your gums?",
    options: [
      { v: "bleed", label: "My gums bleed when I brush or floss", hint: "Even a little, most days", as: "Gums bleed when brushing", pts: 3,
        why: "Bleeding gums usually mean plaque is being left along the gumline — and plaque is one of the strongest predictors of decay, especially on roots.", refs: ["hayes2016", "ritter2010"] },
      { v: "perio", label: "A dentist or hygienist has told me I have gum disease", hint: "Also called periodontitis or periodontal disease", as: "Diagnosed with gum disease", pts: 2,
        why: "Gum disease makes the gums shrink back, exposing roots, which decay more easily than enamel.", refs: ["cortellini2018", "hayes2016"] },
    ],
  },
  {
    id: "age", type: "one", section: "About you", when: (a, ctx) => NAT(a) && !ctx.age,
    text: "How old are you?",
    options: [
      { v: "u40", label: "Under 40", pts: 0 },
      { v: "40", label: "40 to 64", pts: 0 },
      { v: "65", label: "65 to 79", as: "Age 65 or over", pts: 3, why: "Root decay becomes much more common with age.", refs: ["duke2021"] },
      { v: "80", label: "80 or over", as: "Age 80 or over", pts: 4, why: "Root decay becomes much more common with age.", refs: ["duke2021"] },
    ],
  },
  {
    id: "dry", type: "one", section: "Saliva", when: (a, ctx) => NAT(a) && !ctx.dry,
    text: "Does your mouth often feel dry?",
    hint: "Your dry mouth check gives a better answer — this question is skipped once you've done it.",
    options: [
      { v: "no", label: "No", pts: 0 },
      { v: "some", label: "Sometimes", as: "Mouth sometimes dry", pts: 4,
        why: "Saliva washes away sugar, neutralises acid and repairs early decay. Less saliva means less protection.", refs: ["featherstone2021"] },
      { v: "often", label: "Often", as: "Mouth often dry", pts: 8, dryStrong: true,
        why: "A dry mouth is one of the biggest risks for decay: saliva is your teeth's natural defence.", refs: ["featherstone2021"] },
    ],
  },
  {
    id: "habits", type: "many", section: "Everyday habits", when: NAT, none: "None of these",
    text: "Do any of these apply to you?",
    options: [
      { v: "smoke", label: "I smoke or vape", as: "Smoking or vaping", pts: 3,
        why: "Tobacco use is linked with more decay, especially on roots.", refs: ["duke2021"] },
      { v: "drugs", label: "I use recreational drugs", as: "Recreational drug use", pts: 6,
        why: "Many drugs dry the mouth and bring on sugar cravings.", refs: ["featherstone2021"] },
      { v: "nofluoride", label: "My drinking water isn't fluoridated", hint: "Tank, bore or filtered water, or mostly bottled water", as: "No fluoride in drinking water", pts: 3,
        why: "Fluoridated tap water adds protection all day.", refs: ["featherstone2021"] },
    ],
  },
  {
    id: "dentist", type: "one", section: "Check-ups", when: NAT,
    text: "When did you last see a dentist for a check-up?",
    options: [
      { v: "1", label: "In the last year", pts: 0 },
      { v: "2", label: "1 to 2 years ago", pts: 1, as: "Check-up 1 to 2 years ago",
        why: "Early decay can be stopped without a filling if it's found in time.", refs: ["clarkson1993", "hagman2021"] },
      { v: "more", label: "More than 2 years ago", pts: 3, as: "No check-up for over 2 years",
        why: "People who don't have regular check-ups have more untreated decay, including on the roots.", refs: ["clarkson1993", "hagman2021"] },
      { v: "pain", label: "Only when something hurts", pts: 3, as: "Dentist only when something hurts",
        why: "By the time decay hurts it usually needs a filling. Found early, it can often be stopped.", refs: ["clarkson1993", "hagman2021"] },
    ],
  },
  {
    id: "protect", type: "many", section: "What you use now", when: NAT, none: "None of these",
    text: "Do you already use any of these?",
    hint: "These protect your teeth, so they lower your score.",
    options: [
      { v: "hf", label: "High-fluoride toothpaste (5,000 ppm)", hint: "e.g. NeutraFluor 5000, Clinpro 5000", as: "Using a high-fluoride toothpaste", pts: -4,
        why: "High-fluoride toothpaste gives the strongest everyday protection.", refs: ["featherstone2021", "chen2026"] },
      { v: "tm", label: "GC Tooth Mousse™ or Tooth Mousse™ Plus", as: "Using GC Tooth Mousse™ or Tooth Mousse™ Plus", pts: -3,
        why: "Calcium and phosphate (CPP-ACP) are recommended for people at higher risk of decay.", refs: ["featherstone2021", "agarwal2022"] },
      { v: "varnish", label: "Fluoride varnish from my dentist in the last 6 months", as: "Fluoride varnish in the last 6 months", pts: -3,
        why: "Professional fluoride varnish helps stop early decay.", refs: ["slayton2018", "featherstone2021"] },
      { v: "rinse", label: "A fluoride mouthwash every day", as: "Daily fluoride mouthwash", pts: -2,
        why: "A daily fluoride rinse adds protection.", refs: ["featherstone2021"] },
      { v: "gum", label: "Sugar-free or xylitol gum after meals", as: "Sugar-free gum after meals", pts: -1,
        why: "Chewing sugar-free gum gets saliva flowing after meals.", refs: ["featherstone2021"] },
    ],
  },
];

export const DECAY_BANDS = [
  { id: "low", lo: 0, label: "Low", sub: "Few signs of decay risk. Keep doing what you're doing.", tone: "good" },
  { id: "moderate", lo: 8, label: "Moderate", sub: "Some risk factors. A few changes will protect your teeth.", tone: "amber" },
  { id: "high", lo: 18, label: "High", sub: "Decay is likely without extra protection.", tone: "red" },
  { id: "veryhigh", lo: 30, label: "High", sub: "With a dry mouth, your teeth need the most protection.", tone: "red" },
];
const band = (id) => DECAY_BANDS.find((b) => b.id === id);

/**
 * Dry mouth context from the person's other checks, so it isn't asked twice.
 * { dryRisk: band id, sip: latest SIP (5–15), ph: phPattern level, ageAns: dry mouth risk age answer }
 */
export function decayContext({ dryRisk = null, sip = null, ph = "none", ageAns = null, rtHN = false, sjogren = false, acid = null, smoke = null } = {}) {
  const dry = dryRisk != null || sip != null || rtHN || sjogren;
  // smoke: from the dry mouth risk check (true/false), or null if that hasn't been done.
  return { dry, dryRisk, sip, ph, age: ageAns, rtHN, sjogren, acid, smoke };
}

const SMOKE = { q: "habits", v: "smoke", label: "Smoking or vaping", pts: 3, why: "Tobacco use is linked with more decay, especially on roots.", refs: ["duke2021"] };

/** Points from the other checks: radiotherapy, Sjögren's, saliva flow and pH. */
function contextFactors(ctx) {
  const out = [];
  // Smoking or vaping, answered in the dry mouth risk check (so not asked again here).
  if (ctx.smoke) out.push({ ...SMOKE, from: "risk" });
  // Radiotherapy damages both the salivary glands and the teeth themselves: decay
  // can start within months and spread fast (Moore 2020: 29% of patients, 37% within
  // two years). CAMBRA puts it in the highest group whatever else applies.
  if (ctx.rtHN)
    out.push({ q: "ctx", v: "rt", label: "Radiotherapy to the head or neck", pts: 12, floor: "veryhigh", dryStrong: true, from: "risk",
      why: "Radiotherapy reduces saliva and weakens the teeth themselves. Decay can start within months and spread fast.", refs: ["moore2020", "featherstone2021"] });
  // Vomiting, morning sickness or reflux (from the dry mouth risk check): acid softens enamel,
  // and frequent snacking to settle nausea adds acid attacks.
  if (ctx.acid)
    out.push({ q: "acid", v: "acid", label: ctx.acid, pts: 8, from: "risk",
      why: "Stomach acid softens enamel, and snacking often to settle nausea adds more acid attacks.", refs: ["adaPregnancy", "pbbTeeth"] });
  if (ctx.sjogren)
    out.push({ q: "ctx", v: "sjogren", label: "Sjögren's", pts: 8, floor: "high", dryStrong: true, from: "risk",
      why: "Sjögren's reduces saliva for good, and saliva is the teeth's main natural protection.", refs: ["featherstone2021"] });
  const known = ctx.rtHN || ctx.sjogren;
  if (known) { /* dryness already counted through the cause */ }
  else if (ctx.sip != null && ctx.sip >= 11)
    out.push({ q: "ctx", v: "sip", label: "Dry mouth assessment: moderate to severe or worse", pts: 8, dryStrong: true, from: "sip",
      why: "Your dry mouth check shows a lot of dryness. Less saliva means much less protection from decay.", refs: ["featherstone2021"] });
  else if (ctx.sip != null && ctx.sip >= 8)
    out.push({ q: "ctx", v: "sip", label: "Dry mouth assessment: mild to moderate", pts: 4, from: "sip",
      why: "Your dry mouth check shows some dryness, so your saliva protects your teeth less.", refs: ["featherstone2021"] });
  else if (ctx.sip == null && (ctx.dryRisk === "high" || ctx.dryRisk === "veryhigh"))
    out.push({ q: "ctx", v: "dryrisk", label: "High risk of dry mouth", pts: 4, from: "risk",
      why: "Your dry mouth risk check shows a dry mouth is likely, which raises the risk of decay.", refs: ["featherstone2021"] });
  if (ctx.ph === "flag")
    out.push({ q: "ctx", v: "ph", label: "Saliva consistently acidic", pts: 3, from: "ph",
      why: "Acidic saliva can't neutralise the acid that dissolves teeth.", refs: ["gcSalivaCheck"] });
  else if (ctx.ph === "watch")
    out.push({ q: "ctx", v: "ph", label: "Some acidic saliva results", pts: 1, from: "ph",
      why: "Some of your saliva results are acidic, which weakens your teeth's defence.", refs: ["gcSalivaCheck"] });
  return out;
}

/** Questions to ask, given the answers so far and what the other checks already tell us. */
export const visibleQuestions = (answers = {}, ctx = decayContext()) =>
  DECAY_QUESTIONS.filter((q) => !q.when || q.when(answers, ctx))
    // Smoking was already asked in the dry mouth risk check.
    .map((q) => (q.id === "habits" && ctx.smoke != null ? { ...q, options: q.options.filter((o) => o.v !== "smoke") } : q));

/** Score: { score, band, factors (risk, largest first), protective, noTeeth, dryStrong } */
export function scoreDecay(answers = {}, ctx = decayContext()) {
  if (answers.teeth === "none") return { score: 0, band: band("low"), factors: [], protective: [], noTeeth: true, dryStrong: false };
  const all = [];
  const ageAns = ctx.age || answers.age;
  for (const q of visibleQuestions(answers, ctx)) {
    const a = q.id === "age" ? ageAns : answers[q.id];
    const picked = q.type === "one" ? q.options.filter((o) => o.v === a) : q.options.filter((o) => (a || []).includes(o.v));
    for (const o of picked) if (o.pts) all.push({ q: q.id, v: o.v, label: o.as || o.label, pts: o.pts, why: o.why, refs: o.refs || [], floor: o.floor, dryStrong: !!o.dryStrong, limited: !!o.limited });
  }
  // Age from the dry mouth risk check when the question was skipped.
  if (ctx.age && !all.some((f) => f.q === "age")) {
    const o = DECAY_QUESTIONS.find((q) => q.id === "age").options.find((x) => x.v === ctx.age);
    if (o?.pts) all.push({ q: "age", v: o.v, label: o.as, pts: o.pts, why: o.why, refs: o.refs, from: "risk" });
  }
  all.push(...contextFactors(ctx));
  const factors = all.filter((f) => f.pts > 0).sort((x, y) => y.pts - x.pts);
  const protective = all.filter((f) => f.pts < 0);
  const raw = all.reduce((s, f) => s + f.pts, 0);
  const score = Math.max(0, Math.min(100, raw));
  let b = [...DECAY_BANDS].reverse().find((x) => score >= x.lo);
  // CAMBRA: recent decay puts a person at high risk on its own, whatever else.
  if (factors.some((f) => f.floor === "high") && b.lo < band("high").lo) b = band("high");
  if (factors.some((f) => f.floor === "veryhigh")) b = band("veryhigh");
  // CAMBRA "extreme": high risk plus a very dry mouth.
  const dryStrong = factors.some((f) => f.dryStrong);
  if (b.id === "high" && dryStrong) b = band("veryhigh");
  return { score, band: b, factors, protective, noTeeth: false, dryStrong };
}

/**
 * What to use, by risk level (after CAMBRA's adult recommendations).
 * Returns ordered steps: { id, title, body, products?, refs? }
 */
export function decayPlan(result, answers = {}, { dry = false, acid = false } = {}) {
  if (result.noTeeth) return [
    { id: "dentures", title: "Look after your gums and dentures", body: "Without natural teeth there's no tooth decay to worry about. Clean your dentures every day and take them out at night." },
    { id: "visit", ...checkup({ title: "See your dentist once a year", dentures: true }), refs: ["felton2011"] },
  ];
  const lvl = result.band.id;
  const uses = (v) => (answers.protect || []).includes(v);
  const has = (q, v) => (answers[q] || []).includes?.(v) || answers[q] === v;
  const hi = lvl === "high" || lvl === "veryhigh";
  const out = [];

  if (hi)
    out.push({ id: "hf", title: uses("hf") ? "Keep using your high-fluoride toothpaste" : "Switch to a high-fluoride toothpaste",
      body: "Brush twice a day with a 5,000 ppm fluoride toothpaste instead of your usual one. Spit, don't rinse. It's a Pharmacist Only medicine in Australia — ask your pharmacist or dentist.",
      products: ["neutrafluor"], refs: ["featherstone2021", "chen2026"] });
  else
    out.push({ id: "paste", title: "Brush twice a day with fluoride toothpaste",
      body: "Use a standard fluoride toothpaste (1,000 to 1,450 ppm) morning and night. Spit, don't rinse — the fluoride left on your teeth keeps working. If mint flavour or foaming agents (SLS) sting or bother you, OraNurse is an unflavoured, SLS-free alternative with everyday fluoride.",
      products: ["oranurse"], refs: ["walsh2019"] });

  // Everyone with natural teeth: Tooth Mousse for daily prevention. Recommended with a moderate or
  // high decay risk, a dry mouth, acidic saliva or cancer treatment; optional otherwise.
  const optional = lvl === "low" && !dry && !acid;
  out.push({ id: "tmp", optional, title: uses("tm") ? "Keep using Tooth Mousse™ Plus" : optional ? "Optional: GC Tooth Mousse™ Plus for extra protection" : "Add GC Tooth Mousse™ Plus, morning and night",
      body: has("mouth", "braces")
          ? "After brushing in the morning and at night, smear a pea-sized amount around your brackets and over your teeth. Don't rinse, eat or drink for 30 minutes."
          : `${optional ? "Your risk is low, so this is an optional extra. " : ""}After brushing in the morning and at night, smear a pea-sized amount over your teeth. Don't rinse, eat or drink for 30 minutes. Tooth Mousse™ adds calcium and phosphate; Tooth Mousse™ Plus provides additional protection, fortified with 900 ppm fluoride. Tooth Mousse™ Plus is for ages 6 and over; for younger children, use Tooth Mousse™.`,
      products: ["gc-tmp", "gc-tm"], refs: ["featherstone2021", "agarwal2022"] });

  // Through the day, as needed: Tooth Mousse (no added fluoride) between the morning and night Tooth Mousse Plus.
  if (hi || dry || result.factors.some((f) => f.from === "sip" || f.q === "dry"))
    out.push({ id: "tm", title: "Through the day: GC Tooth Mousse™, as needed",
      body: "Between your morning and night Tooth Mousse™ Plus, smear a little GC Tooth Mousse™ over your teeth after meals or whenever your mouth feels dry. It adds calcium and phosphate without extra fluoride, and you can mix it with GC Dry Mouth Gel.",
      products: ["gc-tm"], refs: ["featherstone2021"] });

  if (result.factors.some((f) => f.q === "sugar"))
    out.push({ id: "sugar", title: "Keep sugar to mealtimes",
      body: "How much sugar you have and how often both matter. Have less, keep sweet things to mealtimes, drink water between meals, and finish with sugar-free gum or a piece of cheese.",
      refs: ["bernabe2016", "moynihan2014", "featherstone2021"] });

  if (result.dryStrong)
    out.push({ id: "dry", title: "Help your saliva",
      body: "Sip water often, chew sugar-free gum to get saliva flowing, and use GC Dry Mouth Gel before meals and at bedtime.",
      products: ["gc-dmg"], refs: ["featherstone2021"] });

  // The full check-up: how often depends on the decay result; overdue if more than a year.
  const overdue = ["2", "more", "pain"].includes(answers.dentist);
  const every = hi ? "every 3 to 6 months" : lvl === "moderate" ? "every 6 to 12 months" : "every 12 to 24 months";
  const extra = [
    overdue ? "It's been a while, so a full check-up is a good idea now." : "",
    dry ? "A dry mouth makes decay more likely, so check-ups matter more." : "",
  ].filter(Boolean).join(" ");
  out.push({ id: "visit", ...checkup({
      title: overdue ? "Book a full check-up with your dentist" : hi || lvl === "moderate" ? `See your dentist ${every}` : "Keep up your regular check-ups",
      extra,
      note: `${overdue ? `After that, ${every} suits your result.` : ""}${hi ? " Ask for fluoride varnish at each visit, and show your dentist this result." : " Show your dentist this result."}`.trim() }),
    refs: hi ? ["slayton2018", "featherstone2021", "niceRecall"] : ["featherstone2021", "niceRecall"] });
  return out;
}

// ── Grouping for the visual breakdown ───────────────────────────────────────
export const DECAY_GROUPS = [
  { id: "history", label: "Past decay", qs: ["recent"], act: false },
  { id: "diet", label: "Food and drink", qs: ["sugar"], act: true, actNote: "Keep sugar to mealtimes." },
  { id: "clean", label: "Cleaning", qs: ["brush", "dentist"], act: true, actNote: "Twice-daily fluoride toothpaste and regular check-ups." },
  { id: "teeth", label: "Your teeth", qs: ["mouth"], act: false },
  { id: "gums", label: "Your gums", qs: ["gums"], act: true, actNote: "Brush gently along the gumline twice a day, clean between your teeth, and ask your dentist or hygienist about a gum check." },
  { id: "saliva", label: "Saliva", qs: ["dry", "ctx"], act: true, actNote: "Saliva gel, water and sugar-free gum help." },
  { id: "acid", label: "Stomach acid", qs: ["acid"], act: true, actNote: "After vomiting, rinse with water or a bicarbonate rinse and wait at least 30 minutes before brushing." },
  { id: "habits", label: "Habits", qs: ["habits"], act: true, actNote: "Small changes here make a real difference." },
  { id: "about", label: "Age", qs: ["age"], act: false },
];
export function decayBreakdown(result) {
  return DECAY_GROUPS.map((g) => {
    const fs = result.factors.filter((f) => g.qs.includes(f.q));
    return { ...g, factors: fs, pts: fs.reduce((s, f) => s + f.pts, 0) };
  }).filter((g) => g.pts > 0);
}
