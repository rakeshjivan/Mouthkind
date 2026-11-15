import { useEffect, useState } from "react";
import { Icon, Sources } from "../components/ui.jsx";
import { NEEDS, RELIEF, reliefFor } from "../data/tracker.js";
import { PRODUCTS } from "../data/products.js";
import { Products, Support } from "./more.jsx";

// What to expect, so a bad week doesn't feel like something going wrong.
const EXPECT = {
  sore: {
    title: "What to expect",
    text: ["With chemotherapy, soreness usually starts about 5 to 10 days after a dose, is worst in the second week, and heals over the following week or two.",
      "With radiotherapy to the head or neck, it usually starts in the second or third week, builds until treatment ends, then heals over 2 to 4 weeks.",
      "It does heal. Logging each day helps your team treat it early."],
    refs: ["elad2020", "ccaMouth"],
  },
  dry: {
    title: "What to expect",
    text: ["Dryness from chemotherapy usually improves within weeks to months of finishing.",
      "After radiotherapy to the head or neck it can last much longer, and sometimes for good — which is why protecting your teeth matters so much.",
      "Your dry mouth score every two weeks shows whether it's improving."],
    refs: ["mercadante2021"],
  },
};
const CALL = {
  sore: ["Your temperature is 38 °C or more — call now", "Pain is 7 or more out of 10, or pain relief isn't working", "You can't eat or drink enough", "White patches, or sores that are spreading — in a day or two"],
  dry: ["You can't swallow food even with water", "Your mouth is too dry to eat enough", "Teeth become painful or sensitive — see your dentist"],
  eating: ["You've had little to eat or drink for a day", "You're losing weight without trying", "Coughing or choking when you eat or drink"],
};

export function Relief({ profile, entries, focus }) {
  const latest = [...entries].filter((e) => e.kind === "daily").sort((a, b) => b.ts - a.ts)[0];
  const forYou = new Set(reliefFor(latest).map((r) => r.id));
  const start = focus ? RELIEF.find((r) => r.id === focus)?.need : latest && (latest.dryness ?? 0) > (latest.pain ?? 0) ? "dry" : "sore";
  const [view, setView] = useState(start || "sore");
  const [openId, setOpenId] = useState(focus || null);
  useEffect(() => { if (focus) document.getElementById(`r-${focus}`)?.scrollIntoView({ block: "center" }); }, [focus]);

  const tabs = [...NEEDS, { id: "products", label: "Products" }, { id: "support", label: "Support" }];
  const cards = RELIEF.filter((r) => r.need === view).sort((a, b) => forYou.has(b.id) - forYou.has(a.id));
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Relief</h1>
        <p className="lede">Practical things that help, from cancer-care and dental guidelines.</p></header>
      <div className="tabs-scroll" role="group" aria-label="Topics">
        {tabs.map((t) => <button key={t.id} className={`tchip ${t.id}${view === t.id ? " on" : ""}`} aria-pressed={view === t.id} onClick={() => setView(t.id)}>{t.label}</button>)}
      </div>

      {view === "products" && <Products profile={profile} embedded />}
      {view === "support" && <Support profile={profile} />}
      {NEEDS.some((n) => n.id === view) && (<>
        {cards.map((r) => {
          const isOpen = openId === r.id || (openId == null && r === cards[0]);
          return (
            <section key={r.id} id={`r-${r.id}`} className={`tip ${r.need}${isOpen ? " open" : ""}`}>
              <button className="tip-head" onClick={() => setOpenId(isOpen ? "" : r.id)} aria-expanded={isOpen}>
                <span>{r.title}{forYou.has(r.id) && <em className="for-you">For you today</em>}</span>
                <Icon name="chev" className={isOpen ? "rot" : ""} />
              </button>
              {isOpen && (
                <div className="tip-body">
                  <ul>{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  {r.products && <p className="tip-products">Products: {r.products.map((id) => PRODUCTS.find((p) => p.id === id)?.name).filter(Boolean).join(", ")} — see Products for how to use them.</p>}
                  <Sources refs={r.refs} />
                </div>
              )}
            </section>
          );
        })}
        {EXPECT[view] && (
          <section className="expect">
            <h2>{EXPECT[view].title}</h2>
            {EXPECT[view].text.map((t, i) => <p key={i}>{t}</p>)}
            <Sources refs={EXPECT[view].refs} />
          </section>
        )}
        <section className="call-when">
          <h2>Call your treatment team if</h2>
          <ul>{CALL[view].map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      </>)}
    </div>
  );
}
