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
  for (const d of ["bleed_wont_stop", "cant_swallow_saliva", "swelling_spreading"]) // bleed_wont_stop comes from the follow-up
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

test("plain-word fever answers escalate the same as a measured 38 °C", () => {
  assert.equal(topLevel(redFlags({ ...base, fever: "yes" }, chemoNow)), "emergency");
  assert.equal(topLevel(redFlags({ ...base, fever: "shivery" }, chemoNow)), "emergency");
  assert.equal(redFlags({ ...base, fever: "no" }, chemoNow).length, 0);
  assert.equal(redFlags({ ...base, fever: "unknown" }, chemoNow).length, 0);
});

import { SUPPORT, supportFor } from "../src/data/support.js";
test("support directory: every group has a phone and https site, filtered by country", () => {
  for (const s of SUPPORT) {
    assert.match(s.phone, /^[0-9 ]+$/, s.id);
    assert.match(s.web, /^https:\/\//, s.id);
  }
  assert.ok(supportFor("NZ").every((s) => s.region === "NZ"));
  assert.equal(supportFor("AU", ["rt_hn"])[0].id, "hanca", "head and neck group leads for H&N radiotherapy");
});
test("order button only appears where a link exists", () => {
  for (const p of PRODUCTS) for (const u of Object.values(p.buy || {})) assert.match(u, /^https:\/\//, p.id);
});

import { dentalAlerts, dentalEmergency, stepsFor } from "../src/data/triage.js";
const tri = (danger, dental, profile = { treatments: [] }) => redFlags({ ...base, danger, dental }, profile);
const top = (...a) => topLevel(tri(...a));
const ids = (...a) => tri(...a).map((x) => x.id);
const H_N = { treatments: ["rt_hn"], phase: "after" };

// ── Gums bleed
test("gums: bleeding only on brushing → keep brushing, dentist if it persists", () => {
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "brush", signs: [] } }), "dentist");
});
test("gums: bleeding on brushing during chemo → tell team in a day or two (platelets)", () => {
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "brush", signs: [] } }, chemoNow), "soon");
});
test("gums: bleeding on their own → same day, for anyone", () => {
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "own", now: "stopped", signs: [] } }), "sameday");
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "own", now: "stopped", signs: [] } }, chemoNow), "sameday");
});
test("gums: brushing bleed plus spots, blood blisters or bruising → same day", () => {
  for (const sg of ["spots", "blisters", "bruise"])
    assert.equal(top(["gum_bleed"], { gum_bleed: { when: "brush", signs: [sg] } }, chemoNow), "sameday", sg);
});
test("gums: heavy or 30+ minutes → emergency, and it ends the check-in", () => {
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "own", now: "heavy" } }), "emergency");
  assert.equal(dentalEmergency({ gum_bleed: { now: "heavy" } }), true);
});
test("gums: after an extraction — oozing → same day; stopped → nothing", () => {
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "extract", now: "ooze", signs: [] } }), "sameday");
  assert.equal(tri(["gum_bleed"], { gum_bleed: { when: "extract", now: "stopped", signs: [] } }).length, 0);
});
test("gums: bad taste or smell → possible infection; same day when counts may be low", () => {
  assert.ok(ids(["gum_bleed"], { gum_bleed: { when: "brush", signs: ["smell"] } }).includes("gum-infection"));
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "brush", signs: ["smell"] } }, chemoNow), "sameday");
  assert.equal(top(["gum_bleed"], { gum_bleed: { when: "brush", signs: ["smell"] } }), "soon");
});
test("gums: the 'is it bleeding now' question only appears when relevant", () => {
  assert.deepEqual(stepsFor("gum_bleed", { when: "brush" }).map((x) => x.id), ["when", "signs"]);
  assert.deepEqual(stepsFor("gum_bleed", { when: "own" }).map((x) => x.id), ["when", "now", "signs"]);
});

// ── Toothache
test("toothache: brief sharp pain with cold/sweet → sensitivity advice, not urgent", () => {
  const a = tri(["toothache"], { toothache: { kind: "quick", extra: [] } });
  assert.equal(topLevel(a), "dentist"); assert.ok(a.some((x) => x.id === "sensitive"));
});
test("toothache: lingering or spontaneous → see a dentist in a few days", () => {
  assert.equal(top(["toothache"], { toothache: { kind: "lingers", extra: [] } }), "soon");
});
test("toothache: tender to bite → soon; same day during chemo", () => {
  assert.equal(top(["toothache"], { toothache: { kind: "bite", extra: [] } }), "soon");
  assert.equal(top(["toothache"], { toothache: { kind: "bite", extra: [] } }, chemoNow), "sameday");
});
test("toothache: swelling or pus → same day (possible abscess)", () => {
  for (const x of ["swelling", "pus"])
    assert.equal(top(["toothache"], { toothache: { kind: "lingers", extra: [x] } }), "sameday", x);
});
test("toothache: pain relief not working → same day (SDCEP urgent)", () => {
  assert.equal(top(["toothache"], { toothache: { kind: "lingers", extra: ["meds"] } }), "sameday");
});
test("toothache: diffuse jaw ache mentions vinca alkaloids during chemo, jaw bone after H&N RT", () => {
  assert.match(tri(["toothache"], { toothache: { kind: "spread", extra: [] } }, chemoNow)[0].body, /vincristine/);
  assert.match(tri(["toothache"], { toothache: { kind: "spread", extra: [] } }, H_N)[0].body, /jaw bone/);
});
test("toothache: lip or chin numbness is flagged", () => {
  assert.ok(ids(["toothache"], { toothache: { kind: "spread", extra: ["numb"] } }).includes("numb"));
});
test("toothache: before-treatment warnings follow the treatment", () => {
  assert.match(tri(["toothache"], { toothache: { kind: "lingers", extra: [] } }, chemoNow)[0].body, /blood test/);
  assert.match(tri(["toothache"], { toothache: { kind: "lingers", extra: [] } }, H_N)[0].body, /taken out/);
});

// ── Sensitive
test("sensitive: brief twinges → self-care, mention at next visit", () => {
  assert.equal(top(["sensitive"], { sensitive: { kind: "quick", look: [] } }), "dentist");
});
test("sensitive: lingering → treated as toothache", () => {
  assert.ok(ids(["sensitive"], { sensitive: { kind: "lingers", look: [] } }).includes("pulpitis"));
});
test("sensitive: visible decay after H&N radiotherapy → soon", () => {
  assert.equal(top(["sensitive"], { sensitive: { kind: "quick", look: ["gumline"] } }, H_N), "soon");
  assert.equal(top(["sensitive"], { sensitive: { kind: "quick", look: ["gumline"] } }), "dentist");
});

// ── Broken
test("broken: possibly inhaled → emergency", () => {
  assert.equal(top(["broken"], { broken: { what: "inhaled" } }), "emergency");
  assert.equal(dentalEmergency({ broken: { what: "inhaled" } }), true);
});
test("broken: painless → within a week; sharp edge → sooner; aching → toothache path", () => {
  assert.equal(top(["broken"], { broken: { what: "chip", feel: "fine" } }), "dentist");
  assert.equal(top(["broken"], { broken: { what: "chip", feel: "sharp" } }), "soon");
  assert.ok(ids(["broken"], { broken: { what: "filling", feel: "aches" } }).includes("pulpitis"));
});

test("every dental alert cites references that exist", () => {
  const cases = [
    [["gum_bleed"], { gum_bleed: { when: "own", now: "heavy", signs: ["smell"] } }],
    [["toothache", "sensitive", "broken"], { toothache: { kind: "spread", extra: ["numb", "meds"] }, sensitive: { kind: "quick", look: ["hole", "many"] }, broken: { what: "filling", feel: "sharp" } }],
  ];
  for (const [d, x] of cases) for (const p of [chemoNow, H_N])
    for (const a of dentalAlerts(d, x, { lowCounts: true, boneRisk: true }).concat(tri(d, x, p)))
      for (const r of a.refs) assert.ok(REFS[r], `${a.id} → ${r}`);
});
