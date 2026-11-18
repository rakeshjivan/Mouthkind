import { Icon } from "../components/ui.jsx";
import { phColor, sipBand, SIP_BANDS } from "../data/clinical.js";
import { phPattern, phZone } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { scoreDecay } from "../data/decay.js";
import { CARE_TOPICS } from "../data/care.js";
import { nextCheck } from "../data/schedule.js";
import { fmtShort } from "../lib/store.js";
import { firstName } from "../data/person.js";
import { activeTreatment, inCancerCare, journey } from "../data/journey.js";
import { dailyTriage, sameDay } from "../data/daily.js";
import { FocusList } from "./plan.jsx";

export const latestOf = (entries, kind) => [...entries].filter((e) => e.kind === kind).sort((a, b) => b.ts - a.ts)[0];
export const phReadings = (entries) => entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
export const sipReadings = (entries) => entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);

const when = (n) => (n.due ? "Due today" : n.days === 1 ? "Next: tomorrow" : `Next: ${new Date(n.at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`);

/** A tiny line of recent dry mouth scores (5–15) for the tracker box. */
function Spark({ values }) {
  const w = 120, h = 30, n = values.length;
  const pts = values.map((v, i) => [n === 1 ? w / 2 : (i / (n - 1)) * (w - 6) + 3, h - 3 - ((v - 5) / 10) * (h - 6)]);
  return (
    <svg className="tile-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--dry)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill="var(--dry)" />
    </svg>
  );
}

/** One of the boxes. The whole box is the button. */
// SIP severity bands → the same colour words the risk box uses.
const SIP_TONE = ["good", "amber", "orange", "red"];

function Box({ kind, title, icon, value, valueTone, sub, status, due, onClick, extra, wide }) {
  // A tappable block, not a <button>: Safari won't stretch a button to fit its content,
  // which clipped the last line and stopped the boxes from matching in height.
  const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } };
  return (
    <div role="button" tabIndex={0} className={`tile ${kind}${due ? " due" : ""}${wide ? " span-all" : ""}`} onClick={onClick} onKeyDown={key}>
      <span className="tile-icon" aria-hidden="true">{icon}</span>
      <strong className="tile-title">{title}</strong>
      <span className="tile-body">
        {value && <span className={`tile-value${valueTone ? ` t-${valueTone}` : ""}`}>{value}</span>}
        {sub && <span className="tile-sub">{sub}</span>}
        {extra}
      </span>
      {status && <span className="tile-status">{due && <i />}{status}</span>}
    </div>
  );
}

export function Home({ profile, entries, prefs, careCtx, open, go, plan = [], ask }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
  const decay = latestOf(entries, "decay");
  const d = decay && scoreDecay(decay.answers, decay.ctx);
  const sips = sipReadings(entries), sip = sips.at(-1);
  const phs = phReadings(entries), ph = phs.at(-1);
  const pat = phPattern(phs);
  const every = prefs.sipEvery;
  // One rhythm for both checks: the frequency the person chose.
  const sipNext = every ? nextCheck(sip?.ts, every) : null;
  const phNext = every ? nextCheck(ph?.ts, every) : null;
  const care = CARE_TOPICS.filter((t) => t.forYou(careCtx));
  const due = [sipNext?.due && "dry mouth check", phNext?.due && "pH test"].filter(Boolean);
  const hour = new Date().getHours();
  const greet = (h) => `${h}${firstName(profile) ? `, ${firstName(profile)}` : ""}`;
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greeting = greet(hello);
  const empty = !sips.length && !phs.length;
  const results = entries.filter((e) => e.sip != null || e.ph != null || e.kind === "risk" || e.kind === "decay");
  const count = results.length;
  const lastTs = Math.max(0, ...results.map((e) => e.ts));
  // Dry mouth trend over the last four checks (SIP: higher is drier).
  const recent = sips.slice(-4).map((x) => x.sip);
  const change = recent.length > 1 ? recent.at(-1) - recent[0] : 0;
  // The one thing to do today, most important first.
  const cancer = inCancerCare(profile);
  const active = activeTreatment(profile);
  const daily = latestOf(entries, "daily");
  const dailyToday = daily && sameDay(daily.ts, Date.now());
  const triage = dailyToday ? dailyTriage(daily) : null;
  const who = profile.carer && profile.carerFor ? profile.carerFor : null;
  const today =
    triage?.level === "now" ? { tone: "red", icon: "alert", title: "Contact your treatment team now", sub: triage.now[0], act: "See what to do", go: () => open("dailyresult") }
    : active && !dailyToday ? { tone: "accent", icon: "heart", title: `How's ${who ? `${who}'s` : "your"} mouth today?`, sub: "A 10-second check during treatment", act: "Check now", go: () => open("daily") }
    : triage?.level === "today" ? { tone: "amber", icon: "phone", title: "Let your treatment team know today", sub: triage.today[0], act: "See today's check", go: () => open("dailyresult") }
    : !r ? { tone: "accent", icon: "shield", title: "Start with your dry mouth risk", sub: "2 minutes · medicines, health and habits", act: "Start", go: () => open("risk") }
    : sipNext?.due || !sip ? { tone: "accent", icon: "drop", title: "Your dry mouth check is due", sub: "5 quick questions", act: "Check now", go: () => open("sip") }
    : phNext?.due || !ph ? { tone: "accent", icon: "drop", title: "Your pH test is due", sub: "2 minutes with a test strip", act: "Test now", go: () => open("ph") }
    : { tone: "good", icon: "check", title: "You're up to date", sub: `Next check ${sipNext ? when(sipNext).replace(/^Next: /, "") : "when you're ready"}`, act: "Log what I used today", go: () => open("used"), quiet: true };
  const tx = cancer ? journey(profile).cards[0] : null;
  // After head and neck radiotherapy, the jaw opening test sits with the other checks.
  const jawCheck = (cancer && (profile.treatments || []).includes("rt_hn")) || [].concat(r ? risk.answers.cancer || [] : []).includes("rt_hn");
  const jaw = latestOf(entries, "jaw");
  const jawDue = jawCheck && (!jaw || Date.now() - jaw.ts > 30 * 864e5);
  const trend = recent.length < 2 ? null : change >= 2 ? { label: "Getting drier", tone: "orange" } : change <= -2 ? { label: "Improving", tone: "good" } : { label: "Steady", tone: null };

  return (
    <div className="screen home4">
      <header className="brand-head">
        <p className="brand">Mouthkind <span className="test-badge">Testing</span></p>
        <h1 className="display hello-line" style={{ "--chars": greeting.length }}>{greeting}</h1>
        {who && <p className="carer-line">Looking after {who}'s mouth</p>}
        {tx && <button type="button" className="tx-line" onClick={() => open("journey")}><span>{tx.title} · {tx.when}</span><b>What to expect and tools <Icon name="chev" size={15} /></b></button>}
      </header>

      {pat.level === "flag" && (
        <div className="alert-x amber home-alert">
          <strong>Your saliva has been acidic in {pat.acid} of your last {pat.n} tests.</strong>
          <p>Acidic saliva can put your teeth at risk, even if your mouth doesn't feel dry. Show your results to your dentist.</p>
          <button className="btn primary" onClick={() => go("advice", "plan")}>What helps</button>
        </div>
      )}

      <section className={`today t-${today.tone}`} aria-label="Today">
        <span className="today-icon" aria-hidden="true"><Icon name={today.icon} size={24} /></span>
        <div className="today-text"><p className="today-k">Today</p><h2>{today.title}</h2>{today.sub && <p>{today.sub}</p>}</div>
        {today.act && <button className={`btn ${today.tone === "red" ? "danger" : today.quiet ? "ghost" : "primary"}`} onClick={today.go}>{today.act}</button>}
      </section>



      {ask}
      <FocusList plan={plan.filter((it) => !it.id.startsWith("start"))} onOpen={() => go("advice", "plan")} />

      <div className="boxes">
        <Box kind="risk" title="My dry mouth risk" icon={<Icon name="shield" size={22} />}
          value={r ? r.band.label : null} valueTone={r?.band.tone} sub={r ? `${r.factors.length} risk factor${r.factors.length === 1 ? "" : "s"}` : "Medicines, health and habits"}
          status={r ? "See details" : "Start here · 2 min"} due={!r}
          onClick={() => open(r ? "riskresult" : "risk")} />
        <Box kind="decay" title="My tooth decay risk" icon={<Icon name="tooth" size={22} />}
          value={d ? (d.noTeeth ? "No natural teeth" : d.band.label) : null} valueTone={d && !d.noTeeth ? d.band.tone : null}
          sub={d ? (d.noTeeth ? "Denture care" : `${d.factors.length} risk factor${d.factors.length === 1 ? "" : "s"}`) : "Food, cleaning and your teeth"}
          status={d ? "See my plan" : "2 min"} due={!d}
          onClick={() => open(d ? "decayresult" : "decay")} />
        <Box kind="sip" title="Dry mouth check" icon={<Icon name="drop" size={22} />}
          value={sip ? sipBand(sip.sip).label : null} valueTone={sip ? SIP_TONE[SIP_BANDS.indexOf(sipBand(sip.sip))] : null}
          sub={sip ? `SIP score ${sip.sip} of 15` : "SIP score · 5 questions"}
          status={sipNext ? when(sipNext) : "Not done yet"} due={!sip || sipNext?.due}
          onClick={() => open("sip")} />
        <Box kind="ph" title="Check my saliva pH" icon={<span className="tile-swatches">{[5.4, 6.2, 7.0].map((v) => <i key={v} style={{ background: phColor(v) }} />)}</span>}
          value={ph ? `pH ${ph.ph.toFixed(1)}` : null} valueTone={ph ? phZone(ph.ph).tone : null} sub={ph ? phZone(ph.ph).label : "With a test strip"}
          status={phNext ? when(phNext) : "Not done yet"} due={!ph || phNext?.due}
          onClick={() => open("ph")} />
        {jawCheck && (
          <Box kind="jaw" wide title="Jaw opening" icon={<Icon name="jaw" size={22} />}
            value={jaw ? (jaw.fingers >= 3 ? "Opening well" : "Not opening fully") : null} valueTone={jaw ? (jaw.fingers >= 3 ? "good" : "amber") : null}
            sub={jaw ? `${jaw.fingers === 3 ? "3 or more" : jaw.fingers} finger${jaw.fingers === 1 ? "" : "s"} · ${fmtShort(jaw.ts)}` : "Finger test · 10 seconds"}
            status={jawDue ? (jaw ? "Due this month" : "Not done yet") : "Once a month"} due={jawDue}
            onClick={() => open("jaw")} />
        )}
        <Box kind="advice" title="Mouth care advice" icon={<Icon name="leaf" size={22} />}
          value={null} sub={care.length ? `Start with: ${care[0].title.toLowerCase()}` : "Water, diet, teeth and more"}
          status="Open" onClick={() => go("advice")} />
        <Box kind="tracker" title="My mouth tracker" icon={<Icon name="chart" size={22} />}
          value={trend ? trend.label : null} valueTone={trend?.tone}
          sub={empty ? "Your results over time" : `${count} result${count === 1 ? "" : "s"} · last ${fmtShort(lastTs)}`}
          status={empty ? "No results yet" : "See charts"} onClick={() => go("tracker")} />
      </div>

      {every && <div className="tk-foot home-foot"><span>Checking {every === 1 ? "every day" : every === 7 ? "once a week" : "every two weeks"}</span><span className="home-foot-acts"><button className="link-btn" onClick={() => open("freq")}>Change</button><button className="link-btn" onClick={() => open("remind")}><Icon name="bell" size={15} /> Remind me</button></span></div>}

      <p className="foot-note">Mouthkind is made by Dr Rakesh Jivan. It gives general information, not a diagnosis.</p>
    </div>
  );
}
