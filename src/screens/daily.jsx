import { useState } from "react";
import { milkAllergic, milkFree } from "../data/allergy.js";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { DAILY_TIPS, GRADES, dailyQuestions, dryWord, mucositisGrade, painBand, teethFlags, triageFor, TEETH_FLAGS } from "../data/daily.js";
import { inCancerCare } from "../data/journey.js";
import { USED } from "../data/used.js";

/** A 0–10 scale: big, evenly spaced buttons in two rows, with the end points named.
 *  kind "pain" colours by pain band; "dry" uses one calm colour. */
export function PainScale({ value, onPick, label = "Mouth pain, 0 to 10", kind = "pain" }) {
  const ends = kind === "dry" ? ["0 · Not dry", "10 · Driest imaginable"] : ["0 · No pain", "10 · Worst imaginable"];
  return (
    <div className="painscale">
      <div className="painscale-grid" role="radiogroup" aria-label={`${label}. ${ends[0].replace(" · ", " is ")}, ${ends[1].replace(" · ", " is ").toLowerCase()}.`}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={`ps-btn ${kind === "dry" ? "ps-dry" : `ps-${painBand(n).id}`}${value === n ? " on" : ""}`} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
      <div className="painscale-ends" aria-hidden="true"><span>{ends[0]}</span><span>{ends[1]}</span></div>
    </div>
  );
}

/** The symptom log: one screen of taps, then what to do. Logging again the same day updates the entry. */
export function DailyCheck({ profile, onClose, onSave, onUsed, followUp, initial, onLearn, noTeeth, decayRisk, fluidLimit, onShop, onRemind }) {
  const [a, setA] = useState(() => {
    if (!initial) return {};
    const { id, ts, kind, grade, full, ...rest } = initial;
    return rest;
  });
  const qs = dailyQuestions(profile, a);
  const [done, setDone] = useState(null);
  const ready = qs.every((q) => a[q.id] != null && (!q.many || a[q.id].length));
  const left = qs.filter((q) => a[q.id] == null || (q.many && !a[q.id].length)).length;
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";
  const tick = (q, v) => {
    if (v === "none") return setA({ ...a, [q.id]: ["none"] });
    const cur = [].concat(a[q.id] || []).filter((x) => x !== "none");
    setA({ ...a, [q.id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  if (done) return <DailyResult entry={done} profile={profile} onClose={onClose} onUsed={onUsed} followUp={followUp} onLearn={onLearn} noTeeth={noTeeth} decayRisk={decayRisk} fluidLimit={fluidLimit} onShop={onShop} onRemind={onRemind} />;
  return (
    <Sheet title={`How's ${who} mouth today?`} onClose={onClose}
      footer={<button className="btn primary big" disabled={!ready} onClick={() => {
        const e = { id: initial?.id || `dl_${Date.now()}`, ts: initial?.ts && new Date(initial.ts).toDateString() === new Date().toDateString() ? initial.ts : Date.now(),
          kind: "daily", ...a, dry: dryWord(a.dryness), grade: mucositisGrade(a), full: true };
        onSave(e); setDone(e);
      }}>{ready ? "Save" : `${left} to go`}</button>}>
      <h2 className="q">How's {who} mouth today?</h2>
      <p className="lede tight">One tap on each line. It takes under a minute.</p>
      <div className="daily">
        {qs.map((q) => (
          <fieldset key={q.id} className="daily-q">
            <legend>{q.text}</legend>
            {q.scale ? <PainScale kind={q.scale} label={q.text} value={a[q.id]} onPick={(v) => setA({ ...a, [q.id]: v, ...(q.id === "pain" && v < 7 ? { control: undefined } : {}) })} />
            : q.many ? (
              <div className="dseg wrap" role="group" aria-label={q.text}>
                {[...q.options, { v: "none", label: q.none }].map((o) => {
                  const on = [].concat(a[q.id] || []).includes(o.v);
                  return <button key={o.v} type="button" aria-pressed={on} className={`dseg-btn${on ? " on" : ""}`} onClick={() => tick(q, o.v)}>{o.label}</button>;
                })}
              </div>
            ) : (
            <div className="dseg" role="radiogroup" aria-label={q.text}>
              {q.options.map((o) => (
                <button key={String(o.v)} type="button" role="radio" aria-checked={a[q.id] === o.v}
                  className={`dseg-btn${a[q.id] === o.v ? " on" : ""}`} onClick={() => setA({ ...a, [q.id]: o.v })}>{o.label}</button>
              ))}
            </div>)}
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}

export function DailyResult({ entry, profile, onClose, onUsed, followUp, onLearn, noTeeth, decayRisk, fluidLimit, onShop, onRemind }) {
  const cancer = inCancerCare(profile);
  const t = triageFor(entry, profile, { noTeeth, decayRisk, fluidLimit });
  const g = GRADES[entry.grade ?? mucositisGrade(entry)];
  const phone = profile.team?.phone24;
  const tips = t.tips.map((k) => DAILY_TIPS[k]);
  return (
    <Sheet title="Today's mouth log" onClose={onClose}
      footer={<>
        {onUsed && <button className="btn ghost" onClick={onUsed}>Log what I used</button>}
        <button className="btn primary big" onClick={onClose}>Done</button>
      </>}>
      {t.level === "now" ? (
        <div className="alert-x red callout">
          <strong><Icon name="alert" size={20} /> {cancer ? "Contact your treatment team now" : "Get help now"}</strong>
          {t.now.map((r) => <p key={r}>{r}</p>)}
          {cancer && <CallTeam profile={profile} urgent />}
          <p className="small">{cancer ? "If you can't reach them, go to the nearest emergency department or call 000." : "Go to the nearest emergency department, or call 000 in an emergency."}</p>
        </div>
      ) : t.level === "today" ? (
        <div className="alert-x amber callout">
          <strong>{cancer ? "Let your treatment team know today" : "See a dentist or doctor today"}</strong>
          {t.today.map((r) => <p key={r}>{r}</p>)}
          {cancer && phone && <CallTeam profile={profile} />}
        </div>
      ) : (
        <div className="alert-x good callout"><strong><Icon name="check" size={20} stroke={2.6} /> Nothing worrying today</strong><p>Keep up your mouth care, and check again tomorrow.</p></div>
      )}
      {t.level === "now" && t.today.length > 0 && <div className="callout-more">{t.today.map((r) => <p key={r}>{r}</p>)}</div>}
      {t.notes.length > 0 && <div className="callout-more">{t.notes.map((r) => <p key={r}>{r}</p>)}</div>}
      {entry.dryness != null && <div className="grade-pill t-dry"><span>Dryness</span><strong>{entry.dryness} out of 10</strong></div>}
      {entry.pain != null && <div className={`grade-pill t-${painBand(entry.pain).tone}`}><span>Mouth pain</span><strong>{entry.pain} out of 10 · {painBand(entry.pain).label}</strong></div>}

      {t.level !== "now" && followUp}
      {entry.full !== false && entry.sores != null && <div className={`grade-pill t-${g.tone}`}><span>Mouth sores</span><strong>{g.label}</strong></div>}

      {tips.length > 0 && (
        <section className="rblock plan">
          <h3>What helps today</h3>
          <ul className="tip-list">{tips.map((x) => <li key={x.t}>{milkAllergic(profile) ? milkFree(x.t) : x.t}</li>)}</ul>
          {onShop && tips.some((x) => x.products) && <button type="button" className="btn ghost tip-shop" onClick={onShop}><Icon name="cart" size={18} /> See these products</button>}
          <Sources refs={[...new Set(tips.flatMap((x) => x.refs))]} />
        </section>
      )}
      {onRemind && (
        <button type="button" className="remind-nudge" onClick={onRemind}>
          <Icon name="bell" size={20} /><span><strong>Get a daily reminder to log</strong><em>Add it to your phone's calendar, at a time that suits you</em></span><Icon name="chev" size={16} />
        </button>
      )}
      {onLearn && cancer && ((entry.grade ?? mucositisGrade(entry)) >= 1) && (
        <button type="button" className="link-btn learn-link" onClick={onLearn}>Read about mouth sores from treatment (mucositis)</button>
      )}
    </Sheet>
  );
}

/** The team's number, big and tappable, or a prompt to add it. */
export function CallTeam({ profile, urgent }) {
  const phone = profile.team?.phone24;
  if (!phone) return <p className="small">Add your team's 24-hour number in Contact my care team on Home, so it's here when you need it.</p>;
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;
  return (
    <a className={`btn ${urgent ? "danger" : "primary"} big call-btn`} href={tel}>
      <Icon name="phone" size={20} /> Call {profile.team?.name || "my treatment team"} · {phone}
    </a>
  );
}

/** Quick log of what was used today. */
export function UsedLog({ onClose, onSave, last }) {
  const [v, setV] = useState(last || []);
  return (
    <Sheet title="What I used today" onClose={onClose}
      footer={<button className="btn primary big" disabled={!v.length} onClick={() => { onSave({ id: `u_${Date.now()}`, ts: Date.now(), kind: "used", items: v }); onClose(); }}>Save</button>}>
      <h2 className="q">What did you use today?</h2>
      <p className="lede tight">Over time, the Tracker shows whether your dry mouth score changed after you started something.</p>
      <div className="chips">
        {USED.map((u) => {
          const on = v.includes(u.v);
          return <button key={u.v} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => setV(on ? v.filter((x) => x !== u.v) : [...v, u.v])}>
            {on && <Icon name="check" size={16} stroke={3} />}{u.label}</button>;
        })}
      </div>
    </Sheet>
  );
}

/** Home: log today's mouth pain in one tap, for everyone once the plan is built. */
/** Home: today's mouth log. Not logged yet → one button into the log. Logged → today's
 *  dryness, pain and sores at a glance, with a way to update. Urgent advice is in the Today card. */
export function MouthToday({ profile, entry, onOpen, since, onRemind }) {
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";
  if (!entry) return (
    <section className="paincard" aria-label="Today's mouth log">
      <h2>How's {who} mouth today?</h2>
      <p className="lede tight">{since >= 2 ? `Your last log was ${since} days ago. Logging most days shows how your mouth is changing.` : "Dryness, pain and anything new. It takes under a minute."}</p>
      <button type="button" className="btn primary big" onClick={onOpen}><Icon name="plus" size={20} stroke={2.6} /> Log today</button>
      {onRemind && since != null && <button type="button" className="link-btn paincard-more" onClick={onRemind}><Icon name="bell" size={16} /> Remind me each day</button>}
    </section>
  );
  const t = triageFor(entry, profile);
  const b = entry.pain != null ? painBand(entry.pain) : null;
  return (
    <section className="paincard logged" aria-label="Today's mouth log">
      <div className="paincard-row">
        <p><span>Today's mouth log</span></p>
        <button type="button" className="link-btn" onClick={onOpen}>Update</button>
      </div>
      <ul className="sym-now">
        {entry.dryness != null && <li>Dryness {entry.dryness} of 10</li>}
        {b && <li className={`t-${b.tone}`}>{entry.pain ? `Pain ${entry.pain} of 10 · ${b.label.toLowerCase()}` : "No pain"}</li>}
        {entry.sores != null && <li>{GRADES[entry.grade ?? mucositisGrade(entry)].label}</li>}
        {teethFlags(entry).length > 0 && <li className="t-amber">{teethFlags(entry).map((v) => TEETH_FLAGS.find((f) => f.v === v)?.label).join(", ")}</li>}
      </ul>
      {t.level === "ok" && t.notes[0] && <p className="paincard-msg soft">{t.notes[0]}</p>}
    </section>
  );
}
