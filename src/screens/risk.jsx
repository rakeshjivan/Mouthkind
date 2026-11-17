import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { Pick, RiskDial, TickRows } from "../components/kit.jsx";
import { RISK_QUESTIONS, RISK_VERSION, riskAdvice, scoreRisk } from "../data/risk.js";
import { PRODUCTS } from "../data/products.js";
import { fmtDate } from "../lib/store.js";

/** The risk questionnaire: one question per screen. Starts from the last answers when updating. */
export function RiskFlow({ last, onClose, onSave, onTrack }) {
  const [ans, setAns] = useState(() => ({ ...(last?.answers || {}) }));
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(null);
  const q = RISK_QUESTIONS[i];
  const lastQ = i === RISK_QUESTIONS.length - 1;

  const finish = (a) => {
    const r = scoreRisk(a);
    const e = { id: `r_${Date.now()}`, ts: Date.now(), kind: "risk", v: RISK_VERSION, answers: a, score: r.score, band: r.band.id };
    onSave(e); setSaved(e);
  };
  const next = (a = ans) => (lastQ ? finish(a) : setI(i + 1));

  if (saved) return <RiskResult entry={saved} onClose={onClose} onTrack={onTrack} />;

  const picked = q.type === "many" ? ans[q.id] || [] : ans[q.id];
  return (
    <Sheet title="Dry mouth risk check" onClose={onClose} onBack={i ? () => setI(i - 1) : null}
      progress={{ of: RISK_QUESTIONS.length, at: i, label: `${i + 1} of ${RISK_QUESTIONS.length}` }}
      footer={q.type === "many" ? (
        <button className="btn primary big" onClick={() => next()}>{picked.length ? (lastQ ? "See my result" : "Next") : q.none}</button>
      ) : picked != null && last ? (
        <button className="btn primary big" onClick={() => next()}>{lastQ ? "See my result" : "Next"}</button>
      ) : null}>
      <p className="eyebrow-q">{q.section}</p>
      <h2 className="q">{q.text}</h2>
      {q.hint && <p className="lede tight">{q.hint}</p>}
      {q.type === "one" ? (
        <Pick options={q.options} value={picked}
          onPick={(v) => { const a = { ...ans, [q.id]: v }; setAns(a); setTimeout(() => next(a), 180); }} />
      ) : (
        <TickRows options={q.options} value={picked} onChange={(v) => setAns({ ...ans, [q.id]: v })} />
      )}
    </Sheet>
  );
}

/** What the score means, what drives it, and what to do. */
export function RiskResult({ entry, onClose, onTrack, onRedo }) {
  const r = scoreRisk(entry.answers);
  const advice = riskAdvice(r, entry.answers);
  const top = r.factors[0]?.pts || 1;
  const refs = [...new Set([...r.factors.flatMap((f) => f.refs), ...advice.flatMap((a) => a.refs || [])])];
  return (
    <Sheet title="Your dry mouth risk" onClose={onClose}
      footer={<>
        {onRedo && <button className="btn ghost" onClick={onRedo}>Update answers</button>}
        <button className="btn primary big" onClick={onClose}>Done</button>
      </>}>
      <div className={`risk-head ${r.band.tone}`}>
        <RiskDial score={r.score} tone={r.band.tone} />
        <p className="risk-band">{r.band.label} risk</p>
        <p className="risk-sub">{r.band.sub}</p>
        <p className="risk-date">{fmtDate(entry.ts)}</p>
      </div>

      {r.factors.length > 0 ? (
        <section className="rblock">
          <h3>What's raising your risk</h3>
          {r.factors.map((f) => (
            <div key={f.q + f.v} className="factor">
              <div className="factor-top"><strong>{f.label}</strong><span className="factor-pts">+{f.pts}</span></div>
              <span className="factor-bar"><i style={{ width: `${(f.pts / top) * 100}%` }} /></span>
              <p>{f.why}</p>
            </div>
          ))}
        </section>
      ) : <p className="lede">You didn't report any of the common risk factors for dry mouth.</p>}

      {advice.length > 0 && (
        <section className="rblock">
          <h3>What you can do</h3>
          {advice.map((a) => (
            <div key={a.id} className="advice">
              <strong>{a.title}</strong>
              <p>{a.body}</p>
              {a.products && <p className="advice-prod">{a.products.map((id) => PRODUCTS.find((p) => p.id === id)?.name).join(", ")}</p>}
              {a.id === "track" && onTrack && <button className="btn primary" onClick={onTrack}><Icon name="drop" size={18} /> Check my dry mouth now</button>}
            </div>
          ))}
        </section>
      )}

      <p className="disclaimer"><Icon name="info" size={16} /> This score adds up known risk factors for dry mouth. It isn't a diagnosis and hasn't yet been tested against saliva measurements. Talk to your dentist, GP or pharmacist about your result.</p>
      <Sources refs={refs} />
    </Sheet>
  );
}
