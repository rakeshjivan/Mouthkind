import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutine, routineView, slotNow, tickEntry, ticksToday } from "../src/data/routine.js";
import { logDue } from "../src/data/schedule.js";
import { worryList } from "../src/data/worry.js";

const plan = (...ids) => ids.map((id) => ({ id, pri: 50 }));

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
