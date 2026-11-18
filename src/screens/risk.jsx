import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { Breakdown, Pick, RiskMeter, TickRows } from "../components/kit.jsx";
import { RISK_BANDS, RISK_VERSION, riskAdvice, riskBreakdown, scoreRisk, visibleRiskQuestions } from "../data/risk.js";
import { medicineById } from "../data/medicines.js";
import { MedLookup } from "../components/medLookup.jsx";
import { ProductImage } from "../components/productImage.jsx";
import { PRODUCTS } from "../data/products.js";
import { fmtDate } from "../lib/store.js";

/** The dry mouth risk check. Answers already in Me (age, gender) are used instead of asked. */
export function dryModel(fromProfile = {}) {
  return {
    title: "Dry mouth risk check",
    questions: (a) => visibleRiskQuestions({ ...a, ...fromProfile }).filter((q) => !(q.id in fromProfile)),
    entry: (a, id) => {
      const answers = { ...a, ...fromProfile };
      const r = scoreRisk(answers);
      return { id: id || `r_${Date.now()}`, ts: Date.now(), kind: "risk", v: RISK_VERSION, answers, score: r.score, band: r.band.id };
    },
    Result: (p) => <RiskResult {...p} />,
  };
}

/** A risk questionnaire, one question per screen. Starts from the last answers when updating.
 *  `model` supplies the questions (which can depend on earlier answers), the saved entry and the result screen. */
export function RiskFlow({ last, onClose, onSave, onCare, plan, model = dryModel() }) {
  const [ans, setAns] = useState(() => ({ ...(last?.answers || {}) }));
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(null);
  const [editId, setEditId] = useState(null); // changing answers after seeing the result replaces that result
  const qs = model.questions(ans);
  const q = qs[Math.min(i, qs.length - 1)];
  const lastQ = i >= qs.length - 1;

  const finish = (a) => { const e = model.entry(a, editId); onSave(e); setSaved(e); };
  const next = (a = ans) => (i >= model.questions(a).length - 1 ? finish(a) : setI(i + 1));

  if (saved) return model.Result({ entry: saved, onClose, onCare, plan,
    onRedo: () => { setEditId(saved.id); setSaved(null); setI(0); } });

  const picked = q.type === "many" || q.type === "lookup" ? ans[q.id] || [] : ans[q.id];
  return (
    <Sheet title={model.title} onClose={onClose} onBack={i ? () => setI(i - 1) : null}
      progress={{ of: qs.length, at: i, label: `${i + 1} of ${qs.length}` }}
      footer={(i > 0 || q.type !== "one" || picked != null) ? (<>
        {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}><Icon name="back" size={18} /> Back</button>}
        {q.type === "lookup" ? (
          <button className="btn primary big" onClick={() => next()}>{picked.length ? "Next" : "Skip"}</button>
        ) : q.type === "many" ? (
          <button className="btn primary big" onClick={() => { if (picked.length) return next(); const a = { ...ans, [q.id]: [] }; setAns(a); next(a); }}>{picked.length ? (lastQ ? "See my result" : "Next") : q.none}</button>
        ) : picked != null ? (
          <button className="btn primary big" onClick={() => next()}>{lastQ ? "See my result" : "Next"}</button>
        ) : null}
      </>) : null}>
      <p className="eyebrow-q">{q.section}</p>
      <h2 className="q">{q.text}</h2>
      {q.hint && <p className="lede tight">{q.hint}</p>}
      {q.type === "lookup" ? (
        <MedLookup value={picked} onChange={(list) => setAns({ ...ans, medList: list })} />
      ) : q.type === "one" ? (
        <Pick options={q.options} value={picked}
          onPick={(v) => { const a = { ...ans, [q.id]: v }; setAns(a); setTimeout(() => next(a), 180); }} />
      ) : (
        <TickRows key={q.key || q.id} options={q.options} value={picked} onChange={(v) => setAns({ ...ans, [q.id]: v })} />
      )}
    </Sheet>
  );
}

/** What the score means: where it sits, what makes it up, what can be acted on. */
export function RiskResult({ entry, onClose, onCare, onRedo, plan }) {
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
      <RiskMeter score={Math.max(r.score, r.band.lo + 1)} bands={RISK_BANDS} />
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

      {plan?.length > 0 ? (
        <section className="rblock plan">
          <h3>Added to your plan</h3>
          <ol className="plan-list">{plan.slice(0, 3).map((it) => <li key={it.id}><strong>{it.title}</strong><p>{it.because[0]}</p></li>)}</ol>
          {onCare && <button className="btn primary big" onClick={onCare}><Icon name="leaf" /> See my full plan</button>}
        </section>
      ) : (() => {
        const adv = riskAdvice(r, entry.answers);
        return adv.length > 0 && (
          <section className="rblock plan">
            <h3>What helps you</h3>
            <ol className="plan-list">
              {adv.map((s) => (
                <li key={s.id}><strong>{s.title}</strong><p>{s.body}</p>
                  {s.products?.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean).map((p) => (
                    <div key={p.id} className="plan-prod"><ProductImage product={p} size="sm" /><span>{p.name}</span></div>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        );
      })()}
      {entry.answers.medFor?.length > 0 && !entry.answers.medList?.length && (
        <p className="soft-note">Your medicine groups are worked out from what you take medicines for. Adding the names gives a more accurate result.</p>
      )}
      {entry.answers.medList?.length > 0 && (
        <p className="soft-note">Your medicines: {entry.answers.medList.map((x) => x.brand || medicineById(x.id)?.g || x.name).filter(Boolean).join(", ")}.</p>
      )}

      {!plan?.length && r.band.lo >= 10 && (
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
