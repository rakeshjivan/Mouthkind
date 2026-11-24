// ─── Looking after your mouth ──────────────────────────────────────────────
// Support strategies, written short and plain: one action per step, about a
// Year 6–8 reading level. References sit behind "Sources" on each topic.
// `forYou(ctx)` marks a topic as relevant from the person's own results:
//   ctx.f      — set of risk factor ids ("habits.smoke", "medTypes.bladder"…)
//   ctx.sip    — latest SIP-SCORE (5–15) or null
//   ctx.ph     — phPattern() level: none · ok · watch · flag
//   ctx.risk   — dry mouth risk band id or null
//   ctx.decay  — tooth decay risk band id or null
//   ctx.cancer — in cancer care (from the welcome / Me)
//   ctx.tx     — treatments (rt_hn, chemo, transplant, immuno, rai, surgery)
//   ctx.active — having treatment now or just finished

const has = (ctx, ...ids) => ids.some((i) => ctx.f.has(i));
const tx = (c, ...t) => t.some((x) => (c.tx || []).includes(x));

export const CARE_TOPICS = [
  // ── Cancer care (shown first when they apply) ──
  {
    id: "help", icon: "alert", title: "When to get help straight away", cancer: true,
    short: "Call your treatment team or go to the emergency department.",
    forYou: (c) => !!c.cancer,
    steps: [
      "A temperature of 38°C or more.",
      "Pain you can't control.",
      "You can't eat or drink.",
      "Bleeding in your mouth that won't stop.",
      "You can't open your mouth, your face is swelling, or it's hard to breathe.",
      "Add your team's 24-hour number to Contact my care team on Home, so it's one tap away.",
    ],
    refs: ["healthdirectFN", "ccaMouth2025"],
  },
  {
    // Oral mucositis. Prevention and treatment from MASCC/ISOO 2020 (Elad 2020): each option
    // is shown only for the treatments it was tested in. Basic oral care is suggested for all.
    id: "sore", icon: "heart", title: "Mouth sores from treatment (mucositis)", cancer: true,
    short: "What to expect, what helps every day, and what to ask your team about.",
    forYou: (c) => !!c.cancer && (c.active || tx(c, "rt_hn", "chemo", "transplant")),
    sections: [
      { h: "What it is", steps: [
        "Chemotherapy and radiotherapy can make the lining of the mouth red, sore and ulcerated. This is called oral mucositis.",
        { t: "After chemotherapy it usually starts a few days after treatment, is worst in the second week, then settles.", for: ["chemo", "transplant"] },
        { t: "With head and neck radiotherapy it builds from about week 2, can be worst at the end, and heals over the weeks after.", for: ["rt_hn"] },
        "It does heal. But it can make eating, drinking and swallowing hard, so tell your team early rather than waiting.",
        "Log your mouth pain each day on Home. It shows you and your team how it's changing.",
      ] },
      { h: "Every day", steps: [
        "Brush gently with a soft brush and mild fluoride toothpaste, after meals and at bedtime. A clean mouth heals better.",
        "Rinse at least 4 times a day with a bland rinse: ¼ teaspoon bicarbonate of soda or salt in a cup of warm water. Swish for 30 seconds, then spit.",
        "If brushing is too sore, ask your team what to use instead.",
        "Take pain relief before meals, so eating is easier.",
        "Sip water often and keep your lips moist.",
        "Skip alcohol, smoking, alcohol mouthwashes, and spicy, acidic, crunchy or very hot food.",
        "If you wear dentures, leave them out except to eat.",
      ] },
      { h: "Ask your team about", steps: [
        { t: "Ice chips: sucking ice for 30 minutes during the infusion helps prevent sores with some chemotherapy (5-FU given as a quick injection, or high-dose melphalan before a stem cell transplant). Only if your team says it suits your treatment.", for: ["chemo", "transplant"] },
        { t: "Benzydamine mouthwash, to help prevent sores during head and neck radiotherapy.", for: ["rt_hn"] },
        { t: "Light therapy (photobiomodulation, a low-level laser inside the mouth), where your clinic offers it.", for: ["rt_hn", "transplant"] },
        { t: "Honey, which may help prevent sores during head and neck radiotherapy. It's sugary, so rinse with water afterwards and keep up your fluoride.", for: ["rt_hn"] },
        { t: "Morphine mouthwash, for painful sores during head and neck chemoradiotherapy.", for: ["rt_hn"] },
        "Stronger pain relief if your usual pain relief isn't enough.",
      ] },
      { h: "Best avoided", steps: [
        { t: "Chlorhexidine mouthwash doesn't help prevent sores during head and neck radiotherapy. Use it only if your team prescribes it for an infection.", for: ["rt_hn"] },
        "Mouthwashes with alcohol: they sting and dry the mouth.",
      ] },
      { h: "Call your team the same day if", steps: [
        "Pain relief isn't keeping the pain bearable.",
        "You can't eat or drink, or it hurts to swallow.",
        "You see white patches, or the sores are bleeding.",
        "You have a temperature of 38°C or more: call straight away.",
      ] },
    ],
    refs: ["elad2020", "elad2015", "lalla2008", "nciPdqHp", "canberraHN", "ccaMouth2025"],
  },
  {
    id: "eating", icon: "leaf", title: "Eating with a sore or dry mouth", cancer: true,
    short: "Soft, moist food, little and often.",
    forYou: (c) => !!c.cancer && c.active,
    steps: [
      "Choose soft, moist food: soup, yoghurt, custard, mashed potato, scrambled eggs, slow-cooked meat or fish.",
      "Add gravy, sauce or butter to make food easier to swallow.",
      "Eat little and often, and sip water with every mouthful.",
      "Try a straw for drinks if your mouth has sores.",
      "Ice chips or sugar-free gum can help a dry mouth.",
      "Losing weight? Ask your team to see a dietitian.",
    ],
    refs: ["ccaMouth2025"],
  },
  {
    id: "thrush", icon: "info", title: "White patches (thrush)", cancer: true,
    short: "Common during treatment, and easy to treat.",
    forYou: (c) => !!c.cancer,
    steps: [
      "Look for white or red patches, or a white or yellow coating on your tongue or cheeks.",
      "It can change your taste or cause bad breath.",
      "Tell your team. Antifungal drops or gel usually clear it within 1 to 2 weeks — finish the full course.",
      "Take warfarin or another blood thinner? Say so before you start. Miconazole gel can raise warfarin levels dangerously.",
      "Clean dentures every day and leave them out overnight.",
    ],
    refs: ["lalla2010", "mhraMiconazole", "ccaMouth2025"],
  },
  {
    id: "rtlife", icon: "shield", title: "After radiotherapy: teeth for life", cancer: true,
    short: "Fluoride every day, and tell every dentist.",
    forYou: (c) => !!c.cancer && tx(c, "rt_hn"),
    steps: [
      "Use fluoride every day for life: a high-fluoride toothpaste, or fluoride trays if your dentist made you some.",
      "Add GC Tooth Mousse™ Plus after brushing, morning and night. A dry mouth can decay very fast.",
      "See your dentist every 3 to 6 months.",
      "Tell every dentist you've had radiotherapy before any tooth is taken out. The jaw can heal poorly there. Show them your dental alert card.",
      "Check how wide you can open once a month. If it's getting harder, tell your team early.",
    ],
    products: ["neutrafluor", "gc-tmp", "gc-tm"], refs: ["peterson2024", "nciPdqHp", "featherstone2021"],
  },

  // ── Everyone ──
  {
    id: "water", icon: "drop", title: "Drink enough water",
    short: "Small sips through the day keep your mouth moist.",
    forYou: (c) => !has(c, "conditions.dialysis") && (has(c, "water.low", "habits.caffeine", "habits.alcohol") || (c.sip ?? 0) >= 8),
    steps: [
      "On dialysis, or told to limit fluids? Keep within your limit. Sugar-free gum, sugar-free sweets and a saliva gel moisten your mouth without adding fluid.",
      "Carry a water bottle and take small sips often.",
      "Little and often works better than a lot at once. If your doctor has limited how much you drink, follow their advice.",
      "Sip water with meals to help you chew and swallow.",
      "Keep water by your bed at night.",
      "Water is best. Soft drink, juice and sports drinks are acidic and sugary.",
    ],
    refs: ["thomson2011"],
  },
  {
    id: "diet", icon: "leaf", title: "Eat and drink for your teeth",
    short: "How much sugar you have, and how often, both matter.",
    forYou: (c) => c.ph === "flag" || c.ph === "watch" || (c.sip ?? 0) >= 8,
    steps: [
      "Have less sugar overall, and keep sweet and acidic food and drinks to mealtimes. Every snack starts a new acid attack.",
      "Go easy on soft drink, juice, sports drinks, wine and citrus.",
      "Finish a meal with cheese or milk — they help neutralise acid.",
      "Chew sugar-free gum after meals to get saliva flowing.",
      "Don't suck sweets to ease a dry mouth. Use sugar-free gum or a saliva gel.",
    ],
    refs: ["bernabe2016", "moynihan2014"],
  },
  {
    id: "habits", icon: "user", title: "Change a few habits",
    short: "Small changes that stop your mouth drying out.",
    forYou: (c) => has(c, "habits.smoke", "habits.vape", "habits.cannabis", "habits.alcohol", "habits.caffeine", "breathing.mouth", "breathing.cpap", "breathing.snore", "breathing.mad"),
    steps: [
      "If you smoke or vape, quitting helps. Quitline is free: 13 78 48 (Australia), 0800 778 778 (New Zealand).",
      "Have less alcohol, especially in the evening. Cut back on caffeine too if you notice it dries your mouth.",
      "Use an alcohol-free mouthwash.",
      "Breathe through your mouth? Ask your GP to check for a blocked nose, allergies or sleep apnoea.",
      "On CPAP? Ask your sleep clinic about a heated humidifier, and about stopping air leaking from your mouth (a chin strap or a better-fitting mask).",
      "A humidifier in the bedroom can help at night.",
    ],
    refs: ["mador2005", "kennedy2019", "wolff2017"],
  },
  {
    id: "clean", icon: "check", title: "Clean gently, twice a day",
    short: "A soft brush and fluoride toothpaste, morning and night.",
    forYou: (c) => c.risk === "high" || c.risk === "veryhigh" || c.ph === "flag" || c.decay === "high" || c.decay === "veryhigh",
    steps: [
      "Use a soft brush, or an electric brush on a gentle setting.",
      "Brush for 2 minutes, morning and night, with fluoride toothpaste.",
      "Spit, don't rinse. The fluoride keeps working.",
      "Clean between your teeth once a day.",
      "Mouth sore or sensitive? Try a mild, low-foam toothpaste (no SLS).",
      "Clean dentures every day and leave them out at night.",
    ],
    products: ["oranurse"], refs: ["walsh2019", "felton2011"],
  },
  {
    id: "protect", icon: "shield", title: "Protect your teeth",
    short: "Fluoride, calcium and phosphate — what saliva would normally give.",
    forYou: (c) => c.ph === "flag" || c.ph === "watch" || (c.sip ?? 0) >= 8 || c.risk === "high" || c.risk === "veryhigh" || ["moderate", "high", "veryhigh"].includes(c.decay),
    steps: [
      "Ask your dentist if you need a high-fluoride toothpaste (5,000 ppm).",
      "After brushing in the morning and at night, smear a pea-sized amount of GC Tooth Mousse™ Plus over your teeth. Don't rinse, eat or drink for 30 minutes. It provides additional protection, fortified with 900 ppm fluoride.",
      "GC Tooth Mousse™ has calcium and phosphate without fluoride. It suits daytime use, or children.",
      "Not if you're allergic to milk protein. Tooth Mousse™ Plus isn't for children 6 or under.",
      "Ask for fluoride varnish at your check-ups.",
    ],
    products: ["gc-tmp", "gc-tm", "neutrafluor"], refs: ["sim2019", "agarwal2022"],
  },
  {
    id: "moisten", icon: "drop", title: "Moisten your mouth",
    short: "A saliva gel lasts longer than water, especially at night.",
    forYou: (c) => (c.sip ?? 0) >= 8 || has(c, "cancer.rt_hn", "conditions.sjogren") || tx(c, "rt_hn"),
    steps: [
      "Spread a pea-sized amount of GC Dry Mouth Gel over your tongue, cheeks and gums with a clean finger.",
      "Use it before meals and at bedtime, when dryness is often worst.",
      "Use it as often as you need. It's sugar-free and close to neutral pH.",
      "Sugar-free gum can help your own saliva flow, if your glands still work.",
      "Not if you're allergic to hydroxybenzoates.",
    ],
    products: ["gc-dmg"], refs: ["nuchit2020", "mercadante2021"],
  },
  {
    id: "acid", icon: "shield", title: "After vomiting or reflux",
    short: "Acid softens enamel — rinse first, brush later.",
    forYou: (c) => has(c, "conditions.reflux", "conditions.eating", "conditions.pregnantSick", "medTypes.glp1"),
    steps: [
      "Rinse straight away with water, or with 1 teaspoon of bicarbonate of soda in a cup of water to neutralise the acid.",
      "Wait at least 30 minutes, ideally an hour, before brushing. Brushing softened enamel wears it away.",
      "Meanwhile, smear fluoride toothpaste, GC Tooth Mousse™ or GC Tooth Mousse™ Plus (fortified with 900 ppm fluoride) on your teeth with a clean finger.",
      "Chew sugar-free gum to wash the acid away.",
      "If it keeps happening, see your GP, and tell your dentist.",
    ],
    products: ["gc-tm", "gc-tmp"], refs: ["adaPregnancy", "pbbTeeth"],
  },
  {
    id: "pregnancy", icon: "user", title: "Your mouth in pregnancy",
    short: "Gums change and snacking increases — a little extra care helps.",
    forYou: (c) => has(c, "conditions.pregnant", "conditions.pregnantSick"),
    steps: [
      "Tell your dentist you're pregnant. Check-ups and most treatment are safe.",
      "Gums often swell and bleed more. Keep brushing gently twice a day and clean between your teeth.",
      "Keep sweet treats to mealtimes. Choose cheese, plain yoghurt or crackers between meals.",
      "Brushing makes you gag? Try a smaller brush head, an unflavoured toothpaste, or a different time of day.",
    ],
    products: ["oranurse"], refs: ["adaPregnancy", "adaAusGums", "pbbTeeth"],
  },
  {
    id: "menopause", icon: "user", title: "Menopause and your mouth",
    short: "Lower oestrogen can mean less saliva and more decay.",
    forYou: (c) => has(c, "conditions.menopause", "medTypes.hrt"),
    steps: [
      "Saliva glands respond to oestrogen, so after menopause many women notice a drier mouth, burning or a change in taste.",
      "Gums can become more sensitive, and decay is more common after menopause.",
      "Brush twice a day with fluoride toothpaste, clean between your teeth, and keep up regular check-ups.",
      "HRT improves saliva for many women, but the evidence is mixed and some still notice dryness. If your mouth got drier after starting or changing HRT, talk to your GP. Don't stop it yourself.",
      "Tell your dentist about menopause and any HRT, and mention a burning mouth if you have one.",
    ],
    refs: ["butera2026", "arealquecuty2025", "lago2015", "oliveira2025"],
  },
  {
    id: "medicines", icon: "doc", title: "Check your medicines",
    short: "Many medicines dry the mouth. Some can be changed.",
    forYou: (c) => [...c.f].some((i) => i.startsWith("medTypes.") || i === "meds.5" || i === "meds.10"),
    steps: [
      "Ask your pharmacist or GP for a medicine review. Take your list or your medicines with you.",
      "A different medicine, dose or time of day can make a big difference.",
      "Never stop or change a medicine without talking to your doctor first.",
    ],
    refs: ["wolff2017", "ringstad2026", "lee2026"],
  },
  {
    id: "dentist", icon: "user", title: "See your dentist regularly",
    short: "With a dry or acidic mouth, decay can start quickly.",
    forYou: (c) => c.ph === "flag" || c.risk === "veryhigh" || (c.sip ?? 0) >= 11 || c.decay === "high" || c.decay === "veryhigh",
    steps: [
      "Tell your dentist you have a dry mouth or acidic saliva. Show them this app.",
      "Ask how often to come in — often every 3 to 6 months when risk is high.",
      "Your dentist can test your saliva, apply fluoride varnish and find early decay.",
    ],
    refs: ["niceRecall", "featherstone2021", "gcSalivaCheck"],
  },
];

/** Build the context `forYou` needs from saved results and the person's situation. */
export function careContext({ factors = [], sip = null, ph = "none", risk = null, decay = null, cancer = false, tx = [], active = false }) {
  return { f: new Set(factors.map((x) => `${x.q}.${x.v}`)), sip, ph, risk, decay, cancer, tx, active };
}

for (const t of CARE_TOPICS) if (t.sections && !t.steps) t.steps = t.sections.flatMap((x) => x.steps.map((y) => (typeof y === "string" ? y : y.t)));

/** A topic's sections with steps kept only for the treatments they apply to (none known → all). */
export function topicSections(t, ctx = {}) {
  const txs = ctx.tx || [];
  return (t.sections || []).map((x) => ({ h: x.h, steps: x.steps.filter((y) => typeof y === "string" || !txs.length || y.for.some((v) => txs.includes(v))).map((y) => (typeof y === "string" ? y : y.t)) })).filter((x) => x.steps.length);
}
