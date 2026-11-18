import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";
import { answerQuestion, optionsFor } from "../data/engine.js";
import { CallTeam } from "./daily.jsx";

/** One question at a time, asked only when the answer changes the advice. */
export function AskCard({ q, m, profile, setProfile, onPlan, compact, left = 0, flow }) {
  const [pick, setPick] = useState([]);
  const [thanks, setThanks] = useState(null);
  if (thanks && (!q || q.id !== thanks)) {
    return (
      <section className="ask done" aria-live="polite">
        {q ? (<>
          <p className="ask-k"><Icon name="check" size={16} stroke={2.6} /> Thanks. {left === 1 ? "One more question" : `${left} more questions`} to finish your plan.</p>
          <div className="ask-foot"><span /><button className="btn primary" onClick={() => setThanks(null)}>Next question</button></div>
        </>) : (<>
          <p className="ask-k"><Icon name="check" size={16} stroke={2.6} /> Thanks — your plan is ready</p>
          {onPlan && <div className="ask-foot"><span /><button className="btn primary" onClick={onPlan}>See my plan</button></div>}
        </>)}
      </section>
    );
  }
  if (!q) return null;
  const save = (v) => { setProfile(answerQuestion(profile, q, v, m)); setPick([]); if (!flow) setThanks(q.id); };
  const many = q.many;
  return (
    <section className={`ask${compact ? " compact" : ""}`} aria-label="A question for you">
      {!flow && <p className="ask-k">One question{m.who ? ` about ${m.who}` : " for you"}</p>}
      <h2 className="ask-q">{q.text(m)}</h2>
      {many ? (
        <div className="chips">
          {optionsFor(q, m).map((o) => {
            const on = pick.includes(o.v);
            const toggle = () => setPick(o.v === "none" ? (on ? [] : ["none"]) : on ? pick.filter((x) => x !== o.v) : [...pick.filter((x) => x !== "none"), o.v]);
            return <button key={o.v} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={toggle}>{on && <Icon name="check" size={16} stroke={3} />}{o.label}</button>;
          })}
        </div>
      ) : (
        <div className="ask-opts">
          {optionsFor(q, m).map((o) => <button key={o.v} type="button" className="btn ghost ask-opt" onClick={() => save(o.v)}>{o.label}</button>)}
        </div>
      )}
      <details className="ask-why"><summary>Why we're asking</summary><p>{q.why}</p>{q.refs?.length > 0 && <Sources refs={q.refs} />}</details>
      <div className="ask-foot">
        <span />
        {many && <button className="btn primary" disabled={!pick.length} onClick={() => save(pick)}>Save</button>}
      </div>
    </section>
  );
}

/** A product, in full: why it helps, how to use it, flavours and cautions. */
function ProductCard({ p }) {
  return (
    <div className="pcard">
      <div className="pcard-top"><ProductImage product={p} size="sm" /><div><strong>{p.name}</strong>{p.form && <span>{p.form}</span>}</div></div>
      <p className="pcard-k">Why it helps</p>
      {p.benefits ? <ul className="pcard-list">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul> : <p className="pcard-p">{p.why}</p>}
      {p.use && <p className="pcard-p"><b>How to use:</b> {p.use}</p>}
      {p.flavours && <p className="pcard-p"><b>Flavours:</b> {p.flavours}</p>}
      {p.cautions?.length > 0 && <p className="pcard-c">{p.cautions.join(" ")}</p>}
      {p.benefits && p.gc && <p className="pcard-src">Benefits from GC product information.</p>}
    </div>
  );
}

/** The plan: each item says why it's there. */
export function PlanItem({ it, profile, open, first, shown = new Set() }) {
  const [why, setWhy] = useState(false);
  const more = it.because.length > 1;
  const prods = it.products.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  return (
    <article className={`pitem${it.kept ? " kept" : ""}`}>
      <h3>{it.title}</h3>
      <p>{it.body}</p>
      {it.because.length > 0 && (
        <div className="pwhy">
          <p className="pwhy-one"><b>Why:</b> {it.because[0]}</p>
          {more && <button type="button" className="pwhy-btn" aria-expanded={why} onClick={() => setWhy(!why)}>
            {why ? "Fewer reasons" : `${it.because.length - 1} more reason${it.because.length > 2 ? "s" : ""}`} <Icon name="chev" size={14} className={why ? "rot" : ""} />
          </button>}
          {why && <ul>{it.because.slice(1).map((b) => <li key={b}>{b}</li>)}</ul>}
        </div>
      )}
      {prods.filter((p) => !shown.has(p.id)).map((p) => <ProductCard key={p.id} p={p} />)}
      {prods.some((p) => shown.has(p.id)) && (
        <div className="pprods">{prods.filter((p) => shown.has(p.id)).map((p) => <span key={p.id} className="pprod"><ProductImage product={p} size="sm" />{p.name}<em>· more above</em></span>)}</div>
      )}
      {it.act && (it.act.call ? <CallTeam profile={profile} /> : <button className="btn primary pact" onClick={() => open(it.act.open)}>{it.act.label}</button>)}
      {it.refs.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={it.refs} /></details>}
    </article>
  );
}

/** Home: the top of the plan, short. */
export function FocusList({ plan, onOpen }) {
  const top = plan.slice(0, 3);
  if (!top.length) return null;
  return (
    <section className="focus" aria-label="Your focus">
      <div className="focus-head"><h2>Your focus</h2><button className="link-btn" onClick={onOpen}>Full plan</button></div>
      <ol>{top.map((it) => <li key={it.id}><button type="button" onClick={onOpen}><strong>{it.title}</strong><span>{it.because[0]}</span></button></li>)}</ol>
    </section>
  );
}

/** Advice tab: what we know, then the plan. */
export function PlanBlock({ plan, sum, profile, open, refine }) {
  if (!plan.length && !sum.length) return null;
  return (
    <section className="plan-block" id="my-plan">
      <h2 className="list-h first">Your plan</h2>
      {sum.length > 0 && <p className="plan-sum">{sum.join(" ")}</p>}
      {refine && <button type="button" className="refine-line" onClick={refine.go}>Refine your plan · {refine.n === 1 ? "1 quick question" : `${refine.n} quick questions`} <Icon name="chev" size={15} /></button>}
      {(() => {
        // Each product in full the first time it comes up; a short reminder after that.
        const seen = new Set();
        return plan.map((it, i) => {
          const shown = new Set(seen);
          (it.products || []).forEach((p) => seen.add(p));
          return <PlanItem key={it.id} it={it} profile={profile} open={open} first={i === 0} shown={shown} />;
        });
      })()}
      <p className="soft-note">Your plan changes as you add results and answer questions. It doesn't replace your dentist, doctor or treatment team.</p>
    </section>
  );
}

/** The last step of building the plan: the follow-up questions, one after another. */
export function SetupQuestions({ q, m, left, profile, setProfile, onClose, onPlan, refining }) {
  const [asked, setAsked] = useState(0);
  const total = asked + left;
  return (
    <Sheet title={refining ? "Refine your plan" : "A few questions about you"} onClose={onClose}
      progress={q ? { of: total, at: asked, label: `${asked + 1} of ${total}` } : null}
      footer={q ? null : <button className="btn primary big" onClick={onPlan}>See my plan</button>}>
      {q ? (<>
        <p className="eyebrow-q">{refining ? "Your recent results raised a question" : "Last step · each answer tailors your plan"}</p>
        <AskCard key={q.id} flow q={q} m={m} profile={profile} setProfile={(p) => { setProfile(p); setAsked(asked + 1); }} />
      </>) : (
        <div className="setup-done">
          <span className="setup-done-icon"><Icon name="check" size={30} stroke={2.6} /></span>
          <h2 className="q">{refining ? "Your plan is updated" : "Your plan is ready"}</h2>
          <p className="lede">It's built from your checks and answers, and it updates as you add results.</p>
        </div>
      )}
    </Sheet>
  );
}

/** Before the plan exists: how far along, and the one next step. */
export function SetupCard({ setup, onSetup, slim }) {
  const n = setup.next;
  if (!n) return null;
  if (slim) return (
    <button type="button" className="setup-line" onClick={onSetup}>
      <span>Build your plan · step {setup.at + 1} of {setup.total}</span><b>{n.label} <Icon name="chev" size={15} /></b>
    </button>
  );
  return (
    <section className="setup-card" aria-label="Build your plan">
      <p className="today-k">Build your plan · step {setup.at + 1} of {setup.total}</p>
      <h2>{n.label}</h2>
      <ol className="setup-steps">
        {setup.steps.map((s) => (
          <li key={s.id} className={s.done ? "done" : s.id === n.id ? "now" : ""}>
            <i aria-hidden="true">{s.done && <Icon name="check" size={13} stroke={3} />}</i>{s.short}
          </li>
        ))}
      </ol>
      <button className="btn primary big" onClick={onSetup}>{setup.at ? "Continue" : "Start"}</button>
      <p className="setup-note">Your plan appears when you've finished. About 6 minutes in all.</p>
    </section>
  );
}
