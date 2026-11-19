// ─── Building the plan ─────────────────────────────────────────────────────
// The checks and questions come first, in one order; the plan appears once, at
// the end. After that, questions never pop up; any new ones wait behind an
// optional "Refine your plan" link on the plan.

export const SETUP_STEPS = [
  { id: "risk", label: "Dry mouth risk check", short: "Dry mouth risk", sheet: "risk" },
  { id: "decay", label: "Tooth decay check", short: "Tooth decay", sheet: "decay" },
  { id: "sip", label: "Dry mouth score", short: "Dry mouth score", sheet: "sip" },
  { id: "ph", label: "Saliva pH test", short: "pH test", sheet: "ph", optional: true },
  { id: "questions", label: "A few questions about you", short: "A few questions", sheet: "setupq" },
];

/** Where the person is up to: { steps, built, next, at, total } */
export function setupState({ entries = [], profile = {}, openQs = 0 } = {}) {
  const has = (k) => entries.some((e) => (k === "sip" ? e.sip != null && e.kind !== "risk" : k === "ph" ? e.ph != null : e.kind === k));
  const done = { risk: has("risk"), decay: has("decay"), sip: has("sip"), ph: has("ph") || !!profile.phSkip };
  // Questions come from the checks, so this step can only be done once they are.
  done.questions = done.risk && done.decay && done.sip && done.ph && openQs === 0;
  const steps = SETUP_STEPS.map((s) => ({ ...s, done: done[s.id] }));
  const all = steps.every((s) => s.done);
  return { steps, built: !!profile.planBuilt || all, all, next: steps.find((s) => !s.done) || null, at: steps.filter((s) => s.done).length, total: steps.length };
}
