// ─── Your teeth and gums ───────────────────────────────────────────────────
// Basic dental questions, saved as the person's own record. No score and no band: the
// professional assesses decay and gum health in the chair. Three answers add the same
// general line for everyone who gives them ("Book in with a dentist").
import { infoFor } from "./optionInfo.js";

export const TEETH_QUESTIONS = [
  { id: "dTeeth", type: "one", section: "Teeth and gums", text: "Do you have your own teeth?",
    options: [{ v: "natural", label: "Yes, all or most of them" }, { v: "both", label: "Some, with a denture" }, { v: "dentures", label: "No, I wear full dentures" }] },
  { id: "dPain", type: "many", section: "Teeth and gums", text: "Do your teeth hurt or feel sensitive?", none: "No", when: (a) => a.dTeeth !== "dentures",
    options: [{ v: "sensitive", label: "Sensitive to hot, cold or sweet" }, { v: "pain", label: "Pain when biting, or toothache" }] },
  { id: "dGums", type: "one", section: "Teeth and gums", text: "Do your gums bleed when you brush or clean between your teeth?", when: (a) => a.dTeeth !== "dentures",
    options: [{ v: "yes", label: "Yes, most times" }, { v: "sometimes", label: "Sometimes" }, { v: "no", label: "No" }] },
  { id: "dBrush", type: "one", section: "Teeth and gums", text: "How often do you brush your teeth?", when: (a) => a.dTeeth !== "dentures",
    options: [{ v: "twice", label: "Twice a day or more" }, { v: "once", label: "Once a day" }, { v: "less", label: "Less than once a day" }] },
  { id: "dFluoride", type: "one", section: "Teeth and gums", text: "Does your toothpaste have fluoride?", when: (a) => a.dTeeth !== "dentures",
    options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "unsure", label: "Not sure" }] },
  { id: "dBetween", type: "one", section: "Teeth and gums", text: "Do you clean between your teeth?", hint: "Floss, small interdental brushes or a water flosser.", when: (a) => a.dTeeth !== "dentures",
    options: [{ v: "daily", label: "Every day" }, { v: "some", label: "Sometimes" }, { v: "never", label: "Rarely or never" }] },
  { id: "dSugar", type: "one", section: "What you eat and drink", text: "How often do you have sugary snacks or drinks between meals?",
    hint: "Including sweet tea or coffee, juice, soft drink, biscuits and lollies.",
    options: [{ v: "rare", label: "Rarely" }, { v: "daily", label: "Once or twice a day" }, { v: "often", label: "Three or more times a day" }] },
  { id: "dAcid", type: "one", section: "What you eat and drink", text: "How often do you have acidic drinks?", hint: "Soft drink, juice, sports drinks, wine, kombucha, or lemon in water.",
    options: [{ v: "rare", label: "Rarely" }, { v: "daily", label: "Once a day" }, { v: "often", label: "More than once a day" }] },
  { id: "dVisit", type: "one", section: "Check-ups", text: "When did you last see a dentist?",
    options: [{ v: "year", label: "In the last year" }, { v: "two", label: "1 to 2 years ago" }, { v: "longer", label: "More than 2 years ago" }, { v: "never", label: "I don't remember, or never" }] },
];

export const teethQuestions = (a = {}) => TEETH_QUESTIONS.filter((q) => !q.when || q.when(a));

/** The record: each answer with its general information, and whether to book in with a dentist. */
export function teethRecord(answers = {}) {
  const rows = teethQuestions(answers).flatMap((q) => {
    const vs = [].concat(answers[q.id] ?? []);
    if (q.type === "many" && !vs.length) return [{ q: q.id, text: q.text, label: q.none, info: infoFor(q.id, "none") }];
    return q.options.filter((o) => vs.includes(o.v)).map((o) => ({ q: q.id, text: q.text, label: o.label, info: infoFor(q.id, o.v) }));
  });
  const book = [].concat(answers.dPain || []).includes("pain") || answers.dGums === "yes" || ["longer", "never"].includes(answers.dVisit);
  return { rows, book };
}

/** The dentures follow-up question, answered from here so it isn't asked twice. */
export const denturesFrom = (a = {}) => ({ natural: "no", both: "partial", dentures: "full" })[a.dTeeth] || null;
