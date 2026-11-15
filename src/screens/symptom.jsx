import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { BANDS, TREES, TREE_ORDER, dentalContext, step } from "../data/dental.js";
import { stillAtFeverRisk } from "../lib/rules.js";
import { Choice, Many } from "./check.jsx";
import { CallButtons, CallRow } from "./today.jsx";

// Band → the colour language the rest of the app already uses.
export const bandLevel = { now: "emergency", team: "sameday", "24h": "sameday", tell: "soon", week: "dentist", home: "ok" };

// ═══ Check a symptom ════════════════════════════════════════════════════════
export function CheckHome({ open }) {
  return (
    <div className="screen">
      <header className="hero">
        <h1 className="display">Check a symptom</h1>
        <p className="lede">Pick what's bothering you. A few questions, then what to do and who to contact.</p>
      </header>
      <h2 className="card-h">Teeth and gums</h2>
      <div className="sym-list">
        {TREE_ORDER.map((id) => (
          <button key={id} className="sym-row" onClick={() => open(`sym:${id}`)}>
            <span>{TREES[id].label}</span><Icon name="chev" />
          </button>
        ))}
      </div>
      <p className="soft-note">Checkers for dry mouth and a sore mouth are coming next. For now, today's check covers them.</p>
    </div>
  );
}

// ═══ One symptom: questions, then the result ═══════════════════════════════
export function SymptomFlow({ tree, profile, onClose, onSave }) {
  const ctx = dentalContext(profile, stillAtFeverRisk(profile));
  const [path, setPath] = useState([[tree, TREES[tree].start]]);
  const [ans, setAns] = useState({});
  const [result, setResult] = useState(null);
  const [t, qid] = path.at(-1);
  const q = TREES[t].q[qid];
  const key = `${t}.${qid}`;

  const answer = (v) => {
    const next = { ...ans, [key]: v };
    setAns(next);
    const r = step(t, qid, v, next, ctx);
    if (r.done) setResult(r.done);
    else setTimeout(() => setPath((p) => [...p, r.next]), q.type === "one" ? 200 : 0);
  };
  const back = result ? () => setResult(null) : path.length > 1 ? () => setPath((p) => p.slice(0, -1)) : null;

  // Saved once, when the person leaves the result — going back to change an answer doesn't leave a stray entry.
  const finish = () => {
    onSave({ id: `s_${Date.now()}`, ts: Date.now(), kind: "symptom", tree, answers: ans,
      band: result.band, outcomes: [result.main.id, ...result.also.map((o) => o.id)], title: result.main.title });
    onClose();
  };

  if (result) return <SymptomResult tree={tree} result={result} profile={profile} onClose={finish} onBack={back} />;

  const picked = Array.isArray(ans[key]) ? ans[key] : [];
  return (
    <Sheet title={TREES[tree].label} onClose={onClose} onBack={back}
      footer={q.type === "many" ? (
        <button className="btn primary" onClick={() => answer(picked)}>{picked.length ? "Next" : q.noneLabel || "None of these"}</button>
      ) : null}>
      {t !== tree && <p className="eyebrow">{TREES[t].label}</p>}
      <h2 className="q">{q.text}</h2>
      {q.type === "one" ? (
        <Choice options={q.options} value={ans[key]} onPick={answer} />
      ) : (<>
        <p className="lede tight">Tap any that apply.</p>
        <Many options={q.options.map((o) => ({ id: o.v, label: o.label }))} value={picked}
          onChange={(v) => setAns({ ...ans, [key]: v })} />
      </>)}
    </Sheet>
  );
}

export function SymptomResult({ tree, result, profile, onClose, onBack }) {
  const b = BANDS[result.band];
  const urgent = result.band === "now" || result.band === "team";
  const dentist = ["24h", "week"].includes(result.band) && profile.dentist?.phone;
  const Outcome = ({ o, lead }) => (
    <section className={lead ? "outcome" : "outcome also"}>
      <h3>{o.title}</h3>
      {o.body.map((p, i) => <p key={i}>{p}</p>)}
      <Sources refs={o.refs} />
    </section>
  );
  return (
    <Sheet title={TREES[tree].label} onClose={onClose} onBack={onBack} tone={result.band === "now" ? "urgent" : ""}
      footer={<button className="btn primary big" onClick={onClose}>{result.band === "now" ? "I've called for help" : "Done"}</button>}>
      <div className={`verdict ${b.tone}`}>
        <span className="verdict-mark"><Icon name={b.tone === "green" ? "check" : b.tone === "red" ? "alert" : "info"} size={26} stroke={2.6} /></span>
        <div><p className="verdict-kicker">What to do</p><h2>{b.label}</h2></div>
      </div>
      {urgent && <CallButtons profile={profile} emergency={result.band === "now"} />}
      {dentist && <div className="call-stack"><CallRow label={profile.dentist.name || "My dentist"} number={profile.dentist.phone} tone="primary" /></div>}
      <Outcome o={result.main} lead />
      {result.also.length > 0 && (<>
        <h3 className="also-h">Also from your answers</h3>
        {result.also.map((o) => <Outcome key={o.id} o={o} />)}
      </>)}
      <p className="disclaimer"><Icon name="info" size={16} /> This is general guidance from dental and cancer-care guidelines, not a diagnosis. If you're worried, call your team or dentist anyway. Saved to My notes.</p>
    </Sheet>
  );
}
