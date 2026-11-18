// Treatment journey, daily check and what-I-used insights. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTreatment, chemoDay, journey, rtStage } from "../src/data/journey.js";
import { dailyQuestions, dailyTriage, mucositisGrade } from "../src/data/daily.js";
import { usedInsights } from "../src/data/used.js";
import { REFS } from "../src/data/references.js";

const NOW = new Date("2026-11-19T10:00:00").getTime();
const D = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

test("radiotherapy stage follows the dates", () => {
  const p = (start, weeks = 7) => ({ rtStart: iso(start), rtWeeks: weeks });
  assert.equal(rtStage(p(NOW + 5 * D), NOW).stage, "before");
  assert.deepEqual(rtStage(p(NOW - 15 * D), NOW), { stage: "during", week: 3, of: 7 });
  assert.equal(rtStage(p(NOW - 52 * D), NOW).stage, "justAfter");
  assert.equal(rtStage(p(NOW - 120 * D), NOW).stage, "after");
  assert.equal(rtStage(p(NOW - 500 * D), NOW).stage, "long");
  assert.equal(rtStage({ stage: "before" }, NOW).stage, "before");
});

test("chemotherapy day counts from the latest dose", () => {
  assert.equal(chemoDay({ chemoDates: [iso(NOW - 30 * D), iso(NOW - 9 * D), iso(NOW + 3 * D)] }, NOW), 9);
  assert.equal(chemoDay({}, NOW), null);
  const j = journey({ situation: ["cancer"], treatments: ["chemo"], chemoDates: [iso(NOW - 9 * D)] }, NOW);
  assert.match(j.cards[0].items[0].t, /worst days/);
  assert.match(j.cards[0].always[0].t, /38°C/);
});

test("daily check matters during treatment and soon after", () => {
  assert.ok(activeTreatment({ situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW - 15 * D) }, NOW));
  assert.ok(!activeTreatment({ situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW - 400 * D) }, NOW));
  assert.ok(!activeTreatment({ situation: ["meds"] }, NOW));
});

test("fever is only asked during chemotherapy or transplant", () => {
  assert.ok(dailyQuestions({ treatments: ["chemo"] }).some((q) => q.id === "fever"));
  assert.ok(!dailyQuestions({ treatments: ["rt_hn"] }).some((q) => q.id === "fever"));
});

test("mucositis grade follows the WHO scale", () => {
  assert.equal(mucositisGrade({ pain: 0, eat: "normal", sores: "none" }), 0);
  assert.equal(mucositisGrade({ pain: 2, eat: "normal", sores: "sore" }), 1);
  assert.equal(mucositisGrade({ pain: 5, eat: "soft", sores: "ulcers" }), 2);
  assert.equal(mucositisGrade({ pain: 5, eat: "liquid", sores: "ulcers" }), 3);
  assert.equal(mucositisGrade({ pain: 8, eat: "none", sores: "ulcers" }), 4);
});

test("red flags send the person to their team now", () => {
  for (const a of [{ fever: "yes" }, { eat: "none" }, { sores: "bleed" }, { pain: 8 }]) assert.equal(dailyTriage({ pain: 0, eat: "normal", sores: "none", dry: "none", white: "no", ...a }).level, "now", JSON.stringify(a));
  assert.equal(dailyTriage({ pain: 2, eat: "normal", sores: "none", dry: "none", white: "yes" }).level, "today");
  assert.equal(dailyTriage({ pain: 0, eat: "normal", sores: "none", dry: "none", white: "no" }).level, "ok");
});

test("what-I-used insight compares scores before and after starting", () => {
  const e = [
    { kind: "sip", sip: 13, ts: NOW - 30 * D }, { kind: "sip", sip: 13, ts: NOW - 16 * D },
    ...[14, 13, 12, 10, 9].map((d) => ({ kind: "used", items: ["gc-dmg"], ts: NOW - d * D })),
    { kind: "sip", sip: 10, ts: NOW - 7 * D }, { kind: "sip", sip: 9, ts: NOW - D },
  ];
  const [i] = usedInsights(e);
  assert.equal(i.v, "gc-dmg"); assert.equal(i.before, 13); assert.equal(i.after, 9.5);
  assert.deepEqual(usedInsights(e.slice(0, 3)), []);
});

test("every journey reference exists", () => {
  const p = { situation: ["cancer"], treatments: ["rt_hn", "chemo", "immuno", "rai"] };
  for (const off of [-10, 3, 20, 55, 120, 600]) for (const c of journey({ ...p, rtStart: iso(NOW - off * D), chemoDates: [iso(NOW - (off % 20) * D)] }, NOW).cards)
    for (const it of [...c.items, ...(c.always || [])]) for (const r of it.refs || []) assert.ok(REFS[r], `${c.id} → ${r}`);
});

test("severe pain is an emergency only when pain relief isn't keeping it bearable", () => {
  const base = { pain: 8, eat: "soft", sores: "ulcers", dry: "some", white: "no", urgent: "none" };
  assert.equal(dailyTriage({ ...base, control: "no" }).level, "now");
  assert.equal(dailyTriage({ ...base, control: "yes" }).level, "today");
  assert.ok(dailyQuestions({}, { pain: 8 }).some((q) => q.id === "control"));
  assert.ok(!dailyQuestions({}, { pain: 5 }).some((q) => q.id === "control"));
});

test("swelling or trouble breathing is an emergency; exposed bone goes to the team", () => {
  const ok = { pain: 0, eat: "normal", sores: "none", dry: "none", white: "no" };
  assert.equal(dailyTriage({ ...ok, urgent: "swell" }).level, "now");
  assert.equal(dailyTriage({ ...ok, urgent: "breath" }).level, "now");
  assert.equal(dailyTriage({ ...ok, bone: "yes" }).level, "today");
  assert.ok(dailyQuestions({ treatments: ["bone"] }).some((q) => q.id === "bone"));
  assert.ok(!dailyQuestions({ treatments: ["chemo"] }).some((q) => q.id === "bone"));
  const j = journey({ situation: ["cancer"], treatments: ["bone"] }, NOW);
  assert.equal(j.cards[0].id, "bone");
});
