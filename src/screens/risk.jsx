import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { Breakdown, Pick, RiskMeter, TickRows } from "../components/kit.jsx";
import { RISK_BANDS, RISK_QUESTIONS, RISK_VERSION, riskBreakdown, scoreRisk } from "../data/risk.js";
import { fmtDate } from "../lib/store.js";

/** The risk questionnaire: one question per screen. Starts from the last answers when updating. */
export function RiskFlow({ last, onClose, onSave, onCare }) {
  const [ans, setAns] = useState(() => ({ ...(last?.answers || {}) }));
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(null);
  const [editId, setEditId] = useState(null); // changing answers after seeing the result replaces that result
  const q = RISK_QUESTIONS[i];
  const lastQ = i === RISK_QUESTIONS.length - 1;

  const finish = (a) => {
    const r = scoreRisk(a);
    const e = { id: editId || `r_${Date.now()}`, ts: Date.now(), kind: "risk", v: RISK_VERSION, answers: a, score: r.score, band: r.band.id };
    onSave(e); setSaved(e);
  };
  const next = (a = ans) => (lastQ ? finish(a) : setI(i + 1));

  if (saved) return <RiskResult entry={saved} onClose={onClose} onCare={onCare}
    onRedo={() => { setEditId(saved.id); setSaved(null); setI(0); }} />;

  const picked = q.type === "many" ? ans[q.id] || [] : ans[q.id];
  return (
    <Sheet title="Dry mouth risk check" onClose={onClose} onBack={i ? () => setI(i - 1) : null}
      progress={{ of: RISK_QUESTIONS.length, at: i, label: `${i + 1} of ${RISK_QUESTIONS.length}` }}
      footer={(i > 0 || q.type === "many" || picked != null) ? (<>
        {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}><Icon name="back" size={18} /> Back</button>}
        {q.type === "many" ? (
          <button className="btn primary big" onClick={() => next()}>{picked.length ? (lastQ ? "See my result" : "Next") : q.none}</button>
        ) : picked != null ? (
          <button className="btn primary big" onClick={() => next()}>{lastQ ? "See my result" : "Next"}</button>
        ) : null}
      </>) : null}>
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

/** What the score means: where it sits, what makes it up, what can be acted on. */
export function RiskResult({ entry, onClose, onCare, onRedo }) {
  const r = scoreRisk(entry.answers);
  const groups = riskBreakdown(r);
  const act = groups.filter((g) => g.act);
  const aware = groups.filter((g) => !g.act);
  const refs = [...new Set(r.factors.flatMap((f) => f.refs))];
  return (
    <Sheet title="Your dry mouth risk" onClose={onClose}
      footer={<>
        {onRedo && <button className="btn ghost" onClick={onRedo}>Change my answers</button>}
        <button className="btn primary big" onClick={onClose}>Done</button>
      </>}>
      <div className={`risk-top ${r.band.tone}`}>
        <p className="risk-score"><strong>{r.score}</strong><span>points</span></p>
        <p className="risk-band">{r.band.label} risk</p>
        <p className="risk-sub">{r.band.sub}</p>
      </div>
      <RiskMeter score={r.score} bands={RISK_BANDS} />
      <p className="risk-date">Checked {fmtDate(entry.ts)}</p>

      {groups.length > 0 ? (<>
        <section className="rblock">
          <h3>What makes up your score</h3>
          <Breakdown groups={groups} />
        </section>

        {act.length > 0 && (
          <section className="rblock">
            <h3>Things you can act on</h3>
            {act.map((g) => (
              <div key={g.id} className={`fgroup g-${g.id}`}>
                <p className="fg-head"><i />{g.label}<b>+{g.pts}</b></p>
                {g.factors.map((f) => <p key={f.q + f.v} className="fg-item"><strong>{f.label}.</strong> {f.why}</p>)}
                <p className="fg-act"><Icon name="check" size={16} stroke={2.6} /> {g.actNote}</p>
              </div>
            ))}
          </section>
        )}
        {aware.length > 0 && (
          <section className="rblock">
            <h3>Things to be aware of</h3>
            {aware.map((g) => (
              <div key={g.id} className={`fgroup g-${g.id}`}>
                <p className="fg-head"><i />{g.label}<b>+{g.pts}</b></p>
                {g.factors.map((f) => <p key={f.q + f.v} className="fg-item"><strong>{f.label}.</strong> {f.why}</p>)}
              </div>
            ))}
          </section>
        )}
      </>) : <p className="lede">You didn't report any of the common risk factors for dry mouth. Keep looking after your teeth with fluoride toothpaste twice a day.</p>}

      {r.band.lo >= 10 && (
        <section className="next-steps">
          <h3>What to do next</h3>
          <p>Even without symptoms, a higher risk means your teeth need extra protection. Your Care tab now shows the steps that matter most for you.</p>
          {onCare && <button className="btn primary big" onClick={onCare}><Icon name="leaf" /> See what helps</button>}
          <p className="soft-note">Testing your saliva pH and doing the dry mouth check regularly shows whether anything is changing.</p>
        </section>
      )}

      <p className="disclaimer"><Icon name="info" size={16} /> This score adds up known risk factors for dry mouth. It isn't a diagnosis and hasn't yet been tested against saliva measurements. Talk to your dentist, GP or pharmacist about your result.</p>
      <Sources refs={refs} />
    </Sheet>
  );
}
