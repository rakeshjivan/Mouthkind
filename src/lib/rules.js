// ─── Escalation and advice engine ──────────────────────────────────────────
// Pure functions, no UI. Every rule names its source so it can be audited.
// Order of authority: emergency rules first; if one fires, the app shows
// nothing else on that screen.

import { PH_ROOT_CRITICAL, TREATMENTS } from "../data/clinical.js";

const DAY = 86400000;
export const LEVELS = {
  emergency: { rank: 4, label: "Get help now" },
  sameday: { rank: 3, label: "Call your team today" },
  soon: { rank: 2, label: "Get it checked in the next day or two" },
  dentist: { rank: 1, label: "Mention it at your next visit" },
};

const has = (arr, id) => Array.isArray(arr) && arr.includes(id);
const feverRiskTreatment = (t) => TREATMENTS.some((x) => x.feverRisk && t.includes(x.id));

// Within 6 weeks of finishing counts as still at risk of low white cells.
export function stillAtFeverRisk(profile, now = Date.now()) {
  if (!feverRiskTreatment(profile.treatments || [])) return false;
  if (profile.phase === "during") return true;
  if (profile.phase === "after" && profile.endDate) {
    const end = Date.parse(profile.endDate);
    return Number.isFinite(end) && now - end <= 42 * DAY;
  }
  return false;
}

/**
 * Check one entry against the red-flag rules.
 * Returns alerts sorted most urgent first.
 */
export function redFlags(entry, profile, now = Date.now()) {
  const t = profile.treatments || [];
  const danger = entry.danger || [];
  const sx = entry.symptoms || [];
  const out = [];
  const add = (level, id, title, body, refs = []) => out.push({ level, id, title, body, refs });

  // ── Emergency
  // Fever: a measured 38.0 °C+, or the plain-word answers "yes" / "hot or shivery".
  const febrile = (entry.temp != null && entry.temp >= 38.0) || entry.fever === "yes" || entry.fever === "shivery";
  if (febrile) {
    if (stillAtFeverRisk(profile, now)) {
      add("emergency", "fever", entry.fever === "shivery" ? "Feeling hot, cold or shivery needs help now" : "A temperature of 38 °C or more needs help now",
        "During or soon after chemotherapy, fever can mean a serious infection while your defences are low. Call your treatment team's 24-hour number now, or go to the nearest emergency department. Don't wait to see if it settles, and don't take paracetamol to bring it down unless your team tells you to — it can hide a fever.",
        ["healthdirectFN", "ccaMouth"]);
    } else {
      add("sameday", "fever-other", "You may have a fever",
        "Call your treatment team or GP today. If you also feel very unwell, shivery or confused, go to an emergency department.",
        ["ccaMouth"]);
    }
  }
  if (has(danger, "cant_swallow_saliva"))
    add("emergency", "airway", "Trouble swallowing saliva or breathing",
      "Call emergency services now.", ["ccaMouth"]);
  if (has(danger, "swelling_spreading"))
    add("emergency", "swelling", "Face or neck swelling that is spreading",
      "Call your team's 24-hour number now, or go to an emergency department.", ["ccaMouth"]);
  if (has(danger, "bleed_wont_stop"))
    add("emergency", "bleed", "Bleeding that won't stop",
      "Keep firm pressure on with clean gauze and call your team's 24-hour number now, or go to an emergency department.", ["ccaMouth"]);

  // ── Same day
  if (entry.eating === "none")
    add("sameday", "not-eating", "You can't eat or drink enough",
      "Call your treatment team today. Not drinking enough for a day can make you unwell quickly, and there are medicines and supports that can help.",
      ["ccaMouth"]);
  if (entry.pain != null && entry.pain >= 7)
    add("sameday", "pain", "Your mouth pain is severe",
      "Call your treatment team today. Severe mouth pain during treatment usually needs prescribed pain relief — you don't have to put up with it.",
      ["elad2020", "ccaMouth"]);
  if (has(t, "immuno") && (has(sx, "sores") || has(sx, "white") || has(sx, "taste") || (entry.dryness ?? 0) >= 6))
    add("sameday", "irae", "New mouth changes on immunotherapy",
      "Tell your oncology team today. Immunotherapy can occasionally cause mouth problems that need their own treatment, and they're easier to manage when caught early. Please don't start steroid creams or mouthwashes on your own.",
      ["villa2024"]);
  if (has(sx, "opening") && entry.openingSudden)
    add("sameday", "lockjaw", "Suddenly unable to open your mouth",
      "Call your team today.", ["ccaMouth"]);

  // ── Soon (1–2 days)
  if (has(sx, "white") || has(sx, "corners"))
    add("soon", "thrush", "This could be thrush",
      "White patches that wipe off, red sore areas or cracked corners are often a yeast infection. It needs a prescribed antifungal — ask your team, GP or dentist within a day or two. If you wear dentures, take them out overnight and clean them well.",
      ["hong2024", "lalla2010"]);
  if (has(sx, "bleeding") && !has(danger, "bleed_wont_stop"))
    add("soon", "gum-bleed", "Bleeding gums",
      "Tell your team at your next contact, sooner if it's new or getting worse — your platelet count may be low. Keep brushing gently with an ultra-soft brush.",
      ["ccaMouth"]);

  // ── Within a week: bone and jaw
  const boneRisk = has(t, "rt_hn") || has(t, "bone");
  if (has(sx, "bone") || (boneRisk && has(sx, "jaw")))
    add("soon", "bone", boneRisk ? "Possible jaw bone problem" : "Bone or jaw pain",
      "See your dentist this week and tell your oncologist. After head and neck radiotherapy or bone-strengthening injections, an area of exposed bone or jaw pain needs checking early. Never have a tooth taken out without telling the dentist about your treatment.",
      ["peterson2024", "yarom2019"]);
  if (has(sx, "opening") && !entry.openingSudden)
    add("dentist", "trismus", "Your mouth isn't opening as wide",
      "Ask your team for a referral to a speech pathologist or physiotherapist for jaw exercises. Starting early helps most.",
      ["wranicz2010"]);
  if (has(sx, "toothache"))
    add(boneRisk ? "soon" : "dentist", "tooth", "Toothache or a broken tooth",
      boneRisk
        ? "See your dentist soon, and make sure they know about your radiotherapy or injections before any treatment."
        : "See your dentist. During chemotherapy, check with your team first — they may want a blood test before dental work.",
      ["peterson2024", "yarom2019"]);

  // ── Carer-observed
  if (has(sx, "c_choke"))
    add("sameday", "choke", "Coughing or choking when eating or drinking",
      "Call the treatment team today. Food or drink going the wrong way can lead to a chest infection, and a speech pathologist can help make swallowing safer.",
      ["ccaMouth"]);
  if (has(sx, "c_refuse"))
    add("soon", "refusing", "Refusing food or eating very slowly",
      "Often a sign the mouth hurts more than they're saying. Check their mouth with a torch and tell the team in the next day or two — sooner if they're not drinking.",
      ["ccaMouth"]);
  if (has(sx, "c_denture"))
    add("soon", "denture-refuse", "Won't wear their dentures",
      "Usually means a sore spot or a poor fit. Look under the denture for red or white patches and ask the dentist or team to check.",
      ["hong2024"]);

  // ── Weekly measures
  if (entry.opening != null && entry.opening <= 2)
    add(entry.opening === 1 ? "soon" : "dentist", "opening-measure",
      entry.opening === 1 ? "Mouth opening is clearly restricted" : "Mouth opening is a little restricted",
      "Ask your team for a referral to a speech pathologist or physiotherapist for jaw exercises. Starting early helps most.",
      ["wranicz2010"]);

  const order = (a, b) => LEVELS[b.level].rank - LEVELS[a.level].rank;
  return out.sort(order);
}

export const topLevel = (alerts) => (alerts.length ? alerts[0].level : null);

/** Trend rules across history — these never escalate above "dentist". */
export function trendFlags(entries, now = Date.now()) {
  const out = [];
  const sips = entries.filter((e) => e.sip != null).sort((a, b) => a.ts - b.ts);
  if (sips.length >= 2) {
    const delta = sips.at(-1).sip - sips[0].sip;
    if (delta >= 3)
      out.push({ level: "dentist", id: "sip-rise", title: `Your dry mouth score is up ${delta} since you started`,
        body: "Bring your report to your next dental or oncology appointment.", refs: ["mercadante2021"] });
  }
  const recentPh = entries.filter((e) => e.ph != null && now - e.ts <= 30 * DAY);
  if (recentPh.length >= 3) {
    const low = recentPh.filter((e) => e.ph < PH_ROOT_CRITICAL).length;
    if (low / recentPh.length >= 0.5)
      out.push({ level: "dentist", id: "ph-low", title: `Saliva pH below ${PH_ROOT_CRITICAL} on ${Math.round((100 * low) / recentPh.length)}% of readings`,
        body: "Exposed tooth roots start to dissolve at about this level. Ask your dentist about extra fluoride and calcium-phosphate protection.",
        refs: ["agarwal2022", "sim2019"] });
  }
  const w = entries.filter((e) => e.weight != null).sort((a, b) => a.ts - b.ts);
  if (w.length >= 2) {
    const start = w[0].weight, last = w.at(-1).weight;
    const pct = Math.round(((start - last) / start) * 1000) / 10;
    if (pct >= 5)
      out.push({ level: "soon", id: "weight", title: `Weight down ${pct}% since you started (${start} → ${last} kg)`,
        body: "Losing 5% or more is a sign eating has become too hard. Tell your team this week and ask to see a dietitian.",
        refs: ["csnzMouth"] });
  }
  return out;
}

// ─── Treatment cycle timing ────────────────────────────────────────────────
// Mouth soreness typically starts 4–7 days after chemotherapy and white
// cells reach their lowest around days 7–14, so that window gets extra care.
export function cycleWindow(profile, now = Date.now()) {
  const dates = (profile.chemoDates || []).map((d) => Date.parse(d)).filter(Number.isFinite).filter((t) => t <= now);
  if (!dates.length) return null;
  const last = Math.max(...dates);
  const day = Math.floor((now - last) / DAY);
  if (day > 21) return null;
  const peak = day >= 5 && day <= 14;
  return { day, last, peak };
}

// ─── Self-care advice ──────────────────────────────────────────────────────
// One plain sentence per card, for people too tired to read a list.
const TIPS = {
  "dental-first": "Book a dental check before your treatment starts.",
  routine: "Brush gently twice a day with a soft brush, then spit — don't rinse.",
  dry: "Sip water often, and use a saliva gel before meals and at bedtime.",
  sore: "Choose soft, lukewarm food, and ask your team about pain relief early.",
  eating: "Ask your team about seeing a dietitian. Small meals often are easier.",
  taste: "Try stronger flavours, or plastic cutlery if food tastes metallic.",
  teeth: "Use a high-fluoride toothpaste every day — teeth decay faster now.",
  bone: "Tell every dentist about your injections before any tooth comes out.",
  immuno: "Tell your team early about any new change in your mouth.",
};
const TIP_ORDER = ["dental-first", "sore", "eating", "dry", "taste", "teeth", "bone", "immuno", "routine"];
export const topTips = (cards, n = 3) =>
  [...cards].sort((a, b) => TIP_ORDER.indexOf(a.id) - TIP_ORDER.indexOf(b.id)).slice(0, n);
// Each card: what to do, in plain words, with sources. Cards are chosen from
// the latest entry and the treatment profile.
export function adviceFor(latest, profile, entries = []) {
  const t = profile.treatments || [];
  const sx = latest?.symptoms || [];
  const cards = [];
  const add = (id, title, points, refs, tone = "care") => cards.push({ id, title, points, refs, tone, tip: TIPS[id] });

  if (profile.phase === "before") {
    const why = [];
    if (has(t, "rt_hn")) why.push("before radiotherapy to the head or neck, so any problem teeth are fixed while healing is still easy");
    if (has(t, "bone")) why.push("before bone-strengthening injections, because extractions afterwards carry a risk of jaw bone problems");
    if (has(t, "chemo") || has(t, "transplant")) why.push("before chemotherapy, so infections don't flare when your defences are low");
    add("dental-first", "See a dentist before treatment starts", [
      `Book a dental check now — ${why.length ? why.join("; ") : "it's the single most useful step before cancer treatment"}.`,
      "Tell the dentist exactly what treatment you're having and when it starts.",
      "Ask whether you need high-fluoride toothpaste or custom fluoride trays.",
    ], ["peterson2024", "yarom2019", "ccaMouth"], "key");
  }

  add("routine", "Your daily mouth routine", [
    "Brush gently twice a day with an ultra-soft brush and a fluoride toothpaste. Brushing matters more during treatment, not less.",
    "Spit out the toothpaste but don't rinse with water — it washes the fluoride away.",
    "Rinse with a salt and bicarbonate rinse after meals and before bed.",
    "Look in your mouth each day with a torch. Note anything new in this app.",
    "Avoid mouthwashes with alcohol; they sting and dry the mouth.",
  ], ["hong2019", "ccaMouth", "csnzMouth"]);

  const dry = (latest?.dryness ?? 0) >= 4 || (latest?.sip ?? 0) >= 8;
  if (dry) {
    const pts = [
      "Sip water often through the day, and keep a bottle by the bed.",
      "Use a saliva gel before meals and at bedtime; sprays are handy when you're out.",
      "Sugar-free gum or lozenges can get saliva going if your glands still make some.",
      "A cool-mist humidifier at night and a lanolin or beeswax lip balm help many people.",
      "Cut back on coffee, alcohol and smoking or vaping — all make dryness worse.",
      "Choose products without alcohol or SLS, and with a mild flavour.",
    ];
    if (has(t, "rt_hn")) pts.push("Don't put oils or gels in your mouth just before a radiotherapy session unless your team says it's fine.");
    add("dry", "Easing a dry mouth", pts, ["mercadante2021", "hong2024", "ccaMouth", "csnzMouth"]);
  }

  const sore = (latest?.pain ?? 0) >= 3 || has(sx, "sores") || has(sx, "swallow");
  if (sore) {
    const pts = [
      "Choose soft, moist, lukewarm food — soups, eggs, yoghurt, pasta, casseroles with gravy.",
      "Avoid spicy, salty, acidic, crunchy or very hot food and drinks for now.",
      "Keep brushing gently. If it's too sore, rinse with the salt and bicarbonate rinse instead and tell your team.",
      "Ask your team about pain relief, including mouth rinses that numb, before the pain gets bad.",
    ];
    if (has(t, "rt_hn")) pts.push("Ask your team about benzydamine mouthwash, which is recommended during head and neck radiotherapy.");
    if (has(t, "targeted")) pts.push("If you take everolimus or a similar tablet, ask your oncologist about a steroid mouthwash.");
    add("sore", "Looking after a sore mouth", pts, has(t, "targeted") ? ["elad2020", "rugo2017"] : ["elad2020", "ccaMouth"]);
  }

  if (latest?.eating === "soft" || latest?.eating === "liquids") {
    add("eating", "Keeping your strength up", [
      "Ask your team for a dietitian referral — they can suggest high-energy, easy-to-swallow options.",
      "Moisten food with sauces, gravy, custard or milk.",
      "Small meals often are easier than three big ones.",
      "Nutrition drinks can fill the gap on bad days.",
    ], ["csnzMouth"]);
  }

  if (has(sx, "taste")) {
    add("taste", "When food tastes different", [
      "Try stronger flavours — herbs, ginger, garlic, marinades — if food tastes bland.",
      "If food tastes metallic, plastic cutlery can help.",
      "Cold or room-temperature food often smells and tastes less strongly.",
      "Taste usually improves gradually after treatment ends, though it can take months.",
    ], ["csnzMouth"]);
  }

  if (has(t, "rt_hn") || (latest?.ph != null && latest.ph < PH_ROOT_CRITICAL)) {
    add("teeth", "Protecting your teeth for the long term", [
      "With less saliva, teeth can decay quickly — sometimes within months.",
      "Ask your dentist about a high-fluoride toothpaste (5,000 ppm) and use it every day.",
      "A calcium-phosphate crème (CPP-ACP, such as Tooth Mousse Plus) at night adds the minerals saliva would normally supply. Use it alongside fluoride, not instead of it.",
      "See your dentist every 3 to 6 months, and always tell them about your radiotherapy.",
      "Keep sugary and acidic drinks to mealtimes; sipping them all day does the most damage.",
    ], ["agarwal2022", "sim2019", "hong2024", "peterson2024"]);
  }

  if (has(t, "bone")) {
    add("bone", "Bone-strengthening injections and your jaw", [
      "Keep up regular dental check-ups and cleans.",
      "Avoid having teeth taken out if there's another option — talk it through with your dentist and oncologist first.",
      "Make sure dentures fit well; rubbing sores can be a starting point for problems.",
      "Report any bone showing in your mouth, jaw pain, swelling or a loose tooth.",
    ], ["yarom2019"]);
  }

  if (has(t, "immuno")) {
    add("immuno", "Immunotherapy and your mouth", [
      "Mouth problems from immunotherapy are uncommon but can appear weeks or months in, sometimes after treatment ends.",
      "Watch for new dryness, ulcers, white lacy patches or taste changes, and tell your oncology team early.",
    ], ["villa2024"]);
  }

  return cards;
}
