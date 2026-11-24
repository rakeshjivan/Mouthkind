import { test } from "node:test";
import assert from "node:assert/strict";
import { FOLLOWUPS, answerQuestion, buildModel, buildPlan, nextQuestion } from "../src/data/engine.js";
import { decayPlan, scoreDecay } from "../src/data/decay.js";
import { CHECKUP_POINTS } from "../src/data/dental.js";

const NOW = new Date("2026-11-19T10:00:00").getTime();
const D = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const model = (profile = {}, entries = []) => buildModel({ profile, entries, now: NOW });
const answer = (p, id, v) => answerQuestion(p, FOLLOWUPS.find((q) => q.id === id), v, model(p));
const words = (it) => [it.title, it.body, ...(it.list || []), it.note].join(" ");

test("every dental item is a full check-up, not just extractions", () => {
  const p = answer({ situation: ["cancer"], treatments: ["rt_hn"], rtStart: iso(NOW + 10 * D) }, "dentistSeen", "no");
  const it = buildPlan(model(p)).find((i) => i.id === "dentalRT");
  assert.deepEqual(it.list, CHECKUP_POINTS);
  assert.match(words(it), /decay/); assert.match(words(it), /gum disease/); assert.match(words(it), /abscess/);
  assert.doesNotMatch(it.title, /remov|extract|come out/i);
  assert.match(it.note, /2 weeks before/);
});

test("chemotherapy or a transplant not yet started gets a check-up item near the top", () => {
  for (const tx of ["chemo", "transplant"]) {
    const p = { situation: ["cancer"], treatments: [tx], stage: "before" };
    assert.equal(nextQuestion(model(p)).id, "dentistSeen");
    const plan = buildPlan(model(answer(p, "dentistSeen", "no")));
    assert.equal(plan[0].id, "dentalPre");
    assert.match(plan[0].note, /If there isn.t time/);
  }
});

test("during chemotherapy the check-up waits for the cancer team's OK", () => {
  const p = { situation: ["cancer"], treatments: ["chemo"], stage: "during", chemoDates: [iso(NOW - 5 * D)] };
  const it = buildPlan(model(answer(p, "dentistSeen", "no"))).find((i) => i.id === "dentalPre");
  assert.match(it.note, /blood counts/);
});

test("'I don't have a dentist' points to a referral and public dental services", () => {
  const p = answer({ situation: ["cancer"], treatments: ["chemo"], stage: "before" }, "dentistSeen", "none");
  const it = buildPlan(model(p)).find((i) => i.id === "dentalPre");
  assert.match(it.note, /referral/); assert.match(it.note, /public dental service/);
});

test("bone medicines get the full check-up with the dental alert card", () => {
  const it = buildPlan(model({ situation: ["cancer"], treatments: ["bone"], stage: "during" })).find((i) => i.id === "boneDentist");
  assert.deepEqual(it.list, CHECKUP_POINTS); assert.equal(it.act.open, "rtcard");
});

test("decay check: overdue check-up or a higher result asks for a full check-up", () => {
  const over = decayPlan(scoreDecay({ teeth: "yes", dentist: "more" }), { teeth: "yes", dentist: "more" }).find((s) => s.id === "visit");
  assert.equal(over.title, "Book a full check-up with your dentist"); assert.deepEqual(over.list, CHECKUP_POINTS);
  const dry = decayPlan(scoreDecay({ teeth: "yes", dentist: "1" }), { teeth: "yes", dentist: "1" }, { dry: true }).find((s) => s.id === "visit");
  assert.match(dry.note, /dry mouth makes decay more likely/i);
  const none = decayPlan(scoreDecay({ teeth: "none" }), { teeth: "none" }).find((s) => s.id === "visit");
  assert.match(none.list.join(" "), /dentures fit/);
});
