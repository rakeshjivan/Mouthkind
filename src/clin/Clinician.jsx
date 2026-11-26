// ─── The clinician view ────────────────────────────────────────────────────
// Clinical decision support for a registered health professional, on the patient's
// phone in the chair. It shows what the patient reported, the app's referenced
// assessment and the plan options; the professional chooses, adds a note and a review
// date, and signs. Only a signed plan reaches the patient's screens.
import { unsureOf } from "../data/risk.js";
import { useMemo, useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { REFS } from "../data/references.js";
import { PRODUCTS } from "../data/products.js";
import { CARE_TOPICS } from "../data/care.js";
import { sipLevel } from "../data/clinical.js";
import { phZone } from "../data/ph.js";
import { fmtDate, fmtShort } from "../lib/store.js";
import { AHPRA, findings, findingsText, fullName, sendFindings } from "./findings.js";

export const PROFESSIONS = ["Dentist", "Dental specialist", "Oral health therapist, dental hygienist or therapist", "Medical practitioner", "Nurse practitioner or registered nurse", "Pharmacist", "Other registered health professional"];
const MONTHS = [1, 3, 6, 12];
const addMonths = (ts, n) => { const d = new Date(ts); d.setMonth(d.getMonth() + n); return d.getTime(); };

export const Banner = () => (
  <p className="clin-banner" role="note"><Icon name="info" size={16} /> Decision support for health professionals. It does not replace your clinical judgement.</p>
);

function Refs({ refs = [] }) {
  if (!refs.length) return null;
  return <span className="clin-refs">{refs.map((k) => REFS[k]?.short || k).join("; ")}</span>;
}

function FactorTable({ rows }) {
  return (
    <div className="rep-scroll" tabIndex={0} role="region" aria-label="Factors">
      <table className="clin-table"><thead><tr><th>Factor</th><th>Points</th><th>Source</th></tr></thead>
        <tbody>{rows.map((f) => <tr key={f.q + f.v}><td>{f.label}</td><td>{f.pts}</td><td><Refs refs={f.refs} /></td></tr>)}</tbody></table>
    </div>
  );
}

/** `options` from buildOptions(model); `ctx` from careContext, for the Learn topics. */
export function ClinicianSheet({ profile, setProfile, entries, options, ctx, onClose }) {
  const signed = profile.clinPlan;
  const last = profile.clinBy || signed?.by || {};
  const [step, setStep] = useState("confirm");
  const [by, setBy] = useState({ name: last.name || "", profession: last.profession || PROFESSIONS[0], ahpra: last.ahpra || "" });
  const [ok, setOk] = useState(false);
  const [touched, setTouched] = useState(false);
  const [picked, setPicked] = useState(() => (signed ? signed.items.map((i) => i.id).filter((id) => options.some((o) => o.id === id)) : []));
  const [own, setOwn] = useState(() => (signed?.items || []).filter((i) => i.own).map((i) => i.title).join("\n"));
  const [topics, setTopics] = useState(() => signed?.topics || CARE_TOPICS.filter((t) => t.forYou(ctx)).map((t) => t.id));
  const [note, setNote] = useState(signed?.note || "");
  const [months, setMonths] = useState(3);
  const [sent, setSent] = useState(null);
  const f = useMemo(() => findings(profile, entries), [profile, entries]);
  const name = fullName(profile);
  const ahpraOk = AHPRA.test(by.ahpra.trim().toUpperCase());
  const canGo = by.name.trim() && ahpraOk && ok;
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const al = [].concat(profile.fu?.allergy?.v || []).filter((x) => x !== "none");
  const dialysis = f.r?.factors.some((x) => x.v === "dialysis");

  const sign = () => {
    const ts = Date.now();
    const items = options.filter((o) => picked.includes(o.id)).map(({ item }) => {
      const { because, kept, ...rest } = item;
      return { ...rest, because: [] };
    });
    own.split("\n").map((s) => s.trim()).filter(Boolean).forEach((t, i) => items.push({ id: `own.${i}`, own: true, title: t, body: t, because: [], refs: [], products: [] }));
    const who = { name: by.name.trim(), profession: by.profession, ahpra: by.ahpra.trim().toUpperCase() };
    setProfile({ ...profile, clinBy: who, planDone: {}, clinPlan: { by: who, ts, review: addMonths(ts, months), note: note.trim(), items, topics } });
    setStep("done");
  };
  const send = async () => setSent(await sendFindings(findingsText(profile, entries, profile.clinPlan), `Mouthkind findings${name ? ` for ${name}` : ""}`));

  if (step === "confirm") return (
    <Sheet title="For a health professional" onClose={onClose}
      footer={<button className="btn primary big" disabled={!canGo} onClick={() => setStep("review")}>Continue</button>}>
      <h2 className="q">This part is for a health professional</h2>
      <p className="lede tight">It shows the app's assessment and plan options for the professional to review and choose from. If you're the patient, hand your phone to your dentist, doctor or nurse.</p>
      <label className="field"><span>Your name</span><input value={by.name} onChange={(e) => setBy({ ...by, name: e.target.value })} autoComplete="name" /></label>
      <label className="field"><span>Profession</span>
        <select className="clin-select" value={by.profession} onChange={(e) => setBy({ ...by, profession: e.target.value })}>{PROFESSIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="field"><span>AHPRA registration number</span>
        <input value={by.ahpra} onChange={(e) => setBy({ ...by, ahpra: e.target.value.toUpperCase() })} onBlur={() => setTouched(true)} placeholder="e.g. DEN0001234567" autoCapitalize="characters" aria-invalid={touched && !ahpraOk} aria-describedby="ahpra-hint" />
        <em id="ahpra-hint" className={`clin-hint${touched && !ahpraOk ? " bad" : ""}`}>{touched && !ahpraOk ? "Three letters, then ten digits." : "Checked for format only."}</em></label>
      <button type="button" className={`pick-row tick${ok ? " on" : ""}`} aria-pressed={ok} onClick={() => setOk(!ok)}>
        <span className="tick-box" aria-hidden="true">{ok && <Icon name="check" size={18} stroke={3} />}</span>
        <span><strong>I'm a registered health professional reviewing this with the patient</strong></span>
      </button>
      <p className="soft-note">Claiming to be a registered health practitioner when you're not is an offence under the Health Practitioner Regulation National Law (s 116).</p>
    </Sheet>
  );

  if (step === "done") return (
    <Sheet title="Plan signed" onClose={onClose}
      footer={<><button className="btn ghost" onClick={send}><Icon name="send" size={18} /> Send findings</button><button className="btn primary big" onClick={onClose}>Hand back</button></>}>
      <div className="lite-saved"><span className="lite-saved-mark" aria-hidden="true"><Icon name="check" size={28} stroke={3} /></span>
        <h2 className="q">Plan saved</h2>
        <p className="lede">The patient's Today screen now shows your plan, signed {by.name.trim()}, {fmtDate(Date.now())}. Review by {fmtDate(profile.clinPlan?.review || addMonths(Date.now(), months))}.</p></div>
      {sent === "mail" && <p className="soft-note">Your mail app should open with the findings. Add the address to send them.</p>}
    </Sheet>
  );

  return (
    <Sheet title="Clinician view" onClose={onClose}
      footer={<><button className="btn ghost" onClick={send}><Icon name="send" size={18} /> Send findings</button><button className="btn primary big" disabled={!picked.length && !own.trim()} onClick={sign}>Sign plan</button></>}>
      <Banner />
      <h2 className="q">{name || "Patient"}</h2>
      <p className="lede tight">{[profile.dob && `Born ${fmtDate(new Date(`${profile.dob}T00:00:00`).getTime())}`, signed && `Last plan ${fmtDate(signed.ts)} by ${signed.by.name}`].filter(Boolean).join(" · ") || "Patient-reported answers and records"}</p>

      {(al.length > 0 || dialysis) && (
        <section className="clin-warn" aria-label="Safety notes">
          <h3><Icon name="alert" size={18} /> Safety notes</h3>
          <ul>
            {al.includes("milk") && <li>Milk protein allergy: CPP-ACP products (Tooth Mousse™) are contraindicated.</li>}
            {al.includes("hb") && <li>Hydroxybenzoate (paraben) allergy: GC Dry Mouth Gel is contraindicated.</li>}
            {dialysis && <li>On dialysis: fluid limit. Water advice is limited to "within your fluid limit".</li>}
          </ul>
        </section>
      )}

      <section className="clin-sec">
        <h3>Patient-reported</h3>
        <p><b>Dry mouth assessment (Summated Xerostomia Inventory, 5–15):</b> {f.sips.length ? f.sips.slice(-6).map((s) => `${s.sip} (${sipLevel(s.sip).label.toLowerCase()}, ${fmtShort(s.ts)})`).join(", ") : "none recorded"}.</p>
        <p><b>Saliva pH:</b> {f.phs.length ? f.phs.slice(-6).map((p) => `${p.ph.toFixed(1)} (${fmtShort(p.ts)})`).join(", ") : "none recorded"}.{f.phs.length > 0 && ` Latest zone: ${phZone(f.phs.at(-1).ph).label.toLowerCase()}.`}</p>
        <p><b>Mouth diary, last 4 weeks:</b> {f.recent.length ? `${f.recent.length} ${f.recent.length === 1 ? "entry" : "entries"}; average dryness ${f.dryAvg ?? "–"}/10, pain ${f.painAvg ?? "–"}/10.` : "no entries."}</p>
        {f.flags.length > 0 && <ul className="clin-flags">{f.flags.map((x) => <li key={x}>{x}</li>)}</ul>}
        {f.jaws.length > 0 && <p><b>Jaw opening:</b> {f.jaws.slice(-4).map((j) => `${j.fingers === 3 ? "3+" : j.fingers} (${fmtShort(j.ts)})`).join(", ")} fingers.{f.jaws.at(-1).fingers < 3 && " Fewer than 3 fingers can indicate early trismus."}</p>}
      </section>

      <section className="clin-sec">
        <h3>Assessment</h3>
        {f.r ? (<>
          <p><b>Dry mouth risk: {f.r.score}/100, {f.r.band.label.toLowerCase()}</b> ({fmtDate(f.risk.ts)}). A points-based checklist of published risk factors; not a validated instrument.</p>
          {unsureOf(f.risk.answers).length > 0 && <p className="soft-note"><b>Answered "Not sure":</b> {unsureOf(f.risk.answers).join(", ").toLowerCase()}. Go through these with the patient; the score may be low.</p>}
          {f.r.factors.length > 0 && <FactorTable rows={f.r.factors} />}
        </>) : <p>Dry mouth risk check not done.</p>}
        <p className="soft-note">Tooth decay risk is not assessed by the app: assess it clinically. Tooth Mousse™ and fluoride options below are listed for a dry mouth, where saliva's protection of the teeth is reduced.</p>
        {f.pat.level === "flag" && <p><b>pH pattern:</b> acidic in {f.pat.acid} of the last {f.pat.n} tests.</p>}
      </section>

      <section className="clin-sec">
        <h3>Plan options</h3>
        <p className="soft-note">Nothing is ticked for you. Tick what you want the patient to follow; "Suggested" marks the options the rules point to.</p>
        <div className="pick">
          {options.map((o) => {
            const on = picked.includes(o.id);
            const prods = (o.item.products || []).map((id) => PRODUCTS.find((p) => p.id === id)?.name).filter(Boolean);
            return (
              <div key={o.id} className={`clin-opt${o.contra ? " contra" : ""}`}>
                <button type="button" className={`pick-row tick${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(picked, setPicked, o.id)}>
                  <span className="tick-box" aria-hidden="true">{on && <Icon name="check" size={18} stroke={3} />}</span>
                  <span><strong>{o.item.title}</strong>{o.ticked && <span className="clin-sugg">Suggested</span>}<em>{(o.item.because || [])[0] || o.item.body}</em></span>
                </button>
                {o.warn.map((w) => <p key={w} className="clin-optwarn"><Icon name="alert" size={15} /> {w}</p>)}
                {(prods.length > 0 || o.item.refs?.length > 0) && (
                  <details className="clin-detail"><summary>Detail and sources</summary>
                    <p>{o.item.body}</p>
                    {prods.length > 0 && <p><b>Products:</b> {prods.join(", ")}</p>}
                    {o.item.refs?.length > 0 && <Sources refs={o.item.refs} />}
                  </details>
                )}
              </div>
            );
          })}
        </div>
        <label className="field"><span>Your own items, one per line</span>
          <textarea className="clin-text" rows={3} value={own} onChange={(e) => setOwn(e.target.value)} /></label>
      </section>

      <section className="clin-sec">
        <h3>Suggest topics to read</h3>
        <div className="chips">
          {CARE_TOPICS.filter((t) => !t.general).map((t) => { const on = topics.includes(t.id); return (
            <button key={t.id} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(topics, setTopics, t.id)}>{on && <Icon name="check" size={16} stroke={3} />}{t.title}</button>); })}
        </div>
      </section>

      <section className="clin-sec">
        <h3>Note and review</h3>
        <label className="field"><span>Note for the patient</span>
          <textarea className="clin-text" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="dseg" role="radiogroup" aria-label="Review in">
          {MONTHS.map((n) => <button key={n} type="button" role="radio" aria-checked={months === n} className={`dseg-btn${months === n ? " on" : ""}`} onClick={() => setMonths(n)}>{n} month{n === 1 ? "" : "s"}</button>)}
        </div>
        <p className="soft-note">Signing as {by.name.trim()}, {by.profession}, {by.ahpra.trim().toUpperCase()}.</p>
      </section>
      {sent === "mail" && <p className="soft-note">Your mail app should open with the findings. Add the address to send them.</p>}
    </Sheet>
  );
}

/** On the patient's Today: the signed plan's header, or how to get one. */
export function PlanFrom({ plan, onOpen, onSee, onSend }) {
  if (!plan) return (
    <section className="planfrom wait" aria-label="Your plan">
      <h2>Your plan comes from a health professional</h2>
      <p>When you see a dentist or another health professional, such as your doctor, nurse or pharmacist, hand them your phone. They'll go through your answers and choose your plan.</p>
      <div className="planfrom-acts"><button className="btn primary" onClick={onOpen}>For a health professional</button><button className="btn ghost" onClick={onSend}><Icon name="send" size={18} /> Send my answers</button></div>
    </section>
  );
  const due = Date.now() >= plan.review;
  return (
    <section className="planfrom" aria-label="Your plan">
      <p className="planfrom-k">Your plan from {plan.by.name}, {fmtDate(plan.ts)}</p>
      <p className="planfrom-sub">{plan.by.profession} · {due ? "Review due now" : `Review by ${fmtDate(plan.review)}`}</p>
      {plan.note && <p className="planfrom-note">"{plan.note}"</p>}
      <div className="planfrom-acts"><button className="btn ghost" onClick={onSee}>See my plan</button><button className="link-btn" onClick={onOpen}>For a health professional</button></div>
    </section>
  );
}
