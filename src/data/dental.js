// ─── Seeing a dentist: one full check-up message ────────────────────────────
// Every "see your dentist" item uses the same reassuring core: a check-up finds and
// fixes small problems early. Each situation adds only what is different.
// Evidence: dental evaluation before cancer therapy (Elad 2015, MASCC/ISOO/EBMT; Elad 2020);
// dental infection during treatment is uncommon (~5%), and when time is short a partial
// protocol is reasonable (Hong 2010, Hong 2018); radiotherapy timing (Peterson 2024);
// bone medicines (Yarom 2019); recall by risk (Featherstone 2021, NICE CG19).

export const CHECKUP_INTRO = "A check-up finds small problems early, while they're simple to fix. Your dentist will:";
export const CHECKUP_POINTS = [
  "check every tooth for decay, and treat any they find",
  "repair broken teeth, and worn or loose fillings",
  "check your gums for gum disease, and clean below the gumline",
  "look for any infection or abscess, and treat it",
  "check that dentures fit well and don't rub",
  "look over your whole mouth: tongue, cheeks, lips and throat",
];
export const CHECKUP_CLOSE = "Most people need little or nothing done. If a tooth can't be saved, your dentist will talk it through with you first.";
export const NO_DENTIST = "No dentist? Ask your cancer team or GP for a referral. Many hospitals have a dental service for people having cancer treatment, and your state's public dental service can also help.";
export const NO_DENTIST_GENERAL = "No dentist? Your GP can suggest one nearby, and your state's public dental service can help if cost is a worry.";

const DENTURE_POINTS = [
  "check that your dentures fit well and don't rub",
  "look for sore spots, thrush or ulcers under the dentures",
  "check your gums and the ridges the dentures sit on",
  "look over your whole mouth: tongue, cheeks, lips and throat",
];

/** A full check-up plan item: { title, body, list, note }. `extra` is what this situation adds. */
export function checkup({ title = "Book a full check-up with your dentist", extra = "", note = "", dentures = false } = {}) {
  return {
    title,
    // Reassurance first: what a check-up does. Then what this situation adds.
    body: dentures ? "A check-up keeps your gums and mouth healthy and your dentures comfortable. Your dentist will:" : CHECKUP_INTRO,
    list: dentures ? DENTURE_POINTS : CHECKUP_POINTS,
    note: [dentures ? "Once a year is enough for most people with dentures." : CHECKUP_CLOSE, extra, note].filter(Boolean).join(" "),
  };
}
