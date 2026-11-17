import { useEffect, useState } from "react";
import { Icon, Sources } from "../components/ui.jsx";
import { CARE_TOPICS } from "../data/care.js";
import { PRODUCTS } from "../data/products.js";
import { ProductImage } from "../components/productImage.jsx";

/** Support strategies. Topics that match the person's results come first. */
export function Care({ ctx, focus }) {
  const mine = CARE_TOPICS.filter((t) => t.forYou(ctx));
  const rest = CARE_TOPICS.filter((t) => !t.forYou(ctx));
  const [openId, setOpenId] = useState(focus || mine[0]?.id || null);
  useEffect(() => { if (focus) document.getElementById(`care-${focus}`)?.scrollIntoView({ block: "start" }); }, [focus]);

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
            <Sources refs={t.refs} />
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Dry mouth advice</h1>
        <p className="lede">What helps a dry or acidic mouth, and protects your teeth.</p></header>
      {mine.length > 0 && (<>
        <h2 className="list-h first">Most important for you</h2>
        {mine.map((t) => <Topic key={t.id} t={t} mineFlag />)}
      </>)}
      <h2 className="list-h">{mine.length ? "Everything else" : "Looking after your mouth"}</h2>
      {rest.map((t) => <Topic key={t.id} t={t} />)}
      <p className="foot-note">Based on your risk check, dry mouth scores and pH results. General information — your dentist can tailor it to you.</p>
    </div>
  );
}
