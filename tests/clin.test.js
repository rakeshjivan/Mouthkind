// The clinician view's options and findings, for every persona.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, NOW } from "./personas.js";
import { withContext } from "./audit.js";
import { WATER_OPTIONS, buildModel, buildOptions, buildPlan } from "../src/data/engine.js";
import { AHPRA, findingsText } from "../src/clin/findings.js";

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

import { signCode, verifyCode } from "../src/clin/codes.js";
test("clinician codes: a signed code passes; edited, expired, revoked or foreign codes fail", async () => {
  const ALG = { name: "ECDSA", namedCurve: "P-256" };
  const mine = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  const other = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  const { b64u } = await import("../src/clin/codes.js");
  const keys = [b64u.enc(await crypto.subtle.exportKey("raw", mine.publicKey))];
  const p = { a: "DEN0001234567", n: "Dr Test", p: 0, e: "2027-06-30" };
  const now = new Date("2026-11-26").getTime();
  const good = await signCode(p, mine.privateKey);
  const r = await verifyCode(good, { keys, now });
  assert.ok(r.ok); assert.equal(r.by.name, "Dr Test"); assert.equal(r.by.profession, "Dentist");
  // Change the name in the payload: the signature no longer matches.
  const [h, , sig] = good.split(".");
  const forged = `${h}.${b64u.enc(new TextEncoder().encode(JSON.stringify({ ...p, n: "Someone Else" })))}.${sig}`;
  assert.equal((await verifyCode(forged, { keys, now })).ok, false);
  assert.equal((await verifyCode(await signCode(p, other.privateKey), { keys, now })).ok, false);
  assert.match((await verifyCode(good, { keys, now: new Date("2027-07-01").getTime() })).reason, /expired/);
  assert.match((await verifyCode(good, { keys, now, revoked: ["DEN0001234567"] })).reason, /withdrawn/);
  assert.equal((await verifyCode("hello", { keys, now })).ok, false);
});
