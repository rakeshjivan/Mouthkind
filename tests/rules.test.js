// Safety rules are the one part of this app that must never silently change.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { redFlags, topLevel, trendFlags, adviceFor, stillAtFeverRisk, cycleWindow } from "../src/lib/rules.js";
import { visibleProducts, PRODUCTS } from "../src/data/products.js";
import { REFS } from "../src/data/references.js";

const DAY = 86400000;
const chemoNow = { treatments: ["chemo"], phase: "during" };
const base = { danger: [], symptoms: [], pain: 0, dryness: 0, eating: "normal", temp: null };

test("38.0 °C during chemotherapy is an emergency", () => {
  assert.equal(topLevel(redFlags({ ...base, temp: 38.0 }, chemoNow)), "emergency");
});
test("37.9 °C raises nothing", () => {
  assert.equal(redFlags({ ...base, temp: 37.9 }, chemoNow).length, 0);
});
test("fever within 6 weeks of finishing chemo is still an emergency", () => {
  const p = { treatments: ["chemo"], phase: "after", endDate: new Date(Date.now() - 20 * DAY).toISOString().slice(0, 10) };
  assert.equal(topLevel(redFlags({ ...base, temp: 38.4 }, p)), "emergency");
});
test("fever long after chemo is same-day, not emergency", () => {
  const p = { treatments: ["chemo"], phase: "after", endDate: "2020-01-01" };
  assert.equal(stillAtFeverRisk(p), false);
  assert.equal(topLevel(redFlags({ ...base, temp: 38.4 }, p)), "sameday");
});
test("fever on radiotherapy alone is same-day", () => {
  assert.equal(topLevel(redFlags({ ...base, temp: 38.5 }, { treatments: ["rt_hn"], phase: "during" })), "sameday");
});
test("every danger sign is an emergency for anyone", () => {
  for (const d of ["bleed_wont_stop", "cant_swallow_saliva", "swelling_spreading"])
    assert.equal(topLevel(redFlags({ ...base, danger: [d] }, { treatments: [] })), "emergency", d);
});
test("can't eat or drink → same day", () => {
  assert.equal(topLevel(redFlags({ ...base, eating: "none" }, chemoNow)), "sameday");
});
test("pain 7 → same day; pain 6 → nothing", () => {
  assert.equal(topLevel(redFlags({ ...base, pain: 7 }, chemoNow)), "sameday");
  assert.equal(redFlags({ ...base, pain: 6 }, chemoNow).length, 0);
});
test("new mouth sores on immunotherapy → same day", () => {
  assert.equal(topLevel(redFlags({ ...base, symptoms: ["sores"] }, { treatments: ["immuno"], phase: "during" })), "sameday");
});
test("white patches → thrush within 1–2 days", () => {
  const a = redFlags({ ...base, symptoms: ["white"] }, chemoNow);
  assert.ok(a.some((x) => x.id === "thrush" && x.level === "soon"));
});
test("exposed bone after head and neck RT → see dentist soon", () => {
  const a = redFlags({ ...base, symptoms: ["bone"] }, { treatments: ["rt_hn"], phase: "after" });
  assert.ok(a.some((x) => x.id === "bone" && x.level === "soon"));
});
test("alerts are ordered most urgent first", () => {
  const a = redFlags({ ...base, temp: 39, symptoms: ["white"], pain: 8 }, chemoNow);
  assert.equal(a[0].level, "emergency");
  assert.equal(a.at(-1).level, "soon");
});
test("SIP rise of 3 is flagged for the next visit", () => {
  const e = [{ ts: 1, sip: 7 }, { ts: 2, sip: 10 }];
  assert.ok(trendFlags(e).some((f) => f.id === "sip-rise" && f.level === "dentist"));
});
test("pH below 6.4 on half of recent readings is flagged", () => {
  const now = Date.now();
  const e = [6.0, 6.2, 7.0, 6.8].map((ph, i) => ({ ts: now - i * DAY, ph }));
  assert.ok(trendFlags(e, now).some((f) => f.id === "ph-low"));
});
test("before treatment, the dental check card leads", () => {
  assert.equal(adviceFor({}, { treatments: ["rt_hn"], phase: "before" })[0].id, "dental-first");
});
test("GC products lead each section and essentials are always listed", () => {
  const shown = visibleProducts("AU", []);
  assert.ok(shown.some((p) => p.id === "gc-dmg"));
  assert.ok(shown.some((p) => p.id === "hf-paste"), "fluoride toothpaste must always be listed");
  const firstNonGc = shown.findIndex((p) => !p.gc);
  assert.ok(shown.slice(firstNonGc).every((p) => !p.gc), "GC products come first");
});
test("prescription-only items appear only for the right treatment", () => {
  assert.ok(!visibleProducts("AU", ["chemo"]).some((p) => p.id === "benzydamine"));
  assert.ok(visibleProducts("AU", ["rt_hn"]).some((p) => p.id === "benzydamine"));
});
test("every reference key used anywhere exists", () => {
  for (const p of PRODUCTS) for (const r of p.refs || []) assert.ok(REFS[r], `${p.id} → ${r}`);
  const cards = adviceFor({ dryness: 8, pain: 5, symptoms: ["taste"], eating: "soft", ph: 6 },
    { treatments: ["rt_hn", "bone", "immuno", "targeted"], phase: "before" });
  for (const c of cards) for (const r of c.refs) assert.ok(REFS[r], `${c.id} → ${r}`);
});

test("carer sees coughing or choking → same day", () => {
  assert.equal(topLevel(redFlags({ ...base, symptoms: ["c_choke"] }, chemoNow)), "sameday");
});
test("one-finger mouth opening → get it checked soon", () => {
  assert.equal(topLevel(redFlags({ opening: 1 }, chemoNow)), "soon");
  assert.equal(redFlags({ opening: 3 }, chemoNow).length, 0);
});
test("5% weight loss is flagged; 4% is not", () => {
  assert.ok(trendFlags([{ ts: 1, weight: 80 }, { ts: 2, weight: 76 }]).some((f) => f.id === "weight"));
  assert.ok(!trendFlags([{ ts: 1, weight: 80 }, { ts: 2, weight: 76.8 }]).some((f) => f.id === "weight"));
});
test("chemo day 7 is in the peak window; day 2 and day 25 are not", () => {
  const ago = (d) => new Date(Date.now() - d * DAY).toISOString().slice(0, 10);
  assert.equal(cycleWindow({ chemoDates: [ago(7)] }).peak, true);
  assert.equal(cycleWindow({ chemoDates: [ago(2)] }).peak, false);
  assert.equal(cycleWindow({ chemoDates: [ago(25)] }), null);
});
