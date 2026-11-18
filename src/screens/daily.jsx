import { useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { DAILY_TIPS, GRADES, dailyQuestions, dailyTriage, mucositisGrade } from "../data/daily.js";
import { USED } from "../data/used.js";

/** The 10-second daily mouth check: one screen of taps, then what to do. */
export function DailyCheck({ profile, onClose, onSave, onUsed, followUp }) {
  const qs = dailyQuestions(profile);
  const [a, setA] = useState({});
  const [done, setDone] = useState(null);
  const ready = qs.every((q) => a[q.id] != null);
  const who = profile.carer && profile.carerFor ? `${profile.carerFor}'s` : "your";

  if (done) return <DailyResult entry={done} profile={profile} onClose={onClose} onUsed={onUsed} followUp={followUp} />;
  return (
    <Sheet title={`How's ${who} mouth today?`} onClose={onClose}
      footer={<button className="btn primary big" disabled={!ready} onClick={() => {
        const e = { id: `dl_${Date.now()}`, ts: Date.now(), kind: "daily", ...a, grade: mucositisGrade(a) };
        onSave(e); setDone(e);
      }}>{ready ? "Done" : `${qs.filter((q) => a[q.id] == null).length} to go`}</button>}>
      <h2 className="q">How's {who} mouth today?</h2>
      <p className="lede tight">One tap on each line.</p>
      <div className="daily">
        {qs.map((q) => (
          <fieldset key={q.id} className="daily-q">
            <legend>{q.text}</legend>
            <div className="dseg" role="radiogroup" aria-label={q.text}>
              {q.options.map((o) => (
                <button key={String(o.v)} type="button" role="radio" aria-checked={a[q.id] === o.v}
                  className={`dseg-btn${a[q.id] === o.v ? " on" : ""}`} onClick={() => setA({ ...a, [q.id]: o.v })}>{o.label}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}

export function DailyResult({ entry, profile, onClose, onUsed, followUp }) {
  const t = dailyTriage(entry);
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
          <strong><Icon name="alert" size={20} /> Contact your treatment team now</strong>
          {t.now.map((r) => <p key={r}>{r}</p>)}
          <CallTeam profile={profile} urgent />
          <p className="small">If you can't reach them, go to the nearest emergency department or call 000.</p>
        </div>
      ) : t.level === "today" ? (
        <div className="alert-x amber callout">
          <strong>Let your treatment team know today</strong>
          {t.today.map((r) => <p key={r}>{r}</p>)}
          {phone && <CallTeam profile={profile} />}
        </div>
      ) : (
        <div className="alert-x good callout"><strong><Icon name="check" size={20} stroke={2.6} /> Nothing worrying today</strong><p>Keep up your mouth care, and check again tomorrow.</p></div>
      )}
      {t.level === "now" && t.today.length > 0 && <div className="callout-more">{t.today.map((r) => <p key={r}>{r}</p>)}</div>}

      {t.level !== "now" && followUp}
      <div className={`grade-pill t-${g.tone}`}><span>Mouth sores</span><strong>{g.label}</strong></div>

      {tips.length > 0 && (
        <section className="rblock plan">
          <h3>What helps today</h3>
          <ul className="tip-list">{tips.map((x) => <li key={x.t}>{x.t}</li>)}</ul>
          <Sources refs={[...new Set(tips.flatMap((x) => x.refs))]} />
        </section>
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
