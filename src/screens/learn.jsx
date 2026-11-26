// ─── Learn ─────────────────────────────────────────────────────────────────
// General information, laid out so people can find what they need:
//  1. Start here: a three-step guide (what a dry mouth does, protecting teeth, easing the
//     dryness), read in order, with ticks as each is read.
//  2. What's bothering you?: tiles by problem, each opening one topic.
//  3. Your situation: medicines, sleep, pregnancy, menopause.
// Every topic opens on its own page with the same layout: the one-line answer, sections as
// short lists (things to do ticked, things to avoid crossed, reasons to call in a red box),
// the features to look for with a link to the Shop, then sources folded away.
// No product names: those are only in the Shop and in a plan a professional signs.
import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { CARE_TOPICS, topicSections } from "../data/care.js";
import { milkAllergic, milkFree } from "../data/allergy.js";
import { topicTone } from "../data/tones.js";

const byId = (id) => CARE_TOPICS.find((t) => t.id === id);
const GUIDE = ["saliva", "teeth", "products"];
const GUIDE_LABEL = { saliva: "What a dry mouth does", teeth: "Protecting your teeth", products: "Easing the dryness" };
const TILES = [
  { id: "sleep", label: "Dry at night", icon: "moon" },
  { id: "teeth", label: "Worried about decay", icon: "tooth" },
  { id: "acid", label: "Reflux or vomiting", icon: "shield" },
  { id: "diet", label: "What to eat and drink", icon: "leaf" },
  { id: "clean", label: "Cleaning a dry mouth", icon: "check" },
  { id: "water", label: "Drinking enough", icon: "drop" },
  { id: "habits", label: "Habits that dry the mouth", icon: "user" },
  { id: "dentist", label: "Check-ups", icon: "user" },
];
const CANCER_TILES = [
  { id: "help", label: "When to get help", icon: "alert", urgent: true },
  { id: "sore", label: "Sore mouth or ulcers", icon: "heart" },
  { id: "taste", label: "Taste changes", icon: "leaf" },
  { id: "swallow", label: "Hard to swallow", icon: "alert" },
  { id: "eating", label: "Eating when it's sore", icon: "leaf" },
  { id: "thrush", label: "White patches", icon: "info" },
  { id: "rtlife", label: "Teeth after radiotherapy", icon: "tooth" },
];
const SITUATIONS = [
  { id: "medicines", label: "Medicines" },
  { id: "sleep", label: "Sleep apnoea or CPAP" },
  { id: "pregnancy", label: "Pregnancy" },
  { id: "menopause", label: "Menopause" },
];

// How each section's list reads: things to do, things to avoid, or reasons to call.
const kindOf = (h = "", topicId) =>
  /^(Call your team|Get help)/i.test(h) || topicId === "help" ? "call"
  : /avoid/i.test(h) ? "avoid"
  : /^(What helps|Every day|Neutralise|Put mineral|Using them|What to look for|Ask your team)/i.test(h) ? "do"
  : "info";

function TopicPage({ t, ctx, profile, onClose, onShop, next, onNext }) {
  const milk = milkAllergic(profile);
  const fix = (s) => (milk ? milkFree(s) : s);
  const secs = t.sections ? topicSections(t, ctx) : [{ h: "", steps: t.steps }];
  return (
    <Sheet title={t.title} onClose={onClose}
      footer={next ? <><button className="btn ghost" onClick={onClose}>Close</button><button className="btn primary big" onClick={onNext}>Next: {GUIDE_LABEL[next]}</button></>
        : <button className="btn primary big" onClick={onClose}>Done</button>}>
      <div className="lp-head">
        <span className={`ct-icon ${t.id}`} aria-hidden="true"><Icon name={t.icon} size={22} /></span>
        <h2 className="q">{t.title}</h2>
      </div>
      <p className="lp-answer">{t.short}</p>
      {secs.map((x, i) => {
        const k = kindOf(x.h, t.id);
        const items = <ul>{x.steps.map(fix).map((s) => (
          <li key={s}>{k === "do" ? <Icon name="check" size={16} stroke={3} /> : k === "avoid" ? <Icon name="x" size={16} stroke={3} /> : <i aria-hidden="true" />}<span>{s}</span></li>
        ))}</ul>;
        // Untitled lists, the first section and reasons to call are open; the rest open on tap.
        if (!x.h) return <section key={i} className={`lp-sec k-${k}`}>{items}</section>;
        return (
          <details key={x.h} className={`lp-sec lp-box k-${k} tone-${topicTone(t.id)}`} open={i === 0 || k === "call" || /^What to look for/.test(x.h)}>
            <summary><span>{k === "call" && <Icon name="alert" size={18} />}{x.h}</span><em>{x.steps.length}</em><Icon name="chev" size={16} /></summary>
            {items}
          </details>
        );
      })}
      {t.look?.length > 0 && (
        <section className="lp-look">
          <h3>What to look for</h3>
          <ul className="meets">{t.look.map((m) => <li key={m}><Icon name="check" size={14} stroke={3} />{m}</li>)}</ul>
          {t.shop && onShop && <button type="button" className="btn ghost" onClick={onShop}><Icon name="cart" size={18} /> See products with these features</button>}
        </section>
      )}
      {t.refs?.length > 0 && <details className="srcs"><summary>Sources</summary><Sources refs={t.refs} /></details>}
      <p className="foot-note">General information. A dentist, doctor or pharmacist can tailor it to you.</p>
    </Sheet>
  );
}

/** The Learn view inside Help. `suggested`: topic ids from the plan (or the person's results). */
export function Learn({ ctx, profile, setProfile, suggested = [], suggestedLabel = "For you", focus, onShop }) {
  const [openId, setOpenId] = useState(focus && byId(focus) ? focus : null);
  const read = profile.learnRead || [];
  const markRead = (id) => { if (!read.includes(id)) setProfile({ ...profile, learnRead: [...read, id] }); };
  const openTopic = (id) => { setOpenId(id); markRead(id); };
  const t = openId && byId(openId);
  const gi = t ? GUIDE.indexOf(t.id) : -1;
  const next = gi >= 0 && gi < GUIDE.length - 1 ? GUIDE[gi + 1] : null;
  const doneN = GUIDE.filter((id) => read.includes(id)).length;
  const sugg = suggested.map(byId).filter((x) => x && !GUIDE.includes(x.id));
  const Tile = ({ x }) => byId(x.id) && (
    <button type="button" className={`lt-tile${x.urgent ? " urgent" : ` tone-${topicTone(x.id)}`}`} onClick={() => openTopic(x.id)}>
      <Icon name={x.icon} size={22} /><span>{x.label}</span>
    </button>
  );
  return (
    <div className="learn">
      <section className="lg">
        <div className="lg-h"><h2 className="list-h first">Start here</h2><span>{doneN} of {GUIDE.length} read</span></div>
        <ol className="lg-steps">
          {GUIDE.map((id, i) => (
            <li key={id}>
              <button type="button" className={`${read.includes(id) ? "done " : ""}tone-${topicTone(id)}`} onClick={() => openTopic(id)}>
                <b aria-hidden="true">{read.includes(id) ? <Icon name="check" size={16} stroke={3} /> : i + 1}</b>
                <span><strong>{GUIDE_LABEL[id]}</strong><em>{byId(id).short}</em></span>
                <Icon name="chev" size={16} />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {sugg.length > 0 && (<>
        <h2 className="list-h">{suggestedLabel}</h2>
        <div className="lt-grid">{sugg.map((x, i) => <button key={x.id} type="button" className={`lt-tile mine tone-${topicTone(x.id, i)}`} onClick={() => openTopic(x.id)}><Icon name={x.icon} size={22} /><span>{x.title}</span></button>)}</div>
      </>)}

      {ctx.cancer && (<>
        <h2 className="list-h">During cancer treatment</h2>
        <div className="lt-grid">{CANCER_TILES.map((x) => <Tile key={x.id} x={x} />)}</div>
      </>)}

      <h2 className="list-h">What's bothering you?</h2>
      <div className="lt-grid">{TILES.map((x) => <Tile key={x.id} x={x} />)}</div>

      <h2 className="list-h">Your situation</h2>
      <div className="lt-chips">{SITUATIONS.map((x) => byId(x.id) && <button key={x.id} type="button" className={`chip lt-chip tone-${topicTone(x.id)}`} onClick={() => openTopic(x.id)}>{x.label}</button>)}</div>

      {t && <TopicPage t={t} ctx={ctx} profile={profile} onClose={() => setOpenId(null)} onShop={onShop && (() => { setOpenId(null); onShop(); })}
        next={next} onNext={() => openTopic(next)} />}
    </div>
  );
}
