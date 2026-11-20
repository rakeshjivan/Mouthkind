import { useEffect, useRef, useState } from "react";
import { milkAllergic, milkFree } from "../data/allergy.js";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { hasTx, inCancerCare, journey } from "../data/journey.js";
import { CallTeam } from "./daily.jsx";
import { questionsText } from "../data/questions.js";

/** What to expect, now and next, for each treatment. */
export function Journey({ profile, onClose, openTool, onEdit }) {
  const j = journey(profile);
  const chemo = hasTx(profile, "chemo") || hasTx(profile, "transplant");
  return (
    <Sheet title="What to expect" onClose={onClose}
      footer={<button className="btn primary big" onClick={onClose}>Done</button>}>
      <h2 className="q">What to expect</h2>
      <p className="lede tight">What usually happens to the mouth, and what helps. Everyone is different — your team knows you best.</p>
      {j.cards.map((c) => (
        <section key={c.id} className="jcard">
          <p className="jcard-when">{c.when}</p>
          <h3>{c.title}</h3>
          <ul className="tip-list">{c.items.map((x) => <li key={x.t}>{milkAllergic(profile) ? milkFree(x.t) : x.t}</li>)}</ul>
          {c.next && <p className="jcard-next"><b>Coming up:</b> {c.next}</p>}
          {c.always?.map((x) => <p key={x.t} className="jcard-always"><Icon name="alert" size={16} /> {x.t}</p>)}
          <details className="srcs"><summary>Sources</summary><Sources refs={[...new Set([...c.items, ...(c.always || [])].flatMap((x) => x.refs || []))]} /></details>
        </section>
      ))}
      <div className="jtools">
        {chemo && <button className="btn ghost" onClick={() => openTool("chemoday")}><Icon name="plus" size={18} /> I had treatment today</button>}
        {hasTx(profile, "rt_hn") && <button className="btn ghost" onClick={() => openTool("jaw")}>Jaw opening check</button>}
        {(hasTx(profile, "rt_hn") || hasTx(profile, "bone")) && <button className="btn ghost" onClick={() => openTool("rtcard")}>My dental alert card</button>}
        <button className="btn ghost" onClick={() => openTool("questions")}>Questions for my care team</button>
        <button className="link-btn" onClick={onEdit}>Change my treatment details</button>
      </div>
      <CallTeam profile={profile} />
    </Sheet>
  );
}

// ─── Jaw opening ───────────────────────────────────────────────────────────
// The finger test: how many of your own fingers (stacked flat) fit between the
// front teeth. Fewer than 3 suggests reduced opening — worth telling the team.
// Exercises improve opening once stiffness starts; they haven't been shown to
// prevent it (Shao 2020).
export function JawTool({ entries, onClose, onSave }) {
  const [mode, setMode] = useState("test");
  const [fingers, setFingers] = useState(null);
  const last = entries.filter((e) => e.kind === "jaw" && e.fingers).sort((a, b) => b.ts - a.ts)[0];
  return (
    <Sheet title="Jaw opening" onClose={onClose}
      footer={mode === "test"
        ? <button className="btn primary big" disabled={!fingers} onClick={() => { onSave({ id: `j_${Date.now()}`, ts: Date.now(), kind: "jaw", fingers }); setMode("done"); }}>Save</button>
        : <button className="btn primary big" onClick={onClose}>Done</button>}>
      <div className="dseg tabs-seg" role="tablist">
        <button role="tab" aria-selected={mode !== "ex"} className={`dseg-btn${mode !== "ex" ? " on" : ""}`} onClick={() => setMode("test")}>Finger test</button>
        <button role="tab" aria-selected={mode === "ex"} className={`dseg-btn${mode === "ex" ? " on" : ""}`} onClick={() => setMode("ex")}>Exercises</button>
      </div>
      {mode === "test" && (<>
        <h2 className="q">How many fingers fit?</h2>
        <p className="lede tight">Open as wide as is comfortable. Stack your own fingers flat, one on top of the other, between your top and bottom front teeth.</p>
        <div className="dseg big-seg" role="radiogroup" aria-label="Fingers">
          {[1, 2, 3].map((n) => <button key={n} type="button" role="radio" aria-checked={fingers === n} className={`dseg-btn${fingers === n ? " on" : ""}`} onClick={() => setFingers(n)}>{n === 3 ? "3 or more" : n}</button>)}
        </div>
        {last && <p className="soft-note">Last time: {last.fingers === 3 ? "3 or more" : last.fingers} finger{last.fingers === 1 ? "" : "s"}.</p>}
      </>)}
      {mode === "done" && (fingers >= 3
        ? <div className="alert-x good callout"><strong>Good opening</strong><p>Check again once a month, and after radiotherapy finishes.</p></div>
        : <div className="alert-x amber callout"><strong>Your mouth may not be opening fully</strong><p>Fewer than three fingers can be an early sign of a stiff jaw (trismus). Tell your treatment team or dentist — exercises help most when started early.</p></div>)}
      {mode === "ex" && <JawExercise onLog={() => onSave({ id: `u_${Date.now()}`, ts: Date.now(), kind: "used", items: ["jaw"] })} />}
      <Sources refs={["nciPdqHp", "shao2020"]} />
    </Sheet>
  );
}

function JawExercise({ onLog }) {
  const REPS = 5, HOLD = 10, REST = 5;
  const [run, setRun] = useState(false);
  const [rep, setRep] = useState(0);
  const [phase, setPhase] = useState("open");
  const [left, setLeft] = useState(HOLD);
  const logged = useRef(false);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => {
    if (!run || left > 0) return;
    if (phase === "open") { setPhase("rest"); setLeft(REST); return; }
    if (rep + 1 >= REPS) { setRun(false); setRep(REPS); if (!logged.current) { logged.current = true; onLog(); } return; }
    setRep(rep + 1); setPhase("open"); setLeft(HOLD);
  }, [left, run, phase, rep, onLog]);
  const finished = rep >= REPS;
  return (
    <div className="jaw-ex">
      <p className="lede tight">Open as wide as you comfortably can and hold, then relax. Five times, three times a day — or as your team suggests. Stop if it's painful.</p>
      <div className={`jaw-timer ${phase}`} aria-live="polite">
        {finished ? <strong>Done — well done</strong> : run ? (<><span>{phase === "open" ? "Open wide and hold" : "Relax"}</span><strong>{left}</strong><em>{rep + 1} of {REPS}</em></>) : <span>Ready when you are</span>}
      </div>
      {!run && !finished && <button className="btn primary big" onClick={() => { setRun(true); setPhase("open"); setLeft(HOLD); }}>Start</button>}
      {finished && <button className="btn ghost" onClick={() => { setRep(0); logged.current = false; setPhase("open"); setLeft(HOLD); setRun(true); }}>Do another set</button>}
      <p className="soft-note">These help once the jaw is getting stiff. They haven't been shown to prevent stiffness during radiotherapy, but many teams suggest them.</p>
    </div>
  );
}

// ─── Radiotherapy card ─────────────────────────────────────────────────────
export function RtCard({ profile, onClose }) {
  const name = [profile.firstName || profile.name, profile.lastName].filter(Boolean).join(" ");
  const dates = profile.rtStart ? `from ${new Date(`${profile.rtStart}T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}` : "";
  return (
    <Sheet title="My dental alert card" onClose={onClose} footer={<button className="btn primary big" onClick={onClose}>Done</button>}>
      <p className="lede tight">Show this to any dentist, doctor or oral surgeon. Take a screenshot to keep it handy.</p>
      <div className="rtcard">
        <p className="rtcard-k">Medical alert</p>
        {name && <p className="rtcard-name">{name}</p>}
        {hasTx(profile, "rt_hn") && (<>
          <h2>I've had radiotherapy to the head and neck</h2>
          {dates && <p>Radiotherapy {dates}</p>}
          <p>Extractions, implants or surgery in the treated area carry a risk of osteoradionecrosis. Please plan any treatment with my oncology team first.</p>
        </>)}
        {hasTx(profile, "bone") && (<>
          <h2>I take a bone-strengthening medicine</h2>
          <p>Denosumab or a bisphosphonate (antiresorptive). Extractions and implants carry a risk of medication-related osteonecrosis of the jaw (MRONJ). Please plan any treatment with my medical team.</p>
        </>)}
        {profile.team?.phone24 && <p><b>{profile.team?.name || "Treatment team"}:</b> {profile.team.phone24}</p>}
      </div>
      <Sources refs={[...(hasTx(profile, "rt_hn") ? ["peterson2024"] : []), ...(hasTx(profile, "bone") ? ["yarom2019"] : [])]} />
    </Sheet>
  );
}

// ─── Questions for my team ─────────────────────────────────────────────────
const SUGGESTED_CANCER = [
  "Do I need to see a dentist before treatment starts?",
  "What can I take for mouth pain, and when?",
  "Which mouthwash should I use, and how often?",
  "Should I use a high-fluoride toothpaste or fluoride trays?",
  "Who do I call if I can't eat or drink?",
  "Will my dry mouth get better?",
  "Should I be doing jaw exercises?",
  "What should I do if I get mouth ulcers?",
];
const SUGGESTED_OTHER = [
  "Could any of my medicines be causing my dry mouth?",
  "Is there a different medicine that's less drying?",
  "Should I use a high-fluoride toothpaste?",
  "How often should I have a dental check-up?",
  "Should I be tested for Sjögren's?",
  "What can I use for a sore or burning mouth?",
];
export function Questions({ profile, setProfile, onClose }) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const qs = profile.ownQuestions || [];
  const asked = profile.asked || [];
  const save = (o) => setProfile({ ...profile, ...o });
  const SUGGESTED = inCancerCare(profile) ? SUGGESTED_CANCER : SUGGESTED_OTHER;
  const add = (q) => { const t = q.trim(); if (t && !qs.includes(t)) save({ ownQuestions: [...qs, t] }); setText(""); };
  return (
    <Sheet title="Questions for my care team" onClose={onClose} footer={<>
      {qs.length > 0 && <button className="btn ghost" onClick={() => share(profile)}><Icon name="doc" size={18} /> Share or email</button>}
      <button className="btn primary big" onClick={onClose}>Done</button>
    </>}>
      <h2 className="q">Questions for my care team</h2>
      <p className="lede tight">Jot them down as they come to you, then tick them off at your appointment.</p>
      <div className="medlook-row">
        <label className="medlook-box"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question" aria-label="New question"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(text); } }} /></label>
        <button className="btn primary medlook-add" disabled={!text.trim()} onClick={() => add(text)}><Icon name="plus" size={18} /> Add</button>
      </div>
      {qs.length > 0 && (
        <ul className="q-list">
          {qs.map((q) => {
            const on = asked.includes(q);
            return (
              <li key={q} className={on ? "asked" : ""}>
                <button type="button" className="q-tick" aria-pressed={on} aria-label={on ? `Mark not asked: ${q}` : `Mark asked: ${q}`}
                  onClick={() => save({ asked: on ? asked.filter((x) => x !== q) : [...asked, q] })}>{on && <Icon name="check" size={16} stroke={3} />}</button>
                <span>{q}</span>
                <button type="button" className="icon-btn" aria-label={`Delete: ${q}`} onClick={() => save({ ownQuestions: qs.filter((x) => x !== q), asked: asked.filter((x) => x !== q) })}><Icon name="x" size={18} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {qs.length > 0 && (
        <div className="q-share">
          <button type="button" className="link-btn" onClick={() => share(profile)}>Share or email my list</button>
          <button type="button" className="link-btn" onClick={async () => {
            try { await navigator.clipboard.writeText(questionsText(profile)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no clipboard */ }
          }}>{copied ? "Copied" : "Copy"}</button>
        </div>
      )}
      <h3 className="list-h">Common questions</h3>
      <div className="chips">
        {SUGGESTED.filter((s) => !qs.includes(s)).map((s) => <button key={s} type="button" className="chip" onClick={() => add(s)}><Icon name="plus" size={14} /> {s}</button>)}
      </div>
    </Sheet>
  );
}

/** Phone share sheet (Mail, Messages, Notes…) where there is one; otherwise a new email. */
async function share(profile) {
  const body = questionsText(profile);
  const subject = "Questions for my care team";
  if (navigator.share) { try { await navigator.share({ title: subject, text: body }); return; } catch (e) { if (e?.name === "AbortError") return; } }
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** "I had treatment today" — adds today's date to the chemotherapy dates. */
export function ChemoToday({ profile, setProfile, onClose }) {
  const today = new Date(); const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [d, setD] = useState(iso);
  return (
    <Sheet title="Treatment date" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => { setProfile({ ...profile, chemoDates: [...new Set([...(profile.chemoDates || []), d])].sort() }); onClose(); }}>Save</button>}>
      <h2 className="q">When did you have chemotherapy?</h2>
      <p className="lede tight">The app counts the days from your latest treatment, to tell you when sores are most likely.</p>
      <label className="field"><span>Date</span><input type="date" value={d} max={iso} onChange={(e) => setD(e.target.value)} /></label>
    </Sheet>
  );
}
