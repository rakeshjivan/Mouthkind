// ─── Building the plan ─────────────────────────────────────────────────────
// The baseline: the dry mouth risk check, the dry mouth assessment and the tooth decay check,
// then the care team's numbers (skippable) and a few questions, then the plan. The pH
// test is asked for afterwards and can be skipped by anyone without strips.
// After that, questions never pop up; any new ones wait behind an optional
// "Refine your plan" link on the plan.
import { careContacts } from "./careTeam.js";

export const SETUP_STEPS = [
  { id: "risk", label: "Dry mouth risk check", short: "Dry mouth risk", sheet: "risk", mins: 2 },
  { id: "sip", label: "Dry mouth assessment", short: "Dry mouth assessment", sheet: "sip", mins: 1 },
  { id: "teeth", label: "Your teeth and gums", short: "Teeth and gums", sheet: "teeth", mins: 2 },
  { id: "decay", label: "Tooth decay check", short: "Tooth decay check", sheet: "decay", mins: 2 },
  { id: "team", label: "Your care team's numbers", short: "Care team numbers", sheet: "careteam", mins: 1, optional: true },
  { id: "questions", label: "A few questions about you", short: "A few questions", sheet: "setupq", mins: 1 },
];

const has = (entries, k) => entries.some((e) => (k === "sip" ? e.sip != null && e.kind !== "risk" : k === "ph" ? e.ph != null : e.kind === k));

/** Where the person is up to: { steps, built, next, at, total, minsLeft } */
export function setupState({ entries = [], profile = {}, openQs = 0, skip = [] } = {}) {
  const done = { risk: has(entries, "risk"), sip: has(entries, "sip"), decay: has(entries, "decay"), teeth: has(entries, "teeth"), team: !!profile.teamAsked || careContacts(profile).length > 0 };
  // Questions come from the checks, so this step can only be done once they are.
  // `skip`: steps an edition leaves out (the clinician build has no tooth decay check).
  for (const k of skip) done[k] = true;
  done.questions = done.risk && done.sip && done.teeth && done.decay && done.team && openQs === 0;
  const steps = SETUP_STEPS.filter((s) => !skip.includes(s.id)).map((s) => ({ ...s, done: done[s.id] }));
  const all = steps.every((s) => s.done);
  const minsLeft = steps.filter((s) => !s.done).reduce((n, s) => n + s.mins, 0);
  return { steps, built: !!profile.planBuilt || all, all, next: steps.find((s) => !s.done) || null, at: steps.filter((s) => s.done).length, total: steps.length, minsLeft };
}

