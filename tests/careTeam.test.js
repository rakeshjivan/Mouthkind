import { test } from "node:test";
import assert from "node:assert/strict";
import { careContacts, contactRoles, getContact, openQuestionCount, setContact } from "../src/data/careTeam.js";

test("cancer care gets the 24-hour line, specialist and nurse; others don't see a treatment line", () => {
  const ids = (p) => contactRoles(p).map((r) => r.id);
  assert.deepEqual(ids({ situation: ["cancer"] }), ["line24", "specialist", "nurse", "dentist", "pharmacy", "gp"]);
  assert.deepEqual(ids({ situation: ["meds"] }), ["specialist", "dentist", "pharmacy", "gp"]);
});

test("older team and dentist numbers carry over, and only contacts with a number are listed", () => {
  let p = { situation: ["cancer"], team: { name: "Cancer Care", phone24: "07 5202 0000" }, dentist: { phone: "07 1111 2222" } };
  assert.deepEqual(getContact(p, "line24"), { name: "Cancer Care", phone: "07 5202 0000" });
  p = setContact(p, "specialist", { name: "Dr Lee", phone: "07 3333 4444" });
  p = setContact(p, "line24", { phone: "1800 000 000" });
  assert.equal(p.team.phone24, "1800 000 000"); assert.equal(p.team.name, "Cancer Care");
  assert.deepEqual(careContacts(p).map((c) => c.id), ["line24", "specialist", "dentist"]);
});

test("open questions exclude the ones already asked", () => {
  assert.equal(openQuestionCount({ ownQuestions: ["a", "b", "c"], asked: ["b"] }), 2);
  assert.equal(openQuestionCount({}), 0);
});

test("mucositis topic shows only the options tested in the person's treatment", async () => {
  const { CARE_TOPICS, topicSections } = await import("../src/data/care.js");
  const t = CARE_TOPICS.find((x) => x.id === "sore");
  const txt = (tx) => topicSections(t, { tx }).flatMap((s) => s.steps).join(" ");
  assert.match(txt(["chemo"]), /Ice chips/); assert.doesNotMatch(txt(["chemo"]), /Benzydamine|Chlorhexidine|Honey/);
  assert.match(txt(["rt_hn"]), /Benzydamine/); assert.match(txt(["rt_hn"]), /Chlorhexidine/); assert.doesNotMatch(txt(["rt_hn"]), /Ice chips/);
  assert.ok(t.steps.length > 15);
});

test("postcodes map to states, and the find link searches near the postcode", async () => {
  const { stateFromPostcode, findNearHref, rolesText } = await import("../src/data/careTeam.js");
  assert.equal(stateFromPostcode("4558"), "QLD"); assert.equal(stateFromPostcode("2600"), "ACT"); assert.equal(stateFromPostcode("0800"), "NT");
  assert.equal(stateFromPostcode("2000"), "NSW"); assert.equal(stateFromPostcode("12"), null);
  assert.match(findNearHref("dentists", "4558"), /dentists%20near%204558/);
  assert.equal(rolesText({ situation: ["meds"] }), "specialist, dentist, pharmacy and GP");
});
