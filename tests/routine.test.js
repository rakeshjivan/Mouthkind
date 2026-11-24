import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutine, routineView, slotNow, tickEntry, ticksToday } from "../src/data/routine.js";
import { logDue } from "../src/data/schedule.js";
import { worryList } from "../src/data/worry.js";

// Plan items carry the products they recommend, as buildPlan gives them.
const PROD = { "decay.tmp": ["gc-tmp", "gc-tm"], "decay.tm": ["gc-tm"], gel: ["gc-dmg"], oranurse: ["oranurse"], "decay.hf": ["neutrafluor"], rtFluoride: ["neutrafluor", "gc-tmp"] };
const plan = (...ids) => ids.map((id) => ({ id, pri: 50, products: PROD[id] || [] }));

test("routine follows the plan: Tooth Mousse Plus morning and night, gel and Tooth Mousse through the day", () => {
  const r = buildRoutine(plan("decay.tmp", "decay.tm", "gel", "oranurse"));
  const by = (s) => r.filter((x) => x.slot === s).map((x) => x.id);
  assert.deepEqual(by("morning"), ["morning.brush", "morning.tmp"]);
  assert.deepEqual(by("day"), ["day.gel", "day.tm", "day.water"]);
  assert.deepEqual(by("night"), ["night.brush", "night.tmp", "night.gel"]);
  assert.match(r[0].text, /OraNurse/);
  assert.match(buildRoutine(plan("decay.hf", "oranurse"))[0].text, /5,000 ppm/);
  assert.ok(buildRoutine(plan("gel"), { noTeeth: true }).every((x) => !/Tooth Mousse/.test(x.text)));
});

test("ticks are one 'used' entry a day, so products count as used", () => {
  const r = buildRoutine(plan("decay.tmp", "gel"));
  const now = new Date("2026-11-24T08:00:00").getTime();
  const e1 = tickEntry([], r, "morning.tmp", now);
  assert.equal(e1.kind, "used"); assert.deepEqual(e1.items, ["gc-tmp"]);
  const e2 = tickEntry([e1], r, "morning.tmp", now);
  assert.deepEqual(e2.done, []); assert.deepEqual(ticksToday([e1], now), ["morning.tmp"]);
});

test("the current part of the day is open; morning before 11, through the day to 5 pm, then tonight", () => {
  assert.equal(slotNow(new Date("2026-11-24T08:00:00")), "morning");
  assert.equal(slotNow(new Date("2026-11-24T13:00:00")), "day");
  assert.equal(slotNow(new Date("2026-11-24T19:30:00")), "night");
  const v = routineView(buildRoutine(plan("decay.tmp")), ["morning.brush", "morning.tmp"], new Date("2026-11-24T19:30:00"));
  assert.ok(v.find((s) => s.id === "morning").all && v.find((s) => s.id === "night").current);
});

test("log rhythm: daily in treatment, weekly otherwise", () => {
  const now = new Date("2026-11-24T08:00:00").getTime();
  const e = [{ kind: "daily", ts: now - 3 * 864e5 }];
  assert.ok(logDue(e, true, now)); assert.ok(!logDue(e, false, now));
  assert.ok(logDue([{ kind: "daily", ts: now - 8 * 864e5 }], false, now)); assert.ok(logDue([], false, now));
});

test("when to worry: fever only for chemotherapy, bone only for radiotherapy or bone medicines", () => {
  const t = (o) => worryList(o).flatMap((g) => g.items).join(" ");
  assert.match(t({ cancer: true, chemo: true }), /38°C/); assert.doesNotMatch(t({}), /38°C/);
  assert.match(t({ cancer: true, rtOrBone: true }), /Bone showing/); assert.match(t({}), /3 weeks/);
});

test("a part of the day with nothing in it hands over to the next one", () => {
  const r = buildRoutine([]); // brush morning and night only
  const v = routineView(r, [], new Date("2026-11-24T13:00:00"));
  assert.deepEqual(v.map((s) => s.id), ["morning", "night"]);
  const night = v.find((s) => s.id === "night");
  assert.ok(night.current && night.next);
  assert.ok(v.find((s) => s.id === "morning").past);
});

test("kidney disease: no 'drink more water', and the routine keeps to the fluid limit", async () => {
  const { buildPlan, buildModel } = await import("../src/data/engine.js");
  const r = buildRoutine([{ id: "kidneyFluid", pri: 62 }, { id: "water", pri: 40 }, { id: "gel", pri: 50, products: ["gc-dmg"] }]);
  const w = r.find((x) => x.id === "day.water");
  assert.match(w.text, /fluid limit/);
  assert.equal(w.why, "kidneyFluid");
  const m = buildModel({ profile: {}, entries: [{ id: "r1", kind: "risk", ts: Date.now(), answers: { conditions: ["dialysis"], water: "low" } }] });
  const ids = buildPlan(m).map((i) => i.id);
  assert.ok(ids.includes("kidneyFluid") && !ids.includes("water"), ids.join());
});

test("smoking is asked once: the decay check takes it from the risk check", async () => {
  const { visibleQuestions, scoreDecay, decayContext } = await import("../src/data/decay.js");
  const ctx = decayContext({ smoke: true, dryRisk: "low" });
  const habits = visibleQuestions({ teeth: "yes" }, ctx).find((q) => q.id === "habits");
  assert.ok(!habits.options.some((o) => o.v === "smoke"));
  assert.ok(scoreDecay({ teeth: "yes", habits: [] }, ctx).factors.some((f) => f.label === "Smoking or vaping"));
  // Not counted twice if an older answer also ticked it
  assert.equal(scoreDecay({ teeth: "yes", habits: ["smoke"] }, ctx).factors.filter((f) => f.label === "Smoking or vaping").length, 1);
  // Risk check not done yet: still asked here
  assert.ok(visibleQuestions({ teeth: "yes" }, decayContext()).find((q) => q.id === "habits").options.some((o) => o.v === "smoke"));
});

test("allergies reach the routine: no Tooth Mousse with a milk allergy, no GC gel with a paraben allergy", () => {
  const r = buildRoutine([{ id: "decay.tmp", products: [] }, { id: "gel", products: [] }]);
  assert.ok(r.every((x) => !/Tooth Mousse/.test(x.text)));
  assert.ok(r.some((x) => /paraben-free/.test(x.text)) && r.every((x) => !/GC Dry Mouth Gel/.test(x.text)));
});

test("checks saved before the dialysis split ask once whether the person is on dialysis", async () => {
  const { buildModel, openQuestions } = await import("../src/data/engine.js");
  const old = buildModel({ profile: {}, entries: [{ id: "r1", kind: "risk", v: 2, ts: Date.now(), answers: { conditions: ["kidney"] } }] });
  assert.ok(openQuestions(old).some((q) => q.id === "dialysis"));
  const now = buildModel({ profile: {}, entries: [{ id: "r1", kind: "risk", v: 3, ts: Date.now(), answers: { conditions: ["kidney"] } }] });
  assert.ok(!openQuestions(now).some((q) => q.id === "dialysis"));
});
