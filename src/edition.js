// Which app this build is.
//   "full"      — the app as released: risk checks, a personal plan, routine, triage and shop.
//   "compliant" — a version built to stay outside TGA medical device regulation and the
//                 advertising rules: a diary, records, general information and the care team.
//                 No risk prediction, no personalised treatment or product advice, no
//                 triage from what's logged, no brands and no links to buy.
//   "clinician" — TGA option 3: the full app's engine, with its results and plan options
//                 shown only in a clinician view. A registered professional chooses and
//                 signs the plan the patient follows.
// VITE_EDITION=full (or compliant) builds another edition, for its own tests.
export const EDITION = import.meta.env?.VITE_EDITION || "clinician";
