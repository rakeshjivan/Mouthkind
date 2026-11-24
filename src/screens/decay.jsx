import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { Breakdown, LevelMeter } from "../components/kit.jsx";
import { ProductImage } from "../components/productImage.jsx";
import { DECAY_BANDS, DECAY_VERSION, decayBreakdown, decayPlan, scoreDecay, visibleQuestions } from "../data/decay.js";
import { PRODUCTS } from "../data/products.js";
import { fmtDate } from "../lib/store.js";
import { RiskFlow } from "./risk.jsx";

/** The tooth decay risk check. `ctx` carries dry mouth and pH from the other checks. */
export function DecayFlow({ last, ctx, onClose, onSave, onShop, next }) {
  const model = {
    title: "Tooth decay risk check",
    questions: (a) => visibleQuestions(a, ctx),
    entry: (a, id) => {
      const r = scoreDecay(a, ctx);
      return { id: id || `d_${Date.now()}`, ts: Date.now(), kind: "decay", v: DECAY_VERSION, answers: a, ctx, score: r.score, band: r.band.id };
    },
    Result: (p) => <DecayResult {...p} onShop={onShop} next={next} />,
  };
  return <RiskFlow last={last} onClose={onClose} onSave={onSave} model={model} />;
}

/** The result: level, what makes it up, what's already protecting, and the plan. */
export function DecayResult({ entry, onClose, onRedo, onShop, next }) {
  const r = scoreDecay(entry.answers, entry.ctx);
  const groups = decayBreakdown(r);
  const plan = decayPlan(r, entry.answers);
  const refs = [...new Set([...r.factors, ...r.protective].flatMap((f) => f.refs || []).concat(plan.flatMap((s) => s.refs || [])))];
  const fromChecks = r.factors.filter((f) => f.from);
  return (
    <Sheet title="Your tooth decay risk" onClose={onClose}
      footer={<>
        {onRedo && <button className="btn ghost" onClick={onRedo}>{next ? "Edit answers" : "Change my answers"}</button>}
        {next ? <button className="btn primary big" onClick={next.go}>{next.label}</button> : <button className="btn primary big" onClick={onClose}>Done</button>}
      </>}>
      {r.noTeeth ? (
        <div className="risk-top good"><p className="risk-band">No natural teeth</p><p className="risk-sub">Tooth decay doesn't affect dentures or implants.</p></div>
      ) : (<>
        <div className={`risk-top ${r.band.tone}`}>
          <p className="risk-kind">Screening result</p>
          <p className="risk-band">{r.band.label} risk</p>
          <p className="risk-sub">{r.band.sub}</p>
        </div>
        <LevelMeter level={r.band.id} />
      </>)}
      <p className="risk-date">Checked {fmtDate(entry.ts)}</p>

      {groups.length > 0 && (
        <section className="rblock">
          <h3>What adds to your risk</h3>
          <Breakdown groups={groups} />
          {groups.map((g) => (
            <div key={g.id} className={`fgroup g-${g.id}`}>
              <p className="fg-head"><i />{g.label}</p>
              {g.factors.map((f) => <p key={f.q + f.v} className="fg-item"><strong>{f.label}.</strong> {f.why}</p>)}
            </div>
          ))}
          {fromChecks.length > 0 && <p className="soft-note">Some of these come from your other checks, so you weren't asked again.</p>}
        </section>
      )}

      {r.protective.length > 0 && (
        <section className="rblock">
          <h3>Already protecting you</h3>
          {r.protective.map((f) => <p key={f.v} className="fg-item good-item"><Icon name="check" size={16} stroke={2.6} /> <strong>{f.label}</strong></p>)}
        </section>
      )}

      {!next && <section className="rblock plan">
        <h3>Your plan</h3>
        <ol className="plan-list">
          {plan.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>
              <p>{s.body}</p>
              {s.list && <ul className="pitem-list">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.note && <p>{s.note}</p>}
              {s.products?.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean).map((p) => (
                <div key={p.id} className="plan-prod"><ProductImage product={p} size="sm" /><span>{p.name}</span></div>
              ))}
            </li>
          ))}
        </ol>
        {onShop && !r.noTeeth && <button className="btn primary big" onClick={onShop}><Icon name="cart" /> See these products</button>}
      </section>}

      <p className="disclaimer"><Icon name="info" size={16} /> This is a screening check, based on the CAMBRA approach and using only questions you can answer yourself. Even the best-tested decay risk tools are only moderately accurate, so your dentist's examination and X-rays come first. It isn't a diagnosis — your dentist can find decay you can't see or feel.</p>
      <Sources refs={[...new Set([...refs, "hasyim2026", "hayes2017"])]} />
    </Sheet>
  );
}
