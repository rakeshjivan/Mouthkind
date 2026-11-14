// ─── Dental symptom triage ─────────────────────────────────────────────────
// Branching follow-up questions for the four everyday dental answers on the
// first check-in screen, and what each combination of answers leads to.
//
// Built on:
//  · SDCEP Management of Acute Dental Problems, 2nd ed. 2026 — urgency bands
//    (emergency / urgent ≤24 h / non-urgent ≤7 days / self-care) and the
//    symptom pictures of pulpitis, apical periodontitis, abscess, dentine
//    hypersensitivity, fractured teeth/restorations, post-extraction bleeding.
//  · Oncology modifiers: low platelets and low white cells during and soon
//    after chemotherapy (Elad 2015 MASCC/ISOO/EBMT; NCI PDQ; ADA; Cancer
//    Council), osteoradionecrosis after head and neck radiotherapy
//    (Peterson 2024) and MRONJ with bone-modifying drugs (Ruggiero 2022).
//
// Levels match rules.js: emergency → sameday → soon → dentist.
// Every branch is covered by tests/rules.test.js. Change both together.

export const TRIAGE = {
  gum_bleed: [
    {
      id: "when", type: "one", q: "When do your gums bleed?",
      options: [
        { v: "brush", label: "Only when I brush or clean between my teeth" },
        { v: "own", label: "On their own, without touching them", hint: "For example, blood on the pillow or in your mouth when you wake" },
        { v: "extract", label: "Since a tooth was taken out" },
      ],
    },
    {
      id: "now", type: "one", q: "Is it bleeding right now?", showIf: (a) => a.when === "own" || a.when === "extract",
      options: [
        { v: "stopped", label: "No, it has stopped" },
        { v: "ooze", label: "Yes, a little oozing" },
        { v: "heavy", label: "Yes, a lot — or it hasn't stopped in 30 minutes" },
      ],
    },
    {
      id: "signs", type: "many", q: "Have you noticed any of these as well?", none: "None of these",
      options: [
        { v: "spots", label: "Tiny red or purple spots in my mouth or on my skin" },
        { v: "blisters", label: "Dark blood blisters in my mouth" },
        { v: "bruise", label: "Bruising easily, or nosebleeds" },
        { v: "smell", label: "Very sore gums with a bad taste or smell" },
        { v: "swollen", label: "Swollen or puffy gums" },
      ],
    },
  ],
  toothache: [
    {
      id: "kind", type: "one", q: "What is the pain like?",
      options: [
        { v: "quick", label: "Sharp, with cold, hot or sweet things", hint: "Gone within a few seconds" },
        { v: "lingers", label: "It lasts for minutes, or comes on by itself", hint: "It may keep me awake at night" },
        { v: "bite", label: "It hurts to bite on one tooth", hint: "The tooth may feel tender or 'high'" },
        { v: "spread", label: "A deep ache in several teeth or my jaw", hint: "Hard to tell which tooth" },
      ],
    },
    {
      id: "extra", type: "many", q: "Any of these as well?", none: "None of these",
      options: [
        { v: "swelling", label: "Swelling of my gum or face" },
        { v: "pus", label: "A bad taste, or pus near the tooth" },
        { v: "meds", label: "Pain relief isn't helping" },
        { v: "numb", label: "Numbness in my lip or chin" },
      ],
    },
  ],
  sensitive: [
    {
      id: "kind", type: "one", q: "How long does the sensitivity last?",
      options: [
        { v: "quick", label: "A few seconds, then it's gone" },
        { v: "lingers", label: "It lingers, or turns into an ache" },
      ],
    },
    {
      id: "look", type: "many", q: "Can you see any of these?", none: "No, the teeth look normal",
      options: [
        { v: "hole", label: "A hole, a dark spot or a chipped edge" },
        { v: "gumline", label: "Brown or soft areas near the gum line" },
        { v: "many", label: "It's in lots of teeth, not just one" },
      ],
    },
  ],
  broken: [
    {
      id: "what", type: "one", q: "What happened?",
      options: [
        { v: "filling", label: "A filling or crown came out" },
        { v: "chip", label: "A piece of tooth broke off" },
        { v: "inhaled", label: "I may have breathed in a piece", hint: "Coughing, wheezing or short of breath" },
      ],
    },
    {
      id: "feel", type: "one", q: "How does it feel?", showIf: (a) => a.what !== "inhaled",
      options: [
        { v: "fine", label: "It doesn't hurt" },
        { v: "sharp", label: "A sharp edge is rubbing my tongue or cheek" },
        { v: "sensitive", label: "Sensitive to cold or sweet things" },
        { v: "aches", label: "It aches or throbs" },
      ],
    },
  ],
};

export const DENTAL_IDS = Object.keys(TRIAGE);

/** The follow-up questions still to show for one dental answer. */
export const stepsFor = (id, answers = {}) => (TRIAGE[id] || []).filter((s) => !s.showIf || s.showIf(answers));

/** Answers that mean "stop the check-in and get help now". */
export const dentalEmergency = (dental = {}) =>
  dental.gum_bleed?.now === "heavy" || dental.broken?.what === "inhaled";

const inc = (arr, v) => Array.isArray(arr) && arr.includes(v);

/**
 * What a set of dental answers leads to.
 * ctx: { lowCounts } — during or within 6 weeks of chemotherapy/transplant;
 *      { boneRisk }  — after head and neck radiotherapy or on bone-modifying drugs.
 * Returns alerts in the same shape as redFlags().
 */
export function dentalAlerts(danger = [], dental = {}, { lowCounts = false, boneRisk = false } = {}) {
  const out = [];
  const add = (level, id, title, body, refs) => out.push({ level, id, title, body, refs });
  const beforeTreatment = [
    lowCounts && "Before any dental treatment, the dentist should check with your treatment team — they may want a blood test first.",
    boneRisk && "Make sure the dentist knows about your radiotherapy or bone-strengthening medicine before any tooth is taken out.",
  ].filter(Boolean).join(" ");
  const withNote = (s) => (beforeTreatment ? `${s} ${beforeTreatment}` : s);

  // ── Gums bleed ───────────────────────────────────────────────────────────
  if (inc(danger, "gum_bleed")) {
    const a = dental.gum_bleed || {};
    const signs = a.signs || [];
    const lowPlateletSigns = inc(signs, "spots") || inc(signs, "blisters") || inc(signs, "bruise");
    if (a.now === "heavy") {
      add("emergency", "bleed", "Bleeding that won't stop",
        "Bite firmly on a clean, damp gauze or folded cloth over the spot and sit upright. Don't rinse, spit or poke at it. Call your treatment team's 24-hour number now — or 000 if it is heavy or you feel faint.",
        ["ccBleeding", "sdcep2026"]);
    } else if (a.when === "own" || lowPlateletSigns) {
      add("sameday", "gum-spont", lowPlateletSigns && a.when !== "own" ? "Bleeding gums with spots, blisters or bruising" : "Gums bleeding on their own",
        (lowCounts
          ? "Call your treatment team today. Bleeding without anything touching the gums — or with tiny spots, blood blisters or easy bruising — can mean your platelets are low, and they may want a blood test. "
          : "Call your doctor or treatment team today. Gums that bleed on their own, or with tiny spots or easy bruising, need a blood test to check your platelets. ")
        + "Keep brushing gently with an ultra-soft brush. Don't take aspirin or ibuprofen unless your doctor says it's OK.",
        ["ccBleeding", "nciPdq", "elad2015"]);
    } else if (a.when === "extract") {
      if (a.now === "ooze")
        add("sameday", "extract-bleed", "Still oozing after a tooth was taken out",
          "Bite firmly on a damp gauze for 20 minutes while sitting upright. Don't rinse, smoke or exercise today. If it keeps oozing, call the dentist who took the tooth out today" + (lowCounts ? ", and let your treatment team know — low platelets can make bleeding last longer." : "."),
          ["sdcep2026", "ccBleeding"]);
    } else if (a.when === "brush") {
      if (lowCounts)
        add("soon", "gum-brush", "Gums bleed when you brush",
          "Tell your treatment team in the next day or two — gums can bleed more when platelets are low. Keep brushing gently twice a day with an ultra-soft brush: plaque left on the gums makes bleeding worse, not better. If cleaning between your teeth makes them bleed, use what you're used to, very gently, or ask your team.",
          ["elad2015", "ccBleeding"]);
      else
        add("dentist", "gum-brush", "Gums bleed when you brush",
          "This is usually gum inflammation from plaque. Keep brushing gently twice a day along the gum line with a soft brush, and clean between your teeth — gums that bleed need more cleaning, not less. It usually settles within a week or two. If it doesn't, see your dentist.",
          ["elad2015", "sdcep2026"]);
    }
    if (inc(signs, "smell"))
      add(lowCounts ? "sameday" : "soon", "gum-infection", "Sore gums with a bad taste or smell",
        lowCounts
          ? "This could be a gum infection. With chemotherapy it can spread quickly and fever may not show, so call your treatment team today, then see a dentist."
          : "This could be a gum infection. See a dentist within a day. Rinse gently with warm salt water and keep brushing softly.",
        ["sdcep2026", "elad2015"]);
    else if (inc(signs, "swollen")) {
      const brushAlert = out.find((x) => x.id === "gum-brush");
      if (brushAlert) brushAlert.body += " Swollen, puffy gums are part of the same picture — your dentist or hygienist can clean below the gum line.";
    }
  }

  // ── Toothache ────────────────────────────────────────────────────────────
  if (inc(danger, "toothache") || dental.broken?.feel === "aches" || dental.sensitive?.kind === "lingers") {
    const a = dental.toothache || {};
    const kind = a.kind || (dental.sensitive?.kind === "lingers" || dental.broken?.feel === "aches" ? "lingers" : null);
    const extra = a.extra || [];
    if (inc(extra, "swelling") || inc(extra, "pus")) {
      add("sameday", "abscess", "This could be a tooth infection",
        (lowCounts
          ? "Call your treatment team today — during chemotherapy an infection can spread quickly, and fever may not show. Then see a dentist. "
          : "See a dentist today or tomorrow. ")
        + "If the swelling spreads towards your eye or neck, or swallowing or breathing gets hard, go to an emergency department.",
        ["sdcep2026", "nciPdq"]);
    } else if (inc(extra, "meds")) {
      add("sameday", "tooth-uncontrolled", "Toothache that pain relief isn't helping",
        withNote("See a dentist within 24 hours." + (lowCounts ? " Check with your team before taking ibuprofen or aspirin — they can make bleeding worse when platelets are low." : "")),
        ["sdcep2026", "ccBleeding"]);
    } else if (kind === "lingers") {
      add("soon", "pulpitis", "Toothache that lingers or comes on by itself",
        withNote("This usually means the nerve inside the tooth is inflamed. See a dentist in the next few days — within 24 hours if pain relief stops working."),
        ["sdcep2026"]);
    } else if (kind === "bite") {
      add(lowCounts ? "sameday" : "soon", "apical", "A tooth that hurts to bite on",
        withNote(lowCounts
          ? "This is often an infection at the root of the tooth. Let your treatment team know today and see a dentist — infections need attention quickly during chemotherapy."
          : "This is often an infection at the root of the tooth. See a dentist within a day or two."),
        ["sdcep2026"]);
    } else if (kind === "spread") {
      add("soon", "jaw-ache", "A deep ache in several teeth or the jaw",
        withNote([
          "See a dentist to rule out a tooth problem.",
          lowCounts && "Some chemotherapy medicines, such as vincristine and vinblastine, can cause aching teeth and jaw with no dental cause, usually within days of a dose — tell your team too.",
          boneRisk && "After head and neck radiotherapy or bone-strengthening medicine, unexplained jaw ache can be an early sign of a jaw bone problem, so tell your dentist and oncologist this week.",
        ].filter(Boolean).join(" ")),
        ["adaOnc", "ruggiero2022", "peterson2024"].filter((r) => r !== "ruggiero2022" || boneRisk));
    } else if (kind === "quick") {
      // Same picture as sensitivity — the sensitivity advice below covers it.
    } else if (!kind) {
      add(boneRisk ? "soon" : "dentist", "tooth", "Toothache", withNote("See your dentist."), ["sdcep2026"]);
    }
    if (inc(extra, "numb"))
      add("soon", "numb", "Numbness in your lip or chin",
        "Tell your oncologist and see a dentist in the next day or two. New numbness in the lip or chin always needs checking during or after cancer treatment.",
        ["ruggiero2022", "nciPdq"]);
  }

  // ── Sensitive teeth ──────────────────────────────────────────────────────
  const quickPain = inc(danger, "toothache") && dental.toothache?.kind === "quick" && !(dental.toothache?.extra || []).length;
  if ((inc(danger, "sensitive") && dental.sensitive?.kind !== "lingers") || quickPain) {
    const look = dental.sensitive?.look || [];
    const decay = inc(look, "hole") || inc(look, "gumline");
    add(decay && boneRisk ? "soon" : "dentist", "sensitive", decay ? "Sensitive teeth — possibly decay" : "Sensitive teeth",
      [
        decay
          ? "A hole, dark spot or soft brown area near the gum line is usually decay. Book a dentist visit" + (boneRisk ? " in the next week or two — after head and neck radiotherapy, decay moves fast and is far easier to fix early." : ".")
          : "Short, sharp twinges that stop within seconds are usually sensitivity, not a nerve problem.",
        "Rub a little desensitising or high-fluoride toothpaste onto the sensitive spot with a clean finger and leave it there. Avoid acidic drinks and snacks between meals. A calcium-phosphate crème such as GC Tooth Mousse Plus can help protect the surface.",
        inc(look, "many") && "Sensitivity in lots of teeth often goes with a dry mouth — mention it to your dentist so they can check for early decay.",
        !decay && "Mention it at your next dental visit, sooner if it starts to linger.",
      ].filter(Boolean).join(" "),
      ["sdcep2026", "mercadante2021"]);
  }

  // ── Broken tooth or filling ──────────────────────────────────────────────
  if (inc(danger, "broken")) {
    const a = dental.broken || {};
    if (a.what === "inhaled") {
      add("emergency", "inhaled", "You may have breathed in a piece of tooth or filling",
        "Go to an emergency department now, or call 000 if you're short of breath. A piece in the airway needs an X-ray.",
        ["sdcep2026"]);
    } else if (a.feel !== "aches") {
      const what = a.what === "filling" ? "a lost filling or crown" : "a broken tooth";
      add(a.feel === "sharp" ? "soon" : "dentist", "broken", a.what === "filling" ? "A filling or crown came out" : "A piece of tooth broke off",
        withNote([
          `Book a dentist visit within a week for ${what}.`,
          a.feel === "sharp" && "A sharp edge can cause ulcers, especially when your mouth is already sore — until it's smoothed, cover it with a small piece of sugar-free gum or dental wax from the pharmacy.",
          a.feel === "sensitive" && "Rub a little desensitising toothpaste onto the exposed area to settle the sensitivity.",
          a.what === "filling" && "A pharmacy temporary filling kit can cover the gap. Keep a crown that has come out — don't glue it back yourself.",
          "Chew on the other side until it's fixed.",
        ].filter(Boolean).join(" ")),
        ["sdcep2026"]);
    }
  }

  return out;
}
