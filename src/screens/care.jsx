import { useEffect, useState } from "react";
import { Icon, Sources } from "../components/ui.jsx";
import { CARE_TOPICS } from "../data/care.js";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";
import { PlanBlock } from "./plan.jsx";

/** Support strategies. Topics that match the person's results come first. */
export function Care({ ctx, focus, plan = [], sum = [], ask, profile, setProfile, open, setup, onSetup, refine, onShop }) {
  const mine = CARE_TOPICS.filter((t) => t.forYou(ctx));
  const rest = CARE_TOPICS.filter((t) => !t.forYou(ctx));
  // Two views: the personal plan, and a library of topics to read ("Learn").
  const topicFocus = focus && focus !== "plan";
  const [view, setView] = useState(topicFocus ? "learn" : "plan");
  const [openId, setOpenId] = useState(topicFocus ? focus : null);
  useEffect(() => { if (focus) document.getElementById(focus === "plan" ? "my-plan" : `care-${focus}`)?.scrollIntoView({ block: "start" }); }, [focus]);

  const Topic = ({ t, mineFlag }) => {
    const on = openId === t.id;
    return (
      <section id={`care-${t.id}`} className={`ctopic${on ? " open" : ""}`}>
        <button className="ctopic-head" onClick={() => setOpenId(on ? null : t.id)} aria-expanded={on}>
          <span className={`ct-icon ${t.id}`}><Icon name={t.icon} size={20} /></span>
          <span className="ct-text"><strong>{t.title}</strong><em>{t.short}</em>{mineFlag && <b className="for-you">For you</b>}</span>
          <Icon name="chev" className={on ? "rot" : ""} />
        </button>
        {on && (
          <div className="ctopic-body">
            <ul>{t.steps.map((s) => <li key={s}>{s}</li>)}</ul>
            {t.products && (
              <div className="prod-cards">
                {t.products.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean).map((p) => (
                  <div key={p.id} className="prod-card">
                    <div className="prod-top"><ProductImage product={p} size="sm" /><strong>{p.name}</strong></div>
                    {p.benefits ? <ul className="pcard-list">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul> : <span>{p.why}</span>}
                    <span className="prod-use"><b>How to use:</b> {p.use}</span>
                  </div>
                ))}
              </div>
            )}
            {t.refs?.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={t.refs} /></details>}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">{view === "plan" ? "My plan" : "Learn"}</h1></header>
      <div className="dseg plan-switch" role="tablist" aria-label="Plan or learn">
        <button role="tab" aria-selected={view === "plan"} className={`dseg-btn${view === "plan" ? " on" : ""}`} onClick={() => setView("plan")}>My plan</button>
        <button role="tab" aria-selected={view === "learn"} className={`dseg-btn${view === "learn" ? " on" : ""}`} onClick={() => setView("learn")}>Learn</button>
      </div>
      {view === "plan" ? (
        setup?.next ? (
          <section className="plan-wait" id="my-plan">
            <h2>Your plan is on its way</h2>
            <p>{setup.total - setup.at === 1 ? "One more step" : `${setup.total - setup.at} more steps`} and your personal plan appears here. Next: {setup.next.label}.</p>
            <button className="btn primary big" onClick={onSetup}>{setup.at ? "Continue" : "Start"}</button>
          </section>
        ) : plan.length ? <PlanBlock plan={plan} sum={sum} profile={profile} setProfile={setProfile} open={open} refine={refine} onShop={onShop} />
          : <section className="plan-wait"><h2>No plan yet</h2><p>Do your checks and your plan appears here.</p></section>
      ) : (<>
        <p className="lede tight">What helps a dry or acidic mouth, and protects your teeth.</p>
        {mine.length > 0 && (<>
          <h2 className="list-h first">For you</h2>
          {mine.map((t) => <Topic key={t.id} t={t} mineFlag={false} />)}
        </>)}
        <h2 className={`list-h${mine.length ? "" : " first"}`}>{mine.length ? "Everything else" : "All topics"}</h2>
        {rest.map((t) => <Topic key={t.id} t={t} />)}
        <p className="foot-note">General information — your dentist can tailor it to you.</p>
      </>)}
    </div>
  );
}
