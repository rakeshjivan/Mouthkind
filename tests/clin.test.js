// The clinician view's options and findings, for every persona.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, NOW } from "./personas.js";
import { withContext } from "./audit.js";
import { WATER_OPTIONS, buildModel, buildOptions, buildPlan } from "../src/data/engine.js";
import { AHPRA, dryFactors, findingsText } from "../src/clin/findings.js";
import { setupState } from "../src/data/setup.js";
import { CARE_TOPICS } from "../src/data/care.js";

for (const p of PERSONAS) {
  test(`clinician options: ${p.name}`, () => {
    const entries = withContext(p);
    const m = buildModel({ profile: p.profile, entries, now: NOW });
    const plan = buildPlan(m);
    const opts = buildOptions(m);
    // Everything the safe plan suggests is offered and pre-ticked; contraindicated options are offered unticked.
    for (const it of plan.filter((x) => !WATER_OPTIONS.includes(x.id))) assert.ok(opts.find((o) => o.id === it.id && o.ticked), it.id);
    // One "Keep hydrated" option for everyone, except on dialysis, where the fluid-limit item replaces it.
    const water = opts.filter((o) => WATER_OPTIONS.includes(o.id));
    if (m.has("conditions", "dialysis")) { assert.equal(water.length, 0); assert.ok(opts.some((o) => o.id === "kidneyFluid")); }
    else { assert.equal(water.length, 1); assert.equal(water[0].item.title, "Keep hydrated"); assert.ok(water[0].ticked); }
    for (const o of opts.filter((x) => x.contra)) { assert.equal(o.ticked, false); assert.ok(o.warn.length, o.id); }
    // The clinician build has no tooth decay check: decay entries are left out before the engine.
    const clinEntries = entries.filter((e) => e.kind !== "decay");
    const cm = buildModel({ profile: p.profile, entries: clinEntries, now: NOW });
    const copts = buildOptions(cm);
    assert.ok(!copts.some((o) => o.ticked && /tooth decay risk is/i.test((o.item.because || []).join(" "))), "no option rests on a decay band");
    if (!cm.noTeeth && !cm.rtHN) { const hf = copts.find((o) => o.id === "hf"); assert.ok(hf && !hf.ticked, "high fluoride offered, not suggested"); }
    const txt = findingsText(p.profile, clinEntries);
    assert.match(txt, /DRY MOUTH RISK CHECK/);
    assert.match(txt, /does not replace clinical judgement/);
    assert.doesNotMatch(txt, /TOOTH DECAY/);
    // What the patient sends: answers only, no score, band or points.
    const mine = findingsText(p.profile, clinEntries, null, { patient: true });
    assert.doesNotMatch(mine, /\/100|\bpts\b|risk check|\b(low|moderate|high|very high) risk\b|clinical judgement/i);
    const risk = clinEntries.find((e) => e.kind === "risk");
    if (risk) {
      assert.match(mine, /WHAT CAN AFFECT MY DRY MOUTH/);
      const x = dryFactors(risk.answers);
      for (const g of x.groups) for (const r of g.rows) { assert.equal(r.pts, undefined); assert.ok(r.label); }
    }
  });
}

test("milk allergy: Tooth Mousse is offered only as a contraindicated, unticked option", () => {
  const p = PERSONAS.find((x) => [].concat(x.profile.fu?.allergy?.v || []).includes("milk"));
  if (!p) return;
  const m = buildModel({ profile: p.profile, entries: withContext(p), now: NOW });
  for (const o of buildOptions(m).filter((x) => x.ticked)) assert.ok(!(o.item.products || []).some((id) => ["gc-tm", "gc-tmp"].includes(id)), o.id);
});

test("AHPRA format: three letters and ten digits", () => {
  assert.ok(AHPRA.test("DEN0001234567"));
  for (const bad of ["DEN12345", "de0001234567", "DEN00012345678", "0001234567DEN"]) assert.ok(!AHPRA.test(bad), bad);
});


test("clinician setup: no tooth decay check, and a teeth and gums step after the assessment", () => {
  const st = setupState({ entries: [], profile: {}, openQs: 0, skip: ["decay"] });
  assert.ok(!st.steps.some((x) => x.id === "decay"));
  assert.deepEqual(st.steps.map((x) => x.id), ["risk", "sip", "teeth", "team", "questions"]);
});

test("teeth and gums: a record with no score, a book-in line, and the dentures answer carried over", async () => {
  const { teethRecord, teethQuestions, denturesFrom } = await import("../src/data/teeth.js");
  const { OPTION_INFO } = await import("../src/data/optionInfo.js");
  assert.equal(teethQuestions({ dTeeth: "dentures" }).length, 4, "denture wearers skip the brushing questions");
  const r = teethRecord({ dTeeth: "natural", dPain: ["sensitive"], dGums: "yes", dBrush: "once", dFluoride: "yes", dBetween: "never", dSugar: "often", dAcid: "rare", dVisit: "year" });
  assert.ok(r.book && r.rows.every((x) => x.info), "every answer has its explanation");
  assert.ok(!teethRecord({ dTeeth: "natural", dPain: [], dGums: "no", dVisit: "year" }).book);
  assert.equal(denturesFrom({ dTeeth: "both" }), "partial");
  // Every risk option a person can tick has a "?" explanation.
  const { RISK_QUESTIONS } = await import("../src/data/risk.js");
  for (const q of RISK_QUESTIONS.filter((x) => ["conditions", "medFor", "medTypes", "cancer", "breathing", "habits"].includes(x.id)))
    for (const o of q.options) assert.ok(OPTION_INFO[q.id]?.[o.v], `no explanation for ${q.id}.${o.v}`);
});

test("dry mouth factors are listed in question order, the same for everyone, with no points", () => {
  const a = dryFactors({ habits: ["smoke"], conditions: ["sjogren"], medTypes: ["bladder"], meds: "3" });
  const labels = a.groups.flatMap((g) => g.rows.map((r) => r.label));
  assert.ok(labels.includes("Sjögren's syndrome") && labels.includes("Smoking"));
  assert.deepEqual(a.groups.map((g) => g.id), a.groups.map((g) => g.id).sort((x, y) => ["meds", "treat", "health", "sleep", "habits", "about"].indexOf(x) - ["meds", "treat", "health", "sleep", "habits", "about"].indexOf(y)));
  assert.ok(dryFactors({}).none);
});

test("general information on teeth and dry mouth products is there for everyone, with no brand names", () => {
  for (const id of ["saliva", "teeth", "products"]) {
    const t = CARE_TOPICS.find((x) => x.id === id);
    assert.ok(t && t.general && t.refs.length >= 3, id);
    assert.ok(!t.products, id);
    assert.doesNotMatch(t.steps.join(" "), /GC|Tooth Mousse|NeutraFluor|OraNurse|Biot[eè]ne/);
  }
});

test("\"Not sure\" answers score nothing, are listed for the professional and don't break the medicine count", async () => {
  const { scoreRisk, unsureOf, fullAnswers } = await import("../src/data/risk.js");
  const a = { conditions: ["unsure"], medFor: ["unsure"], meds: "unsure", breathing: ["unsure"], age: "65", sex: "f" };
  assert.deepEqual(unsureOf(a), ["Health conditions", "Medicines", "Sleep and breathing"]);
  assert.equal(fullAnswers(a).meds, "unsure");
  assert.ok(!scoreRisk(a).factors.some((f) => f.v === "unsure"));
  const x = dryFactors(a);
  assert.ok(x.unsure.length === 3 && !x.groups.flatMap((g) => g.rows).some((r) => r.v === "unsure"));
  assert.match(findingsText({}, [{ kind: "risk", ts: 1, answers: a }]), /Not sure/);
});
