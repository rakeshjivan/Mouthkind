// The risk score and the check schedule. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { RISK_QUESTIONS, RISK_BANDS, riskAdvice, scoreRisk } from "../src/data/risk.js";
import { FREQUENCIES, nextCheck, reminderIcs } from "../src/data/schedule.js";
import { REFS } from "../src/data/references.js";
import { PRODUCTS } from "../src/data/products.js";

const DAY = 86400000;

test("no risk factors → 0, low", () => {
  const r = scoreRisk({ age: "u40", sex: "m", meds: "0", medTypes: [], conditions: [], cancer: [], breathing: [], habits: [], water: "high" });
  assert.equal(r.score, 0); assert.equal(r.band.id, "low"); assert.equal(r.factors.length, 0);
});
test("head and neck radiotherapy or Sjögren's alone is never below high", () => {
  for (const a of [{ cancer: ["rt_hn"] }, { conditions: ["sjogren"] }]) {
    const r = scoreRisk(a);
    assert.ok(r.major); assert.ok(r.band.lo >= 25, JSON.stringify(a));
  }
});
test("polypharmacy scores in steps, more medicines never scores less", () => {
  const pts = ["0", "1", "3", "5", "10"].map((m) => scoreRisk({ meds: m }).score);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i] > pts[i - 1], pts.join(","));
  assert.ok(scoreRisk({ meds: "5" }).score >= 14);
});
test("adding any factor never lowers the score", () => {
  const base = { age: "65", meds: "3" };
  const b = scoreRisk(base).score;
  for (const q of RISK_QUESTIONS.filter((x) => x.type === "many"))
    for (const o of q.options) assert.ok(scoreRisk({ ...base, [q.id]: [o.v] }).score >= b, `${q.id}.${o.v}`);
});
test("a typical older patient on several drying medicines is high or very high", () => {
  const r = scoreRisk({ age: "65", meds: "5", medTypes: ["bladder", "bp"], conditions: ["diabetes"] });
  assert.ok(r.band.lo >= 25, `${r.score} ${r.band.id}`);
  assert.equal(r.factors[0].label, "5 to 9 regular medicines");
});
test("score is capped at 100", () => {
  const all = {};
  for (const q of RISK_QUESTIONS.filter((q) => q.options)) all[q.id] = q.type === "many" ? [...(all[q.id] || []), ...q.options.map((o) => o.v)] : q.options.at(-1).v;
  assert.equal(scoreRisk(all).score, 100);
});
test("bands are in order and cover 0", () => {
  assert.equal(RISK_BANDS[0].lo, 0);
  for (let i = 1; i < RISK_BANDS.length; i++) assert.ok(RISK_BANDS[i].lo > RISK_BANDS[i - 1].lo);
});
test("every scored option explains itself; cited sources exist; uncited ones are flagged limited", () => {
  for (const q of RISK_QUESTIONS.filter((q) => q.options)) for (const o of q.options) {
    if (!o.pts) continue;
    assert.ok(o.why, `${q.id}.${o.v} has no explanation`);
    for (const r of o.refs || []) assert.ok(REFS[r], `${q.id}.${o.v} → ${r}`);
    if (!(o.refs || []).length) assert.ok(o.limited, `${q.id}.${o.v} has no source and isn't flagged limited`);
  }
});
test("advice follows the answers", () => {
  const a = { meds: "5", medTypes: ["bladder"], breathing: ["cpap"], habits: ["smoke"] };
  const ids = riskAdvice(scoreRisk(a), a).map((x) => x.id);
  for (const id of ["meds", "cpap", "smoke", "teeth"]) assert.ok(ids.includes(id), id);
  assert.equal(riskAdvice(scoreRisk({}), {}).length, 0);
  for (const x of riskAdvice(scoreRisk(a), a)) for (const p of x.products || []) assert.ok(PRODUCTS.some((y) => y.id === p), p);
});

test("frequencies: daily, weekly (recommended), fortnightly", () => {
  assert.deepEqual(FREQUENCIES.map((f) => f.days), [1, 7, 14]);
  assert.equal(FREQUENCIES.find((f) => f.recommended).days, 7);
});
test("next check is due after the chosen gap", () => {
  const now = Date.parse("2026-11-18T10:00:00");
  assert.equal(nextCheck(null, 7, now).due, true);
  assert.equal(nextCheck(now - 3 * DAY, 7, now).due, false);
  assert.equal(nextCheck(now - 3 * DAY, 7, now).days, 4);
  assert.equal(nextCheck(now - 7 * DAY, 7, now).due, true);
  assert.equal(nextCheck(now - DAY, 1, now).due, true);
});
test("calendar reminder repeats at the chosen frequency", () => {
  assert.match(reminderIcs(1), /RRULE:FREQ=DAILY/);
  assert.match(reminderIcs(7), /RRULE:FREQ=WEEKLY;INTERVAL=1/);
  assert.match(reminderIcs(14), /RRULE:FREQ=WEEKLY;INTERVAL=2/);
  assert.match(reminderIcs(14), /BEGIN:VALARM/);
});
