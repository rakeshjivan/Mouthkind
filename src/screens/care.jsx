import { useEffect, useState } from "react";
import { Icon } from "../components/ui.jsx";
import { CARE_TOPICS } from "../data/care.js";
import { PlanBlock } from "./plan.jsx";
import { Learn } from "./learn.jsx";
import { fmtDate } from "../lib/store.js";

/** Support strategies. Topics that match the person's results come first. */
// `clin`: the clinician-in-the-loop build. "My plan" is the plan the patient's professional
// signed, and Learn highlights the topics they suggested instead of matching results.
export function Care({ ctx, focus, plan = [], sum = [], ask, profile, setProfile, open, setup, onSetup, refine, onShop, openSheet, clin }) {
  const mine = CARE_TOPICS.filter((t) => !t.general && (clin ? (clin.plan?.topics || []).includes(t.id) : t.forYou(ctx)));
  // Two views: the personal plan, and a library of topics to read ("Learn").
  const topicFocus = focus && focus !== "plan";
  const [view, setView] = useState(topicFocus ? "learn" : "plan");
  useEffect(() => { if (focus) document.getElementById(focus === "plan" ? "my-plan" : `care-${focus}`)?.scrollIntoView({ block: "start" }); }, [focus]);

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
      ) : (
        <Learn ctx={ctx} profile={profile} setProfile={setProfile} focus={topicFocus ? focus : null} onShop={onShop}
          suggested={mine.map((t) => t.id)} suggestedLabel={clin ? "Suggested in your plan" : "For you"} />
      )}
    </div>
  );
}
