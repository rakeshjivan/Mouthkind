import { test } from "node:test";
import assert from "node:assert/strict";
import { RELIEF, lastDays, reliefFor, soreLevel, soreWord, dryWord } from "../src/data/tracker.js";
import { redFlags, topLevel } from "../src/lib/rules.js";
import { REFS } from "../src/data/references.js";
import { PRODUCTS } from "../src/data/products.js";

const chemoNow = { treatments: ["chemo"], phase: "during" };

test("soreness level follows the WHO pattern from what the patient reports", () => {
  assert.equal(soreLevel({ pain: 0, eating: "normal", symptoms: [] }), 0);
  assert.equal(soreLevel({ pain: 3, eating: "normal", symptoms: [] }), 1);
  assert.equal(soreLevel({ pain: 5, eating: "soft", symptoms: ["sores"] }), 2);
  assert.equal(soreLevel({ pain: 6, eating: "liquids", symptoms: ["sores"] }), 3);
  assert.equal(soreLevel({ pain: 8, eating: "none", symptoms: [] }), 4);
  assert.equal(soreLevel({ pain: 8, eating: "saliva", symptoms: [] }), 4);
});
test("words for every point on both scales", () => {
  for (let v = 0; v <= 10; v++) { assert.ok(soreWord(v)); assert.ok(dryWord(v)); }
  assert.equal(soreWord(0), "No soreness"); assert.equal(soreWord(10), "The worst it's been");
});
test("can't swallow saliva is an emergency; blood blisters during chemo are same day", () => {
  assert.equal(topLevel(redFlags({ pain: 5, eating: "saliva", danger: ["cant_swallow_saliva"], symptoms: [] }, chemoNow)), "emergency");
  assert.equal(topLevel(redFlags({ pain: 2, symptoms: ["blisters"] }, chemoNow)), "sameday");
  assert.equal(topLevel(redFlags({ pain: 2, symptoms: ["blisters"] }, { treatments: ["rt_hn"], phase: "during" })), "soon");
});
test("relief follows today's log", () => {
  assert.equal(reliefFor({ pain: 0, dryness: 0, symptoms: [], dryExtras: [] }).length, 0);
  const ids = (e) => reliefFor(e).map((r) => r.id);
  assert.ok(ids({ pain: 5, dryness: 0, symptoms: [] }).includes("pain"));
  assert.ok(ids({ pain: 0, dryness: 6, symptoms: [], dryExtras: ["sticky"] }).includes("sticky"));
  assert.ok(ids({ pain: 2, dryness: 0, eating: "liquids", symptoms: [] }).includes("dietitian"));
});
test("every relief card cites real sources and real products", () => {
  for (const r of RELIEF) {
    for (const ref of r.refs) assert.ok(REFS[ref], `${r.id} → ${ref}`);
    for (const p of r.products || []) assert.ok(PRODUCTS.some((x) => x.id === p), `${r.id} → ${p}`);
  }
});
test("lastDays keeps the latest log of each day and leaves gaps empty", () => {
  const now = Date.parse("2026-11-15T12:00:00");
  const e = [
    { kind: "daily", ts: Date.parse("2026-11-15T08:00:00"), pain: 2 },
    { kind: "daily", ts: Date.parse("2026-11-15T10:00:00"), pain: 4 },
    { kind: "daily", ts: Date.parse("2026-11-13T09:00:00"), pain: 1 },
  ];
  const d = lastDays(e, 3, now);
  assert.equal(d.length, 3);
  assert.equal(d[2].e.pain, 4);
  assert.equal(d[1].e, null);
  assert.equal(d[0].e.pain, 1);
});
