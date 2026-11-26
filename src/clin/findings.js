// ─── Findings for the care team, as plain text ─────────────────────────────
// What the clinician view shows, written out so it can be emailed or shared. Nothing is
// sent by the app: the phone's own share sheet or mail app does that, and only when the
// person chooses to.
import { scoreRisk } from "../data/risk.js";
import { scoreDecay } from "../data/decay.js";
import { sipLevel } from "../data/clinical.js";
import { phPattern, phZone } from "../data/ph.js";
import { REFS } from "../data/references.js";
import { fmtDate } from "../lib/store.js";

// AHPRA registration numbers: three letters for the profession, then ten digits (e.g. DEN0001234567).
export const AHPRA = /^[A-Z]{3}\d{10}$/;

const latest = (entries, kind) => [...entries].filter((e) => e.kind === kind).sort((a, b) => b.ts - a.ts)[0];
export const sipsOf = (entries) => entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);
export const phsOf = (entries) => entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
export const fullName = (p = {}) => [p.firstName ?? p.name, p.lastName].filter(Boolean).join(" ").trim();

/** Everything the professional reviews, worked out once. */
export function findings(profile = {}, entries = []) {
  const risk = latest(entries, "risk"), decay = latest(entries, "decay");
  const r = risk ? scoreRisk(risk.answers) : null;
  const d = decay ? scoreDecay(decay.answers, decay.ctx) : null;
  const sips = sipsOf(entries), phs = phsOf(entries);
  const diary = entries.filter((e) => e.kind === "daily").sort((a, b) => a.ts - b.ts);
  const recent = diary.filter((e) => Date.now() - e.ts < 28 * 864e5);
  const avg = (k) => { const xs = recent.map((e) => e[k]).filter((x) => x != null); return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null; };
  const flags = recent.flatMap((e) => [
    e.bone === "yes" && `${fmtDate(e.ts)}: bone showing in the mouth`,
    e.sores === "bleed" && `${fmtDate(e.ts)}: bleeding that won't stop`,
    e.eat === "none" && `${fmtDate(e.ts)}: can't eat or drink`,
  ].filter(Boolean));
  const jaws = entries.filter((e) => e.kind === "jaw" && e.fingers).sort((a, b) => a.ts - b.ts);
  return { risk, r, decay, d, sips, phs, pat: phPattern(phs), diary, recent, dryAvg: avg("dryness"), painAvg: avg("pain"), flags, jaws };
}

/** The findings as plain text, for an email or a message. */
export function findingsText(profile = {}, entries = [], plan = null) {
  const f = findings(profile, entries);
  const L = [];
  const name = fullName(profile);
  L.push(`Mouthkind findings${name ? ` for ${name}` : ""}`);
  if (profile.dob) L.push(`Date of birth: ${fmtDate(new Date(`${profile.dob}T00:00:00`).getTime())}`);
  L.push(`Prepared ${fmtDate(Date.now())}. Patient-reported answers, with the app's referenced scoring. Decision support for health professionals; it does not replace clinical judgement.`, "");

  L.push("DRY MOUTH RISK CHECK");
  if (f.r) {
    L.push(`Score ${f.r.score}/100, ${f.r.band.label} (${fmtDate(f.risk.ts)}). Points-based checklist of published risk factors; not a validated instrument.`);
    f.r.factors.forEach((x) => L.push(`- ${x.label}: ${x.pts} pts${x.refs.length ? ` [${x.refs.map((k) => REFS[k]?.short || k).join("; ")}]` : ""}`));
  } else L.push("Not done.");
  L.push("");

  L.push("TOOTH DECAY RISK (patient-answered CAMBRA items)");
  if (f.d) {
    if (f.d.noTeeth) L.push("No natural teeth.");
    else {
      L.push(`${f.d.score} points, ${f.d.band.label} (${fmtDate(f.decay.ts)}). Clinical indicators not included.`);
      [...f.d.factors, ...f.d.protective].forEach((x) => L.push(`- ${x.label}: ${x.pts} pts${(x.refs || []).length ? ` [${x.refs.map((k) => REFS[k]?.short || k).join("; ")}]` : ""}`));
    }
  } else L.push("Not done.");
  L.push("");

  L.push("DRY MOUTH ASSESSMENT (Summated Xerostomia Inventory, 5 to 15)");
  if (f.sips.length) f.sips.slice(-8).forEach((s) => L.push(`- ${fmtDate(s.ts)}: ${s.sip}, ${sipLevel(s.sip).label}`));
  else L.push("None recorded.");
  L.push("");

  L.push("RESTING SALIVA pH (test strip)");
  if (f.phs.length) {
    f.phs.slice(-8).forEach((p) => L.push(`- ${fmtDate(p.ts)}: pH ${p.ph.toFixed(1)}, ${phZone(p.ph).label}`));
    if (f.pat.level === "flag") L.push(`Acidic in ${f.pat.acid} of the last ${f.pat.n} tests.`);
  } else L.push("None recorded.");
  L.push("");

  L.push("MOUTH DIARY (last 4 weeks)");
  if (f.recent.length) {
    L.push(`${f.recent.length} ${f.recent.length === 1 ? "entry" : "entries"}. Average dryness ${f.dryAvg ?? "–"}/10, average pain ${f.painAvg ?? "–"}/10.`);
    if (f.flags.length) { L.push("Red flags logged:"); f.flags.forEach((x) => L.push(`- ${x}`)); }
  } else L.push("No entries.");
  if (f.jaws.length) L.push(`Jaw opening: ${f.jaws.at(-1).fingers === 3 ? "3 or more" : f.jaws.at(-1).fingers} finger(s) on ${fmtDate(f.jaws.at(-1).ts)}.`);
  L.push("");

  const al = [].concat(profile.fu?.allergy?.v || []).filter((x) => x !== "none");
  if (al.length) L.push(`Allergies recorded: ${al.map((a) => (a === "milk" ? "milk protein" : a === "hb" ? "hydroxybenzoates (parabens)" : a)).join(", ")}.`, "");

  if (plan) {
    L.push(`PLAN signed by ${plan.by.name}, ${plan.by.profession} (AHPRA ${plan.by.ahpra}) on ${fmtDate(plan.ts)}. Review by ${fmtDate(plan.review)}.`);
    plan.items.forEach((it) => L.push(`- ${it.title}`));
    if (plan.note) L.push(`Note: ${plan.note}`);
  }
  return L.join("\n");
}

/** Share the findings with the phone's share sheet, or open an email. */
export async function sendFindings(text, subject = "Mouthkind findings") {
  try {
    if (navigator.share) { await navigator.share({ title: subject, text }); return "shared"; }
  } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  return "mail";
}
