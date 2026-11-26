// ─── The compliant edition's own screens ──────────────────────────────────
// Today, Records, Learn, the routine builder and the diary's "saved" note. Nothing here
// predicts risk, interprets what's logged, chooses a treatment or names a brand.
import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { BrandMark } from "../components/brandMark.jsx";
import { PhTimeline, SymptomChart } from "../components/kit.jsx";
import { RoutineCard } from "../screens/routine.jsx";
import { TEETH_FLAGS, teethFlags } from "../data/daily.js";
import { SIP_OPTIONS, SIP_QUESTIONS, phBand, sipLevel } from "../data/clinical.js";
import { PH_ZONES } from "../data/ph.js";
import { phColor } from "../data/clinical.js";
import { logDue, nextCheck, freqFor } from "../data/schedule.js";
import { activeTreatment, inCancerCare } from "../data/journey.js";
import { firstName } from "../data/person.js";
import { fmtDate, fmtShort } from "../lib/store.js";
import { CARE_TOPICS, topicSections } from "../data/care.js";
import { ROUTINE_LIBRARY } from "./routineLib.js";

const sipsOf = (entries) => entries.filter((e) => e.sip != null && e.kind === "sip").sort((a, b) => a.ts - b.ts);
const phsOf = (entries) => entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
const diaryOf = (entries) => entries.filter((e) => e.kind === "daily").sort((a, b) => a.ts - b.ts);

/** Setting up: three steps, the last two optional. */
export function liteSetup(profile = {}, entries = []) {
  const steps = [
    { id: "sip", label: "Your first dry mouth assessment (your baseline)", sheet: "sip", done: sipsOf(entries).length > 0 },
    { id: "team", label: "Your care team's numbers", sheet: "careteam", done: !!profile.teamAsked },
    { id: "routine", label: "Your daily routine", sheet: "routine", done: !!profile.routineAsked },
  ];
  return { steps, done: !!profile.setupDone || steps.every((s) => s.done), next: steps.find((s) => !s.done) || null };
}

export function Today({ profile, entries, prefs, open, onMe, setup, routine, ticks, onTick }) {
  const hour = new Date().getHours();
  const greetName = profile.carer ? (profile.carerName || "").trim() : firstName(profile);
  const greeting = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}${greetName ? `, ${greetName}` : ""}`;
  const initial = (greetName || "").trim().charAt(0).toUpperCase();
  const active = activeTreatment(profile);
  const diary = diaryOf(entries);
  const due = logDue(entries, active);
  const every = prefs.sipEvery;
  const sipNext = every ? nextCheck(sipsOf(entries).at(-1)?.ts, every) : null;
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";
  return (
    <div className="screen home5">
      <div className="brand-row">
        <p className="brand"><BrandMark size={24} />Mouthkind <span className="test-badge">Testing</span></p>
        <button type="button" className="me-avatar" onClick={onMe} aria-label="My details">{initial || <Icon name="user" size={20} />}</button>
      </div>
      <h1 className="display">{greeting}</h1>
      {profile.carer && profile.carerFor && <p className="lede tight">Looking after {profile.carerFor}</p>}

      {!setup.done ? (
        <section className="lite-setup" aria-labelledby="setup-h">
          <h2 id="setup-h">Getting started</h2>
          <ol>
            {setup.steps.map((s) => (
              <li key={s.id} className={s.done ? "done" : ""}>
                <span className="lite-step-dot" aria-hidden="true">{s.done && <Icon name="check" size={14} stroke={3} />}</span>
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
          <button className="btn primary big" onClick={() => open(setup.next.sheet)}>{setup.steps.some((s) => s.done) ? "Continue" : "Start"}</button>
        </section>
      ) : (<>
        <button type="button" className="log5" onClick={() => open("daily")}>
          <span className="log5-icon" aria-hidden="true"><Icon name="plus" size={20} stroke={2.6} /></span>
          <span className="log5-text"><strong>Write in {who} mouth diary</strong>
            <em>{!diary.length ? "Under a minute" : due ? (active ? "Today's entry" : "This week's entry") : `Last entry ${fmtShort(diary.at(-1).ts)}`}</em></span>
          <Icon name="chev" size={18} />
        </button>
        {sipNext?.due && (
          <button type="button" className="lite-due" onClick={() => open("sip")}>
            <strong>Dry mouth assessment</strong><span>Due today</span><Icon name="chev" size={16} />
          </button>
        )}
        {routine.length ? (<>
          <RoutineCard routine={routine} done={ticks} onTick={onTick} onWhy={() => {}} />
          <button className="link-btn lite-edit" onClick={() => open("routine")}>Change my routine</button>
        </>) : (
          <section className="empty-card"><p>Make a checklist of what you do each day for your mouth, to tick off as you go.</p>
            <button className="btn primary" onClick={() => open("routine")}>Make my routine</button></section>
        )}
      </>)}
    </div>
  );
}

/** Choose routine items from the same list everyone sees, or add your own. */
export function RoutineBuilder({ profile, setProfile, onClose }) {
  const [mine, setMine] = useState(profile.myRoutine || []);
  const [own, setOwn] = useState("");
  const [slot, setSlot] = useState("day");
  const has = (k) => mine.some((r) => r.key === k);
  const toggle = (it) => setMine((m) => (has(it.key) ? m.filter((r) => r.key !== it.key) : [...m, { key: it.key, slot: it.slot, text: it.text }]));
  const custom = mine.filter((r) => r.key.startsWith("own_"));
  const add = () => { const t = own.trim(); if (!t) return; setMine((m) => [...m, { key: `own_${Date.now()}`, slot, text: t }]); setOwn(""); };
  const save = () => { setProfile({ ...profile, myRoutine: mine, routineAsked: true }); onClose(); };
  return (
    <Sheet title="My routine" onClose={onClose} footer={<button className="btn primary big" onClick={save}>Save</button>}>
      <h2 className="q">What do you do each day?</h2>
      <p className="lede tight">Tick what you already do, or what your dentist or care team has told you to do. It becomes a checklist on Today.</p>
      {ROUTINE_LIBRARY.map((g) => (
        <fieldset key={g.group} className="lite-lib">
          <legend>{g.group}</legend>
          {g.items.map((it) => (
            <label key={it.key} className={`opt${has(it.key) ? " on" : ""}`}>
              <input type="checkbox" checked={has(it.key)} onChange={() => toggle(it)} />
              <span className="box" aria-hidden="true">{has(it.key) && <Icon name="check" size={16} stroke={3} />}</span>
              <span className="opt-txt">{it.text}<em className="lite-slot">{it.slot === "morning" ? "Morning" : it.slot === "night" ? "Night" : "Through the day"}</em></span>
            </label>
          ))}
        </fieldset>
      ))}
      <fieldset className="lite-lib">
        <legend>Something else</legend>
        {custom.map((r) => (
          <div key={r.key} className="lite-own"><span>{r.text}</span>
            <button type="button" className="link-btn team-remove" onClick={() => setMine((m) => m.filter((x) => x.key !== r.key))}>Remove</button></div>
        ))}
        <label className="field"><span>Add your own</span><input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="e.g. Use the mouthwash from my dentist" /></label>
        <div className="seg full" role="group" aria-label="When">{[["morning", "Morning"], ["day", "Day"], ["night", "Night"]].map(([k, t]) =>
          <button key={k} type="button" className={slot === k ? "on" : ""} aria-pressed={slot === k} onClick={() => setSlot(k)}>{t}</button>)}</div>
        <button type="button" className="btn ghost" onClick={add} disabled={!own.trim()}><Icon name="plus" size={18} /> Add</button>
      </fieldset>
    </Sheet>
  );
}

/** After a diary entry: the same note for everyone, whatever was logged. */
export function DiarySaved({ onClose, open }) {
  return (
    <Sheet title="Mouth diary" onClose={onClose} footer={<button className="btn primary big" onClick={onClose}>Done</button>}>
      <div className="lite-saved"><span className="lite-saved-mark" aria-hidden="true"><Icon name="check" size={28} stroke={3} /></span>
        <h2 className="q">Saved</h2>
        <p className="lede">Your entries are in Records, with charts to show your dentist or care team.</p></div>
      <div className="lite-static">
        <p><strong>Worried about anything you've noticed?</strong> The When to worry list says when to call 000, when to call your team the same day, and what can wait for an appointment. If you're not sure, it's always OK to call.</p>
        <button className="btn ghost" onClick={() => open("worry")}>When to worry</button>
      </div>
    </Sheet>
  );
}

export function Records({ entries, open, onDelete, extra = null }) {
  const diary = diaryOf(entries), sips = sipsOf(entries), phs = phsOf(entries);
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Records</h1>
        <p className="lede">Everything you've recorded, to look back on or show your dentist or care team.</p></header>

      <section className="panel">
        <div className="panel-h"><h2>Mouth diary</h2><button className="link-btn" onClick={() => open("daily")}>Write today</button></div>
        {diary.length ? (<>
          {(() => { const d = diary.at(-1); return <ul className="sym-now">{d.dryness != null && <li>Dryness {d.dryness} of 10</li>}<li>Pain {d.pain ?? 0} of 10</li></ul>; })()}
          <p className="panel-foot">Last entry {fmtShort(diary.at(-1).ts)}</p>
          {diary.length > 1 && <SymptomChart days={diary.slice(-21).map((d) => ({ ...d, tooth: teethFlags(d).length > 0 }))} fmt={fmtShort} />}
          {(() => { const t = diary.slice(-21).filter((d) => teethFlags(d).length); return t.length > 0 && (
            <ul className="sym-flags">{t.reverse().slice(0, 4).map((d) => <li key={d.id}><strong>{fmtShort(d.ts)}</strong> {teethFlags(d).map((v) => TEETH_FLAGS.find((f) => f.v === v)?.label).join(", ")}</li>)}</ul>); })()}
          <p className="panel-foot">Dryness and pain, as you scored them from 0 (none) to 10. The strip shows mouth sores as you described them.</p>
        </>) : <p className="soft-note">No entries yet.</p>}
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Dry mouth assessment</h2><button className="link-btn" onClick={() => open("sip")}>Start</button></div>
        {sips.length ? (<>
          <p className="big-read"><strong>{sips.at(-1).sip}</strong> out of 15 · {sipLevel(sips.at(-1).sip).label.toLowerCase()}</p>
          {sips.length > 1 && <p className="panel-foot">{sips.slice(-8).map((s) => `${fmtShort(s.ts)}: ${s.sip}`).join(" · ")}</p>}
          <p className="panel-foot">Dry mouth assessment: five questions from the Summated Xerostomia Inventory, 5 (no dryness) to 15.</p>
        </>) : <p className="soft-note">No scores yet.</p>}
      </section>
      {extra}

      <section className="panel">
        <div className="panel-h"><h2>Saliva pH</h2><button className="link-btn" onClick={() => open("ph")}>Record a result</button></div>
        {phs.length ? (<>
          <PhTimeline readings={phs} zones={PH_ZONES} color={phColor} fmt={fmtShort} max={14} />
          <p className="panel-foot">Readings from a saliva pH test strip, with the colour zones printed on the strips.</p>
        </>) : <p className="soft-note">No results yet. You'll need saliva pH test strips.</p>}
      </section>

      <section className="panel share">
        <div><h2>Show your dentist or care team</h2><p>A one-page summary of your diary, scores and pH results, to print or save as a PDF.</p></div>
        <button className="btn primary big" onClick={() => open("report")}><Icon name="doc" /> Make a summary</button>
      </section>

      {(sips.length > 0 || phs.length > 0) && (<>
        <h2 className="list-h">Delete a result</h2>
        <ul className="lite-del">{[...sips, ...phs].sort((a, b) => b.ts - a.ts).slice(0, 30).map((e) => (
          <li key={e.id}><span>{fmtDate(e.ts)} · {e.sip != null ? `Dry mouth assessment ${e.sip}/15` : `pH ${e.ph.toFixed(1)}`}</span>
            <button className="link-btn danger-text" onClick={() => onDelete([e.id])} aria-label={`Delete ${e.sip != null ? "dry mouth assessment" : "pH result"} from ${fmtDate(e.ts)}`}><Icon name="trash" size={16} /></button></li>))}</ul>
      </>)}
    </div>
  );
}

/** A printable summary: what was recorded, with no interpretation. */
export function LiteSummary({ entries, profile, onClose }) {
  const fullName = [profile.firstName ?? profile.name, profile.lastName].filter(Boolean).join(" ").trim();
  const diary = diaryOf(entries).slice(-14).reverse();
  const sips = sipsOf(entries).slice(-12).reverse(), phs = phsOf(entries).slice(-12).reverse();
  const yn = (v) => (v == null ? "—" : String(v));
  return (
    <Sheet title="Summary for your care team" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => window.print()}><Icon name="doc" /> Print or save as PDF</button>}>
      <article className="report2">
        <h1>Mouth diary and dry mouth records{fullName ? ` — ${fullName}` : ""}</h1>
        {profile.dob && <p className="rep-meta">Date of birth {fmtDate(new Date(`${profile.dob}T00:00:00`).getTime())}</p>}
        <p className="rep-meta">Prepared {fmtDate(Date.now())} with Mouthkind. Patient-reported, not interpreted.</p>
        <section><h2>Mouth diary (last 14 entries)</h2>
          {diary.length ? <div className="rep-scroll" tabIndex={0} role="region" aria-label="Mouth diary entries"><table><thead><tr><th>Date</th><th>Dryness</th><th>Pain</th><th>Eating</th><th>Sores</th><th>Teeth/gums</th></tr></thead>
            <tbody>{diary.map((d) => <tr key={d.id}><td>{fmtDate(d.ts)}</td><td>{yn(d.dryness)}</td><td>{yn(d.pain)}</td><td>{yn(d.eat)}</td><td>{yn(d.sores)}</td>
              <td>{teethFlags(d).map((v) => TEETH_FLAGS.find((f) => f.v === v)?.label).join(", ") || "—"}</td></tr>)}</tbody></table></div> : <p>None recorded.</p>}
        </section>
        <section><h2>Dry mouth assessment (5–15)</h2>
          {sips.length ? <table><thead><tr><th>Date</th><th>Score</th><th>Recall</th></tr></thead>
            <tbody>{sips.map((s) => <tr key={s.id}><td>{fmtDate(s.ts)}</td><td>{s.sip}</td><td>{s.recall ? freqFor(s.recall).recall : "Last two weeks"}</td></tr>)}</tbody></table> : <p>None recorded.</p>}
          {sips[0]?.items && <p className="rep-foot">Latest answers: {SIP_QUESTIONS.map((q, i) => `${q} ${SIP_OPTIONS.find((o) => o.v === sips[0].items[i])?.label}`).join("; ")}.</p>}
        </section>
        <section><h2>Resting saliva pH (test strip)</h2>
          {phs.length ? <table><thead><tr><th>Date</th><th>pH</th><th>Strip zone</th></tr></thead>
            <tbody>{phs.map((p) => <tr key={p.id}><td>{fmtDate(p.ts)}</td><td>{p.ph.toFixed(1)}</td><td>{phBand(p.ph)}</td></tr>)}</tbody></table> : <p>None recorded.</p>}
        </section>
      </article>
    </Sheet>
  );
}

/** General information: the same for everyone, grouped so people find their part. */
export function Learn({ profile, open }) {
  const [openId, setOpenId] = useState(null);
  const cancerTopics = CARE_TOPICS.filter((t) => t.cancer);
  const general = CARE_TOPICS.filter((t) => !t.cancer);
  // Treatment-specific lines show for the treatments the person said they're having.
  const ctx = { tx: profile.treatments || [], cancer: inCancerCare(profile) };
  const Topic = (t) => {
    const on = openId === t.id;
    return (
      <section key={t.id} id={`care-${t.id}`} className={`ctopic${on ? " open" : ""}`}>
        <button className="ctopic-head" onClick={() => setOpenId(on ? null : t.id)} aria-expanded={on}>
          <span className={`ct-icon ${t.id}`}><Icon name={t.icon} size={20} /></span>
          <span className="ct-text"><strong>{t.title}</strong><em>{t.short}</em></span>
          <Icon name="chev" className={on ? "rot" : ""} />
        </button>
        {on && (
          <div className="ctopic-body">
            {t.sections ? topicSections(t, ctx).map((x) => (
              <div key={x.h} className="ct-sec"><h3>{x.h}</h3><ul>{x.steps.map((st) => <li key={st}>{st}</li>)}</ul></div>
            )) : <ul>{t.steps.map((st) => <li key={st}>{st}</li>)}</ul>}
            {t.refs?.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={t.refs} /></details>}
          </div>
        )}
      </section>
    );
  };
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Learn</h1>
        <p className="lede">General information about dry mouth and looking after your mouth. It isn't advice for you personally: your dentist, doctor or pharmacist can tell you what suits you.</p></header>
      <div className="help-links">
        <button type="button" className="help-link" onClick={() => open("worry")}><Icon name="alert" size={20} /><span><strong>When to worry</strong><em>What needs help now, today or soon</em></span><Icon name="chev" size={16} /></button>
        <button type="button" className="help-link" onClick={() => open("careteam")}><Icon name="phone" size={20} /><span><strong>My care team</strong><em>Numbers to call, find a dentist or pharmacy</em></span><Icon name="chev" size={16} /></button>
        <button type="button" className="help-link" onClick={() => open("questions")}><Icon name="doc" size={20} /><span><strong>Questions for my care team</strong><em>Write them down as they come to you</em></span><Icon name="chev" size={16} /></button>
        {inCancerCare(profile) && <button type="button" className="help-link" onClick={() => open("journey")}><Icon name="info" size={20} /><span><strong>What to expect</strong><em>What usually happens with your treatment</em></span><Icon name="chev" size={16} /></button>}
      </div>
      <h2 className="list-h">During cancer treatment</h2>
      <div className="ctopics">{cancerTopics.map(Topic)}</div>
      <h2 className="list-h">Dry mouth and your teeth</h2>
      <div className="ctopics">{general.map(Topic)}</div>
    </div>
  );
}
