import { useEffect, useState } from "react";
import { Icon, Sources } from "../components/ui.jsx";
import { CARE_TOPICS } from "../data/care.js";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";
import { PlanBlock } from "./plan.jsx";

/** Support strategies. Topics that match the person's results come first. */
export function Care({ ctx, focus, plan = [], sum = [], ask, profile, open }) {
  const mine = CARE_TOPICS.filter((t) => t.forYou(ctx));
  const rest = CARE_TOPICS.filter((t) => !t.forYou(ctx));
  const [openId, setOpenId] = useState(focus && focus !== "plan" ? focus : plan.length ? null : mine[0]?.id || null);
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
                    <span>{p.why}</span>
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
      <header className="hero"><h1 className="display">Mouth care advice</h1>
        <p className="lede">What helps a dry or acidic mouth, and protects your teeth from decay.</p></header>
      <PlanBlock plan={plan} sum={sum} profile={profile} open={open} ask={ask} />
      {mine.length > 0 && (<>
        <h2 className={`list-h${plan.length ? "" : " first"}`}>{plan.length ? "Read more: topics for you" : "Most important for you"}</h2>
        {mine.map((t) => <Topic key={t.id} t={t} mineFlag />)}
      </>)}
      <h2 className="list-h">{mine.length ? "Everything else" : "Looking after your mouth"}</h2>
      {rest.map((t) => <Topic key={t.id} t={t} />)}
      <p className="foot-note">Based on your risk checks, dry mouth scores and pH results. General information — your dentist can tailor it to you.</p>
    </div>
  );
}
