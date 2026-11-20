import { test } from "node:test";
import assert from "node:assert/strict";
import { careContacts, contactRoles, getContact, openQuestionCount, setContact } from "../src/data/careTeam.js";

test("cancer care gets the 24-hour line, specialist and nurse; others don't see a treatment line", () => {
  const ids = (p) => contactRoles(p).map((r) => r.id);
  assert.deepEqual(ids({ situation: ["cancer"] }), ["line24", "specialist", "nurse", "dentist", "gp"]);
  assert.deepEqual(ids({ situation: ["meds"] }), ["specialist", "dentist", "gp"]);
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
