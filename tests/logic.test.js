// The safety rules for advice, products, routine, questions and the mouth log, checked
// against every persona in tests/personas.js. Run `node tests/audit.js` to see the output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS } from "./personas.js";
import { see } from "./audit.js";
import { REFS } from "../src/data/references.js";

const all = PERSONAS.map((p) => ({ p, ...see(p) }));
const allergy = (p) => [].concat(p.profile.fu?.allergy?.v || []);
const text = ({ plan, routine, tri }) => [
  ...plan.flatMap((i) => [i.title, i.body]), ...routine.map((r) => r.text), ...(tri ? [...tri.now, ...tri.today, ...tri.notes] : []),
].join(" \n ");
const products = ({ plan, routine, tips }) => new Set([...plan.flatMap((i) => i.products || []), ...routine.map((r) => r.product).filter(Boolean), ...tips.flatMap((t) => t.products || [])]);
const each = (name, fn) => test(name, () => { for (const x of all) fn(x, x.p.name); });

const DRYING = ["chemo", "transplant", "rt_hn", "rt_other", "immuno", "rai"];
const dryTx = (x) => x.m.cancer && (!x.m.tx.length || x.m.tx.some((t) => DRYING.includes(t)));
const isDry = (x) => (x.m.sip?.sip ?? 0) >= 8 || x.m.rtHN || x.m.sjogren || (x.p.log && (x.p.log.dryness >= 1 || x.p.log.night !== "no"));

each("GC Dry Mouth Gel only for a dry mouth or a drying cancer treatment", (x, who) => {
  if (!isDry(x) && !dryTx(x)) assert.ok(!products(x).has("gc-dmg") && !/Dry Mouth Gel/.test(text(x)), who);
});

each("chemotherapy, radiotherapy (any site) or immunotherapy: gel and Tooth Mousse, whatever the cancer", (x, who) => {
  if (!dryTx(x)) return;
  const al = allergy(x.p);
  if (!al.includes("hb")) assert.ok(x.plan.some((i) => i.id === "gel") || x.m.usedNow.has("gc-dmg"), `${who}: gel`);
  if (!al.includes("milk") && !x.m.noTeeth) assert.ok(x.routine.some((r) => r.id === "morning.tmp"), `${who}: Tooth Mousse Plus`);
});

each("acidic saliva: Tooth Mousse, explained as acid buffering with calcium and phosphate", (x, who) => {
  if (!["watch", "flag"].includes(x.m.phPat.level) || x.m.noTeeth || allergy(x.p).includes("milk")) return;
  const acid = x.plan.find((i) => i.id === "acid");
  if (!acid) return; // waiting on a retest
  assert.match(acid.body, /buffer acid/); assert.match(acid.body, /calcium and phosphate/);
  assert.ok(acid.products.includes("gc-tmp"), who);
  assert.ok(x.routine.some((r) => r.id === "morning.tmp"), `${who}: routine`);
});

each("low risk, not dry, no cancer treatment: Tooth Mousse Plus is optional; OraNurse is never the default", (x, who) => {
  const tmp = x.plan.find((i) => i.id === "decay.tmp");
  if (tmp && x.m.decay?.band.id === "low" && !isDry(x) && !dryTx(x) && !["watch", "flag"].includes(x.m.phPat.level))
    assert.match(tmp.title, /^Optional/, who);
  assert.ok(!x.routine.some((r) => r.product === "oranurse"), `${who}: OraNurse in routine`);
});

each("no Tooth Mousse with a milk allergy, and none without natural teeth", (x, who) => {
  if (!allergy(x.p).includes("milk") && !x.m.noTeeth) return;
  assert.ok(!["gc-tm", "gc-tmp", "recaldent"].some((id) => products(x).has(id)), `${who}: product`);
  assert.ok(!x.routine.some((r) => /Tooth Mousse/.test(r.text)), `${who}: routine`);
  assert.ok(!x.plan.some((i) => /Tooth Mousse/.test(i.title)), `${who}: plan title`);
  assert.ok(!x.tips.some((t) => /Tooth Mousse/.test(t.t)), `${who}: log tips`);
});

each("no GC Dry Mouth Gel with a paraben allergy", (x, who) => {
  if (!allergy(x.p).includes("hb")) return;
  assert.ok(!products(x).has("gc-dmg"), `${who}: product`);
  assert.ok(!/GC Dry Mouth Gel/.test(text(x)) && !x.tips.some((t) => /GC Dry Mouth Gel/.test(t.t)), `${who}: text`);
});

each("on dialysis, never 'drink more': everything keeps within the fluid limit", (x, who) => {
  if (!x.m.has("conditions", "dialysis")) return;
  assert.doesNotMatch(text(x), /drink (a little )?more water|sip water often|water by the bed|water bottle/i, who);
  assert.ok(x.plan.some((i) => i.id === "kidneyFluid"), `${who}: fluid-limit advice`);
});

each("without natural teeth: no toothpaste, fluoride or decay advice", (x, who) => {
  if (!x.m.noTeeth) return;
  assert.ok(!x.plan.some((i) => ["hf", "oranurse", "risk.teeth", "decay.hf", "decay.paste", "decay.tmp", "decay.tm", "rtFluoride"].includes(i.id)), who);
  assert.ok(!x.routine.some((r) => /brush|toothpaste/i.test(r.text)), `${who}: routine`);
});

each("nothing said twice: unique ids and titles", (x, who) => {
  const ids = x.plan.map((i) => i.id), titles = x.plan.map((i) => i.title);
  assert.equal(new Set(ids).size, ids.length, `${who}: ids`);
  assert.equal(new Set(titles).size, titles.length, `${who}: titles`);
  // One dental check-up item at most
  const dental = x.plan.filter((i) => ["dentalRT", "dentalPre", "boneDentist", "dentalFlag", "decay.visit", "risk.dentist"].includes(i.id));
  assert.ok(dental.length <= 1, `${who}: ${dental.map((i) => i.id)}`);
});

each("every item says why it's there, and every source exists", (x, who) => {
  for (const i of x.plan) {
    assert.ok(i.because?.length, `${who}: ${i.id} has no reason`);
    for (const r of i.refs || []) assert.ok(REFS[r], `${who}: ${i.id} cites unknown ${r}`);
  }
  for (const t of x.tips) for (const r of t.refs || []) assert.ok(REFS[r], `${who}: tip cites unknown ${r}`);
});

each("questions for a carer name the person, not 'you'", (x, who) => {
  if (!x.p.profile.carer) return;
  for (const q of x.qs) assert.doesNotMatch(q.text, /\byou(r)?\b/i, `${who}: ${q.text}`);
});

each("the routine never recommends what the plan doesn't", (x, who) => {
  const planned = new Set(x.plan.flatMap((i) => i.products || []));
  for (const r of x.routine) if (r.product && r.product !== "hf-paste") assert.ok(planned.has(r.product), `${who}: ${r.text}`);
});

test("red flags: fever on chemotherapy is an emergency; the plan leads with the dentist before radiotherapy", () => {
  const chemo = all.find((x) => /fever/.test(x.p.name));
  assert.equal(chemo.tri.level, "now");
  const preRT = all.find((x) => /starts in 10 days/.test(x.p.name));
  assert.equal(preRT.plan[0].id, "dentalRT");
});

test("someone with no problems gets a short, quiet plan", () => {
  const h = all.find((x) => /Healthy/.test(x.p.name));
  assert.ok(h.plan.length <= 4, h.plan.map((i) => i.id).join());
  assert.ok(h.plan.every((i) => i.pri < 50));
  assert.ok(!h.plan.some((i) => i.id === "salivaTest" || i.id === "gel"));
});

each("no question asks what a check already answered", (x, who) => {
  const ids = x.qs.map((q) => q.id);
  if (x.m.decayE && !x.m.last3.some((e) => e.white === "yes")) assert.ok(!ids.includes("dentures"), `${who}: dentures`);
  if ([].concat(x.m.decayAns.protect || []).includes("hf")) assert.ok(!ids.includes("rtFluoride"), `${who}: rtFluoride`);
});
