// The clinician view's options and findings, for every persona.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, NOW } from "./personas.js";
import { withContext } from "./audit.js";
import { buildModel, buildOptions, buildPlan } from "../src/data/engine.js";
import { AHPRA, findingsText } from "../src/clin/findings.js";

for (const p of PERSONAS) {
  test(`clinician options: ${p.name}`, () => {
    const entries = withContext(p);
    const m = buildModel({ profile: p.profile, entries, now: NOW });
    const plan = buildPlan(m);
    const opts = buildOptions(m);
    // Everything the safe plan suggests is offered and pre-ticked; contraindicated options are offered unticked.
    for (const it of plan) assert.ok(opts.find((o) => o.id === it.id && o.ticked), it.id);
    for (const o of opts.filter((x) => x.contra)) { assert.equal(o.ticked, false); assert.ok(o.warn.length, o.id); }
    const txt = findingsText(p.profile, entries);
    assert.match(txt, /DRY MOUTH RISK CHECK/);
    assert.match(txt, /does not replace clinical judgement/);
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
