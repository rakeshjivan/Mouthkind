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

import { milkFree } from "./allergy.js";
import { fullAnswers, riskAdvice, scoreRisk } from "./risk.js";
import { decayPlan, scoreDecay } from "./decay.js";
import { phPattern, isAcidic } from "./ph.js";
import { sipBand, sipLevel } from "./clinical.js";
import { medicineById } from "./medicines.js";
import { usedInsights } from "./used.js";
import { PRODUCTS } from "./products.js";
import { activeTreatment, chemoDay, hasTx, inCancerCare, rtStage } from "./journey.js";
import { GRADES, TEETH_FLAGS, dailyTriage, mucositisGrade, teethFlags } from "./daily.js";
import { checkup, NO_DENTIST } from "./dental.js";

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
    bone: cancer && tx.includes("bone"),
    decayE, sugarOften: decayE ? ["3", "sip"].includes(decayE.answers?.sugar) : null,
  };
}

// ── Helpers the rules share ─────────────────────────────────────────────────
const answered = (m, id) => m.fu[id]?.v;
const sipNow = (m) => m.sip?.sip ?? 0;
// Lower-case a label for use mid-sentence, keeping names and abbreviations ("Sjögren's", "HRT", "GP").
const PROPER = /^(Sjögren|Parkinson|Alzheimer|Crohn|Graves|Hashimoto|HIV|HRT|GLP|CPAP|ADHD|GP|GC)/;
const lc = (s = "") => PROPER.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
// At risk: a drier mouth, acidic saliva, a known cause, or a raised risk result.
const atRisk = (m) => sipNow(m) >= 8 || ["watch", "flag"].includes(m.phPat.level) || m.rtHN || m.sjogren
  || ["moderate", "high", "veryhigh"].includes(m.decay?.band.id) || ["high", "veryhigh"].includes(m.risk?.band.id);
export const SALIVA_TEST_Q = "Can you test my stimulated saliva flow and buffering capacity?";
const painDays = (m, n) => m.last3.filter((e) => (e.pain ?? 0) >= n).length;
const soreDays = (m) => m.last3.filter((e) => e.sores && e.sores !== "none").length;
const softDays = (m) => m.dailies.filter((e) => m.now - e.ts < 7 * DAY && (e.eat === "soft" || e.eat === "liquid")).length;
const whiteRecent = (m) => m.last3.some((e) => e.white === "yes");
const dryRecent = (m) => m.last3.some((e) => e.dry === "lot");
const hasArr = (v, x) => [].concat(v || []).includes(x);
// Questions say "you", or the name of the person being cared for.
const T = (m, you, them) => (m.who ? them.replace(/\$/g, m.who) : you);
// When a dental check matters most in cancer care.
const preRT = (m) => !!m.rt && (m.rt.stage === "before" || (m.rt.stage === "during" && m.rt.week <= 1));
const chemoTx = (m) => m.cancer && (m.tx.includes("chemo") || m.tx.includes("transplant"));
const preChemo = (m) => chemoTx(m) && m.profile.stage === "before" && m.chemo == null;
const duringChemo = (m) => chemoTx(m) && !preChemo(m) && m.active;
const fresh = (m, id, days) => m.fu[id] && m.now - m.fu[id].ts < days * DAY;

// ── Follow-up questions ─────────────────────────────────────────────────────
// when(m): the answer would change the advice now.
// pri(m):  how much it matters (higher first).
// key(m):  for questions that come back with a new result (e.g. a score that
//          rose again), the result that triggered it.
// again:   days before it can be asked again once answered (default: never).
export const FOLLOWUPS = [
  {
    id: "boneDentist", pri: () => 77,
    text: (m) => T(m, "Does your dentist know about your bone-strengthening medicine?", "Does $'s dentist know about the bone-strengthening medicine?"),
    why: "Extractions and implants need planning on these medicines, because the jaw bone can heal poorly.",
    refs: ["yarom2019"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "Not yet" }, { v: "none", label: "I don't have a dentist" }],
    when: (m) => m.bone,
  },
  {
    id: "allergy", pri: () => 59, many: true,
    text: (m) => T(m, "Do you have either of these allergies?", "Does $ have either of these allergies?"),
    why: "GC Tooth Mousse™ contains milk protein (casein), and GC Dry Mouth Gel contains hydroxybenzoates (parabens). We'll suggest something else if either applies.",
    refs: [],
    options: [{ v: "milk", label: "Milk protein (casein)" }, { v: "hb", label: "Hydroxybenzoates (parabens)" }, { v: "none", label: "Neither" }],
    // Tooth Mousse is recommended to everyone with natural teeth, so everyone with teeth is asked;
    // the gel is only suggested for dryness, which atRisk already covers.
    when: (m) => atRisk(m) || (!!m.decay && !m.noTeeth),
  },
  {
    id: "dentistSeen", pri: () => 96,
    text: (m) => T(m, "Have you had a dental check since your cancer diagnosis?", "Has $ had a dental check since the cancer diagnosis?"),
    why: "A check-up before or early in treatment finds small problems while they're simple to fix, so they don't flare up when your mouth is sore or your defences are low.",
    refs: ["elad2015", "peterson2024"],
    options: [{ v: "yes", label: "Yes" }, { v: "booked", label: "It's booked" }, { v: "no", label: "Not yet" }, { v: "none", label: "I don't have a dentist" }],
    when: (m) => preRT(m) || preChemo(m) || duringChemo(m),
  },
  {
    id: "painRelief", pri: () => 90, again: 3,
    text: (m) => T(m, "Is pain relief helping your mouth pain?", "Is pain relief helping $'s mouth pain?"),
    why: "Mouth pain during treatment should be treated, and the timing of pain relief makes a big difference to eating.",
    refs: ["elad2020"],
    options: [{ v: "works", label: "Yes, it's working" }, { v: "notEnough", label: "It's not enough" }, { v: "no", label: "Not taking any" }],
    when: (m) => painDays(m, 5) >= 1 && dailyTriage(m.daily || {}).level !== "now",
  },
  {
    id: "dryEyes", pri: () => 88,
    text: (m) => T(m, "Do your eyes also feel dry or gritty?", "Do $'s eyes also feel dry or gritty?"),
    why: "Dry mouth with dry eyes on immunotherapy can be an immune side effect that the cancer team can treat.",
    refs: ["bitoun2024"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }],
    when: (m) => m.immuno && (sipNow(m) >= 8 || dryRecent(m)),
  },
  {
    id: "sipRise", pri: () => 86, key: (m) => m.sip?.id,
    text: (m) => `${m.who ? `${m.who}'s` : "Your"} mouth has got drier since the last check. Has anything changed?`,
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
    text: (m) => T(m, "Which of these do you use every day?", "Which of these does $ use every day?"),
    why: "After radiotherapy to the head or neck, daily fluoride for life is the main protection against fast decay.",
    refs: ["peterson2024", "featherstone2021"],
    noSnooze: true,
    options: [
      { v: "plain", label: "Fluoride toothpaste" }, { v: "hf", label: "High-fluoride toothpaste" },
      { v: "ff", label: "Fluoride-free toothpaste" }, { v: "rinse", label: "Fluoride mouthwash" },
      { v: "tmp", label: "GC Tooth Mousse™ Plus" }, { v: "none", label: "None of these" },
    ],
    when: (m) => m.rtHN && (!m.rt || m.rt.stage !== "before"),
  },
  {
    id: "phTiming", pri: () => 80, key: (m) => m.ph?.id,
    text: () => "Was the last pH test at least an hour after eating, drinking or brushing?",
    why: "Food, drink and toothpaste change saliva pH for up to an hour, so an early test can look more acidic than it is.",
    refs: ["gcSalivaCheck"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No, it was sooner" }, { v: "unsure", label: "Not sure" }],
    when: (m) => m.ph && isAcidic(m.ph.ph) && m.phPat.level !== "flag",
  },
  {
    id: "acidSource", pri: (m) => (m.phPat.level === "flag" ? 82 : 66), again: 60, many: true,
    text: (m) => T(m, "Could any of these be bringing acid into your mouth?", "Could any of these be bringing acid into $'s mouth?"),
    why: "Saliva stays acidic for a reason. Finding it means the advice targets the cause, not just the teeth.",
    refs: ["gcSalivaCheck"],
    options: [
      { v: "drinks", label: "Soft drink, juice, sports drinks or kombucha most days" },
      { v: "graze", label: "Snacking or sipping sweet drinks through the day", show: (m) => m.sugarOften == null },
      { v: "reflux", label: "Reflux or heartburn" }, { v: "vomit", label: "Vomiting or morning sickness" },
      { v: "none", label: "None of these" },
    ],
    when: (m) => m.phPat.level === "watch" || m.phPat.level === "flag",
  },
  {
    id: "rinse", pri: () => 74, again: 14,
    text: (m) => T(m, "What are you rinsing your mouth with?", "What is $ rinsing with?"),
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
    text: (m) => T(m, "Have you lost weight without trying?", "Has $ lost weight without trying?"),
    why: "Eating soft foods for days can mean too little food. A dietitian can help early.",
    refs: ["ccaMouth2025"],
    options: [{ v: "no", label: "No" }, { v: "little", label: "A little" }, { v: "lot", label: "Clothes are looser" }, { v: "unsure", label: "Don't know" }],
    when: (m) => m.active && softDays(m) >= 2,
  },
  {
    id: "gelTried", pri: () => 60,
    text: (m) => T(m, "Have you tried a saliva gel or spray?", "Has $ tried a saliva gel or spray?"),
    why: "Gels last longer than water. If one hasn't helped, how it's used, or something else, might.",
    refs: ["nuchit2020", "mercadante2021"],
    options: [{ v: "helps", label: "Yes, it helps" }, { v: "meh", label: "Yes, didn't help much" }, { v: "no", label: "Not yet" }],
    when: (m) => sipNow(m) >= 8 && !m.usedNow.has("gc-dmg"),
  },
  {
    id: "dryTime", pri: () => 56, again: 90,
    text: (m) => T(m, "When is your mouth driest?", "When is $'s mouth driest?"),
    why: "Night-time dryness has different causes and fixes from daytime dryness.",
    refs: ["raoof2023"],
    options: [{ v: "night", label: "At night or on waking" }, { v: "meals", label: "When eating" }, { v: "day", label: "Through the day" }, { v: "all", label: "All the time" }],
    when: (m) => sipNow(m) >= 8,
  },
  {
    id: "dentures", pri: () => 50,
    text: (m) => T(m, "Do you wear dentures?", "Does $ wear dentures?"),
    why: "Dentures change how to clean the mouth, and thrush often hides under them.",
    refs: ["ccaMouth2025"],
    options: [{ v: "full", label: "Full dentures" }, { v: "partial", label: "A partial denture" }, { v: "no", label: "No" }],
    when: (m) => m.noTeeth || whiteRecent(m) || (m.cancer && m.active),
  },
  {
    id: "cpapHumid", pri: () => 48,
    text: (m) => T(m, "Does your CPAP machine have a heated humidifier?", "Does $'s CPAP machine have a heated humidifier?"),
    why: "A heated humidifier, and stopping mouth leaks, are the main fixes for a dry mouth on CPAP.",
    refs: ["mador2005", "kennedy2019"],
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "unsure", label: "Not sure" }],
    when: (m) => m.has("breathing", "cpap"),
  },
  {
    id: "glp1Sick", pri: () => 46,
    text: (m) => T(m, "On your weight-loss or diabetes injection, do you get nausea or reflux?", "On the weight-loss or diabetes injection, does $ get nausea or reflux?"),
    why: "Nausea and reflux bring acid onto the teeth and add to dryness.",
    refs: ["massarotto2026", "alzawawi2026"],
    options: [{ v: "often", label: "Often" }, { v: "some", label: "Sometimes" }, { v: "no", label: "No" }],
    when: (m) => m.has("medTypes", "glp1"),
  },
  {
    id: "inhalerRinse", pri: () => 42,
    text: (m) => T(m, "After your preventer inhaler, do you rinse and spit?", "After the preventer inhaler, does $ rinse and spit?"),
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
  // Bone-strengthening medicines: a full check-up, and the dentist must know.
  (m) => {
    const a = answered(m, "boneDentist");
    if (!m.bone || a === "yes") return;
    return { id: "boneDentist", pri: 75, ...checkup({
      title: a === "none" ? "Find a dentist, and tell them about your bone medicine" : "Book a check-up, and tell your dentist about your bone medicine",
      extra: "Go before you start if you can, and show your dental alert card. Keeping teeth and gums healthy means fewer extractions later, which matters because the jaw bone can heal slowly on these medicines.",
      note: a === "none" ? NO_DENTIST : "" }),
      because: ["You take a bone-strengthening medicine (such as denosumab or zoledronic acid).", ...(a ? ["Your dentist doesn't know yet."] : [])],
      refs: ["yarom2019", "elad2015"], act: { label: "My dental alert card", open: "rtcard" } };
  },
  // Before radiotherapy: the full check-up, timed to the start date.
  (m) => {
    if (!preRT(m)) return;
    const a = answered(m, "dentistSeen");
    if (a === "yes") return;
    const because = [m.rt.daysToGo != null ? `Radiotherapy starts in ${m.rt.daysToGo} day${m.rt.daysToGo === 1 ? "" : "s"}.` : "Radiotherapy is about to start."];
    if (a === "no" || a === "none") because.push("You haven't had a dental check yet.");
    const extra = "Go before treatment starts, and take your start date. Radiotherapy can make the mouth slower to heal, so if a tooth does need to come out, it's done at least 2 weeks before.";
    return a === "booked"
      ? { id: "dentalRT", pri: 62, ...checkup({ title: "Take your radiotherapy dates to your dental check", extra }), because, refs: ["peterson2024", "elad2015"] }
      : { id: "dentalRT", pri: 95, ...checkup({ title: "See your dentist before radiotherapy starts", extra, note: a === "none" ? NO_DENTIST : "Ask your team for a referral if you need one." }), because, refs: ["peterson2024", "elad2015", "hong2018"],
        ...(a === "none" ? { act: { label: "Find a dentist near me", open: "careteam" } } : {}) };
  },
  // Chemotherapy or a stem cell transplant: a check-up before, and team-led dental care during.
  (m) => {
    if (preRT(m) || !(preChemo(m) || duringChemo(m))) return;
    const a = answered(m, "dentistSeen");
    if (a === "yes") return;
    const tr = m.tx.includes("transplant") ? "your transplant" : "chemotherapy";
    const pre = preChemo(m);
    const because = [pre ? `You're about to start ${tr}.` : `You're having ${tr}.`];
    if (a === "no" || a === "none") because.push("You haven't had a dental check yet.");
    const extra = pre
      ? "Go before treatment starts if you can. Treatment can lower your defence against infection, so it's best to sort out anything that might flare up. If there isn't time, your dentist can fix just what matters most."
      : "Before any dental treatment, check with your cancer team first: they'll tell you when your blood counts are safe.";
    return { id: "dentalPre", pri: pre ? (a === "booked" ? 60 : 93) : 54,
      ...checkup({ title: a === "booked" ? `Take your ${tr === "chemotherapy" ? "treatment" : "transplant"} dates to your dental check` : pre ? `See your dentist before ${tr} starts` : "Book a check-up, with your cancer team's OK",
        extra, note: a === "none" ? NO_DENTIST : "" }),
      because, refs: ["elad2015", "hong2018", "hong2010", "elad2020"], ...(a === "none" ? { act: { label: "Find a dentist near me", open: "careteam" } } : {}) };
  },
  // A new tooth or gum problem in the symptom log: see the dentist, with the full check-up.
  (m) => {
    const recent = m.dailies.filter((e) => m.now - e.ts < 7 * DAY);
    const flags = [...new Set(recent.flatMap(teethFlags))];
    if (!flags.length) return;
    const names = flags.map((v) => lc(TEETH_FLAGS.find((f) => f.v === v)?.label || v));
    const soon = flags.includes("swell") || flags.includes("ache");
    const chemoNow = duringChemo(m);
    return { id: "dentalFlag", pri: soon ? 87 : 72, ...checkup({
      title: soon ? "See your dentist this week" : "Book in with your dentist",
      extra: chemoNow ? "You're having chemotherapy, so check with your cancer team before any dental treatment." : "",
      note: answered(m, "dentistSeen") === "none" ? NO_DENTIST : "" }),
      because: [`You logged ${list(names)} in the last week.`], refs: ["elad2015", "featherstone2021"] };
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
  // The rest of the saliva picture, which a dentist measures.
  (m) => atRisk(m) && !m.noTeeth && {
    id: "salivaTest", pri: ["flag", "watch"].includes(m.phPat.level) || sipNow(m) >= 11 ? 58 : 46,
    title: T(m, "Ask your dentist for a saliva test", "Ask the dentist for a saliva test"),
    body: "A pH strip shows how acidic your saliva is at rest. Your dentist can also test how much saliva you make when you chew, and how well it fights acid, for example with GC Saliva-Check BUFFER. The results show how much extra protection your teeth need.",
    because: [
      sipNow(m) >= 8 ? `Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}.`
        : ["flag", "watch"].includes(m.phPat.level) ? "Some of your saliva results are acidic."
        : m.rtHN ? "Radiotherapy to the head or neck reduces saliva."
        : m.sjogren ? "Sjögren's reduces saliva."
        : m.decay && ["moderate", "high", "veryhigh"].includes(m.decay.band.id) ? `Your tooth decay risk is ${m.decay.band.label.toLowerCase()}.`
        : `Your dry mouth risk is ${m.risk.band.label.toLowerCase()}.`,
    ],
    refs: ["gcSalivaCheck", "bratthall2005", "featherstone2021"],
    act: { label: "Add to my questions", addQ: SALIVA_TEST_Q },
  },
  // A gentle toothpaste for anyone having cancer treatment or with a dry mouth.
  (m) => !m.noTeeth && (m.cancer || sipNow(m) >= 8 || dryRecent(m) || soreDays(m) >= 1) && {
    id: "oranurse", pri: 64,
    title: T(m, "Brush with a gentle toothpaste: OraNurse", "Brush with a gentle toothpaste: OraNurse"),
    body: "OraNurse has no flavour and no foaming agent (SLS), so it's gentle on a dry or sore mouth, and it has everyday fluoride. Brush twice a day with a soft brush. Spit, don't rinse. If your dentist gives you a high-fluoride toothpaste, use that instead, and keep OraNurse for days your mouth is too sore.",
    because: [m.cancer ? "Cancer treatment can leave the mouth dry and sore, and mint or foaming toothpaste can sting."
      : sipNow(m) >= 8 ? `Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}.` : "Your mouth has been dry or sore lately."],
    refs: ["hong2024", "walsh2019"], products: ["oranurse"],
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
    const src = [...new Set([...[].concat(answered(m, "acidSource") || []), ...(m.sugarOften ? ["graze"] : [])])];
    const steps = [];
    if (src.includes("drinks")) steps.push("Swap soft drink, juice and sports drinks for water or milk, or keep them to mealtimes.");
    if (src.includes("graze")) steps.push("Keep snacks and sweet drinks to mealtimes — every one starts a new acid attack.");
    if (src.includes("reflux")) steps.push("Ask your GP about treating the reflux. After heartburn, rinse with water and wait an hour to brush.");
    if (src.includes("vomit")) steps.push("After vomiting, rinse with water or a bicarbonate rinse, and wait at least 30 minutes before brushing.");
    if (lvl === "flag") steps.push("See your dentist and show them your pH results.");
    const because = [m.phPat.n === 1 ? "Your last pH test was acidic." : `Your saliva was acidic in ${m.phPat.acid} of your last ${m.phPat.n} tests.`];
    if (src.length && !src.includes("none")) because.push(`You mentioned ${list(src.filter((s) => s !== "none").map((s) => ({ drinks: "acidic drinks", graze: "snacking through the day", reflux: "reflux", vomit: "vomiting" })[s]))}.`);
    if (sipNow(m) >= 8) because.push("A dry mouth makes acid harder to clear.");
    return { id: "acid", pri: lvl === "flag" ? 84 : 55, title: lvl === "flag" ? "Bring the acid down and protect your teeth" : "Keep an eye on your saliva pH",
      body: steps.join(" "), because, refs: ["gcSalivaCheck", ...(src.includes("vomit") ? ["adaPregnancy"] : [])] };
  },
  // Head and neck radiotherapy: fluoride for life.
  (m) => {
    if (!m.rtHN || (m.rt && m.rt.stage === "before")) return;
    const f = [].concat(answered(m, "rtFluoride") || []);
    if (f.includes("hf") || f.includes("tray")) return { id: "rtFluoride", pri: 30, title: "Keep up your daily fluoride, for life", body: "You're doing the most important thing. See your dentist every 3 to 6 months, for life, and tell every dentist about your radiotherapy before any treatment.", because: ["You've had radiotherapy to the head or neck."], refs: ["peterson2024"] };
    return { id: "rtFluoride", pri: 83, title: "Use high-strength fluoride every day, for life",
      body: "Brush with a high-fluoride toothpaste (5,000 ppm) twice a day — spit, don't rinse. After brushing, morning and night, add GC Tooth Mousse™ Plus (fortified with 900 ppm fluoride) or GC Tooth Mousse™.",
      because: ["You've had radiotherapy to the head or neck. Teeth can decay very fast afterwards.",
        ...(f.includes("ff") ? ["Your toothpaste has no fluoride."] : f.includes("plain") ? ["You're using an ordinary-strength fluoride toothpaste."] : f.includes("none") ? ["You're not using any fluoride yet."] : [])],
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
    body: "Take dentures out at night, brush and soak them every day, and show your team the white patches — drops or gel usually clear thrush within 1 to 2 weeks. If you take warfarin, say so first — miconazole gel can interact with it.",
    because: ["You noticed white patches.", "You wear dentures."], refs: ["ccaMouth2025"],
  },
  // Jaw opening after head and neck radiotherapy.
  (m) => {
    if (!m.rtHN || (m.rt && m.rt.stage === "before")) return;
    if (m.jaw && m.jaw.fingers < 3) return { id: "jaw", pri: 79, title: "Tell your team your mouth isn't opening fully",
      body: "Stiffness is easier to improve when it's caught early. Jaw exercises help once it starts.",
      because: [`Your last finger test was ${m.jaw.fingers} finger${m.jaw.fingers === 1 ? "" : "s"}, on ${fmt(m.jaw.ts)}.`], refs: ["shao2020", "nciPdqHp"], act: { label: "Jaw exercises", open: "jaw" } };
    // The monthly check itself lives with the other checks on Home.
  },
  // A dry mouth score that went up: depends on why.
  (m) => {
    if (!(m.rise >= 2) || m.fu.sipRise?.key !== m.sip.id) return;
    const r = [].concat(m.fu.sipRise.v);
    const because = ["Your mouth has got drier since your last check."];
    if (r.includes("med")) return { id: "riseMed", pri: 78, title: "Ask your pharmacist about the new medicine", body: "Many medicines dry the mouth. A different medicine, dose or time of day can help. Don't stop a medicine without asking first.", because: [...because, "You started or changed a medicine."], refs: ["wolff2017"] };
    if (r.includes("stopped")) return { id: "riseStopped", pri: 72, title: "Go back to what was helping", body: "Restart it for 2 weeks, then do your dry mouth check again to see if your mouth is less dry.", because: [...because, "You stopped something you were using."], act: { label: "Log what I used", open: "used" } };
    if (r.includes("drink")) return { id: "riseDrink", pri: 68, title: "Sip water through the day", body: "Keep a bottle with you and take small sips often. Water with every meal helps chewing and swallowing.", because: [...because, "You've been drinking less."] };
    if (r.includes("ill")) return { id: "riseIll", pri: 58, title: "Recheck in two weeks", body: "Being unwell, a fever and cold and flu tablets can dry the mouth for a while. Sip water often. If the score stays up, mention it to your GP.", because: [...because, "You've been unwell."], act: { label: "Remind me", open: "remind" } };
    if (r.includes("tx")) return { id: "riseTx", pri: 64, title: "Dryness often follows treatment", body: "Tell your team at your next visit, and use a saliva gel before meals and at bedtime.", because: [...because, "Your cancer treatment started or changed."], refs: ["mercadante2021"], products: ["gc-dmg"] };
    return { id: "riseNone", pri: 60, title: "Recheck in two weeks", body: "If your score is still higher, show your results to your GP or dentist — there may be a cause worth finding.", because, act: { label: "Remind me", open: "remind" } };
  },
  // Saliva-stimulating medicine where the evidence supports it.
  (m) => sipNow(m) >= 11 && (m.rtHN || m.sjogren) && answered(m, "gelTried") === "meh" && {
    id: "sialogogue", pri: 64, title: "Ask your doctor about a saliva-stimulating medicine",
    body: "Pilocarpine can help when the salivary glands still work a little. It needs a prescription and isn't suitable for everyone — your doctor will check.",
    because: [`Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}.`, "A saliva gel hasn't helped enough.", m.rtHN ? "You've had radiotherapy to the head or neck." : "You have Sjögren's."],
    refs: m.rtHN ? ["mercadante2021"] : ["ramosCasals2020"],
  },
  // Saliva gel: try one, or use it better.
  (m) => {
    const a = answered(m, "gelTried");
    // For a dry mouth, all cancer care, and a Moderate or High decay risk.
    const dry = sipNow(m) >= 8, decayRisk = !!m.decay && m.decay.band.id !== "low";
    if (!(dry || m.cancer || decayRisk) || m.usedNow.has("gc-dmg") || a === "helps") return;
    const night = answered(m, "dryTime") === "night";
    const because = [dry ? `Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}.`
      : m.cancer ? "Cancer treatment can dry the mouth, and a moist mouth is more comfortable and heals better."
      : `Your tooth decay risk is ${m.decay.band.label.toLowerCase()}, and a moist mouth helps saliva protect your teeth.`];
    if (night) because.push("Your mouth is driest at night.");
    if (a === "meh") return { id: "gel", pri: 50, title: "Get more from your saliva gel", body: "Use a pea-sized amount spread over the tongue, cheeks and gums with a clean finger — before meals, at bedtime and whenever you need it. Water alone wears off within minutes.", because: [...because, "You said gel didn't help much."], refs: ["nuchit2020"], products: ["gc-dmg"] };
    return { id: "gel", pri: 66, title: night ? "Try GC Dry Mouth Gel at bedtime" : "Through the day: GC Dry Mouth Gel, as needed", body: "Spread a pea-sized amount over your tongue, cheeks and gums with a clean finger, before meals, at bedtime and whenever your mouth feels dry. It lasts longer than water." + ([].concat(answered(m, "allergy") || []).includes("milk") ? "" : " You can mix it with GC Tooth Mousse™ or Tooth Mousse™ Plus before you put it on."), because, refs: ["nuchit2020", "mercadante2021"], products: ["gc-dmg"] };
  },
  // Night-time dryness.
  (m) => {
    if (answered(m, "dryTime") !== "night") return;
    const steps = ["Keep water by the bed and use saliva gel at bedtime and on waking.", "A humidifier in the bedroom can help."];
    const because = ["Your mouth is driest at night or when you wake."];
    let pri = 56, refs = [];
    if (m.has("breathing", "mouth") || m.has("breathing", "snore")) { steps.push("Ask your GP to check for a blocked nose or sleep apnoea."); because.push(m.has("breathing", "snore") ? "You snore or have sleep apnoea." : "You breathe through your mouth."); refs.push("raoof2023"); pri = 60; }
    if (m.has("breathing", "cpap") && answered(m, "cpapHumid") !== "yes") { steps.push("Ask your sleep clinic about a heated humidifier, and about stopping air leaking from your mouth."); because.push("You use CPAP without a heated humidifier."); refs.push("mador2005"); pri = 63; }
    return { id: "night", pri, title: "Make nights less dry", body: steps.join(" "), because, refs: [...new Set(refs)], products: ["gc-dmg"] };
  },
  // CPAP without a humidifier (when nights weren't flagged).
  (m) => m.has("breathing", "cpap") && ["no", "unsure"].includes(answered(m, "cpapHumid")) && answered(m, "dryTime") !== "night" && {
    id: "cpap", pri: 52, title: "Ask about a heated humidifier for your CPAP", body: "Heated humidification reduces dry mouth on CPAP. Your sleep clinic can also check for air leaking from your mouth — a chin strap or a better-fitting mask can help.",
    because: ["You use a CPAP machine.", answered(m, "cpapHumid") === "no" ? "It doesn't have a heated humidifier." : "You're not sure it has a humidifier."], refs: ["mador2005", "kennedy2019"],
  },
  // Medicines: name them.
  (m) => {
    const med = (m.risk?.factors || []).filter((f) => f.q === "medTypes" || f.q === "meds");
    const pts = med.reduce((s, f) => s + f.pts, 0);
    if (pts < 8) return;
    const names = m.named.map((x) => x.g).slice(0, 3);
    const because = [names.length ? `You take ${list(names)}, ${names.length === 1 ? "which is" : "which are"} known to dry the mouth.` : `Medicines make up ${pts} points of your dry mouth risk.`];
    if (sipNow(m) >= 8) because.push(`Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}.`);
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
  (m) => m.has("water", "low") && { id: "water", pri: 40, title: "Drink a little more water", body: "Carry a bottle and take small sips often — little and often, unless your doctor has limited how much you drink.", because: ["You drink less than 4 glasses of water a day."] },
  // Getting started.
  (m) => !m.risk && { id: "startRisk", pri: 35, title: "Do your dry mouth risk check", body: "Two minutes on your health, medicines and habits. It shapes everything else the app suggests.", because: ["The app doesn't know your risk factors yet."], act: { label: "Start", open: "risk" } },
  (m) => !m.sip && { id: "startSip", pri: 33, title: "Do your first dry mouth check", body: "Five quick questions (the GC SIP-SCORE) show how much dryness is affecting you.", because: ["You haven't scored your dry mouth yet."], act: { label: "Check now", open: "sip" } },
];

// Advice from the two risk checks, folded into the one plan. Each maps to the plan
// items that already cover it, so nothing is said twice.
const COVERED = {
  "risk.track": ["startSip"], "risk.dentist": ["decay.visit"], "risk.meds": ["medReview", "riseMed"], "risk.moist": ["gel", "sialogogue", "night"], "risk.cpap": ["cpap", "night"],
  "risk.drink": ["water", "riseDrink"], "risk.glp1": ["glp1"], "risk.immuno": ["sicca"], "risk.acid": ["acid"], "risk.teeth": ["hf", "rtFluoride", "decay.hf", "decay.tmp"],
  "decay.visit": ["dentalRT", "dentalPre", "boneDentist", "dentalFlag"],
  "decay.hf": ["hf", "rtFluoride"], "decay.paste": ["rtFluoride", "oranurse"], "decay.tmp": ["rtFluoride"], "decay.dry": ["gel", "sialogogue", "night"], "decay.sugar": ["acid"],
};
const DECAY_PRI = { veryhigh: 66, high: 60, moderate: 42, low: 22 };
function checkAdvice(m) {
  const out = [];
  if (m.decayE) {
    const r = scoreDecay(m.decayE.answers, m.decayE.ctx);
    const base = DECAY_PRI[r.band.id] ?? 30;
    // Tooth Mousse Plus morning and night leads the plan (after anything urgent); Tooth Mousse through
    // the day follows straight after the gel.
    // Cancer treatment or a dry mouth puts Tooth Mousse Plus first whatever the decay band.
    const dryOrCancer = m.cancer || sipNow(m) >= 8;
    const order = (a, i) => a.id === "tmp" ? (r.band.id === "low" && !dryOrCancer ? base + 5 : 70) : a.id === "tm" ? 65 : base - i;
    decayPlan(r, m.decayE.answers, { dry: dryOrCancer }).forEach((a, i) => out.push({ ...a, id: `decay.${a.id}`, pri: order(a, i),
      because: [r.noTeeth ? "You don't have natural teeth."
        : (a.id === "tmp" || a.id === "tm") && r.band.id === "low" && dryOrCancer
          ? (m.cancer ? "Cancer treatment can dry the mouth and leave teeth less protected." : `Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}, so your teeth have less protection from saliva.`)
        : a.id === "tmp" && r.band.id === "low" ? "Daily prevention: calcium, phosphate and fluoride for your teeth every day."
        : `Your tooth decay risk is ${r.band.label.toLowerCase()}.`] }));
  }
  else if (atRisk(m) || m.cancer) {
    // No tooth decay check yet (it's optional after setup): a dry mouth or cancer treatment still
    // gets the daily Tooth Mousse routine, assuming natural teeth until the check says otherwise.
    const r = scoreDecay({ teeth: "yes" });
    const why = m.cancer ? "Cancer treatment can dry the mouth and leave teeth less protected." : `Your dry mouth score is ${sipLevel(sipNow(m)).label.toLowerCase()}, so your teeth have less protection from saliva.`;
    decayPlan(r, { teeth: "yes" }, { dry: true }).filter((a) => a.id === "tmp" || a.id === "tm")
      .forEach((a) => out.push({ ...a, id: `decay.${a.id}`, pri: a.id === "tmp" ? 70 : 65, because: [why] }));
  }
  if (m.risk) for (const a of riskAdvice(m.risk, m.answers)) {
    const top = m.risk.factors[0];
    out.push({ ...a, id: `risk.${a.id}`, pri: a.id === "dentist" ? 41 : 38, because: [`Your dry mouth risk is ${m.risk.band.label.toLowerCase()}${top ? `, mostly from ${lc(top.label)}` : ""}.`] });
  }
  return out;
}

// Allergies: never suggest what someone can't use.
const MILK = ["gc-tmp", "gc-tm", "recaldent"], HB = ["gc-dmg"];
function safe(it, m) {
  const al = [].concat(answered(m, "allergy") || []);
  const milk = al.includes("milk"), hb = al.includes("hb");
  if (!milk && !hb) return it;
  let { body, title, products = [], because = [] } = it;
  if (milk) body = milkFree(body);
  const drop = (re) => body.split(/(?<=\.)\s+/).filter((x) => !re.test(x)).join(" ");
  if (milk && (products.some((p) => MILK.includes(p)) || /Tooth Mousse/.test(body + title))) {
    products = products.filter((p) => !MILK.includes(p));
    body = drop(/Tooth Mousse/); title = title.replace(/GC Tooth Mousse™?( Plus)?/, "extra fluoride");
    if (/Tooth Mousse/.test(it.title) || !body) body = `${body} Tooth Mousse™ contains milk protein, so ask your dentist about fluoride varnish or a fluoride gel instead.`.trim();
    because = [...because, "You're allergic to milk protein, so Tooth Mousse™ is left out."];
  }
  if (hb && (products.includes("gc-dmg") || /Dry Mouth Gel/.test(body + title))) {
    products = products.filter((p) => !HB.includes(p));
    body = body.replace(/GC Dry Mouth Gel/g, "a paraben-free saliva gel or spray (ask your pharmacist)");
    title = title.replace(/GC Dry Mouth Gel/g, "a paraben-free saliva gel");
    because = [...because, "You're allergic to hydroxybenzoates, so GC Dry Mouth Gel is left out."];
  }
  return { ...it, body, title, products, because };
}

// What the person already uses, from every place they've told us: the "what I used"
// log, the tooth decay check, the fluoride question and the gel question.
function inUse(m) {
  const u = new Set();
  const add = (...ids) => ids.forEach((i) => u.add(i));
  const LOG = { "gc-dmg": ["gc-dmg"], "gc-tmp": ["gc-tmp"], "gc-tm": ["gc-tm"], hf: ["neutrafluor", "hf-paste"], gum: ["recaldent"] };
  for (const v of m.usedNow) add(...(LOG[v] || []));
  const pr = [].concat(m.decayAns.protect || []);
  if (pr.includes("hf")) add("neutrafluor", "hf-paste");
  if (pr.includes("tm")) add("gc-tmp", "gc-tm");
  if (pr.includes("rinse")) add("f-rinse");
  if (pr.includes("gum")) add("recaldent");
  const rf = [].concat(answered(m, "rtFluoride") || []);
  if (rf.includes("hf")) add("neutrafluor", "hf-paste");
  if (rf.includes("tmp")) add("gc-tmp");
  if (rf.includes("rinse")) add("f-rinse");
  if (answered(m, "gelTried") === "helps") add("gc-dmg");
  return u;
}

// Already using what the plan suggests? Say so, and encourage them to keep going.
function encourage(it, using) {
  if (!it.products?.length || /^Keep/.test(it.title)) return it;
  const have = it.products.filter((p) => using.has(p));
  if (!have.length) return it;
  const names = have.map((id) => PRODUCTS.find((p) => p.id === id)?.name).filter(Boolean);
  const rest = it.products.filter((p) => !using.has(p));
  if (!rest.length) return { ...it, kept: true, pri: Math.min(it.pri, 45), title: `Keep going with ${list(names)}`,
    body: `You're already doing the right thing. ${it.body}`, because: [`You told us you use ${list(names)}.`, ...it.because] };
  return { ...it, body: `You're already using ${list(names)} — keep going. ${it.body}`, because: [...it.because, `You already use ${list(names)}.`] };
}

/** The plan, most important first. The first three are "your focus". */
export function buildPlan(m) {
  const seen = new Set(), out = [];
  for (const r of RULES) {
    const it = r(m);
    if (it && !seen.has(it.id)) { seen.add(it.id); out.push({ refs: [], products: [], ...it }); }
  }
  for (const it of checkAdvice(m)) {
    if (seen.has(it.id) || (COVERED[it.id] || []).some((x) => seen.has(x))) continue;
    if (it.id === "risk.track" && m.sip) continue; // the dry mouth score is already done
    seen.add(it.id); out.push({ refs: [], products: [], ...it });
  }
  // Tooth Mousse and Tooth Mousse Plus go together: show both wherever one is suggested.
  for (const it of out) {
    if (it.id === "decay.tm") continue;
    const p = it.products || [];
    if (p.includes("gc-tm") && !p.includes("gc-tmp")) it.products = [...p, "gc-tmp"];
    else if (p.includes("gc-tmp") && !p.includes("gc-tm")) it.products = [...p, "gc-tm"];
  }
  const using = inUse(m);
  for (let i = 0; i < out.length; i++) out[i] = encourage(safe(out[i], m), using);
  // Two items can end up praising the same thing: keep the first.
  for (let i = out.length - 1; i >= 0; i--) if (out[i].kept && out.findIndex((x) => x.title === out[i].title) < i) out.splice(i, 1);
  // A new medicine already says "ask your pharmacist"; don't say it twice.
  const dup = out.some((i) => i.id === "riseMed") ? new Set(["medReview"]) : new Set();
  // A logged tooth or gum problem already asks for the check-up.
  if (out.some((i) => i.id === "dentalFlag")) dup.add("dentalPre");
  return out.filter((i) => !dup.has(i.id)).sort((a, b) => b.pri - a.pri);
}

/** A short, plain summary of what the app knows. */
export function summary(m) {
  const s = [];
  if (m.rt?.stage === "during") s.push(`Week ${m.rt.week} of ${m.rt.of} of radiotherapy.`);
  else if (m.chemo != null && m.chemo <= 21) s.push(`Day ${m.chemo} after chemotherapy.`);
  if (m.daily && m.now - m.daily.ts < DAY) s.push(`Today: ${GRADES[m.daily.grade ?? mucositisGrade(m.daily)].label.toLowerCase()}.`);
  if (m.risk) {
    const top = m.risk.factors.slice(0, 2).map((f) => lc(f.label));
    s.push(`${m.risk.band.label} dry mouth risk${top.length ? `, mostly from ${list(top)}` : ""}.`);
  }
  if (m.sip) {
    const t = m.rise >= 2 ? `, drier than on ${fmt(m.prevSip.ts)}` : m.rise <= -2 ? `, less dry than on ${fmt(m.prevSip.ts)}` : "";
    s.push(`${sipLevel(m.sip.sip).label} dry mouth score${t}.`);
  }
  if (m.phPat.level === "flag" || m.phPat.level === "watch") s.push(m.phPat.n === 1 ? "Your last pH test was acidic." : `Saliva acidic in ${m.phPat.acid} of the last ${m.phPat.n} pH tests.`);
  else if (m.phPat.level === "ok") s.push(m.phPat.n === 1 ? "Saliva pH healthy in the last test." : "Saliva pH healthy in recent tests.");
  if (m.decay) s.push(`${m.decay.band.label} tooth decay risk.`);
  const best = m.insights.find((i) => i.change <= -2);
  if (best) s.push(`${best.label} seems to be helping.`);
  return s;
}
