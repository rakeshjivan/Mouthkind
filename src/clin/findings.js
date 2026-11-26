// ─── Findings for the care team, as plain text ─────────────────────────────
// What the clinician view shows, written out so it can be emailed or shared. Nothing is
// sent by the app: the phone's own share sheet or mail app does that, and only when the
// person chooses to.
import { RISK_GROUPS, RISK_QUESTIONS, fullAnswers, scoreRisk, unsureOf } from "../data/risk.js";
import { medicineById } from "../data/medicines.js";
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

/**
 * "What can affect a dry mouth": what the person told us that is known to dry the mouth, in the
 * order the questions ask it, grouped, with the general information on each. No points, no
 * score, no band and no ranking: the same text appears for everyone who gives that answer.
 */
export function dryFactors(answers = {}) {
  const a = fullAnswers(answers);
  const rows = [];
  for (const q of RISK_QUESTIONS) {
    if (!q.options || q.id === "medFor") continue;
    const v = a[q.id];
    const picked = q.options.filter((o) => (q.type === "one" ? o.v === v : [].concat(v || []).includes(o.v)) && o.pts > 0);
    for (const o of picked) if (!rows.some((r) => r.q === q.id && r.v === o.v)) rows.push({ q: q.id, v: o.v, label: o.as || o.label, why: o.why || "", refs: o.refs || [] });
  }
  const named = (a.medList || []).map((x) => { const m = x.id ? medicineById(x.id) : null; return { name: x.name || m?.g || "", known: m ? (m.c === "rep" ? "reported" : m.c ? "known" : "no") : "unknown" }; }).filter((x) => x.name);
  const groups = RISK_GROUPS.map((g) => ({ id: g.id, label: g.label, rows: rows.filter((r) => g.qs.includes(r.q)) })).filter((g) => g.rows.length);
  return { groups, named, none: !rows.length, unsure: unsureOf(answers) };
}

/** Everything the professional reviews, worked out once. */
export function findings(profile = {}, entries = []) {
  const risk = latest(entries, "risk");
  const r = risk ? scoreRisk(risk.answers) : null;
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
  return { risk, r, sips, phs, pat: phPattern(phs), diary, recent, dryAvg: avg("dryness"), painAvg: avg("pain"), flags, jaws };
}

/** The findings as plain text, for an email or a message. */
// `patient`: what the patient's own "Send my answers" sends: their answers and records, with no
// score, band or points of the app's own (those stay in the clinician view).
export function findingsText(profile = {}, entries = [], plan = null, { patient = false } = {}) {
  const f = findings(profile, entries);
  const L = [];
  const name = fullName(profile);
  L.push(`${patient ? "My Mouthkind answers" : "Mouthkind findings"}${name ? ` for ${name}` : ""}`);
  if (profile.dob) L.push(`Date of birth: ${fmtDate(new Date(`${profile.dob}T00:00:00`).getTime())}`);
  L.push(patient ? `Prepared ${fmtDate(Date.now())}. My own answers and records, for my dentist or care team.`
    : `Prepared ${fmtDate(Date.now())}. Patient-reported answers, with the app's referenced scoring. Decision support for health professionals; it does not replace clinical judgement.`, "");

  if (patient) {
    L.push("WHAT CAN AFFECT MY DRY MOUTH (my answers)");
    const x = f.risk ? dryFactors(f.risk.answers) : null;
    if (!x) L.push("Not done.");
    else {
      L.push(`Answered ${fmtDate(f.risk.ts)}.`);
      if (x.none) L.push("Nothing known to dry the mouth.");
      x.groups.forEach((g) => g.rows.forEach((r) => L.push(`- ${g.label}: ${r.label}`)));
      if (x.named.length) L.push(`Medicines I listed: ${x.named.map((m) => m.name).join(", ")}.`);
      if (x.unsure.length) L.push(`I wasn't sure about: ${x.unsure.join(", ").toLowerCase()}.`);
    }
    L.push("");
  } else {
  L.push("DRY MOUTH RISK CHECK");
  if (f.r) {
    L.push(`Score ${f.r.score}/100, ${f.r.band.label} (${fmtDate(f.risk.ts)}). Points-based checklist of published risk factors; not a validated instrument.`);
    const un = unsureOf(f.risk.answers);
    if (un.length) L.push(`Patient answered "Not sure" for: ${un.join(", ").toLowerCase()}. Go through these; the score may be low.`);
    f.r.factors.forEach((x) => L.push(`- ${x.label}: ${x.pts} pts${x.refs.length ? ` [${x.refs.map((k) => REFS[k]?.short || k).join("; ")}]` : ""}`));
  } else L.push("Not done.");
  L.push("");
  }

  L.push("DRY MOUTH ASSESSMENT (Summated Xerostomia Inventory, 5 to 15)");
  if (f.sips.length) f.sips.slice(-8).forEach((s) => L.push(`- ${fmtDate(s.ts)}: ${s.sip}, ${sipLevel(s.sip).label}`));
  else L.push("None recorded.");
  L.push("");

  L.push("RESTING SALIVA pH (test strip)");
  if (f.phs.length) {
    f.phs.slice(-8).forEach((p) => L.push(`- ${fmtDate(p.ts)}: pH ${p.ph.toFixed(1)}${patient ? "" : `, ${phZone(p.ph).label}`}`));
    if (!patient && f.pat.level === "flag") L.push(`Acidic in ${f.pat.acid} of the last ${f.pat.n} tests.`);
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
