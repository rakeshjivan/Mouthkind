// ─── Looking after a dry or acidic mouth ───────────────────────────────────
// Support strategies, in the order most people need them. `forYou(ctx)`
// marks a topic as relevant from the person's own results:
//   ctx.f    — set of risk factor ids ("habits.smoke", "medTypes.bladder"…)
//   ctx.sip  — latest SIP-SCORE (5–15) or null
//   ctx.ph   — phPattern() level: none · ok · watch · flag
//   ctx.risk — dry mouth risk band id or null
//   ctx.decay — tooth decay risk band id or null

const has = (ctx, ...ids) => ids.some((i) => ctx.f.has(i));

export const CARE_TOPICS = [
  {
    id: "water", icon: "drop", title: "Drink enough water",
    short: "Small sips through the day keep your mouth moist.",
    forYou: (c) => has(c, "water.low", "habits.caffeine", "habits.alcohol") || (c.sip ?? 0) >= 8,
    steps: [
      "Keep a water bottle with you and take small sips often — not just when you're thirsty.",
      "Aim for about 8 glasses of fluid a day, unless your doctor has told you to limit fluids.",
      "Sip water with meals to help you chew and swallow.",
      "Keep water by your bed for the night.",
      "Water is best. Sugary, fizzy and sports drinks are acidic and feed decay.",
    ],
  },
  {
    id: "diet", icon: "leaf", title: "Eat and drink for your teeth",
    short: "How often you have sugar and acid matters more than how much.",
    forYou: (c) => c.ph === "flag" || c.ph === "watch" || (c.sip ?? 0) >= 8 || ["moderate", "high", "veryhigh"].includes(c.decay),
    steps: [
      "Keep sugary and acidic foods and drinks to mealtimes. Every snack or sip starts a new acid attack.",
      "Go easy on soft drinks, juice, sports drinks, wine, citrus and vinegar — they're acidic as well as sugary.",
      "Finish a meal with a piece of cheese or a glass of milk: they help neutralise acid.",
      "Chew sugar-free gum or a xylitol mint after meals to get saliva flowing.",
      "Avoid sucking sweets or sipping sweet drinks to ease a dry mouth — it's a fast route to decay.",
    ],
  },
  {
    id: "habits", icon: "user", title: "Change a few habits",
    short: "Small changes that stop your mouth drying out.",
    forYou: (c) => has(c, "habits.smoke", "habits.vape", "habits.cannabis", "habits.alcohol", "habits.caffeine", "breathing.mouth", "breathing.cpap", "breathing.snore", "breathing.mad"),
    steps: [
      "If you smoke or vape, quitting helps your saliva and your teeth. Quitline is free: 13 78 48 (Australia), 0800 778 778 (New Zealand).",
      "Cut back on alcohol and caffeine, especially in the evening.",
      "Use an alcohol-free mouthwash — alcohol dries the mouth.",
      "If you breathe through your mouth, ask your GP to check for a blocked nose, allergies or sleep apnoea.",
      "Using CPAP? Ask your sleep clinic about a heated humidifier, chin strap or full-face mask.",
      "A humidifier in the bedroom can help at night.",
    ],
    refs: ["raoof2023"],
  },
  {
    id: "clean", icon: "check", title: "Clean gently, twice a day",
    short: "A soft brush and fluoride toothpaste, every morning and night.",
    forYou: (c) => c.risk === "high" || c.risk === "veryhigh" || c.ph === "flag" || c.decay === "high" || c.decay === "veryhigh",
    steps: [
      "Use a soft or extra-soft toothbrush, or an electric brush on a gentle setting.",
      "Brush for two minutes, morning and night, with a fluoride toothpaste.",
      "Spit, don't rinse — leaving the fluoride on your teeth makes it work harder.",
      "Clean between your teeth once a day with floss or interdental brushes.",
      "Choose a mild, low-foaming toothpaste (no SLS) if your mouth feels sore or sensitive.",
      "If you wear dentures, take them out at night and clean them every day.",
    ],
    products: ["oranurse"],
  },
  {
    id: "protect", icon: "shield", title: "Protect your teeth",
    short: "Fluoride plus calcium and phosphate — what saliva would normally provide.",
    forYou: (c) => c.ph === "flag" || c.ph === "watch" || (c.sip ?? 0) >= 8 || c.risk === "high" || c.risk === "veryhigh" || ["moderate", "high", "veryhigh"].includes(c.decay),
    steps: [
      "Ask your dentist whether you need a high-fluoride toothpaste (5000 ppm, on prescription) instead of your usual one.",
      "After brushing at night, smear a pea-sized amount of GC Tooth Mousse Plus over your teeth. Don't rinse, eat or drink for 30 minutes.",
      "Tooth Mousse Plus adds calcium, phosphate (CPP-ACP) and fluoride. GC Tooth Mousse has the same calcium and phosphate without fluoride — your dentist will say which suits you.",
      "Not if you're allergic to milk protein (casein). Tooth Mousse Plus isn't for children 6 or under.",
      "Ask your dentist about fluoride varnish at your check-ups.",
    ],
    products: ["gc-tmp", "gc-tm", "neutrafluor"], refs: ["sim2019", "agarwal2022"],
  },
  {
    id: "moisten", icon: "drop", title: "Moisten your mouth",
    short: "A saliva gel lasts longer than water, especially at night.",
    forYou: (c) => (c.sip ?? 0) >= 8 || has(c, "cancer.rt_hn", "conditions.sjogren"),
    steps: [
      "Spread a pea-sized amount of GC Dry Mouth Gel over your tongue, cheeks and gums with a clean finger.",
      "Use it before meals to make eating easier, and at bedtime when dryness is often worst.",
      "Use it as often as you need — it's sugar-free and close to neutral pH.",
      "Sugar-free gum or xylitol lozenges can help your own saliva flow, if your glands still work.",
      "Avoid if you're allergic to hydroxybenzoates.",
    ],
    products: ["gc-dmg"], refs: ["nuchit2020", "mercadante2021"],
  },
  {
    id: "acid", icon: "shield", title: "After vomiting or reflux",
    short: "Acid softens enamel — rinse first, brush later.",
    forYou: (c) => has(c, "conditions.reflux", "conditions.eating", "pregnant.sick", "medTypes.glp1"),
    steps: [
      "Rinse your mouth with plain water straight away.",
      "Wait about an hour before brushing — brushing softened enamel wears it away.",
      "In the meantime, smear fluoride toothpaste or GC Tooth Mousse over your teeth with a clean finger, or use an alcohol-free fluoride mouthwash.",
      "Chew sugar-free gum to get saliva flowing and wash the acid away.",
      "If reflux or vomiting keeps happening, see your GP — and let your dentist know so they can check for wear.",
    ],
    products: ["gc-tm"], refs: ["adaPregnancy", "pbbTeeth"],
  },
  {
    id: "pregnancy", icon: "user", title: "Your mouth in pregnancy",
    short: "Gums change and snacking increases — a little extra care helps.",
    forYou: (c) => has(c, "pregnant.yes", "pregnant.sick"),
    steps: [
      "Tell your dentist you're pregnant. Check-ups and most treatment are safe — many people find the second trimester most comfortable.",
      "Gums often swell and bleed more in pregnancy. Keep brushing gently twice a day with a soft brush and fluoride toothpaste, and clean between your teeth daily.",
      "Cravings and grazing feed decay. Keep sweet treats to mealtimes and choose cheese, plain yoghurt or crackers between meals.",
      "If brushing makes you gag, try a smaller brush head, an unflavoured toothpaste, or brush at a different time of day.",
    ],
    products: ["oranurse"], refs: ["adaPregnancy", "pbbTeeth"],
  },
  {
    id: "medicines", icon: "doc", title: "Check your medicines",
    short: "Many medicines dry the mouth. Some can be changed.",
    forYou: (c) => [...c.f].some((i) => i.startsWith("medTypes.") || i === "meds.5" || i === "meds.10"),
    steps: [
      "Ask your pharmacist or GP for a medicine review — take a list, or your medicines, with you.",
      "Sometimes a different medicine, dose or time of day makes a big difference.",
      "Never stop or change a medicine without talking to your doctor first.",
    ],
    refs: ["wolff2017"],
  },
  {
    id: "dentist", icon: "user", title: "See your dentist regularly",
    short: "With a dry or acidic mouth, decay can start quickly.",
    forYou: (c) => c.ph === "flag" || c.risk === "veryhigh" || (c.sip ?? 0) >= 11 || c.decay === "high" || c.decay === "veryhigh",
    steps: [
      "Tell your dentist you have a dry mouth or acidic saliva, and show them your results in this app.",
      "Ask how often you should have check-ups — often every 3 to 6 months when risk is high.",
      "Your dentist can test your saliva flow and buffering, apply fluoride varnish and spot early decay.",
    ],
    refs: ["gcSalivaCheck"],
  },
];

/** Build the context `forYou` needs from saved results. */
export function careContext({ factors = [], sip = null, ph = "none", risk = null, decay = null }) {
  return { f: new Set(factors.map((x) => `${x.q}.${x.v}`)), sip, ph, risk, decay };
}
