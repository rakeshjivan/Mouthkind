// ─── About the person (Me) ─────────────────────────────────────────────────
// Gender options follow the ABS Standard for Sex, Gender, Variations of Sex
// Characteristics and Sexual Orientation Variables (2020), the accepted
// Australian standard for inclusive data collection.
export const GENDERS = [
  { v: "woman", label: "Woman or female" },
  { v: "man", label: "Man or male" },
  { v: "nonbinary", label: "Non-binary" },
  { v: "different", label: "I use a different term" },
  { v: "none", label: "Prefer not to answer" },
];

/** Whole years from an ISO date (yyyy-mm-dd) to now, or null. */
export function ageFrom(dob, now = new Date()) {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(+d) || d > now) return null;
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/** The age band used by both risk checks. */
export const ageBand = (age) => (age == null ? null : age < 40 ? "u40" : age < 65 ? "40" : age < 80 ? "65" : "80");

// Treatments from the welcome that the dry mouth risk check asks about.
const RISK_TX = ["rt_hn", "transplant", "rai", "immuno", "chemo"];

/** Answers the risk checks can take from Me instead of asking: { age?, sex?, cancer? } */
export function profileAnswers(profile = {}, now = new Date()) {
  const out = {};
  // Someone in cancer care has already told us their treatments, so the check doesn't ask again.
  if ((profile.situation || []).includes("cancer") && (profile.treatments || []).length) out.cancer = (profile.treatments || []).filter((t) => RISK_TX.includes(t));
  const band = ageBand(ageFrom(profile.dob, now));
  if (band) out.age = band;
  const g = profile.gender;
  if (g) out.sex = { woman: "f", man: "m", nonbinary: "nb", different: "diff" }[g] || "x";
  return out;
}

/** The name to greet with. */
export const firstName = (p = {}) => (p.firstName || p.name || "").trim();
