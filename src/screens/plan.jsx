import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";
import { answerQuestion, optionsFor } from "../data/engine.js";
import { CallTeam } from "./daily.jsx";
import { ShopItem } from "./shop.jsx";

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

/** The plan as a checklist. Each item is one row: tick it when you're doing it,
 *  tap it for the detail. Products are small chips that open their full details. */
export function PlanItem({ it, profile, open, done, onTick, onProduct, startOpen }) {
  const [on, setOn] = useState(!!startOpen);
  const [why, setWhy] = useState(false);
  const prods = it.products.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  return (
    <article className={`pitem${done ? " done" : ""}${it.kept ? " kept" : ""}${on ? " open" : ""}`}>
      <div className="pitem-row">
        <button type="button" className="ptick" aria-pressed={done} onClick={onTick}
          aria-label={done ? `Mark not doing: ${it.title}` : `I'm doing this: ${it.title}`}>
          {done && <Icon name="check" size={18} stroke={3} />}
        </button>
        <button type="button" className="pitem-head" aria-expanded={on} onClick={() => setOn(!on)}>
          <span className="pitem-text"><strong>{it.title}</strong>{it.because[0] && <em>{it.because[0]}</em>}</span>
          <Icon name="chev" size={18} className={on ? "rot" : ""} />
        </button>
      </div>
      {on && (
        <div className="pitem-body">
          <p>{it.body}</p>
          {it.because.length > 1 && (<>
            <button type="button" className="pwhy-btn" aria-expanded={why} onClick={() => setWhy(!why)}>
              {why ? "Fewer reasons" : `${it.because.length - 1} more reason${it.because.length > 2 ? "s" : ""}`} <Icon name="chev" size={14} className={why ? "rot" : ""} />
            </button>
            {why && <ul className="pwhy-list">{it.because.slice(1).map((b) => <li key={b}>{b}</li>)}</ul>}
          </>)}
          {prods.length > 0 && (
            <div className="pchips">
              {prods.map((p) => (
                <button key={p.id} type="button" className="pchip" onClick={() => onProduct(p)}>
                  <ProductImage product={p} size="sm" /><span>{p.name}</span><Icon name="chev" size={16} />
                </button>
              ))}
            </div>
          )}
          {it.act && (it.act.call ? <CallTeam profile={profile} /> : <button className="btn primary pact" onClick={() => open(it.act.open)}>{it.act.label}</button>)}
          {!done && <button type="button" className="btn ghost pdo" onClick={onTick}><Icon name="check" size={18} /> I'm doing this</button>}
          {it.refs.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={it.refs} /></details>}
        </div>
      )}
    </article>
  );
}

/** Home: the next three things to do, without repeating what Today already says. */
export function FocusList({ plan, onOpen, skip = [] }) {
  const top = plan.filter((it) => !skip.includes(it.id)).slice(0, 3);
  if (!top.length) return null;
  return (
    <section className="focus" aria-label="Your focus">
      <div className="focus-head"><h2>Your focus</h2><button className="link-btn" onClick={onOpen}>My plan</button></div>
      <ol>{top.map((it) => <li key={it.id}><button type="button" onClick={onOpen}><strong>{it.title}</strong><span>{it.because[0]}</span></button></li>)}</ol>
    </section>
  );
}

/** Plan tab: what we know, what to do, and what you're already doing. */
export function PlanBlock({ plan, sum, profile, setProfile, open, refine, onShop }) {
  const [prod, setProd] = useState(null);
  const [all, setAll] = useState(false);
  if (!plan.length && !sum.length) return null;
  const doneMap = profile.planDone || {};
  const isDone = (it) => !!doneMap[it.id] || !!it.kept;
  const todo = plan.filter((it) => !isDone(it)), doing = plan.filter(isDone);
  const tick = (it) => {
    const d = { ...doneMap };
    if (d[it.id]) delete d[it.id]; else d[it.id] = Date.now();
    setProfile({ ...profile, planDone: d });
  };
  const row = (it, i) => <PlanItem key={it.id} it={it} profile={profile} open={open} done={isDone(it)} startOpen={i === 0 && !isDone(it)}
    onTick={() => tick(it)} onProduct={setProd} />;
  return (
    <section className="plan-block" id="my-plan">
      {sum.length > 0 && <p className="plan-sum">{sum.join(" ")}</p>}
      {refine && <button type="button" className="refine-line" onClick={refine.go}>Refine your plan · {refine.n === 1 ? "1 quick question" : `${refine.n} quick questions`} <Icon name="chev" size={15} /></button>}
      {todo.length > 0 && <h2 className="plan-h">To do <span>{todo.length}</span></h2>}
      {(all ? todo : todo.slice(0, 5)).map(row)}
      {!all && todo.length > 5 && <button type="button" className="btn ghost plan-more" onClick={() => setAll(true)}>Show {todo.length - 5} more</button>}
      {doing.length > 0 && <h2 className="plan-h">You're already doing <span>{doing.length}</span></h2>}
      {doing.map(row)}
      <p className="soft-note">Tick each one when you're doing it. Your plan changes as you add results. It doesn't replace your dentist, doctor or treatment team.</p>
      {prod && (
        <Sheet title={prod.name} onClose={() => setProd(null)}
          footer={onShop ? <button className="btn ghost" onClick={() => { setProd(null); onShop(); }}>See all products</button> : null}>
          <ShopItem p={prod} />
        </Sheet>
      )}
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
