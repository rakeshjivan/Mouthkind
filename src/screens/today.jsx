import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { REGIONS, SIP_INTERVAL_DAYS, WEEKLY_INTERVAL_DAYS, telHref } from "../data/clinical.js";
import { LEVELS, adviceFor, cycleWindow, redFlags, topTips, trendFlags } from "../lib/rules.js";
import { DAY, dayKey } from "../lib/store.js";
import { dryWord, painWord } from "./check.jsx";

// ─── Who to call — numbers always visible as text, because a tap may not dial ─
export function CallRow({ label, number, tone = "ghost" }) {
  return (
    <a className={`call-row ${tone}`} href={telHref(number)}>
      <Icon name="phone" />
      <span><strong>{label}</strong><em>{number}</em></span>
    </a>
  );
}

export function CallButtons({ profile, emergency }) {
  const R = REGIONS[profile.region] || REGIONS.AU;
  return (
    <div className="call-stack">
      {profile.team?.phone24
        ? <CallRow label={profile.team.name || "My treatment team"} number={profile.team.phone24} tone={emergency ? "danger" : "primary"} />
        : <p className="soft-note">Add your team's 24-hour number under Me so it's here when you need it.</p>}
      {emergency
        ? <CallRow label="Emergency" number={R.emergency} tone="danger-outline" />
        : <CallRow label={`${R.nurseLine.name} — nurse advice`} number={R.nurseLine.number} />}
    </div>
  );
}

function AlertCard({ a, profile }) {
  return (
    <section className={`alert ${a.level}`} role={a.level === "emergency" ? "alert" : undefined}>
      <p className="alert-level"><Icon name="alert" size={16} /> {LEVELS[a.level].label}</p>
      <h3>{a.title}</h3>
      <p>{a.body}</p>
      {(a.level === "emergency" || a.level === "sameday") && <CallButtons profile={profile} emergency={a.level === "emergency"} />}
      <Sources refs={a.refs} />
    </section>
  );
}

// ─── "I need help now" ─────────────────────────────────────────────────────
export function HelpNow({ profile, onClose }) {
  const R = REGIONS[profile.region] || REGIONS.AU;
  return (
    <Sheet title="Get help" onClose={onClose} tone="urgent">
      <h2 className="q">Who to call</h2>
      <div className="help-block">
        <p><strong>Fever of 38 °C or more, shivering, bleeding that won't stop, swelling, or trouble breathing or swallowing</strong></p>
        {profile.team?.phone24 && <CallRow label={profile.team.name || "My treatment team"} number={profile.team.phone24} tone="danger" />}
        <CallRow label="Emergency" number={R.emergency} tone="danger-outline" />
      </div>
      <div className="help-block">
        <p><strong>Mouth very sore, can't eat or drink, or something new is worrying you</strong></p>
        {profile.team?.phone24
          ? <CallRow label={profile.team.name || "My treatment team"} number={profile.team.phone24} tone="primary" />
          : <p className="soft-note">Call the number your treatment team gave you.</p>}
      </div>
      <div className="help-block">
        <p><strong>Not sure, or just want to talk it through</strong></p>
        <CallRow label={`${R.nurseLine.name} — nurse advice, any time`} number={R.nurseLine.number} />
        <CallRow label={`${R.cancerLine.name} — support and information`} number={R.cancerLine.number} />
      </div>
      {profile.dentist?.phone && (
        <div className="help-block">
          <p><strong>Toothache, a broken tooth, or a denture problem</strong></p>
          <CallRow label={profile.dentist.name || "My dentist"} number={profile.dentist.phone} />
        </div>
      )}
    </Sheet>
  );
}

// ─── After a check-in ──────────────────────────────────────────────────────
export function ResultSheet({ entry, profile, onClose }) {
  const alerts = redFlags(entry, profile);
  const level = alerts[0]?.level;
  const emergency = level === "emergency";
  const tips = topTips(adviceFor(entry, profile));
  const head = emergency ? null
    : level === "sameday" ? { tone: "amber", title: "Please call your team today", sub: "Here's why, and who to call." }
      : level ? { tone: "blue", title: "Mostly OK — one thing to keep an eye on", sub: "Nothing urgent. Details below." }
        : { tone: "green", title: "You're doing OK today", sub: "Nothing in your answers needs a call." };

  return (
    <Sheet title={emergency ? "Get help now" : "Today's result"} onClose={onClose} tone={emergency ? "urgent" : ""}
      footer={<button className="btn primary big" onClick={onClose}>{emergency ? "I've called for help" : "Done"}</button>}>
      {emergency ? (
        alerts.filter((a) => a.level === "emergency").map((a) => <AlertCard key={a.id} a={a} profile={profile} />)
      ) : (
        <>
          <div className={`verdict ${head.tone}`}>
            <span className="verdict-mark"><Icon name={head.tone === "green" ? "check" : "info"} size={26} stroke={2.6} /></span>
            <div><h2>{head.title}</h2><p>{head.sub}</p></div>
          </div>
          {alerts.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}
          {tips.length > 0 && (
            <section className="tips">
              <h3>What may help today</h3>
              <ul>{tips.map((c) => <li key={c.id}>{c.tip}</li>)}</ul>
              <p className="soft-note">More detail is in the Help tab.</p>
            </section>
          )}
        </>
      )}
    </Sheet>
  );
}

// ─── Home ──────────────────────────────────────────────────────────────────
// Extra questions are spread out so no single day feels long: none on the very
// first check-in, and never the weekly and fortnightly extras on the same day.
export const dueFor = (entries) => {
  if (!entries.some((e) => e.kind === "daily")) return { sip: false, weekly: false };
  const last = (pred) => [...entries].filter(pred).sort((a, b) => b.ts - a.ts)[0];
  const sip = last((e) => e.sip != null), wk = last((e) => e.weight != null || e.opening != null);
  const sipDue = !sip || Date.now() - sip.ts >= SIP_INTERVAL_DAYS * DAY;
  const wkDue = !wk || Date.now() - wk.ts >= WEEKLY_INTERVAL_DAYS * DAY;
  return { sip: sipDue, weekly: wkDue && !sipDue };
};

export function Today({ profile, entries, open, go }) {
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const today = sorted.find((e) => e.kind === "daily" && dayKey(e.ts) === dayKey(Date.now()));
  const latest = sorted.find((e) => e.kind === "daily");
  const live = latest && Date.now() - latest.ts < DAY
    ? redFlags(latest, profile).filter((a) => a.level === "emergency" || a.level === "sameday") : [];
  const trend = trendFlags(entries)[0];
  const cyc = cycleWindow(profile);
  const tips = topTips(adviceFor({ ...(latest || {}), sip: sorted.find((e) => e.sip != null)?.sip }, profile));
  const name = profile.carer ? "" : profile.name;
  const whose = profile.carer ? (profile.name ? `${profile.name}'s` : "their") : "your";
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="screen home">
      <p className="hello">{hello}{name ? `, ${name}` : ""}</p>

      {live.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}

      {!today ? (
        <section className="main-card">
          <h1 className="display">Let's check {whose} mouth</h1>
          <p className="lede">A few taps. About a minute.</p>
          <button className="btn primary huge" onClick={() => open("check")}>Start</button>
        </section>
      ) : (
        <section className="main-card done">
          <div className="done-mark"><Icon name="check" size={28} stroke={2.6} /></div>
          <h1 className="display sm">Done for today</h1>
          <p className="lede">
            {[painWord(today.pain), dryWord(today.dryness)?.toLowerCase()].filter(Boolean).join(", ")}.
            {" "}Well done for keeping track.
          </p>
          <button className="link-btn" onClick={() => open("check")}>Something changed? Check again</button>
        </section>
      )}

      <button className="check-link" onClick={() => go("check")}>
        <span><strong>Problem with a tooth or your gums?</strong><em>Check a symptom and find out what to do</em></span>
        <Icon name="chev" />
      </button>

      {cyc && (
        <section className={`cycle${cyc.peak ? " peak" : ""}`}>
          <strong>Day {cyc.day} after chemotherapy</strong>
          <span>{cyc.peak
            ? "This week is usually the hardest for the mouth, and the highest risk for infection. Check for a temperature every day."
            : cyc.day < 5 ? "Mouth soreness often starts in the next few days. Keep up the routine." : "The hardest days are usually behind you."}</span>
        </section>
      )}

      {tips.length > 0 && (
        <section className="tips">
          <h2>What may help</h2>
          <ul>{tips.map((c) => <li key={c.id}>{c.tip}</li>)}</ul>
          <button className="link-btn" onClick={() => go("help")}>More help and products →</button>
        </section>
      )}

      {trend && (
        <section className="nudge">
          <Icon name="info" size={18} />
          <span><strong>{trend.title}.</strong> {trend.body}</span>
        </section>
      )}

      <button className="help-now" onClick={() => open("helpnow")}>
        <Icon name="phone" /> I need help now
      </button>
    </div>
  );
}
