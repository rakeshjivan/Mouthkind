// Tooth decay risk. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { DECAY_QUESTIONS, decayContext, decayPlan, scoreDecay, visibleQuestions } from "../src/data/decay.js";
import { REFS } from "../src/data/references.js";
import { PRODUCTS } from "../src/data/products.js";

const clean = { teeth: "yes", recent: "no", sugar: "rare", brush: "2", between: "daily", mouth: [], age: "u40", dry: "no", habits: [], dentist: "1", protect: [] };
const ids = (plan) => plan.map((s) => s.id);

test("no risk factors → 0, low, standard fluoride toothpaste", () => {
  const r = scoreDecay(clean);
  assert.equal(r.score, 0); assert.equal(r.band.id, "low");
  assert.deepEqual(decayPlan(r, clean).find((s) => s.id === "paste").products, ["oranurse"]);
  assert.ok(!ids(decayPlan(r, clean)).includes("hf"));
});

test("no natural teeth ends the check and skips the plan's products", () => {
  assert.equal(visibleQuestions({ teeth: "none" }).length, 1);
  const r = scoreDecay({ teeth: "none" });
  assert.ok(r.noTeeth); assert.deepEqual(ids(decayPlan(r)), ["dentures"]);
});

test("recent decay alone puts a person at high risk (CAMBRA)", () => {
  const r = scoreDecay({ ...clean, recent: "one" });
  assert.equal(r.score, 12); assert.equal(r.band.id, "high");
  const plan = ids(decayPlan(r, clean));
  assert.ok(plan.includes("hf") && plan.includes("tmp") && plan.includes("tm"));
});

test("protective factors lower the score but never below zero or the recent-decay floor", () => {
  const r = scoreDecay({ ...clean, sugar: "1", protect: ["hf", "tm", "varnish"] });
  assert.equal(r.score, 0); assert.equal(r.protective.length, 3);
  assert.equal(scoreDecay({ ...clean, recent: "one", protect: ["hf", "tm", "varnish", "rinse"] }).band.id, "high");
});

test("high risk plus a very dry mouth is very high (CAMBRA extreme)", () => {
  assert.equal(scoreDecay({ ...clean, recent: "one", dry: "often" }).band.id, "veryhigh");
  assert.equal(scoreDecay({ ...clean, recent: "one", dry: "some" }).band.id, "high");
});

test("dry mouth and pH come from the other checks instead of being asked", () => {
  const ctx = decayContext({ dryRisk: "high", sip: 12, ph: "flag", ageAns: "80" });
  const qs = visibleQuestions(clean, ctx).map((q) => q.id);
  assert.ok(!qs.includes("dry") && !qs.includes("age"));
  const r = scoreDecay({ ...clean, recent: "one" }, ctx);
  assert.equal(r.band.id, "veryhigh");
  assert.ok(r.factors.some((f) => f.from === "sip" && f.pts === 8));
  assert.ok(r.factors.some((f) => f.from === "ph" && f.pts === 3));
  assert.ok(r.factors.some((f) => f.q === "age" && f.pts === 4));
  assert.ok(ids(decayPlan(r, clean)).includes("dry"));
});

test("moderate risk and braces both bring in Tooth Mousse Plus", () => {
  const m = scoreDecay({ ...clean, sugar: "3" });
  assert.equal(m.band.id, "moderate"); assert.ok(ids(decayPlan(m, clean)).includes("tmp"));
  const b = { ...clean, mouth: ["braces"] };
  assert.ok(ids(decayPlan(scoreDecay(b), b)).includes("tmp"));
});

test("every reference and product named exists", () => {
  for (const q of DECAY_QUESTIONS) for (const o of q.options) for (const r of o.refs || []) assert.ok(REFS[r], `${q.id}.${o.v} → ${r}`);
  const all = { ...clean, recent: "more", sugar: "sip", dry: "often", mouth: ["braces"] };
  for (const s of decayPlan(scoreDecay(all), all)) {
    for (const r of s.refs || []) assert.ok(REFS[r], `${s.id} → ${r}`);
    for (const p of s.products || []) assert.ok(PRODUCTS.find((x) => x.id === p), `${s.id} → ${p}`);
  }
});

test("v2: gums questions count, fillings weigh more, pH weighs less", async () => {
  const { scoreDecay, decayContext } = await import("../src/data/decay.js");
  const base = { teeth: "yes", recent: "no", sugar: "rare", brush: "2", between: "daily", mouth: [], gums: [], age: "40", dry: "no", habits: [], dentist: "1", protect: [] };
  const gums = scoreDecay({ ...base, gums: ["bleed", "perio"] });
  assert.equal(gums.factors.filter((f) => f.q === "gums").reduce((s, f) => s + f.pts, 0), 5);
  assert.equal(scoreDecay({ ...base, mouth: ["fillings"] }).factors.find((f) => f.v === "fillings").pts, 5);
  assert.equal(scoreDecay(base, decayContext({ ph: "flag" })).factors.find((f) => f.v === "ph").pts, 3);
  assert.equal(scoreDecay(base, decayContext({ ph: "watch" })).factors.find((f) => f.v === "ph").pts, 1);
});

test("protective products never lower the result below High when there's recent decay", async () => {
  const { scoreDecay } = await import("../src/data/decay.js");
  const r = scoreDecay({ teeth: "yes", recent: "one", brush: "2", protect: ["hf", "tm", "varnish", "rinse", "gum"] });
  assert.ok(["high", "veryhigh"].includes(r.band.id), r.band.id);
});
