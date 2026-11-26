import { useEffect, useState } from "react";
import { Icon, Sources } from "../components/ui.jsx";
import { CARE_TOPICS, topicSections } from "../data/care.js";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";
import { PlanBlock } from "./plan.jsx";
import { milkAllergic, milkFree } from "../data/allergy.js";
import { fmtDate } from "../lib/store.js";

/** Support strategies. Topics that match the person's results come first. */
// `clin`: the clinician-in-the-loop build. "My plan" is the plan the patient's professional
// signed, and Learn highlights the topics they suggested instead of matching results.
export function Care({ ctx, focus, plan = [], sum = [], ask, profile, setProfile, open, setup, onSetup, refine, onShop, openSheet, clin }) {
  const general = CARE_TOPICS.filter((t) => t.general);
  const mine = CARE_TOPICS.filter((t) => !t.general && (clin ? (clin.plan?.topics || []).includes(t.id) : t.forYou(ctx)));
  // Cancer topics only for people in cancer care (or chosen by their professional).
  const rest = CARE_TOPICS.filter((t) => !t.general && !mine.includes(t) && (!t.cancer || ctx.cancer));
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
            {t.sections ? topicSections(t, ctx).map((x) => (
              <div key={x.h} className="ct-sec"><h3>{x.h}</h3><ul>{x.steps.map((s) => milkAllergic(profile) ? milkFree(s) : s).map((s) => <li key={s}>{s}</li>)}</ul></div>
            )) : <ul>{t.steps.map((s) => milkAllergic(profile) ? milkFree(s) : s).map((s) => <li key={s}>{s}</li>)}</ul>}
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
            {t.shop && onShop && <button type="button" className="btn ghost ct-shop" onClick={onShop}><Icon name="cart" size={18} /> See products with these features</button>}
            {t.refs?.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={t.refs} /></details>}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Help</h1></header>
      {/* The things people look for when they're worried, first. */}
      <div className="help-links">
        <button type="button" className="help-link" onClick={() => open("worry")}><Icon name="alert" size={20} /><span><strong>When to worry</strong><em>What needs help now, today or soon</em></span><Icon name="chev" size={16} /></button>
        <button type="button" className="help-link" onClick={() => open("careteam")}><Icon name="phone" size={20} /><span><strong>My care team</strong><em>Numbers to call, find a dentist or pharmacy</em></span><Icon name="chev" size={16} /></button>
        <button type="button" className="help-link" onClick={() => open("questions")}><Icon name="doc" size={20} /><span><strong>Questions for my care team</strong><em>Write them down as they come to you</em></span><Icon name="chev" size={16} /></button>
        {ctx.cancer && <button type="button" className="help-link" onClick={() => open("journey")}><Icon name="info" size={20} /><span><strong>What to expect</strong><em>Your treatment, week by week, and tools</em></span><Icon name="chev" size={16} /></button>}
      </div>
      <div className="dseg plan-switch" role="tablist" aria-label="My plan or learn">
        <button role="tab" aria-selected={view === "plan"} className={`dseg-btn${view === "plan" ? " on" : ""}`} onClick={() => setView("plan")}>My plan</button>
        <button role="tab" aria-selected={view === "learn"} className={`dseg-btn${view === "learn" ? " on" : ""}`} onClick={() => setView("learn")}>Learn</button>
      </div>
      {view === "plan" ? (
        clin ? (clin.plan ? (<>
          <p className="planfrom-k inline">Your plan from {clin.plan.by.name}, {clin.plan.by.profession}, {fmtDate(clin.plan.ts)}</p>
          {clin.plan.note && <p className="planfrom-note">"{clin.plan.note}"</p>}
          <PlanBlock plan={plan} sum={[]} profile={profile} setProfile={setProfile} open={open} onShop={onShop} clin />
        </>) : (
          <section className="plan-wait" id="my-plan">
            <h2>Your plan comes from a health professional</h2>
            <p>{setup?.next ? `First, finish getting ready: next is ${setup.next.label}. ` : ""}When you see a dentist or another health professional, hand them your phone. They'll go through your answers and choose your plan.</p>
            {setup?.next ? <button className="btn primary big" onClick={onSetup}>Continue</button> : <button className="btn primary big" onClick={clin.onOpen}>For a health professional</button>}
          </section>
        ))
        : setup?.next ? (
          <section className="plan-wait" id="my-plan">
            <h2>Your plan is on its way</h2>
            <p>{setup.total - setup.at === 1 ? "One more step" : `${setup.total - setup.at} more steps`} and your personal plan appears here. Next: {setup.next.label}.</p>
            <button className="btn primary big" onClick={onSetup}>{setup.at ? "Continue" : "Start"}</button>
          </section>
        ) : plan.length ? <PlanBlock plan={plan} sum={sum} profile={profile} setProfile={setProfile} open={open} refine={refine} onShop={onShop} />
          : <section className="plan-wait"><h2>No plan yet</h2><p>Do your checks and your plan appears here.</p></section>
      ) : (<>
        <p className="lede tight">What helps a dry or acidic mouth, and protects your teeth.</p>
        <h2 className="list-h first">Start here</h2>
        {general.map((t) => <Topic key={t.id} t={t} />)}
        {mine.length > 0 && (<>
          <h2 className="list-h">{clin ? "Suggested in your plan" : "For you"}</h2>
          {mine.map((t) => <Topic key={t.id} t={t} mineFlag={false} />)}
        </>)}
        {rest.some((t) => t.cancer) && (<>
          <h2 className="list-h">During cancer treatment</h2>
          {rest.filter((t) => t.cancer).map((t) => <Topic key={t.id} t={t} />)}
        </>)}
        <h2 className="list-h">{mine.length ? "Everything else" : "More topics"}</h2>
        {rest.filter((t) => !t.cancer).map((t) => <Topic key={t.id} t={t} />)}
        <p className="foot-note">General information — a dentist, doctor or pharmacist can tailor it to you.</p>
      </>)}
    </div>
  );
}
