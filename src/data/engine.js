// ─── The Mouthkind engine ──────────────────────────────────────────────────
// Everything the app knows about one person, in one place, and two things
// built from it:
//
//   nextQuestion(m) — the single most useful thing to ask next. A question is
//                     only asked when something the person told the app, or a
//                     result, makes the answer change the advice.
//   buildPlan(m)    — advice ranked for this person, each item carrying the
//                     reasons it is there ("because…") and its sources.
//
// Rules, not a language model: the same inputs always give the same advice,
// every item can be traced to a source, and nothing leaves the phone.
// Red flags stay in daily.js and are never ranked away.

import { fullAnswers, scoreRisk } from "./risk.js";
import { scoreDecay } from "./decay.js";
import { phPattern, isAcidic } from "./ph.js";
import { sipBand } from "./clinical.js";
import { medicineById } from "./medicines.js";
import { usedInsights } from "./used.js";
import { activeTreatment, chemoDay, hasTx, inCancerCare, rtStage } from "./journey.js";
import { GRADES, dailyTriage, mucositisGrade } from "./daily.js";

const DAY = 86400000;
const fmt = (t) => new Date(t).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
const latest = (xs) => xs.at(-1);
const list = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** One picture of the person, from their profile, results and answers. */
export function buildModel({ profile = {}, entries = [], now = Date.now() } = {}) {
  const by = (k) => entries.filter((e) => e.kind === k).sort((a, b) => a.ts - b.ts);
  const riskE = latest(by("risk"));
  const answers = riskE ? fullAnswers(riskE.answers) : {};
  const risk = riskE ? scoreRisk(riskE.answers) : null;
  const decayE = latest(by("decay"));
  const decay = decayE ? scoreDecay(decayE.answers, decayE.ctx) : null;
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const dailies = by("daily").filter((e) => now - e.ts < 14 * DAY);
  const last3 = dailies.filter((e) => now - e.ts < 3 * DAY);
  const used = by("used").filter((e) => now - e.ts < 14 * DAY);
  const usedNow = new Set(used.flatMap((e) => e.items || []));
  const jaw = latest(by("jaw"));
  const named = (answers.medList || []).map((x) => (x.id ? medicineById(x.id) : null)).filter((m) => m && m.c && m.c !== "rep");
  const tx = profile.treatments || [];
  const cancer = inCancerCare(profile);
  const sip = latest(sips), prevSip = sips.at(-2);
  const has = (q, v) => [].concat(answers[q] || []).includes(v);
  return {
    now, profile, fu: profile.fu || {}, snooze: profile.snooze || {},
    who: profile.carer && profile.carerFor ? profile.carerFor : null,
    answers, risk, has,
    decay: decay && !decay.noTeeth ? decay : null, noTeeth: !!decay?.noTeeth, decayAns: decayE?.answers || {},
    sips, sip, prevSip, rise: sip && prevSip ? sip.sip - prevSip.sip : 0,
    phs, ph: latest(phs), phPat: phPattern(phs),
    dailies, last3, daily: latest(dailies),
    used, usedNow, insights: usedInsights(entries),
    jaw, named,
    cancer, tx, active: cancer && activeTreatment(profile, now),
    rt: cancer && tx.includes("rt_hn") ? rtStage(profile, now) : null,
    chemo: cancer && (tx.includes("chemo") || tx.includes("transplant")) ? chemoDay(profile, now) : null,
    immuno: (cancer && tx.includes("immuno")) || has("cancer", "immuno"),
    rtHN: (cancer && tx.includes("rt_hn")) || has("cancer", "rt_hn"),
    sjogren: has("conditions", "sjogren"),
  };
}

// ── Helpers the rules share ─────────────────────────────────────────────────
const answered = (m, id) => m.fu[id]?.v;
const sipNow = (m) => m.sip?.sip ?? 0;
const painDays = (m, n) => m.last3.filter((e) => (e.pain ?? 0) >= n).length;
const soreDays = (m) => m.last3.filter((e) => e.sores && e.sores !== "none").length;
const softDays = (m) => m.dailies.filter((e) => m.now - e.ts < 7 * DAY && (e.eat === "soft" || e.eat === "liquid")).length;
const whiteRecent = (m) => m.last3.some((e) => e.white === "yes");
const dryRecent = (m) => m.last3.some((e) => e.dry === "lot");
const hasArr = (v, x) => [].concat(v || []).includes(x);
const fresh = (m, id, days) => m.fu[id] && m.now - m.fu[id].ts < days * DAY;

// ── Follow-up questions ─────────────────────────────────────────────────────
// when(m): the answer would change the advice now.
// pri(m):  how much it matters (higher first).
// key(m):  for questions that come back with a new result (e.g. a score that
//          rose again), the result that triggered it.
// again:   days before it can be asked again once answered (default: never).
export const FOLLOWUPS = [
  {
    id: "dentistSeen", pri: () => 96,
    text: () => "Have you had a dental check since the cancer diagnosis?",
    why: "Any tooth that might cause trouble is best treated before radiotherapy starts, so the mouth can heal first.",
    refs: ["peterson2024"],
    options: [{ v: "yes", label: "Yes" }, { v: "booked", label: "It's booked" }, { v: "no", label: "Not yet" }],
    when: (m) => m.rt && (m.rt.stage === "before" || (m.rt.stage === "during" && m.rt.week <= 1)),
  },
  {
    id: "painRelief", pri: () => 90, again: 3,
    text: () => "Is pain relief helping the mouth pain?",
    why: "Mouth pain during treatment should be treated, and the timing of pain relief makes a big difference to eating.",
    refs: ["elad2020"],
    options: [{ v: "works", label: "Yes, it's working" }, { v: "notEnough", label: "It's not enough" }, { v: "no", label: "Not taking any" }],
    when: (m) => painDays(m, 5) >= 1 && dailyTriage(m.daily || {}).level !== "now",
  },
  {
    id: "dryEyes", pri: () => 88,
    text: () => "Do the eyes also feel dry or gritty?",
    why: "Dry mouth with dry eyes on immunotherapy can be an immune side effect that the cancer team can treat.",
    refs: ["bitoun2024"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }],
    when: (m) => m.immuno && (sipNow(m) >= 8 || dryRecent(m)),
  },
  {
    id: "sipRise", pri: () => 86, key: (m) => m.sip?.id,
    text: (m) => `The dry mouth score went up from ${m.prevSip.sip} to ${m.sip.sip}. Has anything changed?`,
    why: "Knowing what changed tells us whether it's likely to pass, or needs a medicine review or a call to the team.",
    many: true,
    options: [
      { v: "med", label: "A new or changed medicine" }, { v: "ill", label: "Been unwell" },
      { v: "drink", label: "Drinking less" }, { v: "stopped", label: "Stopped something I was using" },
      { v: "tx", label: "Started or changed cancer treatment", show: (m) => m.cancer }, { v: "none", label: "Nothing I can think of" },
    ],
    when: (m) => m.rise >= 2,
  },
  {
    id: "rtFluoride", pri: () => 84, again: 180, many: true,
    text: () => "Which of these are used every day?",
    why: "After radiotherapy to the head or neck, daily fluoride for life is the main protection against fast decay.",
    refs: ["peterson2024", "featherstone2021"],
    options: [
      { v: "hf", label: "High-fluoride toothpaste" }, { v: "tray", label: "Fluoride trays" },
      { v: "tmp", label: "GC Tooth Mousse Plus" }, { v: "plain", label: "Ordinary toothpaste only" },
    ],
    when: (m) => m.rtHN && (!m.rt || m.rt.stage !== "before"),
  },
  {
    id: "phTiming", pri: () => 80, key: (m) => m.ph?.id,
    text: () => "Was that pH test at least an hour after eating, drinking or brushing?",
    why: "Food, drink and toothpaste change saliva pH for up to an hour, so an early test can look more acidic than it is.",
    refs: ["gcSalivaCheck"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No, it was sooner" }, { v: "unsure", label: "Not sure" }],
    when: (m) => m.ph && isAcidic(m.ph.ph) && m.phPat.level !== "flag",
  },
  {
    id: "acidSource", pri: (m) => (m.phPat.level === "flag" ? 82 : 66), again: 60, many: true,
    text: () => "Could any of these be bringing acid into the mouth?",
    why: "Saliva stays acidic for a reason. Finding it means the advice targets the cause, not just the teeth.",
    refs: ["gcSalivaCheck"],
    options: [
      { v: "drinks", label: "Soft drink, juice, sports drinks or kombucha most days" },
      { v: "graze", label: "Snacking or sipping sweet drinks through the day" },
      { v: "reflux", label: "Reflux or heartburn" }, { v: "vomit", label: "Vomiting or morning sickness" },
      { v: "none", label: "None of these" },
    ],
    when: (m) => m.phPat.level === "watch" || m.phPat.level === "flag",
  },
  {
    id: "rinse", pri: () => 74, again: 14,
    text: () => "What's being used to rinse the mouth?",
    why: "Some mouthwashes sting and dry a sore mouth. A plain bicarb rinse is gentler.",
    refs: ["canberraHN", "ccaMouth2025"],
    options: [
      { v: "bicarb", label: "Bicarb or salt water" }, { v: "alcohol", label: "A mouthwash with alcohol" },
      { v: "team", label: "One my team gave me" }, { v: "none", label: "Nothing yet" },
    ],
    when: (m) => m.cancer && soreDays(m) >= 1,
  },
  {
    id: "weight", pri: () => 70, again: 14,
    text: () => "Any weight loss without trying?",
    why: "Eating soft foods for days can mean too little food. A dietitian can help early.",
    refs: ["ccaMouth2025"],
    options: [{ v: "no", label: "No" }, { v: "little", label: "A little" }, { v: "lot", label: "Clothes are looser" }, { v: "unsure", label: "Don't know" }],
    when: (m) => m.active && softDays(m) >= 2,
  },
  {
    id: "gelTried", pri: () => 60,
    text: () => "Has a saliva gel or spray been tried?",
    why: "Gels last longer than water. If one hasn't helped, how it's used, or something else, might.",
    refs: ["nuchit2020", "mercadante2021"],
    options: [{ v: "helps", label: "Yes, it helps" }, { v: "meh", label: "Yes, didn't help much" }, { v: "no", label: "Not yet" }],
    when: (m) => sipNow(m) >= 8 && !m.usedNow.has("gc-dmg"),
  },
  {
    id: "dryTime", pri: () => 56, again: 90,
    text: () => "When is the mouth driest?",
    why: "Night-time dryness has different causes and fixes from daytime dryness.",
    refs: ["raoof2023"],
    options: [{ v: "night", label: "At night or on waking" }, { v: "meals", label: "When eating" }, { v: "day", label: "Through the day" }, { v: "all", label: "All the time" }],
    when: (m) => sipNow(m) >= 8,
  },
  {
    id: "dentures", pri: () => 50,
    text: () => "Are dentures worn?",
    why: "Dentures change how to clean the mouth, and thrush often hides under them.",
    refs: ["ccaMouth2025"],
    options: [{ v: "full", label: "Full dentures" }, { v: "partial", label: "A partial denture" }, { v: "no", label: "No" }],
    when: (m) => m.noTeeth || whiteRecent(m) || (m.cancer && m.active),
  },
  {
    id: "cpapHumid", pri: () => 48,
    text: () => "Does the CPAP machine have a heated humidifier?",
    why: "A heated humidifier, and stopping mouth leaks, are the main fixes for a dry mouth on CPAP.",
    refs: ["raoof2023"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "unsure", label: "Not sure" }],
    when: (m) => m.has("breathing", "cpap"),
  },
  {
    id: "glp1Sick", pri: () => 46,
    text: () => "On the weight-loss or diabetes injection, is there nausea or reflux?",
    why: "Nausea and reflux bring acid onto the teeth and add to dryness.",
    refs: ["massarotto2026", "alzawawi2026"],
    options: [{ v: "often", label: "Often" }, { v: "some", label: "Sometimes" }, { v: "no", label: "No" }],
    when: (m) => m.has("medTypes", "glp1"),
  },
  {
    id: "inhalerRinse", pri: () => 42,
    text: () => "After a preventer inhaler, is the mouth rinsed and spat out?",
    why: "Rinsing after a steroid preventer lowers the chance of thrush and a dry, sore mouth.",
    refs: ["asthmaHandbook"],
    options: [{ v: "always", label: "Every time" }, { v: "some", label: "Sometimes" }, { v: "no", label: "No" }, { v: "na", label: "No preventer" }],
    when: (m) => m.has("medTypes", "inhaler") || m.has("medFor", "breathing"),
  },
];

/** The answer options that apply to this person. */
export const optionsFor = (q, m) => q.options.filter((o) => !o.show || o.show(m));

/** Is this question waiting for an answer (not answered for this trigger, not snoozed)? */
function open(m, q) {
  if (!q.when(m)) return false;
  if ((m.snooze[q.id] || 0) > m.now) return false;
  const a = m.fu[q.id];
  if (!a) return true;
  if (q.key) return a.key !== q.key(m);
  return q.again ? m.now - a.ts > q.again * DAY : false;
}

/** The questions worth asking now, most useful first. */
export const openQuestions = (m) => FOLLOWUPS.filter((q) => open(m, q)).sort((a, b) => b.pri(m) - a.pri(m));
export const nextQuestion = (m) => openQuestions(m)[0] || null;

/** Store an answer on the profile. */
export function answerQuestion(profile, q, v, m) {
  return { ...profile, fu: { ...(profile.fu || {}), [q.id]: { v, ts: m.now, key: q.key ? q.key(m) : undefined } } };
}
export function snoozeQuestion(profile, q, now = Date.now(), days = 3) {
  return { ...profile, snooze: { ...(profile.snooze || {}), [q.id]: now + days * DAY } };
}

// ── The plan ────────────────────────────────────────────────────────────────
// Each rule returns an item or nothing. Items: { id, pri, title, body, because[], refs?, products?, act? }
const RULES = [
  // Before radiotherapy: the dental check.
  (m) => {
    if (!m.rt || m.rt.stage !== "before" && !(m.rt.stage === "during" && m.rt.week <= 1)) return;
    const a = answered(m, "dentistSeen");
    if (a === "yes") return;
    const because = [m.rt.daysToGo != null ? `Radiotherapy starts in ${m.rt.daysToGo} day${m.rt.daysToGo === 1 ? "" : "s"}.` : "Radiotherapy is about to start."];
    if (a === "no") because.push("You haven't had a dental check yet.");
    return a === "booked"
      ? { id: "dentalRT", pri: 62, title: "Take your radiotherapy dates to the dental check", body: "Your dentist needs the start date so any tooth that needs removing can come out at least 2 weeks before, and heal.", because, refs: ["peterson2024"] }
      : { id: "dentalRT", pri: 95, title: "See a dentist before radiotherapy starts", body: "Any tooth that may need to come out is best removed at least 2 weeks before radiotherapy, so it can heal. Ask your team for a referral, or call your dentist this week.", because, refs: ["peterson2024"] };
  },
  // Immunotherapy with dry mouth and dry eyes.
  (m) => m.immuno && answered(m, "dryEyes") === "yes" && {
    id: "sicca", pri: 89, title: "Tell your cancer team about the dry mouth and dry eyes",
    body: "Together they can be an immune side effect of immunotherapy, and it can be treated. Don't wait for your next appointment.",
    because: ["You're having immunotherapy.", "You said your eyes are dry or gritty as well."], refs: ["bitoun2024"],
  },
  // Pain that isn't controlled.
  (m) => {
    const a = answered(m, "painRelief");
    if (!(painDays(m, 5) >= 1) || !a || a === "works") return;
    return { id: "pain", pri: 88, title: "Ask your team about pain relief today",
      body: "You don't have to put up with mouth pain. Pain relief taken about 30 minutes before meals makes eating easier, and your team can suggest a numbing or anti-inflammatory mouthwash.",
      because: [`Mouth pain was moderate or worse on ${painDays(m, 5)} of the last 3 days.`, a === "no" ? "You're not taking pain relief for it." : "You said your pain relief isn't enough."],
      refs: ["elad2020", "ccaMouth2025"], act: { label: "Call my team", call: true } };
  },
  // Weight loss.
  (m) => {
    const a = answered(m, "weight");
    if (a !== "little" && a !== "lot") return;
    return { id: "dietitian", pri: a === "lot" ? 86 : 66, title: "Ask to see a dietitian",
      body: "Soft, high-energy foods little and often, and supplement drinks if needed. A dietitian can tailor this to your treatment.",
      because: [`You've been on soft foods or liquids on ${softDays(m)} of the last 7 days.`, a === "lot" ? "Your clothes are looser." : "You've lost a little weight."], refs: ["ccaMouth2025"] };
  },
  // Repeat an early pH test.
  (m) => m.ph && isAcidic(m.ph.ph) && m.fu.phTiming?.key === m.ph.id && m.fu.phTiming.v !== "yes" && {
    id: "phRetest", pri: 79, title: "Repeat your pH test before breakfast",
    body: "Test first thing, or at least an hour after eating, drinking or brushing. One early test can look more acidic than your saliva really is.",
    because: [`Your last test read pH ${m.ph.ph.toFixed(1)}.`, m.fu.phTiming.v === "no" ? "It was within an hour of eating, drinking or brushing." : "You weren't sure when you last ate or brushed."],
    refs: ["gcSalivaCheck"], act: { label: "Test now", open: "ph" },
  },
  // Acidic saliva: tailored to what's bringing the acid.
  (m) => {
    const lvl = m.phPat.level;
    if (lvl !== "flag" && lvl !== "watch") return;
    if (lvl === "watch" && m.fu.phTiming?.key === m.ph?.id && m.fu.phTiming.v !== "yes") return;
    const src = [].concat(answered(m, "acidSource") || []);
    const steps = [];
    if (src.includes("drinks")) steps.push("Swap soft drink, juice and sports drinks for water or milk, or keep them to mealtimes.");
    if (src.includes("graze")) steps.push("Keep snacks and sweet drinks to mealtimes — every one starts a new acid attack.");
    if (src.includes("reflux")) steps.push("Ask your GP about treating the reflux. After heartburn, rinse with water and wait an hour to brush.");
    if (src.includes("vomit")) steps.push("After vomiting, rinse with water and wait about an hour before brushing.");
    steps.push("Smear GC Tooth Mousse Plus over your teeth after brushing at night.");
    if (lvl === "flag") steps.push("See your dentist and show them your pH results.");
    const because = [`Your saliva was acidic in ${m.phPat.acid} of your last ${m.phPat.n} tests.`];
    if (src.length && !src.includes("none")) because.push(`You mentioned ${list(src.filter((s) => s !== "none").map((s) => ({ drinks: "acidic drinks", graze: "snacking through the day", reflux: "reflux", vomit: "vomiting" })[s]))}.`);
    if (sipNow(m) >= 8) because.push("A dry mouth makes acid harder to clear.");
    return { id: "acid", pri: lvl === "flag" ? 84 : 55, title: lvl === "flag" ? "Bring the acid down and protect your teeth" : "Keep an eye on your saliva pH",
      body: steps.join(" "), because, refs: ["gcSalivaCheck", "agarwal2022", ...(src.includes("vomit") ? ["adaPregnancy"] : [])], products: ["gc-tmp", "gc-tm"] };
  },
  // Head and neck radiotherapy: fluoride for life.
  (m) => {
    if (!m.rtHN || (m.rt && m.rt.stage === "before")) return;
    const f = [].concat(answered(m, "rtFluoride") || []);
    if (f.includes("hf") || f.includes("tray")) return { id: "rtFluoride", pri: 30, title: "Keep up your daily fluoride, for life", body: "You're doing the most important thing. See your dentist every 3 to 6 months.", because: ["You've had radiotherapy to the head or neck."], refs: ["peterson2024"] };
    return { id: "rtFluoride", pri: 83, title: "Use high-strength fluoride every day, for life",
      body: "Brush with a high-fluoride toothpaste (5,000 ppm) twice a day — spit, don't rinse — or use the fluoride trays your dentist makes. Add GC Tooth Mousse Plus at night.",
      because: ["You've had radiotherapy to the head or neck. Teeth can decay very fast afterwards.", ...(f.includes("plain") ? ["You're using ordinary toothpaste only."] : [])],
      refs: ["peterson2024", "featherstone2021"], products: ["neutrafluor", "gc-tmp"] };
  },
  // Chemotherapy: the sore-mouth window, worked out from the dates.
  (m) => {
    const d = m.chemo;
    if (d == null || d > 14) return;
    const last = m.now - d * DAY;
    if (d < 7) return { id: "chemoWindow", pri: 80, title: `Get ready for ${fmt(last + 7 * DAY)} to ${fmt(last + 14 * DAY)}`,
      body: "These are the days a sore mouth is most likely. Start rinsing 4 times a day now, stock up on soft foods, and do your daily check each morning.",
      because: [`Your last chemotherapy was on ${fmt(last)}.`], refs: ["nciPdqHp", "canberraHN"] };
    return { id: "chemoWindow", pri: 81, title: "These are your most likely sore-mouth days",
      body: "Rinse 4 times a day, keep brushing gently, choose soft foods and do your daily check. It usually settles within the following week.",
      because: [`It's day ${d} after your chemotherapy.`], refs: ["nciPdqHp", "canberraHN"] };
  },
  // Radiotherapy weeks 2+: soreness builds.
  (m) => m.rt?.stage === "during" && m.rt.week >= 2 && {
    id: "rtWeeks", pri: 76, title: "Rinse 4 times a day and check your mouth daily",
    body: "¼ teaspoon of bicarbonate of soda in a cup of warm water, swish for 30 seconds and spit. Soreness usually builds from now until a week or two after treatment ends.",
    because: [`You're in week ${m.rt.week} of ${m.rt.of} of radiotherapy.`], refs: ["lalla2008", "canberraHN"],
  },
  // Rinse choice when the mouth is sore.
  (m) => {
    const a = answered(m, "rinse");
    if (!m.cancer || !soreDays(m) || (a !== "alcohol" && a !== "none")) return;
    return a === "alcohol"
      ? { id: "rinseSwap", pri: 74, title: "Swap to an alcohol-free rinse", body: "Alcohol stings and dries a sore mouth. Use a bicarb rinse instead: ¼ teaspoon in a cup of warm water, at least 4 times a day.", because: ["Your mouth has been sore.", "You're using a mouthwash with alcohol."], refs: ["canberraHN", "ccaMouth2025"] }
      : { id: "rinseSwap", pri: 70, title: "Start a bicarb rinse", body: "¼ teaspoon of bicarbonate of soda in a cup of warm water. Swish for 30 seconds and spit, at least 4 times a day.", because: ["Your mouth has been sore.", "You're not rinsing yet."], refs: ["canberraHN", "elad2020"] };
  },
  // Thrush under dentures.
  (m) => whiteRecent(m) && ["full", "partial"].includes(answered(m, "dentures")) && {
    id: "dentureThrush", pri: 73, title: "Check under your dentures for thrush",
    body: "Take dentures out at night, brush and soak them every day, and show your team the white patches — drops or gel usually clear thrush in a few days.",
    because: ["You noticed white patches.", "You wear dentures."], refs: ["ccaMouth2025"],
  },
  // Jaw opening after head and neck radiotherapy.
  (m) => {
    if (!m.rtHN || (m.rt && m.rt.stage === "before")) return;
    if (m.jaw && m.jaw.fingers < 3) return { id: "jaw", pri: 79, title: "Tell your team your mouth isn't opening fully",
      body: "Stiffness is easier to improve when it's caught early. Jaw exercises help once it starts.",
      because: [`Your last finger test was ${m.jaw.fingers} finger${m.jaw.fingers === 1 ? "" : "s"}, on ${fmt(m.jaw.ts)}.`], refs: ["shao2020", "nciPdqHp"], act: { label: "Jaw exercises", open: "jaw" } };
    if (!m.jaw || m.now - m.jaw.ts > 30 * DAY) return { id: "jaw", pri: 47, title: "Check how wide your mouth opens", body: "A 10-second finger test, once a month, picks up a stiff jaw early.",
      because: [m.jaw ? `Your last check was on ${fmt(m.jaw.ts)}.` : "You haven't done a jaw check yet."], refs: ["nciPdqHp"], act: { label: "Check now", open: "jaw" } };
  },
  // A dry mouth score that went up: depends on why.
  (m) => {
    if (!(m.rise >= 2) || m.fu.sipRise?.key !== m.sip.id) return;
    const r = [].concat(m.fu.sipRise.v);
    const because = [`Your dry mouth score went from ${m.prevSip.sip} to ${m.sip.sip}.`];
    if (r.includes("med")) return { id: "riseMed", pri: 78, title: "Ask your pharmacist about the new medicine", body: "Many medicines dry the mouth. A different medicine, dose or time of day can help. Don't stop a medicine without asking first.", because: [...because, "You started or changed a medicine."], refs: ["wolff2017"] };
    if (r.includes("stopped")) return { id: "riseStopped", pri: 72, title: "Go back to what was helping", body: "Restart it for 2 weeks, then do your dry mouth check again to see if the score comes back down.", because: [...because, "You stopped something you were using."], act: { label: "Log what I used", open: "used" } };
    if (r.includes("drink")) return { id: "riseDrink", pri: 68, title: "Sip water through the day", body: "Keep a bottle with you and take small sips often. Water with every meal helps chewing and swallowing.", because: [...because, "You've been drinking less."] };
    if (r.includes("ill")) return { id: "riseIll", pri: 58, title: "Recheck in two weeks", body: "Being unwell, a fever and cold and flu tablets can dry the mouth for a while. Sip water often. If the score stays up, mention it to your GP.", because: [...because, "You've been unwell."], act: { label: "Remind me", open: "remind" } };
    if (r.includes("tx")) return { id: "riseTx", pri: 64, title: "Dryness often follows treatment", body: "Tell your team at your next visit, and use a saliva gel before meals and at bedtime.", because: [...because, "Your cancer treatment started or changed."], refs: ["mercadante2021"], products: ["gc-dmg"] };
    return { id: "riseNone", pri: 60, title: "Recheck in two weeks", body: "If your score is still higher, show your results to your GP or dentist — there may be a cause worth finding.", because, act: { label: "Remind me", open: "remind" } };
  },
  // Saliva-stimulating medicine where the evidence supports it.
  (m) => sipNow(m) >= 11 && (m.rtHN || m.sjogren) && answered(m, "gelTried") === "meh" && {
    id: "sialogogue", pri: 64, title: "Ask your doctor about a saliva-stimulating medicine",
    body: "Pilocarpine can help when the salivary glands still work a little. It needs a prescription and isn't suitable for everyone — your doctor will check.",
    because: [`Your dry mouth score is ${sipNow(m)} (${sipBand(sipNow(m)).label.toLowerCase()}).`, "A saliva gel hasn't helped enough.", m.rtHN ? "You've had radiotherapy to the head or neck." : "You have Sjögren's."],
    refs: m.rtHN ? ["mercadante2021"] : ["ramosCasals2020"],
  },
  // Saliva gel: try one, or use it better.
  (m) => {
    const a = answered(m, "gelTried");
    if (sipNow(m) < 8 || m.usedNow.has("gc-dmg") || a === "helps") return;
    const night = answered(m, "dryTime") === "night";
    const because = [`Your dry mouth score is ${sipNow(m)} (${sipBand(sipNow(m)).label.toLowerCase()}).`];
    if (night) because.push("Your mouth is driest at night.");
    if (a === "meh") return { id: "gel", pri: 50, title: "Get more from your saliva gel", body: "Use a pea-sized amount spread over the tongue, cheeks and gums with a clean finger — before meals, at bedtime and whenever you need it. Water alone wears off within minutes.", because: [...because, "You said gel didn't help much."], refs: ["nuchit2020"], products: ["gc-dmg"] };
    return { id: "gel", pri: 62, title: night ? "Try GC Dry Mouth Gel at bedtime" : "Try GC Dry Mouth Gel", body: "Spread a pea-sized amount over your tongue, cheeks and gums with a clean finger, before meals and at bedtime. It lasts longer than water.", because, refs: ["nuchit2020", "mercadante2021"], products: ["gc-dmg"] };
  },
  // Night-time dryness.
  (m) => {
    if (answered(m, "dryTime") !== "night") return;
    const steps = ["Keep water by the bed and use saliva gel at bedtime and on waking.", "A humidifier in the bedroom can help."];
    const because = ["Your mouth is driest at night or when you wake."];
    let pri = 56, refs = [];
    if (m.has("breathing", "mouth") || m.has("breathing", "snore")) { steps.push("Ask your GP to check for a blocked nose or sleep apnoea."); because.push(m.has("breathing", "snore") ? "You snore or have sleep apnoea." : "You breathe through your mouth."); refs.push("raoof2023"); pri = 60; }
    if (m.has("breathing", "cpap") && answered(m, "cpapHumid") !== "yes") { steps.push("Ask your sleep clinic about a heated humidifier, a chin strap or a full-face mask."); because.push("You use CPAP without a heated humidifier."); refs.push("raoof2023"); pri = 63; }
    return { id: "night", pri, title: "Make nights less dry", body: steps.join(" "), because, refs: [...new Set(refs)], products: ["gc-dmg"] };
  },
  // CPAP without a humidifier (when nights weren't flagged).
  (m) => m.has("breathing", "cpap") && ["no", "unsure"].includes(answered(m, "cpapHumid")) && answered(m, "dryTime") !== "night" && {
    id: "cpap", pri: 52, title: "Ask about a heated humidifier for your CPAP", body: "Humidified air, and stopping mouth leaks with a chin strap or full-face mask, are the main fixes for a dry mouth on CPAP.",
    because: ["You use a CPAP machine.", answered(m, "cpapHumid") === "no" ? "It doesn't have a heated humidifier." : "You're not sure it has a humidifier."], refs: ["raoof2023"],
  },
  // Medicines: name them.
  (m) => {
    const med = (m.risk?.factors || []).filter((f) => f.q === "medTypes" || f.q === "meds");
    const pts = med.reduce((s, f) => s + f.pts, 0);
    if (pts < 8) return;
    const names = m.named.map((x) => x.g).slice(0, 3);
    const because = [names.length ? `You take ${list(names)}, ${names.length === 1 ? "which is" : "which are"} known to dry the mouth.` : `Medicines make up ${pts} points of your dry mouth risk.`];
    if (sipNow(m) >= 8) because.push(`Your dry mouth score is ${sipNow(m)}.`);
    return { id: "medReview", pri: sipNow(m) >= 8 ? 61 : 44, title: "Ask for a medicine review", body: "Your pharmacist or GP may be able to change the dose, timing or type of a medicine that dries the mouth. Take your list. Never stop a medicine without asking first.", because, refs: ["wolff2017"] };
  },
  // Inhalers.
  (m) => ["some", "no"].includes(answered(m, "inhalerRinse")) && {
    id: "inhaler", pri: 52, title: "Rinse and spit after your preventer", body: "Rinse with water and spit after every dose of a steroid preventer, and use a spacer if you have a puffer. It lowers the chance of thrush and a sore, dry mouth.",
    because: ["You use a preventer inhaler.", "You don't always rinse afterwards."], refs: ["asthmaHandbook"],
  },
  // GLP-1 with nausea or reflux.
  (m) => ["often", "some"].includes(answered(m, "glp1Sick")) && {
    id: "glp1", pri: 54, title: "Protect your teeth from reflux on your injection", body: "After reflux or vomiting, rinse with water and wait about an hour to brush. Sip water through the day, and tell your prescriber if nausea keeps happening.",
    because: ["You take a GLP-1 medicine.", `You get nausea or reflux ${answered(m, "glp1Sick") === "often" ? "often" : "sometimes"}.`], refs: ["massarotto2026", "alzawawi2026"], products: ["gc-tm"],
  },
  // Decay risk without high-fluoride toothpaste.
  (m) => {
    if (!m.decay || !["high", "veryhigh"].includes(m.decay.band.id) || hasArr(m.decayAns.protect, "hf") || m.rtHN) return;
    const because = [`Your tooth decay risk is ${m.decay.band.label.toLowerCase()}.`];
    if (sipNow(m) >= 8) because.push("A dry mouth leaves teeth with less protection.");
    if (m.phPat.level === "flag") because.push("Your saliva has been acidic.");
    return { id: "hf", pri: 63, title: "Ask your dentist about a high-fluoride toothpaste", body: "5,000 ppm toothpaste twice a day gives the strongest everyday protection. Spit, don't rinse.", because, refs: ["featherstone2021", "chen2026"], products: ["neutrafluor"] };
  },
  // What's working: the person's own data.
  (m) => {
    const best = m.insights.find((i) => i.change <= -2);
    return best && { id: `keep-${best.v}`, pri: 57, title: `Keep going with ${best.label}`,
      body: "Your own results suggest it's helping. Other things change too, so keep checking.",
      because: [`Your dry mouth score averaged ${best.before} before you started and ${best.after} since.`] };
  },
  // Water.
  (m) => m.has("water", "low") && { id: "water", pri: 40, title: "Drink a little more water", body: "Carry a bottle and take small sips often — aim for about 8 glasses a day unless your doctor has said otherwise.", because: ["You drink less than 4 glasses of water a day."] },
  // Getting started.
  (m) => !m.risk && { id: "startRisk", pri: 35, title: "Do your dry mouth risk check", body: "Two minutes on your health, medicines and habits. It shapes everything else the app suggests.", because: ["The app doesn't know your risk factors yet."], act: { label: "Start", open: "risk" } },
  (m) => !m.sip && { id: "startSip", pri: 33, title: "Do your first dry mouth check", body: "Five quick questions (the GC SIP-SCORE) show how much dryness is affecting you.", because: ["You haven't scored your dry mouth yet."], act: { label: "Check now", open: "sip" } },
];

/** The plan, most important first. The first three are "your focus". */
export function buildPlan(m) {
  const seen = new Set(), out = [];
  for (const r of RULES) {
    const it = r(m);
    if (it && !seen.has(it.id)) { seen.add(it.id); out.push({ refs: [], products: [], ...it }); }
  }
  // A new medicine already says "ask your pharmacist"; don't say it twice.
  const dup = out.some((i) => i.id === "riseMed") ? new Set(["medReview"]) : new Set();
  return out.filter((i) => !dup.has(i.id)).sort((a, b) => b.pri - a.pri);
}

/** A short, plain summary of what the app knows. */
export function summary(m) {
  const s = [];
  if (m.rt?.stage === "during") s.push(`Week ${m.rt.week} of ${m.rt.of} of radiotherapy.`);
  else if (m.chemo != null && m.chemo <= 21) s.push(`Day ${m.chemo} after chemotherapy.`);
  if (m.daily && m.now - m.daily.ts < DAY) s.push(`Today: ${GRADES[m.daily.grade ?? mucositisGrade(m.daily)].label.toLowerCase()}.`);
  if (m.risk) {
    const top = m.risk.factors.slice(0, 2).map((f) => f.label.toLowerCase());
    s.push(`${m.risk.band.label} dry mouth risk${top.length ? `, mostly from ${list(top)}` : ""}.`);
  }
  if (m.sip) {
    const t = m.rise >= 2 ? `, up ${m.rise} since ${fmt(m.prevSip.ts)}` : m.rise <= -2 ? `, down ${-m.rise} since ${fmt(m.prevSip.ts)}` : "";
    s.push(`Dry mouth score ${m.sip.sip} of 15 (${sipBand(m.sip.sip).label.toLowerCase()})${t}.`);
  }
  if (m.phPat.level === "flag" || m.phPat.level === "watch") s.push(`Saliva acidic in ${m.phPat.acid} of the last ${m.phPat.n} pH tests.`);
  else if (m.phPat.level === "ok") s.push(m.phPat.n === 1 ? "Saliva pH healthy in the last test." : "Saliva pH healthy in recent tests.");
  if (m.decay) s.push(`${m.decay.band.label} tooth decay risk.`);
  const best = m.insights.find((i) => i.change <= -2);
  if (best) s.push(`${best.label} seems to be helping.`);
  return s;
}
