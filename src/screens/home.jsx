import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { REGIONS, SIP_INTERVAL_DAYS, sipBand, telHref } from "../data/clinical.js";
import { LEVELS, cycleWindow, redFlags, trendFlags } from "../lib/rules.js";
import { DAY, dayKey } from "../lib/store.js";
import { CARE, dryWord, lastDays, reliefFor, soreWord } from "../data/tracker.js";
import { DayStrip, Ring } from "../components/kit.jsx";

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

export function AlertCard({ a, profile }) {
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

// ─── Home ──────────────────────────────────────────────────────────────────
export const sipDue = (entries) => {
  const last = [...entries].filter((e) => e.sip != null).sort((a, b) => b.ts - a.ts)[0];
  return { last, due: !last || Date.now() - last.ts >= SIP_INTERVAL_DAYS * DAY };
};

export function Home({ profile, entries, care, onCare, open, go }) {
  const days = lastDays(entries, 14);
  const today = days.at(-1).e;
  const latest = [...days].reverse().find((d) => d.e)?.e;
  const live = today ? redFlags(today, profile).filter((a) => a.level === "emergency" || a.level === "sameday") : [];
  const trend = trendFlags(entries)[0];
  const cyc = cycleWindow(profile);
  const relief = reliefFor(today || latest).slice(0, 3);
  const sip = sipDue(entries);
  const done = care[dayKey(Date.now())] || [];
  const whose = profile.carer ? (profile.name ? `${profile.name}'s` : "their") : "your";
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const logged = days.filter((d) => d.e).length;

  return (
    <div className="screen home2">
      <header className="topbar">
        <div>
          <p className="hello">{hello}{!profile.carer && profile.name ? `, ${profile.name}` : ""}</p>
          <p className="today-date">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button className="help-pill" onClick={() => open("helpnow")}><Icon name="phone" size={18} /> Get help</button>
      </header>

      {live.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}

      <section className="today-card">
        {today ? (<>
          <div className="rings">
            <Ring value={today.pain} tone="sore" label="Soreness" word={soreWord(today.pain)} />
            <Ring value={today.dryness} tone="dry" label="Dryness" word={dryWord(today.dryness)} />
          </div>
          <button className="btn quiet-btn" onClick={() => open("log")}>Update today's log</button>
        </>) : (<>
          <h1 className="today-q">How's {whose} mouth today?</h1>
          <p className="today-sub">Soreness, dryness and eating. About 30 seconds.</p>
          <button className="btn primary huge" onClick={() => open("log")}>Log today</button>
        </>)}
        <div className="strip-wrap">
          <div className="strip-legend"><span className="lg sore">Soreness</span><span className="lg dry">Dryness</span><span className="lg-n">{logged} of 14 days logged</span></div>
          <DayStrip days={days} onDay={() => go("diary")} />
        </div>
      </section>

      {cyc && (
        <section className={`cycle${cyc.peak ? " peak" : ""}`}>
          <strong>Day {cyc.day} after chemotherapy</strong>
          <span>{cyc.peak
            ? "Mouth soreness is usually worst around now, and infection risk is highest. Keep up the rinses and check your temperature every day."
            : cyc.day < 5 ? "Soreness often starts in the next few days. Keep up the rinses." : "The hardest days are usually behind you this cycle."}</span>
        </section>
      )}

      {sip.due && (
        <button className="due-row" onClick={() => open("sip")}>
          <span className="due-icon dry"><Icon name="drop" size={20} /></span>
          <span><strong>Dry mouth score is due</strong><em>Five questions, every two weeks{sip.last ? ` · last ${sip.last.sip} of 15, ${sipBand(sip.last.sip).label.toLowerCase()}` : ""}</em></span>
          <Icon name="chev" />
        </button>
      )}

      {relief.length > 0 && (
        <section className="block">
          <div className="block-h"><h2>Ease it today</h2><button className="link-btn" onClick={() => go("relief")}>All relief</button></div>
          {relief.map((r) => (
            <button key={r.id} className={`ease ${r.need}`} onClick={() => go("relief", r.id)}>
              <strong>{r.title}</strong><span>{r.steps[0]}</span>
            </button>
          ))}
        </section>
      )}

      <section className="block">
        <div className="block-h"><h2>Mouth care today</h2><span className="count">{done.length} of {CARE.length}</span></div>
        <div className="care">
          {CARE.map((c) => {
            const on = done.includes(c.id);
            return (
              <button key={c.id} className={`care-row${on ? " on" : ""}`} aria-pressed={on} onClick={() => onCare(c.id)}>
                <span className="care-tick">{on && <Icon name="check" size={18} stroke={3} />}</span>
                <span><strong>{c.label}</strong><em>{c.note}</em></span>
              </button>
            );
          })}
        </div>
      </section>

      {trend && (
        <section className="nudge">
          <Icon name="info" size={18} />
          <span><strong>{trend.title}.</strong> {trend.body}</span>
        </section>
      )}
    </div>
  );
}
