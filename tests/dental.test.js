// Every branch of the Teeth and gums checker. Mirrors the plan doc, section 5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BANDS, OUTCOMES, TREES, TREE_ORDER, step } from "../src/data/dental.js";
import { REFS } from "../src/data/references.js";

const none = { low: false, bone: false, rt: false };
const low = { low: true, bone: false, rt: false };
const bone = { low: false, bone: true, rt: false };
const rt = { low: false, bone: true, rt: true };

/** Walk a tree with a list of answers; returns the result. */
function run(tree, answers, ctx = none) {
  let at = [tree, TREES[tree].start];
  const ans = {};
  for (const v of answers) {
    ans[`${at[0]}.${at[1]}`] = v;
    const r = step(at[0], at[1], v, ans, ctx);
    if (r.done) return r.done;
    at = r.next;
  }
  throw new Error(`${tree}: no outcome after ${JSON.stringify(answers)} (stopped at ${at.join(".")})`);
}
const band = (...a) => run(...a).band;
const main = (...a) => run(...a).main.id;

test("every tree is listed, every option leads somewhere real", () => {
  assert.deepEqual([...TREE_ORDER].sort(), Object.keys(TREES).sort());
  for (const [t, tree] of Object.entries(TREES)) {
    assert.ok(tree.q[tree.start], `${t} start`);
    for (const [qid, q] of Object.entries(tree.q)) for (const o of q.options) {
      if (o.q) assert.ok(tree.q[o.q], `${t}.${qid}.${o.v} → ${o.q}`);
      else if (o.go) assert.ok(TREES[o.go[0]]?.q[o.go[1]], `${t}.${qid}.${o.v} → ${o.go}`);
      else if (typeof o.out === "string") assert.ok(OUTCOMES[o.out], `${t}.${qid}.${o.v} → ${o.out}`);
      else assert.equal(typeof o.out, "function", `${t}.${qid}.${o.v} has no destination`);
    }
  }
});

test("every outcome, for every kind of patient, has a band, words and real sources", () => {
  for (const ctx of [none, low, bone, rt, { low: true, bone: true, rt: true }])
    for (const [id, f] of Object.entries(OUTCOMES)) {
      const o = f(ctx, { look: ["gumline", "many"], signs: ["swollen"], what: "filling", feel: "sharp" });
      assert.ok(BANDS[o.band], `${id} band`);
      assert.ok(o.title && o.body.length, `${id} words`);
      for (const r of o.refs) assert.ok(REFS[r], `${id} → ${r}`);
    }
});

// 1. Gums
test("gums: brushing only → home care; during chemo → tell the team", () => {
  assert.equal(band("gums", ["brush", []]), "home");
  assert.equal(band("gums", ["brush", []], low), "tell");
});
test("gums: on their own → call today; heavy → now; oozing → today", () => {
  assert.equal(band("gums", ["own", "stopped", []]), "team");
  assert.equal(band("gums", ["own", "heavy"]), "now");
  assert.equal(band("gums", ["own", "ooze"]), "team");
});
test("gums: spots, blood blisters or bruising → call today, for anyone", () => {
  for (const s of ["spots", "blisters", "bruise"]) assert.equal(band("gums", ["brush", [s]]), "team", s);
});
test("gums: bad taste or smell → dentist in 24 h; team today when counts may be low", () => {
  assert.equal(band("gums", ["brush", ["smell"]]), "24h");
  assert.equal(band("gums", ["brush", ["smell"]], low), "team");
});
test("gums: the most urgent answer leads and the rest follow", () => {
  const r = run("gums", ["brush", ["swollen", "spots"]]);
  assert.equal(r.main.id, "low_platelets");
  assert.ok(r.also.some((o) => o.id === "brush_bleed"));
});
test("gums: since an extraction → the extraction bleeding question", () => {
  assert.equal(main("gums", ["extract", "heavy"]), "extract_bleed_now");
});

// 2. Toothache
test("toothache: brief and sharp → the sensitivity questions", () => {
  assert.equal(main("toothache", ["quick", []]), "sensitivity");
});
test("toothache: each kind of pain has its own default", () => {
  assert.equal(main("toothache", ["lingers", []]), "pulpitis");
  assert.equal(band("toothache", ["lingers", []]), "week");
  assert.equal(band("toothache", ["bite", []]), "24h");
  assert.equal(band("toothache", ["bite", []], low), "team");
  assert.equal(main("toothache", ["spread", []]), "jaw_ache");
});
test("toothache: swelling, pus, uncontrolled pain and numbness escalate", () => {
  assert.equal(main("toothache", ["lingers", ["swelling"]]), "abscess");
  assert.equal(band("toothache", ["lingers", ["pus"]], low), "team");
  assert.equal(band("toothache", ["lingers", ["meds"]]), "24h");
  assert.equal(main("toothache", ["spread", ["numb"]]), "numb");
});
test("toothache: jaw ache explains vinca alkaloids during chemo and jaw bone risk after RT", () => {
  assert.match(run("toothache", ["spread", []], low).main.body.join(" "), /vincristine/);
  assert.match(run("toothache", ["spread", []], bone).main.body.join(" "), /jaw bone/);
  assert.doesNotMatch(run("toothache", ["spread", []]).main.body.join(" "), /vincristine|jaw bone/);
});
test("before-treatment warnings follow the treatment", () => {
  assert.match(run("toothache", ["lingers", []], low).main.body.join(" "), /blood test/);
  assert.match(run("toothache", ["lingers", []], bone).main.body.join(" "), /taken out/);
  assert.doesNotMatch(run("toothache", ["lingers", []]).main.body.join(" "), /blood test|taken out/);
});

// 3. Sensitive
test("sensitive: brief → home care; lingering → toothache advice", () => {
  assert.equal(band("sensitive", ["quick", []]), "home");
  assert.equal(main("sensitive", ["lingers"]), "pulpitis");
});
test("sensitive: visible decay → dentist; radiation caries note only after head and neck RT", () => {
  assert.equal(band("sensitive", ["quick", ["hole"]]), "week");
  assert.match(run("sensitive", ["quick", ["gumline"]], rt).main.body.join(" "), /radiotherapy/);
  assert.doesNotMatch(run("sensitive", ["quick", ["gumline"]]).main.body.join(" "), /radiotherapy/);
});

// 4. Broken
test("broken: breathed in → now; otherwise within a week; aching → toothache", () => {
  assert.equal(band("broken", ["inhaled"]), "now");
  for (const f of ["fine", "sharp", "sensitive"]) assert.equal(band("broken", ["chip", f]), "week", f);
  assert.equal(main("broken", ["filling", "aches"]), "pulpitis");
  assert.match(run("broken", ["filling", "fine"]).main.body.join(" "), /temporary filling/);
});

// 5. Swelling
test("swelling: airway → now; fever → now during chemo, 24 h otherwise", () => {
  assert.equal(band("swelling", ["airway"]), "now");
  assert.equal(band("swelling", ["fever"], low), "now");
  assert.equal(band("swelling", ["fever"]), "24h");
});
test("swelling: by place", () => {
  assert.equal(band("swelling", ["none", "tooth"]), "24h");
  assert.equal(band("swelling", ["none", "cheek"], low), "team");
  assert.equal(main("swelling", ["none", "wisdom", "none", "yes"]), "pericoronitis_ok");
  assert.equal(band("swelling", ["none", "lump"]), "week");
});

// 6. Loose
test("loose: knock → 24 h; bone or numbness → 24 h; otherwise a week", () => {
  assert.equal(band("loose", ["knock"]), "24h");
  assert.equal(band("loose", ["sudden", ["bone"]]), "24h");
  assert.equal(band("loose", ["gradual", ["numb"]]), "24h");
  assert.equal(band("loose", ["gradual", []]), "week");
  assert.match(run("loose", ["sudden", []], bone).main.body.join(" "), /oncologist/);
});

// 7. Wisdom tooth
test("wisdom: airway → now; unwell → 24 h (team if low); pain relief decides the rest", () => {
  assert.equal(band("wisdom", ["airway"]), "now");
  assert.equal(band("wisdom", ["unwell"]), "24h");
  assert.equal(band("wisdom", ["unwell"], low), "team");
  assert.equal(band("wisdom", ["none", "yes"]), "week");
  assert.equal(band("wisdom", ["none", "no"]), "24h");
});

// 8. Extraction
test("extraction: dry socket, infection, non-healing, bleeding", () => {
  assert.equal(main("extraction", ["socket"]), "dry_socket");
  assert.equal(main("extraction", ["swelling"]), "abscess");
  assert.equal(main("extraction", ["bone"]), "bone_exposed");
  assert.equal(band("extraction", ["bleed", "ooze"]), "home");
  assert.equal(band("extraction", ["bleed", "ooze"], low), "team");
  assert.equal(band("extraction", ["bleed", "heavy"]), "now");
});

// 9. Denture
test("denture: stroke signs → now; the rest within a week (patches: tell team if low)", () => {
  assert.equal(band("denture", ["stroke"]), "now");
  for (const w of ["sore", "fit", "broken", "patches"]) assert.equal(band("denture", ["none", w]), "week", w);
  assert.equal(band("denture", ["none", "patches"], low), "tell");
});

// 10. Jaw
test("jaw: stuck open → now; infection → abscess; deep ache splits on bone risk", () => {
  assert.equal(band("jaw", ["stuck"]), "now");
  assert.equal(main("jaw", ["infection"]), "abscess");
  assert.equal(main("jaw", ["none", "ache"]), "tmd");
  assert.equal(main("jaw", ["none", "ache"], bone), "jaw_bone");
  assert.match(run("jaw", ["none", "opening"], rt).main.body.join(" "), /radiotherapy/);
});

import { describeAnswers } from "../src/data/dental.js";
test("the report spells out each question and answer", () => {
  const d = describeAnswers({ "gums.when": "own", "gums.now": "stopped", "gums.signs": [] });
  assert.equal(d.length, 3);
  assert.match(d[0].a, /On their own/);
  assert.equal(d[2].a, "None of these");
});
