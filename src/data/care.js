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
      "Add your team's 24-hour number under Call my team on Today, so it's one tap away.",
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
        "Write in your mouth diary each day. It shows you and your team how it's changing.",
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
    id: "taste", icon: "leaf", title: "Taste changes during treatment", cancer: true,
    short: "Common, frustrating and usually temporary. A few things help.",
    forYou: (c) => !!c.cancer && (c.active || tx(c, "rt_hn", "chemo")),
    steps: [
      "More than half of people having chemotherapy or radiotherapy notice taste changes: food can taste bland, bitter, salty, sweet or metallic.",
      "Taste usually comes back gradually over the months after treatment, though after head and neck radiotherapy it can take longer.",
      "A dry mouth makes it worse, because flavours need saliva to reach the taste buds. Moisten your mouth before meals.",
      "Clean your teeth and rinse before eating to freshen your mouth.",
      "Metallic taste? Try plastic cutlery, and cold or room-temperature food.",
      "If your mouth isn't sore, try stronger flavours: herbs, marinades, a squeeze of lemon. Rinse with water afterwards to protect your teeth.",
      "Eating less, or losing weight? Ask your team to see a dietitian.",
    ],
    refs: ["hovan2010", "pedersen2018", "ccaMouth2025"],
  },
  {
    id: "swallow", icon: "alert", title: "Trouble swallowing", cancer: true,
    short: "Tell your team early. Some swallowing problems need checking the same day.",
    forYou: (c) => !!c.cancer && (c.active || tx(c, "rt_hn")),
    sections: [
      { h: "Why it happens", steps: [
        "Sores, swelling, a dry mouth and thick saliva can all make swallowing hard during treatment.",
        "Radiotherapy to the head or neck can also stiffen the muscles used to swallow, during treatment and for a long time after.",
      ] },
      { h: "What helps", steps: [
        "Sit upright to eat and drink, and stay upright for 30 minutes afterwards.",
        "Take small mouthfuls, and choose soft, moist food with sauce or gravy.",
        "Moisten your mouth before meals, and sip water between mouthfuls.",
        "Take pain relief before meals if your team has given you some.",
        { t: "Ask your team for a speech pathologist. Swallowing exercises started before or during radiotherapy can help keep your swallow working.", for: ["rt_hn"] },
      ] },
      { h: "Call your team the same day if", steps: [
        "You cough or choke when you eat or drink, or your voice sounds wet or gurgly afterwards.",
        "You can't swallow your medicines, or can't drink enough.",
        "Food feels stuck, or you're losing weight.",
        "You have a temperature of 38°C or more, or feel short of breath: food or drink may have gone into your lungs.",
      ] },
    ],
    refs: ["yang2021", "charters2024", "pedersen2018", "ccaMouth2025"],
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
      "Ask your dentist about a calcium and phosphate crème with fluoride after brushing, morning and night. A dry mouth can decay very fast.",
      "See your dentist every 3 to 6 months.",
      "Tell every dentist you've had radiotherapy before any tooth is taken out. The jaw can heal poorly there. Show them your dental alert card.",
      "Check how wide you can open once a month. If it's getting harder, tell your team early.",
    ],
    refs: ["peterson2024", "nciPdqHp", "featherstone2021", "reynolds2008"],
  },

  // ── Everyone ──
  // Start here: general information, the same for everyone, with no product names. It sets
  // out the properties to look for; the Shop shows which products have them.
  {
    id: "saliva", icon: "drop", title: "What saliva does, and what a dry mouth changes", general: true,
    short: "Saliva does far more than keep your mouth wet.",
    forYou: () => false,
    sections: [
      { h: "What saliva does", steps: [
        "It wets and lubricates the mouth, so you can talk, chew and swallow comfortably, and dentures stay in place.",
        "It helps you taste. Flavours dissolve in saliva before your tongue can sense them.",
        "It neutralises acid. Natural buffers in saliva, mainly bicarbonate, bring the mouth back towards neutral after you eat or drink.",
        "It carries calcium and phosphate, the minerals teeth are made of, and keeps the mouth topped up with them, so early acid damage is repaired all day.",
        "It coats the teeth and the lining of the mouth with a thin protective film.",
        "It contains natural antibacterial, antifungal and antiviral proteins, such as lysozyme, lactoferrin, peroxidase and histatins, that keep the mix of germs in the mouth in balance.",
      ] },
      { h: "What changes when there's less of it", steps: [
        "The mouth feels dry, sticky or burning, and its lining can become sore, cracked or ulcerated.",
        "Chewing, swallowing and talking get harder. Dry food sticks, and dentures can rub or lose their grip.",
        "Taste changes: food can seem bland, bitter or metallic.",
        "The balance of germs shifts. Thrush (candida), gum problems and bad breath become more common.",
        "Acid lingers and minerals aren't replaced, so tooth decay and acid wear speed up. See \"Protecting your teeth when your mouth is dry\".",
        "A dry mouth at night can break your sleep.",
      ] },
      { h: "Why it happens", steps: [
        "Medicines are the most common cause, especially when you take several.",
        "Conditions such as Sjögren's, diabetes and kidney disease, cancer treatment, mouth breathing, smoking and not drinking enough can all add to it.",
        "Your own list, under Records, shows the ones you told us about.",
      ] },
    ],
    refs: ["dawes2008", "pedersen2018", "vanthof2014", "buranarom2020", "babu2022", "villa2015", "wolff2017"],
  },
  {
    id: "teeth", icon: "tooth", title: "Protecting your teeth when your mouth is dry", general: true, shop: true,
    look: ["Calcium and phosphate", "Fluoride", "Neutralises plaque acids"],
    short: "Less saliva means less acid neutralising and less mineral. Put both back.",
    forYou: () => false,
    sections: [
      { h: "Why teeth are at risk", steps: [
        "Every time you have sugar, plaque bacteria make acid that dissolves mineral from your teeth. Saliva normally neutralises that acid and puts the mineral back.",
        "With less saliva, acid stays longer and mineral isn't replaced, so decay can start and spread quickly. It often starts at the gum line and on exposed roots, where it's hard to see.",
        "Acid from food, drink, reflux or vomiting softens enamel. Without saliva to repair the surface, teeth wear away faster. This is called erosion.",
        "Saliva almost stops while you sleep, so the night is when teeth are least protected.",
        "After radiotherapy to the head or neck, decay can appear within the first three months and move fast.",
      ] },
      { h: "Neutralise acid quickly", steps: [
        "After eating or drinking, rinse with water, chew sugar-free gum, or finish with cheese or milk.",
        "After vomiting or reflux, rinse with water, or a teaspoon of bicarbonate of soda in a cup of water. Wait about an hour before brushing.",
        "A product that buffers plaque acid on the teeth helps between meals and overnight, when your own saliva can't.",
      ] },
      { h: "Put mineral back", steps: [
        "Teeth are made of calcium and phosphate. When saliva is low, a product that delivers calcium and phosphate to the teeth replaces what acid removes and keeps the mouth topped up with mineral.",
        "Fluoride works with calcium and phosphate. Together they rebuild the enamel surface as fluorapatite, which resists acid better than the original enamel.",
        "The best-studied products hold calcium and phosphate in a form that stays available on the tooth, and some add fluoride as well. Ask your dentist which suits you: some aren't for children 6 or under, and some contain milk protein.",
      ] },
      { h: "Every day", steps: [
        "Brush twice a day with a fluoride toothpaste, last thing at night most of all. Spit, don't rinse.",
        "Use a soft brush, and clean between your teeth once a day.",
        "Keep sugary food and drinks to mealtimes, and choose water between meals. Don't suck sweets to ease dryness.",
        "Ask your dentist whether you need a high-fluoride toothpaste (5,000 ppm) or fluoride varnish.",
        "Tell your dentist your mouth is dry, and keep up check-ups, often every 3 to 6 months, so early decay is found while it can still be repaired.",
      ] },
    ],
    refs: ["featherstone2004", "featherstone2008", "reynolds2008", "cochrane2010", "dawes2008", "buzalaf2012", "chapple2017", "hong2010", "gupta2015", "walsh2019", "moynihan2014"],
  },
  {
    id: "products", icon: "drop", title: "Choosing a dry mouth product", general: true, shop: true,
    look: ["Gel", "Close to neutral pH", "Sugar-free", "Range of flavours"],
    short: "Look for a gel, close to neutral pH, sugar-free, in a flavour you like.",
    forYou: () => false,
    sections: [
      { h: "What they do", steps: [
        "Dry mouth gels, sprays and rinses moisten and lubricate the mouth. They relieve dryness for a while; they don't make the glands work again or treat the cause.",
        "International cancer care guidelines (MASCC/ISOO and ASCO) support mouth lubricants, saliva substitutes and sugar-free lozenges or gum for a dry mouth.",
      ] },
      { h: "What to look for", steps: [
        "A gel for longer relief. Thicker, more lubricating gels coat and cling to the lining of the mouth for longer than sprays or rinses. That matters most at night, before meals and on long days out.",
        "Close to neutral pH. Researchers recommend a pH of about 6.7 or higher, because below that, exposed roots start to soften, and below about 5.5, enamel does too.",
        "Many dry mouth products are acidic. In independent tests, three in four sprays and gels were below pH 6.7 when opened, some were below 5.5, and the pH fell further the longer an opened product was kept. Check the label for the pH, ask your pharmacist, and use it within the time the label gives.",
        "Products with added enzymes usually have to be kept acidic for the enzymes to work, and there's little good evidence that the enzymes help a dry mouth or protect teeth.",
        "Read the fine print on claims. An asterisk on \"relief for hours\" can mean the result was measured only after weeks of daily use, not from the first dose.",
        "Sugar-free, so it doesn't feed decay.",
        "Flavour. Taste is one of the strongest triggers for saliva, so if your glands still work, a flavoured product, citrus especially, can help your own saliva flow as well as moistening. Choose one that stays close to neutral pH: acidic sweets and drinks also bring up saliva, but they wear teeth.",
        "A range of flavours you like, so you keep using it.",
        "Gentle ingredients: alcohol-free, and check them if you have allergies.",
      ] },
      { h: "Using them", steps: [
        "Use one as often as you need, especially before meals, before talking for a long time, and at bedtime.",
        "Spread a gel over your tongue, cheeks and gums with a clean finger.",
        "Different people prefer different products. If one doesn't suit you, try another.",
        "Always read the label and follow the directions for use.",
      ] },
    ],
    refs: ["mercadante2021", "furness2011", "lysik2019", "nieuwamerongen2003", "watanabe1988", "delgado2016", "delgado2017", "murakami2025", "teixeira2023"],
  },
  {
    id: "water", icon: "drop", title: "Drink enough water",
    short: "Small sips through the day keep your mouth moist.",
    forYou: (c) => !has(c, "conditions.dialysis") && (has(c, "water.low", "caffeine.high", "alcohol.high") || (c.sip ?? 0) >= 8),
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
    forYou: (c) => has(c, "habits.smoke", "habits.vape", "habits.cannabis", "alcohol.high", "caffeine.high", "breathing.mouth", "breathing.cpap", "breathing.snore", "breathing.mad"),
    steps: [
      "If you smoke or vape, quitting helps. Quitline is free: 13 78 48 (Australia), 0800 778 778 (New Zealand).",
      "Have less alcohol, especially in the evening. Cut back on caffeine too if you notice it dries your mouth.",
      "Use an alcohol-free mouthwash.",
      "Breathe through your mouth? Ask your GP to check for a blocked nose, allergies or sleep apnoea.",
      "Snore, or use CPAP or a splint? See \"A dry mouth at night, snoring and CPAP\".",
      "A humidifier in the bedroom can help at night.",
    ],
    refs: ["mador2005", "kennedy2019", "wolff2017"],
  },
  {
    id: "sleep", icon: "moon", title: "A dry mouth at night, snoring and CPAP", shop: true,
    look: ["Gel", "Close to neutral pH", "Sugar-free"],
    short: "Dry mouth on waking is very common. A few changes help.",
    forYou: (c) => has(c, "breathing.mouth", "breathing.cpap", "breathing.snore", "breathing.mad"),
    steps: [
      "Sleeping with your mouth open dries it, and saliva almost stops at night anyway.",
      "A dry mouth is one of the commonest symptoms of sleep apnoea. In one study of 385 people, 6 in 10 had a dry mouth daily or almost daily before starting CPAP, and about half had a dry throat.",
      "CPAP usually helps, but dry mouth remains one of its most common side effects: in the same study, over a third still had a dry mouth most days on CPAP, especially when air leaks from the mouth. It's also one of the side effects that makes people give up CPAP. Snoring or sleep apnoea splints can leave the mouth dry too, though this usually eases with time.",
      "Ask your sleep clinic about a heated humidifier, and about stopping mouth leaks with a chin strap or a full-face mask. Don't stop using CPAP because of dryness: talk to them first.",
      "Use a dry mouth gel before bed so your mouth is coated for the night, and keep water by the bed.",
      "If your mouth stays dry or your throat is sore during the day too, use a dry mouth product through the day as well.",
      "Brush with fluoride toothpaste last thing at night, because teeth are least protected while you sleep. Ask your dentist whether you need extra protection overnight.",
      "Tell your dentist you use CPAP or a splint.",
    ],
    refs: ["kreivi2010", "ulander2014", "vidal2024", "oksenberg2006", "raoof2023", "mador2005", "kennedy2019", "dawes2008"],
  },
  {
    id: "clean", icon: "check", title: "Clean gently, twice a day", shop: true,
    look: ["Soft bristles", "Small head", "Unflavoured", "SLS-free", "Fluoride"],
    short: "A soft brush and fluoride toothpaste, morning and night.",
    forYou: (c) => c.risk === "high" || c.risk === "veryhigh" || c.ph === "flag" || c.decay === "high" || c.decay === "veryhigh",
    steps: [
      "Use a soft brush, or an electric brush on a gentle setting.",
      "Brush for 2 minutes, morning and night, with fluoride toothpaste.",
      "Spit, don't rinse. The fluoride keeps working.",
      "Clean between your teeth once a day.",
      "Mouth sore, or sensitive to strong flavours? Try a mild, unflavoured, low-foam toothpaste (no SLS).",
      "Clean dentures every day and leave them out at night.",
    ],
    refs: ["walsh2019", "felton2011", "nieuwamerongen2003"],
  },


  {
    id: "acid", icon: "shield", title: "After vomiting or reflux",
    short: "Acid softens enamel — rinse first, brush later.",
    forYou: (c) => has(c, "conditions.reflux", "conditions.eating", "conditions.pregnantSick", "medTypes.glp1"),
    steps: [
      "Rinse straight away with water, or with 1 teaspoon of bicarbonate of soda in a cup of water to neutralise the acid.",
      "Wait about an hour before brushing. Brushing softened enamel wears it away.",
      "Meanwhile, smear a little fluoride toothpaste, or a calcium and phosphate crème, on your teeth with a clean finger.",
      "Chew sugar-free gum to wash the acid away.",
      "If it keeps happening, see your GP, and tell your dentist.",
    ],
    refs: ["buzalaf2012", "adaPregnancy", "pbbTeeth"],
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
    refs: ["adaPregnancy", "adaAusGums", "pbbTeeth"],
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
export function careContext({ factors = [], recorded = [], sip = null, ph = "none", risk = null, decay = null, cancer = false, tx = [], active = false }) {
  return { f: new Set([...factors, ...recorded].map((x) => `${x.q}.${x.v}`)), sip, ph, risk, decay, cancer, tx, active };
}

for (const t of CARE_TOPICS) if (t.sections && !t.steps) t.steps = t.sections.flatMap((x) => x.steps.map((y) => (typeof y === "string" ? y : y.t)));

/** A topic's sections with steps kept only for the treatments they apply to (none known → all). */
export function topicSections(t, ctx = {}) {
  const txs = ctx.tx || [];
  return (t.sections || []).map((x) => ({ h: x.h, steps: x.steps.filter((y) => typeof y === "string" || !txs.length || y.for.some((v) => txs.includes(v))).map((y) => (typeof y === "string" ? y : y.t)) })).filter((x) => x.steps.length);
}
