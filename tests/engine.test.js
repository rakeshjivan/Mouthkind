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
  assert.match(plan[0].because[0], /9 to 12/);
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
