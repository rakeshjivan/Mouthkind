import { useState } from "react";
import { Gauge, Icon, Sheet, Sources } from "../components/ui.jsx";
import { REGIONS, SIP_INTERVAL_DAYS, WEEKLY_INTERVAL_DAYS, sipBand, telHref, phColor, phBand, PH_ROOT_CRITICAL } from "../data/clinical.js";
import { LEVELS, adviceFor, cycleWindow, redFlags, trendFlags } from "../lib/rules.js";
import { DAY, dayKey, fmtDate, fmtShort } from "../lib/store.js";

export function CallButtons({ profile, emergency }) {
  const R = REGIONS[profile.region] || REGIONS.AU;
  return (
    <div className="call-stack">
      {profile.team?.phone24 ? (
        <a className={`btn big ${emergency ? "danger" : "primary"}`} href={telHref(profile.team.phone24)}>
          <Icon name="phone" /> Call {profile.team.name || "my treatment team"}
        </a>
      ) : (
        <p className="note">Add your team's 24-hour number under <strong>You</strong> so it's here when you need it.</p>
      )}
      {emergency && (
        <a className="btn big ghost danger-outline" href={telHref(R.emergency)}><Icon name="phone" /> Call {R.emergency}</a>
      )}
      {!emergency && (
        <a className="btn ghost" href={telHref(R.nurseLine.number)}><Icon name="phone" /> {R.nurseLine.name} {R.nurseLine.number}</a>
      )}
    </div>
  );
}

function AlertCard({ a, profile }) {
  const lvl = LEVELS[a.level];
  return (
    <section className={`alert ${a.level}`} role={a.level === "emergency" ? "alert" : undefined}>
      <p className="alert-level"><Icon name="alert" size={16} /> {lvl.label}</p>
      <h3>{a.title}</h3>
      <p>{a.body}</p>
      {(a.level === "emergency" || a.level === "sameday") && <CallButtons profile={profile} emergency={a.level === "emergency"} />}
      <Sources refs={a.refs} />
    </section>
  );
}

// Shown straight after saving a check-in.
export function ResultSheet({ entry, profile, onClose }) {
  const alerts = redFlags(entry, profile);
  const emergency = alerts.some((a) => a.level === "emergency");
  return (
    <Sheet title={emergency ? "Get help now" : "Saved"} onClose={onClose} tone={emergency ? "urgent" : ""}
      footer={<button className="btn ghost big" onClick={onClose}>{emergency ? "I've called for help" : "Done"}</button>}>
      {emergency ? (
        alerts.filter((a) => a.level === "emergency").map((a) => <AlertCard key={a.id} a={a} profile={profile} />)
      ) : (
        <>
          {alerts.length === 0 ? (
            <div className="calm">
              <div className="calm-mark"><Icon name="check" size={28} stroke={2.5} /></div>
              <h2 className="q">Thanks{profile.name && !profile.carer ? `, ${profile.name}` : ""} — that's saved.</h2>
              <p className="lede">Nothing in today's answers needs urgent attention. Your suggestions for today are on the home screen.</p>
            </div>
          ) : (
            <>
              <h2 className="q">Thanks — here's what to do next.</h2>
              {alerts.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

function AdviceCard({ c, open, onToggle }) {
  return (
    <section className={`advice${c.tone === "key" ? " key" : ""}`}>
      <button className="advice-head" onClick={onToggle} aria-expanded={open}>
        <span>{c.title}</span><Icon name="chev" className={open ? "rot" : ""} />
      </button>
      {open && (
        <div className="advice-body">
          <ul>{c.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <Sources refs={c.refs} />
        </div>
      )}
    </section>
  );
}

export function Today({ profile, entries, open, go }) {
  const [openCard, setOpenCard] = useState("dental-first");
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const todayLog = sorted.find((e) => e.kind === "daily" && dayKey(e.ts) === dayKey(Date.now()));
  const latestDaily = sorted.find((e) => e.kind === "daily");
  const latestSip = sorted.find((e) => e.sip != null);
  const firstSip = [...entries].filter((e) => e.sip != null).sort((a, b) => a.ts - b.ts)[0];
  const latestPh = sorted.find((e) => e.ph != null);
  const sipDue = !latestSip || Date.now() - latestSip.ts >= SIP_INTERVAL_DAYS * DAY;
  const latestWeekly = sorted.find((e) => e.kind === "weekly");
  const weeklyDue = !latestWeekly || Date.now() - latestWeekly.ts >= WEEKLY_INTERVAL_DAYS * DAY;
  const cyc = cycleWindow(profile);
  const your = profile.carer ? "their" : "your";

  // Alerts stay visible for 24 hours after the entry that raised them.
  const live = [
    ...(latestDaily && Date.now() - latestDaily.ts < DAY ? redFlags(latestDaily, profile) : []),
    ...(latestWeekly && Date.now() - latestWeekly.ts < 7 * DAY ? redFlags(latestWeekly, profile) : []),
  ];
  const trends = trendFlags(entries);
  const merged = { ...(latestDaily || {}), sip: latestSip?.sip, ph: latestPh?.ph };
  const cards = adviceFor(merged, profile, entries);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="screen">
      <header className="hero">
        <p className="eyebrow">{hello}{profile.name && !profile.carer ? `, ${profile.name}` : ""}</p>
        <h1 className="display">{profile.carer ? `How's ${profile.name ? profile.name + "'s" : "their"} mouth today?` : "How's your mouth today?"}</h1>
      </header>

      {cyc && (
        <section className={`cycle${cyc.peak ? " peak" : ""}`}>
          <strong>Day {cyc.day} after chemotherapy</strong>
          <span>{cyc.peak
            ? `Days 5 to 14 are usually when mouth soreness peaks and infection risk is highest. Check ${your} temperature every day this week, and keep up the mouth routine.`
            : cyc.day < 5
              ? "Mouth soreness usually starts 4 to 7 days after treatment. Now is the time to be extra careful with your routine."
              : "The highest-risk days are behind you. Keep going with your routine."}</span>
          <Sources refs={["elad2022", "healthdirectFN"]} />
        </section>
      )}

      {live.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}

      <div className="actions">
        {todayLog ? (
          <div className="done-strip"><Icon name="check" size={18} stroke={2.6} /> Checked in today · pain {todayLog.pain}/10 · dryness {todayLog.dryness}/10</div>
        ) : (
          <button className="btn primary big" onClick={() => open("checkin")}><Icon name="plus" /> Start today's check-in</button>
        )}
        {sipDue && (
          <button className="due" onClick={() => open("sip")}>
            <span className="due-dot" />
            <span className="due-txt"><strong>Your fortnightly dry mouth score is due</strong>
              <span>{latestSip ? `Last done ${fmtShort(latestSip.ts)}` : "Five quick questions — sets your starting point"}</span></span>
            <span className="due-go">Start</span>
          </button>
        )}
        {weeklyDue && (
          <button className="due" onClick={() => open("weekly")}>
            <span className="due-dot" />
            <span className="due-txt"><strong>Weekly check: weight and mouth opening</strong>
              <span>{latestWeekly ? `Last done ${fmtShort(latestWeekly.ts)}` : "Two quick measures that catch problems early"}</span></span>
            <span className="due-go">Start</span>
          </button>
        )}
      </div>

      <section className="card gauge-card">
        <Gauge score={latestSip?.sip ?? null} />
        {latestSip ? (
          <>
            <div className="score-line"><span className="score-num">{latestSip.sip}</span><span className="score-den">/ 15</span></div>
            <p className="score-band" style={{ color: sipBand(latestSip.sip).color }}>{sipBand(latestSip.sip).full}</p>
            <p className="score-meta">
              {fmtDate(latestSip.ts)}
              {firstSip && firstSip.id !== latestSip.id && (
                <span>{latestSip.sip - firstSip.sip === 0 ? "Same as when you started"
                  : `${latestSip.sip > firstSip.sip ? "Up" : "Down"} ${Math.abs(latestSip.sip - firstSip.sip)} since you started`}</span>
              )}
            </p>
          </>
        ) : (
          <p className="lede center">Your dry mouth score will show here after your first fortnightly check.</p>
        )}
        {latestPh && (
          <div className="ph-mini">
            <span className="ph-dot" style={{ background: phColor(latestPh.ph) }} />
            Saliva pH {latestPh.ph.toFixed(1)} · {phBand(latestPh.ph)}{latestPh.ph < PH_ROOT_CRITICAL ? " — worth showing your dentist" : ""}
          </div>
        )}
      </section>

      {trends.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}

      <h2 className="section-h">What may help</h2>
      {cards.map((c) => (
        <AdviceCard key={c.id} c={c} open={openCard === c.id} onToggle={() => setOpenCard(openCard === c.id ? "" : c.id)} />
      ))}
      <button className="link-btn" onClick={() => go("products")}>See products that help →</button>

      <p className="disclaimer"><Icon name="info" size={16} /> This app helps you keep track and know when to ask for help.
        It doesn't replace your treatment team. If you're worried, call them.</p>
    </div>
  );
}
