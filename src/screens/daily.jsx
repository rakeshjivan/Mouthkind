import { useState } from "react";
import { milkAllergic, milkFree } from "../data/allergy.js";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { DAILY_TIPS, GRADES, dailyQuestions, dailyTriage, mucositisGrade, painBand } from "../data/daily.js";
import { inCancerCare } from "../data/journey.js";
import { USED } from "../data/used.js";

/** The 10-second daily mouth check: one screen of taps, then what to do. */
/** 0–10 pain scale: big, evenly spaced buttons in two rows, with the end points named. */
export function PainScale({ value, onPick, label = "Mouth pain, 0 to 10" }) {
  return (
    <div className="painscale">
      <div className="painscale-grid" role="radiogroup" aria-label={`${label}. 0 is no pain, 10 is the worst pain you can imagine.`}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={`ps-btn ps-${painBand(n).id}${value === n ? " on" : ""}`} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
      <div className="painscale-ends" aria-hidden="true"><span>0 · No pain</span><span>10 · Worst imaginable</span></div>
    </div>
  );
}

export function DailyCheck({ profile, onClose, onSave, onUsed, followUp, initial }) {
  // Opened from today's pain log, the check carries on from it and saves over the same entry.
  const [a, setA] = useState(() => {
    if (!initial) return {};
    const { id, ts, kind, grade, ...rest } = initial;
    return rest;
  });
  const qs = dailyQuestions(profile, a);
  const [done, setDone] = useState(null);
  const ready = qs.every((q) => a[q.id] != null);
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";

  if (done) return <DailyResult entry={done} profile={profile} onClose={onClose} onUsed={onUsed} followUp={followUp} />;
  return (
    <Sheet title={`How's ${who} mouth today?`} onClose={onClose}
      footer={<button className="btn primary big" disabled={!ready} onClick={() => {
        const e = { id: initial?.id || `dl_${Date.now()}`, ts: Date.now(), kind: "daily", ...a, grade: mucositisGrade(a), full: true };
        onSave(e); setDone(e);
      }}>{ready ? "Done" : `${qs.filter((q) => a[q.id] == null).length} to go`}</button>}>
      <h2 className="q">How's {who} mouth today?</h2>
      <p className="lede tight">One tap on each line.</p>
      <div className="daily">
        {qs.map((q) => (
          <fieldset key={q.id} className="daily-q">
            <legend>{q.text}</legend>
            {q.scale ? <PainScale value={a[q.id]} onPick={(v) => setA({ ...a, [q.id]: v, ...(v < 7 ? { control: undefined } : {}) })} /> :
            <div className="dseg" role="radiogroup" aria-label={q.text}>
              {q.options.map((o) => (
                <button key={String(o.v)} type="button" role="radio" aria-checked={a[q.id] === o.v}
                  className={`dseg-btn${a[q.id] === o.v ? " on" : ""}`} onClick={() => setA({ ...a, [q.id]: o.v })}>{o.label}</button>
              ))}
            </div>}
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}

export function DailyResult({ entry, profile, onClose, onUsed, followUp, onLearn }) {
  const cancer = inCancerCare(profile);
  const t = dailyTriage(entry, { cancer });
  const g = GRADES[entry.grade ?? mucositisGrade(entry)];
  const phone = profile.team?.phone24;
  const tips = t.tips.map((k) => DAILY_TIPS[k]);
  return (
    <Sheet title="Today's mouth check" onClose={onClose}
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
      {entry.pain != null && <div className={`grade-pill t-${painBand(entry.pain).tone}`}><span>Mouth pain</span><strong>{entry.pain} out of 10 · {painBand(entry.pain).label}</strong></div>}

      {t.level !== "now" && followUp}
      {entry.full !== false && entry.sores != null && <div className={`grade-pill t-${g.tone}`}><span>Mouth sores</span><strong>{g.label}</strong></div>}

      {tips.length > 0 && (
        <section className="rblock plan">
          <h3>What helps today</h3>
          <ul className="tip-list">{tips.map((x) => <li key={x.t}>{milkAllergic(profile) ? milkFree(x.t) : x.t}</li>)}</ul>
          <Sources refs={[...new Set(tips.flatMap((x) => x.refs))]} />
        </section>
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
  if (!phone) return <p className="small">Add your team's 24-hour number in Me, so it's here when you need it.</p>;
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
export function PainToday({ profile, entry, onLog, onDetail, onResult }) {
  const [edit, setEdit] = useState(false);
  const cancer = inCancerCare(profile);
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";
  const log = (patch) => {
    const base = entry && !edit ? entry : entry ? { ...entry, control: undefined } : null;
    const e = { ...(base || {}), id: base?.id || `dl_${Date.now()}`, ts: Date.now(), kind: "daily", ...patch };
    onLog({ ...e, grade: mucositisGrade(e) });
    setEdit(false);
  };
  if (!entry || entry.pain == null || edit) {
    return (
      <section className="paincard" aria-label="Mouth pain today">
        <h2>How much does {who} mouth hurt today?</h2>
        <p className="lede tight">Tap a number. 0 is no pain; 10 is the worst you can imagine.</p>
        <PainScale value={entry?.pain} onPick={(n) => log({ pain: n })} />
      </section>
    );
  }
  const b = painBand(entry.pain);
  const t = dailyTriage(entry, { cancer });
  const needControl = entry.pain >= 7 && entry.control == null;
  return (
    <section className={`paincard logged t-${b.tone}`} aria-label="Mouth pain today">
      <div className="paincard-row">
        <p><span>Mouth pain today</span><strong>{entry.pain} out of 10 · {b.label}</strong></p>
        <button type="button" className="link-btn" onClick={() => setEdit(true)}>Change</button>
      </div>
      {needControl && (
        <div className="paincard-q">
          <p className="daily-legend">Is pain relief keeping it bearable?</p>
          <div className="dseg" role="radiogroup" aria-label="Is pain relief keeping it bearable?">
            {[["yes", "Yes"], ["no", "No"], ["none", "Not taking any"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={false} className="dseg-btn" onClick={() => log({ control: v })}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {/* Anything urgent shows in the Today card above, so it isn't repeated here. */}
      {!needControl && t.level === "ok" && t.notes[0] && <p className="paincard-msg soft">{t.notes[0]}</p>}
      {!needControl && !entry.full && <button type="button" className="btn ghost paincard-more" onClick={onDetail}>Add sores, eating and dryness</button>}
    </section>
  );
}
