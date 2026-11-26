import { test } from "node:test";
import assert from "node:assert/strict";
import { phPattern, phZone } from "../src/data/ph.js";
import { CARE_TOPICS, careContext } from "../src/data/care.js";
import { riskBreakdown, scoreRisk } from "../src/data/risk.js";
import { PRODUCTS } from "../src/data/products.js";
import { REFS } from "../src/data/references.js";
import { PH_VALUES } from "../src/data/clinical.js";

const R = (...v) => v.map((ph, i) => ({ id: i, ts: i, ph }));

test("pH zones follow GC Saliva-Check BUFFER", () => {
  assert.equal(phZone(5.0).id, "high"); assert.equal(phZone(5.8).id, "high");
  assert.equal(phZone(6.0).id, "mod"); assert.equal(phZone(6.6).id, "mod");
  assert.equal(phZone(6.8).id, "ok"); assert.equal(phZone(7.8).id, "ok");
  for (const v of PH_VALUES) assert.ok(phZone(v), String(v));
});
test("consistently acidic pH is flagged even when each reading is only moderately acidic", () => {
  assert.equal(phPattern(R(7.0, 6.6, 6.4, 6.2, 7.0)).level, "flag");
  assert.equal(phPattern(R(7.0, 7.2, 6.6, 7.0, 7.4)).level, "watch");
  assert.equal(phPattern(R(7.0, 7.2, 6.8)).level, "ok");
  assert.equal(phPattern([]).level, "none");
});
test("two highly acidic results in the last five are flagged", () => {
  assert.equal(phPattern(R(7.0, 5.6, 7.0, 5.4)).level, "flag");
});
test("only the latest five results count", () => {
  assert.equal(phPattern(R(6.0, 6.0, 6.0, 7.0, 7.0, 7.0, 7.2, 7.0)).level, "ok");
});
test("care topics: real products and sources, and they respond to results", () => {
  for (const t of CARE_TOPICS) {
    for (const p of t.products || []) assert.ok(PRODUCTS.some((x) => x.id === p), `${t.id} → ${p}`);
    for (const r of t.refs || []) assert.ok(REFS[r], `${t.id} → ${r}`);
  }
  const ids = (ctx) => CARE_TOPICS.filter((t) => t.forYou(careContext(ctx))).map((t) => t.id);
  assert.deepEqual(ids({}), []);
  assert.ok(ids({ ph: "flag" }).includes("protect") && ids({ ph: "flag" }).includes("diet") && ids({ ph: "flag" }).includes("dentist"));
  assert.ok(ids({ sip: 9 }).includes("moisten"));
  const r = scoreRisk({ medTypes: ["bladder"], habits: ["smoke"], water: "low" });
  const mine = ids({ factors: r.factors, risk: r.band.id });
  for (const id of ["medicines", "habits", "water"]) assert.ok(mine.includes(id), id);
});
test("risk breakdown adds up to the score and separates what can be acted on", () => {
  const r = scoreRisk({ age: "65", meds: "5", medTypes: ["bladder"], conditions: ["diabetes"], habits: ["smoke"] });
  const g = riskBreakdown(r);
  assert.equal(g.reduce((s, x) => s + x.pts, 0), r.score);
  assert.ok(g.find((x) => x.id === "meds").act);
  assert.ok(!g.find((x) => x.id === "health").act);
});
