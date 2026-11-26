// Realistic people, for checking the advice logic end to end (tests/logic.test.js).
// Each persona is { name, profile, entries, log? } — log is a mouth log to triage.
const D = 86400000;
export const NOW = new Date("2026-11-24T10:00:00").getTime();
const iso = (days) => new Date(NOW + days * D).toISOString().slice(0, 10);
const risk = (answers, ago = 10) => ({ id: "r1", kind: "risk", ts: NOW - ago * D, answers: { conditions: [], medFor: [], cancer: [], breathing: [], habits: [], water: "mid", age: "40", sex: "m", ...answers } });
const decay = (answers, ctx = {}, ago = 10) => ({ id: "k1", kind: "decay", ts: NOW - ago * D, answers: { teeth: "yes", recent: "no", sugar: "rare", brush: "2", between: "daily", mouth: [], gums: [], habits: [], dentist: "1", protect: [], ...answers }, ctx });
const sip = (v, ago = 5, id = "s1") => ({ id, kind: "sip", ts: NOW - ago * D, sip: v });
const ph = (v, ago = 5, id = "p1") => ({ id, kind: "ph", ts: NOW - ago * D, ph: v });
const fu = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { v, ts: NOW - D }]));

export const PERSONAS = [
  { name: "Healthy 30-year-old, nothing wrong", profile: { situation: ["self"] },
    entries: [risk({ age: "u40" }), decay({}), sip(5), ph(7.0)] },
  { name: "Low decay risk, not dry, not in cancer care", profile: { situation: ["meds"] },
    entries: [risk({ medFor: ["allergy"], age: "40" }), decay({}), sip(6), ph(7.0)] },
  { name: "80-year-old, 10 medicines, very dry, full dentures", profile: { situation: ["meds"] },
    entries: [risk({ medFor: ["mood", "bladder", "bp"], meds: "10", age: "80", sex: "f" }), decay({ teeth: "none" }), sip(13), ph(6.6)] },
  { name: "On dialysis, drinks little, dry", profile: { situation: ["meds"] },
    entries: [risk({ conditions: ["dialysis"], medFor: ["kidney"], water: "low", age: "65" }), decay({ recent: "one" }), sip(11), ph(6.8)],
    log: { dryness: 7, pain: 0, eat: "normal", sores: "none", night: "more", taste: "normal", teeth: [], white: "no", urgent: "none" } },
  { name: "Kidney disease, not on dialysis", profile: { situation: ["meds"] },
    entries: [risk({ conditions: ["kidney"], medFor: ["kidney"], water: "low", age: "65" }), decay({}), sip(9)] },
  { name: "Head and neck radiotherapy starts in 10 days, no dentist", profile: { situation: ["cancer"], treatments: ["rt_hn"], stage: "before", rtStart: iso(10), rtWeeks: 7, fu: fu({ dentistSeen: "none" }) },
    entries: [risk({ cancer: ["rt_hn"] }), decay({}), sip(6)] },
  { name: "Radiotherapy week 4, sore, moderate pain", profile: { situation: ["cancer"], treatments: ["rt_hn", "chemo"], stage: "during", rtStart: iso(-24), rtWeeks: 7, chemoDates: [iso(-3)] },
    entries: [risk({ cancer: ["rt_hn", "chemo"] }), decay({}), sip(12), { id: "d1", kind: "daily", ts: NOW - 3600000, dryness: 7, pain: 6, eat: "soft", sores: "sore", night: "once", taste: "changed", teeth: [], white: "no", urgent: "none" }],
    log: { dryness: 7, pain: 6, eat: "soft", sores: "sore", night: "once", taste: "changed", teeth: [], white: "no", urgent: "none", fever: "no", bone: "no" } },
  { name: "Chemotherapy day 9, fever", profile: { situation: ["cancer"], treatments: ["chemo"], stage: "during", chemoDates: [iso(-9)] },
    entries: [risk({ cancer: ["chemo"] }), decay({}), sip(8)],
    log: { dryness: 3, pain: 3, eat: "soft", sores: "ulcers", night: "no", taste: "changed", teeth: [], white: "no", urgent: "none", fever: "yes" } },
  { name: "Breast radiotherapy only (mouth not in the field)", profile: { situation: ["cancer"], treatments: ["rt_other"], stage: "during" },
    entries: [risk({}), decay({}), sip(5)] },
  { name: "Immunotherapy, dry mouth and dry eyes", profile: { situation: ["cancer"], treatments: ["immuno"], stage: "during", fu: fu({ dryEyes: "yes" }) },
    entries: [risk({ cancer: ["immuno"] }), decay({}), sip(10)] },
  { name: "Sjögren's, very dry, gel hasn't helped", profile: { situation: ["meds"], fu: fu({ gelTried: "meh" }) },
    entries: [risk({ conditions: ["sjogren"], sex: "f" }), decay({ recent: "more" }), sip(14)] },
  { name: "Milk and paraben allergy, high decay risk, dry", profile: { situation: ["meds"], fu: fu({ allergy: ["milk", "hb"] }) },
    entries: [risk({ medFor: ["mood"], meds: "3" }), decay({ recent: "more", sugar: "3" }), sip(11)],
    log: { dryness: 6, pain: 0, eat: "normal", sores: "none", night: "more", taste: "normal", teeth: [], white: "no", urgent: "none" } },
  { name: "Milk allergy, cancer care", profile: { situation: ["cancer"], treatments: ["chemo"], stage: "during", chemoDates: [iso(-2)], fu: fu({ allergy: ["milk"] }) },
    entries: [risk({ cancer: ["chemo"] }), decay({}), sip(9)],
    log: { dryness: 4, pain: 2, eat: "normal", sores: "sore", night: "no", taste: "normal", teeth: [], white: "no", urgent: "none", fever: "no" } },
  { name: "Pregnant with morning sickness", profile: { situation: ["self"] },
    entries: [risk({ conditions: ["pregnantSick"], medFor: ["stomach"], age: "u40", sex: "f" }), decay({ sugar: "1" }), sip(8)] },
  { name: "GLP-1 injection with nausea", profile: { situation: ["meds"], fu: fu({ glp1Sick: "often" }) },
    entries: [risk({ medFor: ["weight"] }), decay({}), sip(9)] },
  { name: "CPAP, dry at night, no humidifier", profile: { situation: ["self"], fu: fu({ dryTime: "night", cpapHumid: "no" }) },
    entries: [risk({ breathing: ["cpap", "snore"] }), decay({}), sip(10)] },
  { name: "Carer for Mum, 85, dementia", profile: { situation: ["meds"], carer: true, carerFor: "Mum" },
    entries: [risk({ conditions: ["dementia"], medFor: ["mood", "sleep"], age: "80", sex: "f" }), decay({ recent: "one", mouth: ["roots"] }), sip(11)] },
  { name: "Bone-strengthening drips, dentist not told", profile: { situation: ["cancer"], treatments: ["bone"], stage: "during", fu: fu({ boneDentist: "no" }) },
    entries: [risk({}), decay({}), sip(6)] },
  { name: "Acidic saliva, not dry", profile: { situation: ["self"] },
    entries: [risk({}), decay({}), sip(6), ph(5.6, 20, "p0"), ph(5.8, 10, "p1"), ph(5.6, 2, "p2")] },
  { name: "Cancer care, no natural teeth", profile: { situation: ["cancer"], treatments: ["chemo"], stage: "during", chemoDates: [iso(-10)] },
    entries: [risk({ cancer: ["chemo"], age: "80" }), decay({ teeth: "none" }), sip(10)],
    log: { dryness: 5, pain: 2, eat: "normal", sores: "none", night: "no", taste: "normal", teeth: ["denture"], white: "yes", urgent: "none", fever: "no" } },
  { name: "Smoker who vapes, drinks a lot of coffee", profile: { situation: ["self"] },
    entries: [risk({ habits: ["smoke", "vape"], caffeine: "high" }), decay({ habits: ["smoke"] }), sip(9)] },
  { name: "After radiotherapy (a year on), using high fluoride", profile: { situation: ["cancer"], treatments: ["rt_hn"], stage: "long", rtStart: iso(-500), rtWeeks: 6, fu: fu({ rtFluoride: ["hf", "tmp"] }) },
    entries: [risk({ cancer: ["rt_hn"] }), decay({ protect: ["hf", "tm"] }), sip(12), { id: "j1", kind: "jaw", ts: NOW - 5 * D, fingers: 2 }] },
];
