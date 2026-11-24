// What each persona would see: plan, routine, questions and mouth-log tips.
// `node tests/audit.js` prints it all; tests/logic.test.js checks the rules.
import { PERSONAS, NOW } from "./personas.js";
import { buildModel, buildPlan, openQuestions, optionsFor } from "../src/data/engine.js";
import { decayContext } from "../src/data/decay.js";
import { scoreRisk } from "../src/data/risk.js";
import { phPattern } from "../src/data/ph.js";
import { buildRoutine } from "../src/data/routine.js";
import { triageFor, DAILY_TIPS } from "../src/data/daily.js";
import { inCancerCare } from "../src/data/journey.js";
import { scoreDecay } from "../src/data/decay.js";

/** The same context the app gives the decay check (App.jsx). */
export function withContext(p) {
  const risk = p.entries.find((e) => e.kind === "risk");
  const rh = (q, v) => [].concat(risk?.answers?.[q] || []).includes(v);
  const sips = p.entries.filter((e) => e.kind === "sip").sort((a, b) => a.ts - b.ts);
  const phs = p.entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const ctx = decayContext({ dryRisk: risk ? scoreRisk(risk.answers).band.id : null, sip: sips.at(-1)?.sip ?? null, ph: phPattern(phs).level,
    ageAns: risk?.answers?.age || null, rtHN: rh("cancer", "rt_hn") || (inCancerCare(p.profile) && (p.profile.treatments || []).includes("rt_hn")),
    sjogren: rh("conditions", "sjogren"),
    acid: rh("conditions", "pregnantSick") ? "Morning sickness or vomiting" : rh("conditions", "eating") || rh("conditions", "reflux") ? "Vomiting or reflux" : null,
    smoke: risk ? rh("habits", "smoke") || rh("habits", "vape") : null });
  return p.entries.map((e) => (e.kind === "decay" ? { ...e, ctx: { ...ctx, ...e.ctx } } : e));
}

export function see(p) {
  const entries = withContext(p);
  const m = buildModel({ profile: p.profile, entries, now: NOW });
  const plan = buildPlan(m);
  const routine = buildRoutine(plan, { noTeeth: m.noTeeth });
  const qs = openQuestions(m).map((q) => ({ id: q.id, text: q.text(m), options: optionsFor(q, m).map((o) => o.label) }));
  const decayE = entries.find((e) => e.kind === "decay");
  const dr = decayE && scoreDecay(decayE.answers, decayE.ctx);
  const tri = p.log ? triageFor(p.log, p.profile, { noTeeth: m.noTeeth, decayRisk: !!dr && !dr.noTeeth && dr.band.id !== "low", fluidLimit: m.has("conditions", "dialysis") }) : null;
  return { m, plan, routine, qs, tri, tips: tri ? tri.tips.map((k) => ({ k, ...DAILY_TIPS[k] })) : [] };
}

if (process.argv[1]?.endsWith("audit.js")) {
  for (const p of PERSONAS) {
    const { m, plan, routine, qs, tri } = see(p);
    console.log(`\n━━ ${p.name}`);
    console.log(`   risk ${m.risk?.band.id} (${m.risk?.score}) · decay ${m.noTeeth ? "no teeth" : m.decay?.band.id} · sip ${m.sip?.sip ?? "-"} · cancer ${m.cancer}`);
    plan.forEach((i) => console.log(`   ${String(i.pri).padStart(3)} ${i.id.padEnd(16)} ${i.title}${i.products?.length ? `  [${i.products.join(",")}]` : ""}`));
    console.log("   routine:", routine.map((r) => `${r.slot}:${r.text}`).join(" | "));
    if (qs.length) console.log("   asks:", qs.map((q) => `${q.id} "${q.text}"`).join(" · "));
    if (tri) console.log(`   log → ${tri.level}; tips ${tri.tips.join(",")}${tri.notes.length ? `; notes: ${tri.notes.join(" / ")}` : ""}`);
  }
}
