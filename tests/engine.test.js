// The engine: the next question and the personal plan. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOLLOWUPS, answerQuestion, buildModel, buildPlan, nextQuestion, openQuestions, snoozeQuestion, summary } from "../src/data/engine.js";
import { MEDICINES } from "../src/data/medicines.js";
import { REFS } from "../src/data/references.js";

const NOW = new Date("2026-11-19T10:00:00").getTime();
const D = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const model = (profile = {}, entries = []) => buildModel({ profile, entries, now: NOW });
const answer = (p, e, id, v) => { const m = model(p, e); return answerQuestion(p, FOLLOWUPS.find((q) => q.id === id), v, m); };

test("nothing known: no question, and the plan starts with the checks", () => {
  const m = model();
  assert.equal(nextQuestion(m), null);
  assert.deepEqual(buildPlan(m).map((i) => i.id), ["startRisk", "startSip"]);
  assert.deepEqual(summary(m), []);
});

test("before radiotherapy: the dental check is asked first, and 'not yet' tops the plan", () => {
  const p = { situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW + 10 * D), rtWeeks: 6 };
  assert.equal(nextQuestion(model(p)).id, "dentistSeen");
  const p2 = answer(p, [], "dentistSeen", "no");
  const top = buildPlan(model(p2))[0];
  assert.equal(top.id, "dentalRT");
  assert.match(top.because[0], /10 days/);
  assert.notEqual(nextQuestion(model(p2))?.id, "dentistSeen");
});

test("a dry mouth score that rises is asked about, and asked again for a new rise", () => {
  const e = [{ id: "s1", kind: "sip", sip: 9, ts: NOW - 20 * D }, { id: "s2", kind: "sip", sip: 12, ts: NOW - D }];
  assert.equal(nextQuestion(model({}, e)).id, "sipRise");
  const p = answer({}, e, "sipRise", ["med"]);
  const plan = buildPlan(model(p, e));
  assert.equal(plan[0].id, "riseMed");
  assert.match(plan[0].because[0], /got drier/);
  const e2 = [...e, { id: "s3", kind: "sip", sip: 14, ts: NOW }];
  assert.ok(openQuestions(model(p, e2)).some((q) => q.id === "sipRise"));
});

test("an acidic pH test taken too soon asks for a retest, not an acid plan", () => {
  const e = [{ id: "p1", kind: "ph", ph: 6.0, ts: NOW - D }];
  assert.equal(nextQuestion(model({}, e)).id, "phTiming");
  const p = answer({}, e, "phTiming", "no");
  const ids = buildPlan(model(p, e)).map((i) => i.id);
  assert.ok(ids.includes("phRetest") && !ids.includes("acid"));
});

test("consistently acidic saliva: the acid plan follows the cause", () => {
  const e = [6.0, 5.8, 6.2, 6.0].map((ph, i) => ({ id: `p${i}`, kind: "ph", ph, ts: NOW - (10 - i) * D }));
  assert.equal(nextQuestion(model({}, e)).id, "acidSource");
  const p = answer({}, e, "acidSource", ["drinks", "reflux"]);
  const acid = buildPlan(model(p, e)).find((i) => i.id === "acid");
  assert.match(acid.body, /soft drink/i);
  assert.match(acid.body, /reflux/i);
  assert.match(acid.because[1], /acidic drinks and reflux/);
});

test("chemotherapy dates give the sore-mouth days", () => {
  const p = { situation: ["cancer"], treatments: ["chemo"], chemoDates: [iso(NOW - 3 * D)] };
  const w = buildPlan(model(p)).find((i) => i.id === "chemoWindow");
  assert.match(w.title, /^Get ready for /);
  const p2 = { ...p, chemoDates: [iso(NOW - 9 * D)] };
  assert.equal(buildPlan(model(p2)).find((i) => i.id === "chemoWindow").title, "These are your most likely sore-mouth days");
});

test("medicine advice names the medicines", () => {
  const oxy = MEDICINES.find((x) => x.g === "oxybutynin");
  const e = [{ id: "r1", kind: "risk", ts: NOW - D, answers: { conditions: [], medFor: ["bladder"], medList: [{ id: oxy.id, name: "oxybutynin" }] } },
    { id: "s1", kind: "sip", sip: 10, ts: NOW - D }];
  const it = buildPlan(model({}, e)).find((i) => i.id === "medReview");
  assert.match(it.because[0], /oxybutynin/);
  assert.equal(it.pri, 61);
});

test("pain that isn't controlled asks, then points to the team", () => {
  const e = [{ id: "d1", kind: "daily", ts: NOW - 3600000, pain: 5, eat: "soft", sores: "ulcers", dry: "some", white: "no" }];
  const p = { situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW - 20 * D) };
  assert.equal(nextQuestion(model(p, e)).id, "painRelief");
  const p2 = answer(p, e, "painRelief", "notEnough");
  assert.equal(buildPlan(model(p2, e))[0].id, "pain");
});

test("immunotherapy with dry eyes goes to the team", () => {
  const p = { situation: ["cancer"], treatments: ["immuno"] };
  const e = [{ id: "s1", kind: "sip", sip: 10, ts: NOW - D }];
  assert.equal(nextQuestion(model(p, e)).id, "dryEyes");
  assert.equal(buildPlan(model(answer(p, e, "dryEyes", "yes"), e))[0].id, "sicca");
});

test("'Not now' hides a question for three days", () => {
  const e = [{ id: "s1", kind: "sip", sip: 9, ts: NOW - 20 * D }, { id: "s2", kind: "sip", sip: 12, ts: NOW - D }];
  const q = nextQuestion(model({}, e));
  const p = snoozeQuestion({}, q, NOW);
  assert.notEqual(nextQuestion(model(p, e))?.id, q.id);
  assert.equal(nextQuestion(buildModel({ profile: p, entries: e, now: NOW + 4 * D })).id, q.id);
});

test("every question and plan item cites sources that exist", () => {
  for (const q of FOLLOWUPS) for (const r of q.refs || []) assert.ok(REFS[r], `${q.id} → ${r}`);
  const p = { situation: ["cancer"], treatments: ["rt_hn", "chemo", "immuno"], rtStart: iso(NOW - 20 * D), chemoDates: [iso(NOW - 4 * D)],
    fu: Object.fromEntries(FOLLOWUPS.map((q) => [q.id, { v: q.many ? q.options.map((o) => o.v).filter((v) => v !== "none") : q.options[1].v, ts: NOW }])) };
  const e = [{ id: "s1", kind: "sip", sip: 9, ts: NOW - 20 * D }, { id: "s2", kind: "sip", sip: 13, ts: NOW - D },
    ...[6.0, 5.8, 6.2].map((ph, i) => ({ id: `p${i}`, kind: "ph", ph, ts: NOW - (5 - i) * D })),
    { id: "d1", kind: "daily", ts: NOW - 3600000, pain: 5, eat: "soft", sores: "ulcers", dry: "lot", white: "yes" },
    { id: "j1", kind: "jaw", fingers: 2, ts: NOW - 2 * D }];
  const plan = buildPlan(model(p, e));
  assert.ok(plan.length >= 8);
  for (const it of plan) { assert.ok(it.because.length, it.id); for (const r of it.refs) assert.ok(REFS[r], `${it.id} → ${r}`); }
});

test("after head and neck radiotherapy, tooth decay risk is very high even with good habits", async () => {
  const { scoreDecay, decayContext } = await import("../src/data/decay.js");
  const clean = { teeth: "yes", recent: "no", sugar: "rare", brush: "2", between: "daily", mouth: [], habits: [], dentist: "1", protect: [] };
  assert.equal(scoreDecay(clean, decayContext({ rtHN: true, ageAns: "40" })).band.id, "veryhigh");
  assert.equal(scoreDecay(clean, decayContext({ sjogren: true, ageAns: "40" })).band.id, "veryhigh");
  assert.equal(scoreDecay(clean, decayContext({ ageAns: "40" })).band.id, "low");
});

test("near-certain causes are very high; every scored answer has a source", async () => {
  const { scoreRisk } = await import("../src/data/risk.js");
  assert.equal(scoreRisk({ cancer: ["rt_hn"] }).band.id, "veryhigh");
  assert.equal(scoreRisk({ conditions: ["sjogren"] }).band.id, "veryhigh");
  const r = scoreRisk({ habits: ["vape"], water: "low", sex: "f" });
  assert.equal(r.band.id, "low");
  assert.ok(r.factors.every((f) => !f.limited && f.refs.length));
  // Recorded for context only: their medicines are what's counted.
  assert.equal(scoreRisk({ conditions: ["heart", "stroke", "dementia"] }).score, 0);
});

test("allergies take Tooth Mousse and the gel out of the plan", () => {
  const e = [6.0, 5.8, 6.2].map((ph, i) => ({ id: `p${i}`, kind: "ph", ph, ts: NOW - (5 - i) * D })).concat([{ id: "s1", kind: "sip", sip: 11, ts: NOW - D }]);
  const p = { fu: { allergy: { v: ["milk", "hb"], ts: NOW } } };
  const plan = buildPlan(model(p, e));
  for (const it of plan) {
    assert.ok(!it.products.some((x) => ["gc-tmp", "gc-tm", "gc-dmg"].includes(x)), it.id);
    assert.ok(!/Tooth Mousse™ Plus over|GC Dry Mouth Gel/.test(it.title + it.body.replace(/Tooth Mousse contains milk protein/, "")), it.id);
  }
});

test("treatments from the welcome aren't asked again in the risk check", async () => {
  const { profileAnswers } = await import("../src/data/person.js");
  assert.deepEqual(profileAnswers({ situation: ["cancer"], treatments: ["rt_hn", "bone"] }).cancer, ["rt_hn"]);
  assert.equal(profileAnswers({ situation: ["meds"], treatments: ["rt_hn"] }).cancer, undefined);
});

test("bone-strengthening medicines: ask about the dentist, and plan for it", () => {
  const p = { situation: ["cancer"], treatments: ["bone"] };
  assert.equal(nextQuestion(model(p)).id, "boneDentist");
  assert.equal(buildPlan(model(answer(p, [], "boneDentist", "no")))[0].id, "boneDentist");
});

test("the sugar question from the decay check isn't asked again", () => {
  const e = [6.0, 5.8, 6.2].map((ph, i) => ({ id: `p${i}`, kind: "ph", ph, ts: NOW - (5 - i) * D }))
    .concat([{ id: "d1", kind: "decay", ts: NOW - D, answers: { teeth: "yes", sugar: "sip" }, ctx: {} }]);
  const m = model({}, e);
  const q = FOLLOWUPS.find((x) => x.id === "acidSource");
  assert.ok(!q.options.filter((o) => !o.show || o.show(m)).some((o) => o.v === "graze"));
  assert.match(buildPlan(m).find((i) => i.id === "acid").body, /mealtimes/);
});

test("after radiotherapy: fluoride options, and the plan responds to fluoride-free toothpaste", () => {
  const q = FOLLOWUPS.find((x) => x.id === "rtFluoride");
  assert.deepEqual(q.options.map((o) => o.label), ["Fluoride toothpaste", "High-fluoride toothpaste", "Fluoride-free toothpaste", "Fluoride mouthwash", "GC Tooth Mousse™ Plus", "None of these"]);
  assert.ok(q.noSnooze);
  const p = { situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW - 200 * D) };
  const it = buildPlan(model(answer(p, [], "rtFluoride", ["ff"]))).find((i) => i.id === "rtFluoride");
  assert.equal(it.pri, 83);
  assert.match(it.because[1], /no fluoride/);
  assert.equal(buildPlan(model(answer(p, [], "rtFluoride", ["hf"]))).find((i) => i.id === "rtFluoride").pri, 30);
});

test("products already in use are praised, not recommended as new", () => {
  const p = { situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW - 200 * D) };
  const e = [{ id: "u1", kind: "used", items: ["gc-tmp"], ts: NOW - D }, { id: "s1", kind: "sip", sip: 12, ts: NOW - D }];
  const plan = buildPlan(model(answer(p, e, "rtFluoride", ["plain", "tmp"]), e));
  const rt = plan.find((i) => i.id === "rtFluoride");
  assert.match(rt.body, /already using GC Tooth Mousse™ Plus — keep going/);
  const acid = [6.0, 5.8, 6.2].map((ph, i) => ({ id: `p${i}`, kind: "ph", ph, ts: NOW - (5 - i) * D }))
    .concat([{ id: "u2", kind: "used", items: ["gc-tmp", "gc-tm"], ts: NOW - D }, { id: "d1", kind: "decay", answers: { teeth: "yes" }, ts: NOW - D }]);
  const kept = buildPlan(model({}, acid)).filter((i) => i.kept);
  assert.ok(kept.length >= 1);
  for (const k of kept) { assert.match(k.title, /^Keep going with/); assert.match(k.body, /^You're already doing the right thing/); assert.ok(k.pri <= 45); }
});

test("the baseline: risk, dry mouth score and decay check, then care team and questions, then the plan", async () => {
  const { setupState } = await import("../src/data/setup.js");
  const s0 = setupState({ entries: [], profile: {}, openQs: 0, skip: ["teeth"] });
  assert.equal(s0.at, 0); assert.equal(s0.next.id, "risk"); assert.ok(!s0.built); assert.equal(s0.minsLeft, 7);
  const checks = [{ kind: "risk" }, { kind: "sip", sip: 10 }, { kind: "decay" }];
  assert.equal(setupState({ entries: checks.slice(0, 2), profile: {}, openQs: 0, skip: ["teeth"] }).next.id, "decay");
  const s1 = setupState({ entries: checks, profile: {}, openQs: 2, skip: ["teeth"] });
  assert.equal(s1.next.id, "team");
  const s2 = setupState({ entries: checks, profile: { teamAsked: true }, openQs: 2, skip: ["teeth"] });
  assert.equal(s2.next.id, "questions"); assert.ok(!s2.built);
  const s3 = setupState({ entries: checks, profile: { dentist: { phone: "07 1111 2222" } }, openQs: 0, skip: ["teeth"] });
  assert.ok(s3.all && s3.built && !s3.next);
  // Once built, a new question doesn't take the plan away.
  assert.ok(setupState({ entries: checks, profile: { teamAsked: true, planBuilt: true }, openQs: 1, skip: ["teeth"] }).built);
});

test("without the decay check, a dry mouth still gets the Tooth Mousse routine", () => {
  const plan = buildPlan(model({}, [{ id: "s", kind: "sip", sip: 12, ts: NOW - D }]));
  const ids = plan.map((i) => i.id);
  assert.ok(ids.includes("decay.tmp") && ids.includes("decay.tm"));
});

test("pregnancy with morning sickness: moderate dry mouth risk, and the decay check counts the acid", async () => {
  const { scoreRisk, riskAdvice } = await import("../src/data/risk.js");
  const { scoreDecay, decayContext } = await import("../src/data/decay.js");
  const a = { age: "u40", sex: "f", conditions: ["pregnantSick"] };
  const r = scoreRisk(a);
  assert.equal(r.band.id, "moderate");
  assert.match(riskAdvice(r, a).find((x) => x.id === "acid").title, /morning sickness/);
  const clean = { teeth: "yes", recent: "no", sugar: "rare", brush: "2", between: "daily", mouth: [], habits: [], dentist: "1", protect: [] };
  const d = scoreDecay(clean, decayContext({ acid: "Morning sickness or vomiting", ageAns: "u40" }));
  assert.ok(d.factors.some((f) => f.v === "acid"));
});

test("people see low, moderate or high — never 'Very high' or a number out of 15", async () => {
  const { RISK_BANDS } = await import("../src/data/risk.js");
  const { DECAY_BANDS } = await import("../src/data/decay.js");
  const { sipLevel } = await import("../src/data/clinical.js");
  for (const b of [...RISK_BANDS, ...DECAY_BANDS]) assert.ok(["Low", "Moderate", "High"].includes(b.label), b.label);
  assert.equal(sipLevel(7).label, "Minimal"); assert.equal(sipLevel(8).label, "Mild to moderate");
  assert.equal(sipLevel(10).label, "Mild to moderate"); assert.equal(sipLevel(11).label, "Moderate to severe"); assert.equal(sipLevel(13).id, "high");
  assert.equal(sipLevel(14).full, "Severe xerostomia symptoms"); assert.equal(sipLevel(15).id, "high");
  const m = buildModel({ profile: {}, entries: [
    { id: "s1", kind: "sip", ts: Date.now() - 20 * 864e5, sip: 9 }, { id: "s2", kind: "sip", ts: Date.now(), sip: 13 },
    { id: "r1", kind: "risk", ts: Date.now(), answers: { cancer: ["rt_hn"] } }] });
  const text = JSON.stringify([summary(m), buildPlan(m)]);
  assert.doesNotMatch(text, /Very high|of 15|score is \d|score \d/);
});

test("people at risk are asked to get a saliva flow and buffering test from their dentist", () => {
  const atRisk = buildPlan(buildModel({ profile: {}, entries: [{ id: "s1", kind: "sip", ts: Date.now(), sip: 9 }] }));
  const it = atRisk.find((i) => i.id === "salivaTest");
  assert.ok(it); assert.match(it.body, /saliva you make when you chew/); assert.match(it.body, /fights acid/);
  assert.ok(it.act.addQ);
  const low = buildPlan(buildModel({ profile: {}, entries: [{ id: "s1", kind: "sip", ts: Date.now(), sip: 6 }] }));
  assert.ok(!low.some((i) => i.id === "salivaTest"));
});

test("everyone with teeth gets fluoride and Tooth Mousse, unless allergic to milk protein", async () => {
  const { scoreDecay, decayPlan } = await import("../src/data/decay.js");
  const low = scoreDecay({});
  assert.equal(low.band.id, "low");
  const steps = decayPlan(low, {});
  assert.ok(steps.some((s) => s.id === "paste") && steps.some((s) => s.id === "tmp"));
  const e = [{ id: "d1", kind: "decay", ts: Date.now(), answers: {} }];
  const plan = buildPlan(buildModel({ profile: {}, entries: e }));
  assert.ok(plan.some((i) => i.products.includes("gc-tmp")));
  const allergic = buildPlan(buildModel({ profile: { fu: { allergy: { v: ["milk"] } } }, entries: e }));
  assert.ok(!allergic.some((i) => i.products.includes("gc-tmp") || i.products.includes("gc-tm")));
});

test("the gel tip about mixing with Tooth Mousse is left out for milk-protein allergy", () => {
  const e = [{ id: "s1", kind: "sip", ts: Date.now(), sip: 10 }];
  const gel = (p) => buildPlan(buildModel({ profile: p, entries: e })).find((i) => i.id === "gel");
  assert.match(gel({}).body, /mix it with GC Tooth Mousse™/);
  assert.doesNotMatch(gel({ fu: { allergy: { v: ["milk"] } } }).body, /Tooth Mousse/);
});

test("milk-protein allergy: no cheese, milk or yoghurt suggestions anywhere", async () => {
  const { milkFree } = await import("../src/data/allergy.js");
  const { CARE_TOPICS } = await import("../src/data/care.js");
  const { DAILY_TIPS } = await import("../src/data/daily.js");
  const texts = [...CARE_TOPICS.flatMap((t) => t.steps), ...Object.values(DAILY_TIPS).map((x) => x.t)].map(milkFree);
  for (const t of texts) assert.doesNotMatch(t, /cheese|\bmilk\b(?! protein)|yoghurt/i, t);
  const e = [{ id: "d1", kind: "decay", ts: Date.now(), answers: { sugar: "3" } }];
  const plan = buildPlan(buildModel({ profile: { fu: { allergy: { v: ["milk"] } } }, entries: e }));
  for (const i of plan) assert.doesNotMatch(i.body, /cheese|yoghurt/i, i.id);
});

test("thrush advice warns about warfarin; sugar advice says amount and frequency", async () => {
  const { CARE_TOPICS } = await import("../src/data/care.js");
  const thrush = CARE_TOPICS.find((t) => t.id === "thrush");
  assert.ok(thrush.steps.some((s) => /warfarin/.test(s)));
  const diet = CARE_TOPICS.find((t) => t.id === "diet");
  assert.doesNotMatch(diet.short + diet.steps.join(" "), /more than how much/);
});

test("every source cited anywhere exists, and every listed source is cited", async () => {
  const fs = await import("node:fs");
  const files = [...fs.readdirSync("src/data").map((f) => `src/data/${f}`), ...fs.readdirSync("src/screens").map((f) => `src/screens/${f}`)]
    .filter((f) => f !== "src/data/references.js");
  const src = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const cited = new Set([...src.matchAll(/refs(?:\.push\(|:\s*\[|=\{\[)([^\])]*)/g)].flatMap((m) => [...m[1].matchAll(/(?<!includes\()"([A-Za-z0-9]+)"/g)].map((x) => x[1])));
  for (const r of cited) assert.ok(REFS[r], `missing source: ${r}`);
  const unused = Object.keys(REFS).filter((k) => !new RegExp(`["']${k}["']`).test(src));
  assert.deepEqual(unused, []);
});

test("the plan doesn't repeat itself: one dentist visit item, no 'check your dryness' once it's done", () => {
  const e = [{ id: "r1", kind: "risk", ts: Date.now(), answers: { conditions: ["sjogren"] } },
    { id: "d1", kind: "decay", ts: Date.now(), answers: {}, ctx: { sjogren: true } },
    { id: "s1", kind: "sip", ts: Date.now(), sip: 12 }];
  const ids = buildPlan(buildModel({ profile: {}, entries: e })).map((i) => i.id);
  assert.ok(ids.includes("decay.visit")); assert.ok(!ids.includes("risk.dentist")); assert.ok(!ids.includes("risk.track"));
});

test("HRT: its own medicine group, light weighting, and menopause advice", async () => {
  const { scoreRisk, riskAdvice, MED_PURPOSES } = await import("../src/data/risk.js");
  assert.ok(MED_PURPOSES.some((p) => p.v === "menopause" && p.g === "hrt"));
  const r = scoreRisk({ medTypes: ["hrt"] });
  const f = r.factors.find((x) => x.v === "hrt");
  assert.ok(f && f.pts <= 2, "HRT is counted, lightly");
  const adv = riskAdvice(r, { medTypes: ["hrt"] });
  const m = adv.find((a) => a.id === "menopause");
  assert.ok(m); assert.match(m.body, /Don't stop it yourself/);
});

test("HRT brands are found in the medicine look-up and fall in the HRT group", async () => {
  const { searchMedicines } = await import("../src/data/medicines.js");
  for (const q of ["Estalis", "Estrogel", "Livial", "Femoston"]) assert.equal(searchMedicines(q, 1)[0]?.m.c, "medTypes.hrt", q);
  assert.equal(searchMedicines("Vagifem", 1)[0]?.m.c, null);
});

test("plan order: Tooth Mousse Plus morning and night first, then gel and Tooth Mousse through the day", () => {
  const e = [{ id: "r1", kind: "risk", ts: NOW - 3 * D, answers: { conditions: ["sjogren"] } },
    { id: "d1", kind: "decay", ts: NOW - 3 * D, answers: { teeth: "yes", recent: "one" }, ctx: { sjogren: true } },
    { id: "s2", kind: "sip", ts: NOW - 2 * D, sip: 12 }, { id: "p1", kind: "ph", ts: NOW - 2 * D, ph: 6.2 }];
  const ids = buildPlan(model({ fu: { allergy: { v: ["none"] }, dentures: { v: "no" } } }, e)).map((i) => i.id);
  assert.deepEqual(ids.slice(0, 3), ["decay.tmp", "gel", "decay.tm"]);
});

test("Sjögren's keeps its capital in the summary", () => {
  const e = [{ id: "r1", kind: "risk", ts: NOW, answers: { conditions: ["sjogren"] } }];
  assert.match(summary(model({}, e)).join(" "), /mostly from Sjögren's syndrome/);
});

test("the milk-protein allergy question is asked of everyone with natural teeth, even at low risk", () => {
  const low = model({}, [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "yes" } }, { id: "s1", kind: "sip", ts: NOW, sip: 6 }]);
  assert.ok(openQuestions(low).some((q) => q.id === "allergy"));
  const none = model({}, [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "none" } }, { id: "s1", kind: "sip", ts: NOW, sip: 6 }]);
  assert.ok(!openQuestions(none).some((q) => q.id === "allergy"));
});

test("OraNurse is in the plan for everyone having cancer treatment or with a dry mouth", () => {
  const cancer = model({ situation: ["cancer"], treatments: ["chemo"] }, [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "yes" } }]);
  assert.ok(buildPlan(cancer).some((i) => i.id === "oranurse" && i.products.includes("oranurse")));
  const dry = model({}, [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "yes" } }, { id: "s1", kind: "sip", ts: NOW, sip: 9 }]);
  const plan = buildPlan(dry);
  assert.ok(plan.some((i) => i.id === "oranurse"));
  assert.equal(plan.filter((i) => i.products.includes("oranurse")).length, 1, "only one OraNurse item");
  const fine = model({}, [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "yes" } }, { id: "s1", kind: "sip", ts: NOW, sip: 6 }]);
  assert.ok(!buildPlan(fine).some((i) => i.id === "oranurse"));
});

test("cancer or a dry mouth: Tooth Mousse Plus leads, then gel, Tooth Mousse through the day and OraNurse", () => {
  const p = { situation: ["cancer"], treatments: ["chemo"], fu: { allergy: { v: ["none"] }, dentures: { v: "no" } } };
  const e = [{ id: "d1", kind: "decay", ts: NOW, answers: { teeth: "yes" } }, { id: "s1", kind: "sip", ts: NOW, sip: 10 }];
  const ids = buildPlan(model(p, e)).map((i) => i.id).filter((id) => ["decay.tmp", "gel", "decay.tm", "oranurse"].includes(id));
  assert.deepEqual(ids, ["decay.tmp", "gel", "decay.tm", "oranurse"]);
});

test("care team: extra people can be added, named, called and removed", async () => {
  const { addExtraContact, removeExtraContact, setContact, careContacts, contactRoles } = await import("../src/data/careTeam.js");
  let p = addExtraContact({}, "x1");
  assert.equal(contactRoles(p).at(-1).role, "Other contact");
  p = setContact(p, "x1", { role: "Dietitian", name: "Sam", phone: "07 5555 0000" });
  const c = careContacts(p).find((x) => x.id === "x1");
  assert.equal(c.role, "Dietitian"); assert.equal(c.phone, "07 5555 0000");
  assert.equal(careContacts(removeExtraContact(p, "x1")).length, 0);
});

test("Call my team lists only people with a number: blank, name-only and empty added contacts are left out", async () => {
  const { addExtraContact, setContact, careContacts } = await import("../src/data/careTeam.js");
  let p = { situation: ["cancer"], team: { name: "Cancer Care", phone24: "07 5202 0000" }, contacts: { gp: { name: "Dr Wu", phone: "" }, nurse: { name: "", phone: "   " } } };
  p = addExtraContact(p, "x1");                                  // added, left empty
  p = setContact(addExtraContact(p, "x2"), "x2", { role: "Dietitian" }); // a role but no number
  assert.deepEqual(careContacts(p).map((c) => c.id), ["line24"]);
});
