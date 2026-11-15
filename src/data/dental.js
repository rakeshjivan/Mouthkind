// ─── Teeth and gums: symptom checker ───────────────────────────────────────
// Ten decision trees. Mirrors "Mouthkind — app plan and dental triage"
// (section 5). Change the two together; every branch is tested in
// tests/dental.test.js.
//
// Urgency bands follow SDCEP Management of Acute Dental Problems (2nd ed.
// 2026). Cancer-treatment modifiers:
//   low  — during, or within 6 weeks of, chemotherapy or transplant
//          (platelets and white cells may be low)
//   bone — after head and neck radiotherapy, or on bone-modifying drugs
//          (osteoradionecrosis / MRONJ risk)
//   rt   — after head and neck radiotherapy (radiation caries, trismus)

export const BANDS = {
  now:  { rank: 5, label: "Get help now", tone: "red" },
  team: { rank: 4, label: "Call your treatment team today", tone: "amber" },
  "24h": { rank: 3, label: "See a dentist within 24 hours", tone: "amber" },
  tell: { rank: 2, label: "Tell your treatment team in the next day or two", tone: "blue" },
  week: { rank: 1, label: "See a dentist within a week", tone: "blue" },
  home: { rank: 0, label: "Look after it at home", tone: "green" },
};
export const higher = (a, b) => (BANDS[a].rank >= BANDS[b].rank ? a : b);

// ── Outcomes ────────────────────────────────────────────────────────────────
// Each returns { band, title, body, refs } for this patient (ctx).
const beforeTreatment = (c) => [
  c.low && "Before any dental treatment, the dentist should check with your treatment team — they may want a blood test first.",
  c.bone && "Make sure the dentist knows about your radiotherapy or bone-strengthening medicine before any tooth is taken out.",
].filter(Boolean);

export const OUTCOMES = {
  // Emergencies
  bleed_now: () => ({ band: "now", title: "Bleeding that won't stop",
    body: ["Bite firmly on a clean, damp gauze or folded cloth over the spot and sit upright. Don't rinse or spit.", "Call your treatment team's 24-hour number now, or 000 if the bleeding is heavy or you feel faint."],
    refs: ["healthdirectBleed", "ccBleeding"] }),
  airway: () => ({ band: "now", title: "Swelling with trouble breathing or swallowing",
    body: ["Call 000 or go to the nearest emergency department now. Swelling that affects breathing, swallowing or your voice can block the airway."],
    refs: ["sdcep2026"] }),
  fever_low: () => ({ band: "now", title: "Swelling with a temperature during chemotherapy",
    body: ["Call your treatment team's 24-hour number now. A fever during chemotherapy needs help straight away, whatever the cause."],
    refs: ["sdcep2026", "healthdirectFN"] }),
  inhaled: () => ({ band: "now", title: "You may have breathed in a piece of tooth or filling",
    body: ["Go to an emergency department now, or call 000 if you are short of breath. A piece in the airway needs an X-ray."],
    refs: ["sdcep2026"] }),
  stroke: () => ({ band: "now", title: "These can be signs of a stroke",
    body: ["Call 000 now. A drooping face, weak arm or slurred speech that comes on suddenly is not caused by a denture."],
    refs: ["sdcep2026"] }),
  dislocated: () => ({ band: "now", title: "A jaw stuck open",
    body: ["Go to an emergency department. A jaw that won't close may be dislocated and needs to be put back."],
    refs: ["sdcep2026"] }),
  extract_bleed_now: (c) => ({ band: "now", title: "Bleeding after an extraction that won't stop",
    body: [`Bite on a fresh damp gauze for another 20 minutes, sitting up.${c.low ? "" : " If it is still bleeding after that,"} Call your treatment team's 24-hour number or the dentist's emergency line now — or 000 if it is heavy.`],
    refs: ["sdcep2026"] }),

  // Gums
  gum_ooze: (c) => ({ band: "team", title: "Gums oozing blood on their own",
    body: ["Press a damp gauze or clean cloth on the spot for 30 minutes without checking. Don't rinse.",
      c.low ? "Call your treatment team today — bleeding without anything touching the gums can mean your platelets are low." : "Call your doctor today. Gums that bleed on their own need a blood test to check your platelets.",
      "Don't take aspirin or ibuprofen unless your doctor says it's OK."],
    refs: ["healthdirectBleed", "ccBleeding", "nciPdq"] }),
  gum_own: (c) => ({ band: "team", title: "Gums bleeding on their own",
    body: [c.low ? "Call your treatment team today. Bleeding without anything touching the gums can mean your platelets are low, and they may want a blood test." : "Call your doctor today. Gums that bleed on their own need a blood test to check your platelets.",
      "Keep brushing gently with an ultra-soft brush. Don't take aspirin or ibuprofen unless your doctor says it's OK."],
    refs: ["ccBleeding", "nciPdq", "elad2015"] }),
  low_platelets: (c) => ({ band: "team", title: "Bleeding gums with spots, blood blisters or bruising",
    body: [c.low ? "Call your treatment team today. Together these can mean your platelets are low." : "Call your doctor today and ask for a blood test. Together these can mean your platelets are low.",
      "Keep brushing gently with an ultra-soft brush. Don't take aspirin or ibuprofen unless your doctor says it's OK."],
    refs: ["ccBleeding", "nciPdq"] }),
  gum_infection: (c) => ({ band: c.low ? "team" : "24h", title: "Sore gums with a bad taste or smell",
    body: [c.low ? "This could be a gum infection. During chemotherapy it can spread quickly and fever may not show, so call your treatment team today, then see a dentist." : "This could be a gum infection. See a dentist today or tomorrow.",
      "Rinse gently with warm salt water and keep brushing softly.", ...beforeTreatment(c)],
    refs: ["sdcep2026", "elad2015"] }),
  brush_bleed: (c, a) => {
    const swollen = (a.signs || []).includes("swollen");
    const care = "Keep brushing twice a day along the gum line with a soft brush, and clean between your teeth gently — healthy gums don't bleed, and cleaning less makes it worse.";
    return c.low
      ? { band: "tell", title: "Gums bleed when you brush",
          body: ["Tell your treatment team in the next day or two — gums can bleed more easily when platelets are low.", care,
            "If your platelets are low, ask the team before flossing.", swollen && "Swollen, puffy gums are part of the same picture."].filter(Boolean),
          refs: ["elad2015", "adaAusGums", "rcsBooklet"] }
      : { band: "home", title: "Gums bleed when you brush",
          body: ["This is usually gum inflammation from plaque.", care,
            swollen ? "Swollen, puffy gums are part of the same picture — a dentist or hygienist can clean below the gum line." : null,
            "If it hasn't settled in two weeks, see your dentist."].filter(Boolean),
          refs: ["adaAusGums", "healthdirectBleed"] };
  },

  // Toothache
  pulpitis: (c) => ({ band: "week", title: "Toothache that lingers or comes on by itself",
    body: ["This usually means the nerve inside the tooth is inflamed. See a dentist in the next few days — within 24 hours if pain relief stops working.",
      "Take regular pain relief until you're seen." + (c.low ? " Check with your team before taking ibuprofen or aspirin." : ""), ...beforeTreatment(c)],
    refs: ["sdcep2026", "adaAusToothache"] }),
  apical: (c) => ({ band: c.low ? "team" : "24h", title: "A tooth that hurts to bite on",
    body: [c.low ? "This is often an infection at the root of the tooth. Tell your treatment team today, then see a dentist — infections need attention quickly during chemotherapy." : "This is often an infection at the root of the tooth. See a dentist today or tomorrow.",
      "Chew on the other side and take regular pain relief.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),
  jaw_ache: (c) => ({ band: "week", title: "A deep ache in several teeth or the jaw",
    body: ["See a dentist to rule out a tooth problem.",
      c.low && "Some chemotherapy medicines, such as vincristine and vinblastine, can cause aching teeth and jaw with no dental cause, usually within days of a dose. Tell your team too.",
      c.bone && "After head and neck radiotherapy or bone-strengthening medicine, unexplained jaw ache can be an early sign of a jaw bone problem. See the dentist within days and tell your oncologist.",
      ...beforeTreatment(c)].filter(Boolean),
    refs: ["adaOnc", ...(c.bone ? ["ruggiero2022", "peterson2024"] : [])] }),
  abscess: (c) => ({ band: c.low ? "team" : "24h", title: "This could be a tooth or gum infection",
    body: [c.low ? "Call your treatment team today — during chemotherapy an infection can spread quickly, and fever may not show. Then see a dentist." : "See a dentist today or tomorrow.",
      "If the swelling spreads towards your eye or neck, or swallowing or breathing gets hard, call 000.",
      "Don't put heat on your face. Antibiotics only help when a dentist or doctor has seen it.", ...beforeTreatment(c)],
    refs: ["sdcep2026", "nciPdq"] }),
  uncontrolled: (c) => ({ band: "24h", title: "Toothache that pain relief isn't helping",
    body: ["See a dentist within 24 hours.", c.low && "Check with your team before taking ibuprofen or aspirin — they can make bleeding worse when platelets are low.", ...beforeTreatment(c)].filter(Boolean),
    refs: ["sdcep2026", "ccBleeding"] }),
  numb: (c) => ({ band: "24h", title: "Numbness in your lip or chin",
    body: ["See a dentist within 24 hours and tell your oncologist. New numbness in the lip or chin always needs checking during or after cancer treatment.", ...beforeTreatment(c)],
    refs: ["ruggiero2022", "nciPdq"] }),
  bone_exposed: (c) => ({ band: "24h", title: "Bone showing in the gum",
    body: ["See a dentist who knows your treatment history within 24 hours, and tell your oncologist.", "Don't scrape or pull at it. Keep the area clean with gentle brushing and salt-water rinses.",
      c.bone && "Don't have any tooth taken out until your dentist and oncologist have talked."].filter(Boolean),
    refs: ["ruggiero2022", "peterson2024"] }),

  // Sensitivity
  sensitivity: (c, a) => {
    const many = (a.look || []).includes("many");
    return { band: "home", title: "Sensitive teeth",
      body: ["Short, sharp twinges that stop within seconds are usually sensitivity, not a nerve problem.",
        "Rub a little sensitive or high-fluoride toothpaste onto the spot with a clean finger and leave it there. Brush gently.",
        "Cut down acidic drinks between meals, and wait an hour after acid, reflux or vomiting before brushing.",
        "A calcium-phosphate crème such as GC Tooth Mousse Plus can help protect the surface.",
        many && "Sensitivity in lots of teeth often goes with a dry mouth — mention it to your dentist so they can check for early decay.",
        "Mention it at your next dental visit, or sooner if it starts to linger."].filter(Boolean),
      refs: ["adaAusSensitive", "sdcep2026"] };
  },
  decay: (c, a) => ({ band: "week", title: "Sensitive teeth — possibly decay",
    body: ["A hole, a dark spot or a soft brown area near the gum line is usually decay. Sensitive toothpaste won't fix it — book a dentist visit.",
      c.rt && (a.look || []).includes("gumline") && "After head and neck radiotherapy, decay near the gum line can move fast and is much easier to fix early.",
      "Until then: high-fluoride toothpaste, spit don't rinse, and cut down sugary and acidic snacks.", ...beforeTreatment(c)].filter(Boolean),
    refs: ["adaAusSensitive", ...(c.rt ? ["mercadante2021"] : [])] }),

  // Broken
  broken: (c, a) => ({ band: "week", title: a.what === "filling" ? "A filling or crown came out" : "A piece of tooth broke off",
    body: ["Book a dentist visit within a week.",
      a.feel === "sharp" && "A sharp edge can cause ulcers, especially when your mouth is already sore — go sooner if it's rubbing. Until then, cover it with dental wax or a small piece of sugar-free gum.",
      a.feel === "sensitive" && "Rub a little sensitive toothpaste onto the exposed area to settle it.",
      a.what === "filling" && "A pharmacy temporary filling kit can cover the gap. Keep a crown that has come out — don't glue it back yourself.",
      "Chew on the other side until it's fixed.", ...beforeTreatment(c)].filter(Boolean),
    refs: ["sdcep2026"] }),

  // Swelling
  lump3w: (c) => ({ band: "week", title: "A lump that has been there three weeks or more",
    body: ["See a dentist within a week and tell them how long it has been there — a lump that lasts three weeks needs to be looked at properly, and may need a referral.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),
  fever_swelling: () => ({ band: "24h", title: "Swelling with a temperature",
    body: ["See a dentist today or tomorrow, and your GP if you feel unwell. If the swelling spreads or swallowing or breathing gets hard, call 000."],
    refs: ["sdcep2026", "healthdirectBleed"] }),

  // Loose tooth
  injury: (c) => ({ band: "24h", title: "A tooth loosened by a knock or fall",
    body: ["See a dentist within 24 hours. Don't wiggle it; eat soft food on the other side.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),
  loose: (c) => ({ band: "week", title: "A loose tooth",
    body: [c.bone ? "See a dentist in the next few days and tell your oncologist. After head and neck radiotherapy or bone-strengthening medicine, a tooth loosening for no clear reason needs checking." : "See a dentist within a week. Gradual loosening is usually gum disease.",
      "Don't wiggle or pull it. Eat soft food on that side and keep brushing gently around it.", ...beforeTreatment(c)],
    refs: ["healthdirectBleed", ...(c.bone ? ["ruggiero2022"] : [])] }),

  // Wisdom tooth
  pericoronitis_bad: (c) => ({ band: c.low ? "team" : "24h", title: "An infected gum flap over a wisdom tooth",
    body: [c.low ? "Call your treatment team today, then see a dentist — infections spread quickly during chemotherapy." : "See a dentist today or tomorrow.",
      "Rinse with warm salt water and brush the area gently.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),
  pericoronitis_ok: (c) => ({ band: "week", title: "A sore gum flap over a wisdom tooth",
    body: ["See a dentist within a week. Rinse with warm salt water, brush gently around the flap with a soft brush, and take regular pain relief.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),
  pericoronitis_pain: (c) => ({ band: "24h", title: "Wisdom tooth pain that pain relief isn't helping",
    body: ["See a dentist within 24 hours. Rinse with warm salt water and brush gently around the flap.", ...beforeTreatment(c)],
    refs: ["sdcep2026"] }),

  // After an extraction
  dry_socket: (c) => ({ band: "24h", title: "This sounds like a dry socket",
    body: ["See the dentist who took the tooth out within 24 hours — it's very treatable.", "Take regular pain relief and rinse gently with warm salt water. Don't smoke."],
    refs: ["sdcep2026"] }),
  extract_ooze: (c) => ({ band: c.low ? "team" : "home", title: "Some oozing after an extraction",
    body: ["Roll a damp gauze, place it over the socket and bite firmly for 20 minutes before checking. Keep your head raised.",
      "No rinsing, smoking, alcohol or exercise for 24 hours. Rinse gently with warm salt water from the next day.",
      c.low ? "Let your treatment team know today — low platelets can make bleeding last longer." : "If it keeps restarting, call the dentist who took it out."],
    refs: ["sdcep2026"] }),

  // Dentures
  denture_sore: (c) => ({ band: "week", title: "A sore spot under your denture",
    body: ["Leave the denture out as much as you can and see your dentist within a week to have it adjusted.", "If an ulcer is still there after three weeks, it needs to be checked properly — tell the dentist how long it has been there.", "Rinse with warm salt water."],
    refs: ["sdcep2026"] }),
  denture_fit: () => ({ band: "week", title: "A loose denture, or the fit has changed",
    body: ["See your dentist within a week. A sudden change in fit should always be checked.", "Clean it with a soft brush and keep it out overnight."],
    refs: ["sdcep2026", "rcsBooklet"] }),
  denture_patches: (c) => ({ band: c.low ? "tell" : "week", title: "Red or white patches under your denture",
    body: ["This is often thrush. Leave the denture out overnight, clean it with a soft brush and soak it as your dentist advises.",
      c.low ? "Tell your treatment team in the next day or two — thrush is common during treatment and easy to treat." : "See your dentist or GP within a week — it is easy to treat."],
    refs: ["sdcep2026", "rcsBooklet"] }),
  denture_broken: () => ({ band: "week", title: "A broken denture or sharp edge",
    body: ["See your dentist within a week. Cover a sharp edge with dental wax, or leave the denture out. Don't glue it yourself."],
    refs: ["sdcep2026"] }),

  // Jaw
  trismus: (c) => ({ band: "week", title: "Your mouth won't open as wide",
    body: ["See your dentist within a week.", c.rt ? "After head and neck radiotherapy, ask for jaw-stretching exercises early — they work best started soon." : "Gentle jaw-stretching exercises can help; your dentist can show you.", ...beforeTreatment(c)],
    refs: ["sdcep2026", "wranicz2010"] }),
  tmd: () => ({ band: "week", title: "An aching or clicking jaw joint",
    body: ["Soft food, rest your jaw, warm or cold packs, and no chewing gum. Pain relief helps.", "See your dentist within a week if it doesn't settle."],
    refs: ["sdcep2026"] }),
  jaw_bone: (c) => ({ band: "week", title: "A deep jaw ache with no clear cause",
    body: ["See a dentist in the next few days and tell your oncologist. After head and neck radiotherapy or bone-strengthening medicine, unexplained jaw ache can be an early sign of a jaw bone problem.", ...beforeTreatment(c)],
    refs: ["ruggiero2022", "peterson2024"] }),
};

// ── Trees ───────────────────────────────────────────────────────────────────
// A question is "one" (pick one) or "many" (tick any). Each option leads to
// { q } the next question in this tree, { go: [tree, q] } another tree, or
// { out } an outcome. A "many" question also names `none`, the outcome when
// nothing is ticked; ticked options must lead to outcomes, and the most
// urgent one leads the result.
const RED = { v: "none", label: "None of these" };

export const TREES = {
  gums: {
    label: "My gums bleed", icon: "drop", start: "when",
    q: {
      when: { type: "one", text: "When do your gums bleed?", options: [
        { v: "brush", label: "Only when I brush or clean between my teeth", q: "signs" },
        { v: "own", label: "On their own, without touching them", hint: "For example, blood on the pillow or in your mouth when you wake", q: "now" },
        { v: "extract", label: "Since a tooth was taken out", go: ["extraction", "bleed"] },
      ] },
      now: { type: "one", text: "Is it bleeding right now?", options: [
        { v: "stopped", label: "No, it has stopped", q: "signs" },
        { v: "ooze", label: "Yes, a little oozing", out: "gum_ooze" },
        { v: "heavy", label: "Yes, a lot — or it hasn't stopped after 30 minutes of pressure", out: "bleed_now" },
      ] },
      signs: { type: "many", text: "Have you noticed any of these as well?", none: (a) => (a.when === "own" ? "gum_own" : "brush_bleed"), options: [
        { v: "spots", label: "Tiny red or purple spots in my mouth or on my skin", out: "low_platelets" },
        { v: "blisters", label: "Dark blood blisters in my mouth", out: "low_platelets" },
        { v: "bruise", label: "Bruising easily, or nosebleeds", out: "low_platelets" },
        { v: "smell", label: "Very sore gums with a bad taste or smell", out: "gum_infection" },
        { v: "swollen", label: "Swollen or puffy gums", out: (a) => (a.when === "own" ? "gum_own" : "brush_bleed") },
      ] },
    },
  },
  toothache: {
    label: "I have a toothache", icon: "alert", start: "kind",
    q: {
      kind: { type: "one", text: "What is the pain like?", options: [
        { v: "quick", label: "Sharp, with cold, hot or sweet things", hint: "Gone within a few seconds", go: ["sensitive", "look"] },
        { v: "lingers", label: "It lasts for minutes, or comes on by itself", hint: "It may keep me awake at night", q: "extra" },
        { v: "bite", label: "It hurts to bite on one tooth", hint: "The tooth may feel tender or 'high'", q: "extra" },
        { v: "spread", label: "A deep ache in several teeth or my jaw", hint: "Hard to tell which tooth", q: "extra" },
      ] },
      extra: { type: "many", text: "Any of these as well?", none: (a) => ({ lingers: "pulpitis", bite: "apical", spread: "jaw_ache" })[a.kind], options: [
        { v: "swelling", label: "Swelling of my gum or face", out: "abscess" },
        { v: "pus", label: "A bad taste, or pus near the tooth", out: "abscess" },
        { v: "meds", label: "Pain relief isn't helping", out: "uncontrolled" },
        { v: "numb", label: "Numbness in my lip or chin", out: "numb" },
      ] },
    },
  },
  sensitive: {
    label: "My teeth are sensitive", icon: "drop", start: "kind",
    q: {
      kind: { type: "one", text: "How long does the sensitivity last?", options: [
        { v: "quick", label: "A few seconds, then it's gone", q: "look" },
        { v: "lingers", label: "It lingers, or turns into an ache", out: "pulpitis" },
      ] },
      look: { type: "many", text: "Can you see any of these?", none: "sensitivity", noneLabel: "No, my teeth look normal", options: [
        { v: "hole", label: "A hole, a dark spot or a chipped edge", out: "decay" },
        { v: "gumline", label: "Brown or soft areas near the gum line", out: "decay" },
        { v: "many", label: "It's in lots of teeth, not just one", out: "sensitivity" },
      ] },
    },
  },
  broken: {
    label: "A tooth, filling or crown broke", icon: "alert", start: "what",
    q: {
      what: { type: "one", text: "What happened?", options: [
        { v: "filling", label: "A filling or crown came out", q: "feel" },
        { v: "chip", label: "A piece of tooth broke off", q: "feel" },
        { v: "inhaled", label: "I may have breathed in a piece", hint: "Coughing, wheezing or short of breath", out: "inhaled" },
      ] },
      feel: { type: "one", text: "How does it feel?", options: [
        { v: "fine", label: "It doesn't hurt", out: "broken" },
        { v: "sharp", label: "A sharp edge is rubbing my tongue or cheek", out: "broken" },
        { v: "sensitive", label: "Sensitive to cold or sweet things", out: "broken" },
        { v: "aches", label: "It aches or throbs", out: "pulpitis" },
      ] },
    },
  },
  swelling: {
    label: "My gum or face is swollen", icon: "alert", start: "red",
    q: {
      red: { type: "one", text: "Is any of this happening?", options: [
        { v: "airway", label: "Trouble breathing or swallowing, a muffled voice, or swelling spreading to my eye or neck", out: "airway" },
        { v: "fever", label: "A temperature of 38 °C or more, or hot and shivery", out: (a, c) => (c.low ? "fever_low" : "fever_swelling") },
        { v: "none", label: "None of these", q: "where" },
      ] },
      where: { type: "one", text: "Where is the swelling?", options: [
        { v: "tooth", label: "On the gum next to one tooth", hint: "A lump or gum boil", out: "abscess" },
        { v: "wisdom", label: "Around a wisdom tooth or a flap of gum", go: ["wisdom", "red"] },
        { v: "cheek", label: "My cheek or jaw, and it's getting bigger", out: "abscess" },
        { v: "lump", label: "A lump that isn't sore and has been there 3 weeks or more", out: "lump3w" },
      ] },
    },
  },
  loose: {
    label: "A tooth feels loose", icon: "alert", start: "how",
    q: {
      how: { type: "one", text: "How did it start?", options: [
        { v: "knock", label: "After a knock or fall", out: "injury" },
        { v: "gradual", label: "Gradually, over weeks", q: "extra" },
        { v: "sudden", label: "Suddenly, with no injury", q: "extra" },
      ] },
      extra: { type: "many", text: "Any of these as well?", none: "loose", options: [
        { v: "pain", label: "Pain, swelling or pus around it", out: "abscess" },
        { v: "bone", label: "Bone showing in the gum nearby", out: "bone_exposed" },
        { v: "numb", label: "Numbness in my lip or chin", out: "numb" },
      ] },
    },
  },
  wisdom: {
    label: "Pain around a wisdom tooth", icon: "alert", start: "red",
    q: {
      red: { type: "one", text: "Is any of this happening?", options: [
        { v: "airway", label: "Trouble breathing or swallowing, or swelling of my face or neck", out: "airway" },
        { v: "unwell", label: "My mouth won't open as wide, or I feel feverish and unwell", out: "pericoronitis_bad" },
        { v: "none", label: "None of these", q: "meds" },
      ] },
      meds: { type: "one", text: "Does pain relief help?", options: [
        { v: "yes", label: "Yes, it keeps the pain down", out: "pericoronitis_ok" },
        { v: "no", label: "No, it isn't helping", out: "pericoronitis_pain" },
      ] },
    },
  },
  extraction: {
    label: "A problem after a tooth was taken out", icon: "alert", start: "what",
    q: {
      what: { type: "one", text: "What's happening?", options: [
        { v: "bleed", label: "It's bleeding", q: "bleed" },
        { v: "socket", label: "Pain getting worse a few days later", hint: "Often with a bad taste, and the socket looks empty", out: "dry_socket" },
        { v: "swelling", label: "Swelling, pus or a temperature", out: "abscess" },
        { v: "bone", label: "It hasn't healed after 8 weeks, or there's bone showing", out: "bone_exposed" },
      ] },
      bleed: { type: "one", text: "How much is it bleeding?", options: [
        { v: "ooze", label: "Oozing, and it stops when I bite on gauze", out: "extract_ooze" },
        { v: "heavy", label: "Still bleeding after biting on gauze for 20 minutes", out: "extract_bleed_now" },
      ] },
    },
  },
  denture: {
    label: "My denture is causing a problem", icon: "alert", start: "red",
    q: {
      red: { type: "one", text: "Is any of this happening, coming on suddenly?", options: [
        { v: "stroke", label: "My face is drooping, an arm is weak, or my speech is slurred", out: "stroke" },
        { v: "none", label: "None of these", q: "what" },
      ] },
      what: { type: "one", text: "What's the problem?", options: [
        { v: "sore", label: "A sore spot or ulcer under it", out: "denture_sore" },
        { v: "fit", label: "It's loose, or the fit changed suddenly", out: "denture_fit" },
        { v: "patches", label: "Red or white patches under it", out: "denture_patches" },
        { v: "broken", label: "It's broken, or has a sharp edge", out: "denture_broken" },
      ] },
    },
  },
  jaw: {
    label: "Jaw pain, or my mouth won't open wide", icon: "alert", start: "red",
    q: {
      red: { type: "one", text: "Is any of this happening?", options: [
        { v: "stuck", label: "My jaw is stuck open and won't close", out: "dislocated" },
        { v: "infection", label: "Swelling, pus or a temperature", out: "abscess" },
        { v: "none", label: "None of these", q: "what" },
      ] },
      what: { type: "one", text: "What is it like?", options: [
        { v: "opening", label: "I can't open as wide as before", hint: "Fewer than three fingers fit between my front teeth", out: "trismus" },
        { v: "joint", label: "The jaw joint aches or clicks, worse when I chew", out: "tmd" },
        { v: "ache", label: "A deep ache with no clear cause", out: (a, c) => (c.bone ? "jaw_bone" : "tmd") },
      ] },
    },
  },
};
export const TREE_ORDER = ["gums", "toothache", "sensitive", "broken", "swelling", "loose", "wisdom", "extraction", "denture", "jaw"];

// ── Engine ──────────────────────────────────────────────────────────────────
const pick = (x, a, c) => (typeof x === "function" ? x(a, c) : x);

/** Patient context from the profile. */
export function dentalContext(profile, lowCounts) {
  const t = profile.treatments || [];
  return { low: !!lowCounts, bone: t.includes("rt_hn") || t.includes("bone"), rt: t.includes("rt_hn") };
}

/**
 * Apply one answer. `path` is the list of [tree, qid] already shown; `ans`
 * maps "tree.qid" → value (array for "many"). Returns { next: [tree, qid] }
 * or { done: result }.
 */
export function step(tree, qid, value, ans, ctx) {
  const q = TREES[tree].q[qid];
  const a = answersFor(tree, ans);
  if (q.type === "one") {
    const o = q.options.find((x) => x.v === value);
    if (o.q) return { next: [tree, o.q] };
    if (o.go) return { next: o.go };
    return { done: resultOf([pick(o.out, a, ctx)], a, ctx) };
  }
  const chosen = value.length ? q.options.filter((x) => value.includes(x.v)).map((x) => pick(x.out, a, ctx)) : [pick(q.none, a, ctx)];
  return { done: resultOf([...new Set(chosen)], a, ctx) };
}

/** Answers for one tree as { qid: value }, including any carried over from the tree that sent us here. */
export function answersFor(tree, ans) {
  const out = {};
  for (const [k, v] of Object.entries(ans)) { const [t, q] = k.split("."); if (t === tree || !(q in out)) out[q] = v; }
  return out;
}

/** The most urgent outcome leads; the others follow as "also". */
export function resultOf(ids, a, ctx) {
  const outs = ids.map((id) => ({ id, ...OUTCOMES[id](ctx, a) }));
  outs.sort((x, y) => BANDS[y.band].rank - BANDS[x.band].rank);
  return { band: outs[0].band, main: outs[0], also: outs.slice(1) };
}

/** The answers of one check as readable question → answer pairs (for the report). */
export function describeAnswers(ans = {}) {
  return Object.entries(ans).map(([k, v]) => {
    const [t, qid] = k.split(".");
    const q = TREES[t]?.q[qid];
    if (!q) return null;
    const label = (x) => q.options.find((o) => o.v === x)?.label || x;
    const a = Array.isArray(v) ? (v.length ? v.map(label).join("; ") : q.noneLabel || "None of these") : label(v);
    return { q: q.text, a };
  }).filter(Boolean);
}
