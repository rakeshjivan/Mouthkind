// Medicine look-up, profile answers and the new health questions. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MEDICINES, groupsFor, searchMedicines } from "../src/data/medicines.js";
import { RISK_QUESTIONS, riskAdvice, scoreRisk, visibleRiskQuestions } from "../src/data/risk.js";
import { ageBand, ageFrom, profileAnswers } from "../src/data/person.js";
import { CARE_TOPICS, careContext } from "../src/data/care.js";
import { REFS } from "../src/data/references.js";

const options = (qid) => RISK_QUESTIONS.filter((q) => q.id === qid && q.options).flatMap((q) => q.options.map((o) => o.v));

test("every medicine maps to a real group in the risk check", () => {
  for (const m of MEDICINES) {
    const [q, v] = m.c.split(".");
    assert.ok(options(q).includes(v), `${m.g} → ${m.c}`);
  }
});

test("brand and generic names are both found, best match first", () => {
  assert.equal(searchMedicines("ozempic")[0].m.g, "semaglutide");
  assert.equal(searchMedicines("ozempic")[0].brand, "Ozempic");
  assert.equal(searchMedicines("Sertra")[0].m.g, "sertraline");
  assert.equal(searchMedicines("lyrica")[0].m.c, "medTypes.seizure");
  assert.equal(searchMedicines("keytruda")[0].m.c, "cancer.immuno");
  assert.deepEqual(searchMedicines("x"), []);
});

test("looked-up medicines give their groups; unknown names give none", () => {
  const oz = searchMedicines("ozempic")[0].m, zol = searchMedicines("zoloft")[0].m;
  assert.deepEqual(groupsFor([{ id: oz.id }, { id: zol.id }, { name: "Mystery tablet" }]).sort(), ["medTypes.antidep", "medTypes.glp1"]);
});

test("age and gender from Me replace those questions", () => {
  const now = new Date("2026-11-18T00:00:00");
  assert.equal(ageFrom("1958-11-19", now), 67);
  assert.equal(ageBand(67), "65");
  assert.deepEqual(profileAnswers({ dob: "1958-11-19", gender: "woman" }, now), { age: "65", sex: "f" });
  assert.deepEqual(profileAnswers({ gender: "nonbinary" }, now), { sex: "x" });
  assert.deepEqual(profileAnswers({}, now), {});
});

test("pregnancy is in the health list for everyone; vomiting brings acid advice", () => {
  for (const sex of ["f", "m", "x"]) assert.ok(!visibleRiskQuestions({ sex }).some((q) => q.id === "pregnant"));
  const a = { sex: "m", conditions: ["pregnantSick"] };
  const r = scoreRisk(a);
  assert.ok(r.factors.some((f) => f.v === "pregnantSick" && f.acid));
  const ids = riskAdvice(r, a).map((x) => x.id);
  assert.ok(ids.includes("pregnant") && ids.includes("acid"));
  assert.ok(CARE_TOPICS.find((t) => t.id === "pregnancy").forYou(careContext({ factors: r.factors })));
  // Older saved answers still count.
  assert.ok(scoreRisk({ pregnant: "sick" }).factors.some((f) => f.v === "pregnantSick"));
});

test("GLP-1 and immunotherapy bring their own advice and Advice topics", () => {
  const a = { medTypes: ["glp1"], cancer: ["immuno"] };
  const r = scoreRisk(a);
  const ids = riskAdvice(r, a).map((x) => x.id);
  assert.ok(ids.includes("glp1") && ids.includes("immuno") && ids.includes("acid"));
  const ctx = careContext({ factors: r.factors });
  assert.ok(CARE_TOPICS.find((t) => t.id === "acid").forYou(ctx));
});

test("all advice references exist", () => {
  const a = { sex: "f", medTypes: ["glp1"], cancer: ["immuno"], conditions: ["reflux", "diabetes", "pregnantSick"] };
  for (const x of riskAdvice(scoreRisk(a), a)) for (const ref of x.refs || []) assert.ok(REFS[ref], `${x.id} → ${ref}`);
  for (const t of CARE_TOPICS) for (const ref of t.refs || []) assert.ok(REFS[ref], `${t.id} → ${ref}`);
});
