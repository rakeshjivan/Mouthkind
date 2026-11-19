import { Icon } from "../components/ui.jsx";
import { BrandMark } from "../components/brandMark.jsx";
import { phColor, sipLevel } from "../data/clinical.js";
import { phPattern, phZone } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { scoreDecay } from "../data/decay.js";
import { CARE_TOPICS } from "../data/care.js";
import { nextCheck } from "../data/schedule.js";
import { fmtShort } from "../lib/store.js";
import { firstName } from "../data/person.js";
import { activeTreatment, inCancerCare, journey } from "../data/journey.js";
import { dailyTriage, sameDay } from "../data/daily.js";
import { FocusList, SetupCard } from "./plan.jsx";

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

export function Home({ profile, entries, prefs, careCtx, open, go, plan = [], ask, setup, onSetup, phSkip }) {
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
  // A carer is greeted by their own name; the patient's name is on the line below.
  const greetName = profile.carer ? (profile.carerName || "").trim() : firstName(profile);
  const greet = (h) => `${h}${greetName ? `, ${greetName}` : ""}`;
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
    : pat.level === "flag" ? { tone: "amber", icon: "drop", id: "acid", title: "Your saliva has been acidic", sub: `${pat.acid} of your last ${pat.n} pH tests. Acid can put your teeth at risk — show your dentist.`, act: "What helps", go: () => go("advice", "plan") }
    : !r ? { tone: "accent", icon: "shield", title: "Start with your dry mouth risk", sub: "2 minutes · medicines, health and habits", act: "Start", go: () => open("risk") }
    : sipNext?.due || !sip ? { tone: "accent", icon: "drop", title: "Your dry mouth score is due", sub: "5 quick questions", act: "Check now", go: () => open("sip") }
    : !phSkip && (phNext?.due || !ph) ? { tone: "accent", icon: "drop", title: "Your pH test is due", sub: "2 minutes with a test strip", act: "Test now", go: () => open("ph") }
    : { tone: "good", icon: "check", title: "You're up to date", sub: `Next check ${sipNext ? when(sipNext).replace(/^Next: /, "") : "when you're ready"}`, act: "Log what I used today", go: () => open("used"), quiet: true };
  // Until the plan is built, the build card leads — unless something urgent comes first.
  const building = setup && !setup.built;
  const urgent = triage?.level === "now" || triage?.level === "today" || (active && !dailyToday);
  const buildCard = building && !urgent;
  // Once the plan covers a high risk, show it calmly: red is kept for things to act on now.
  const planned = setup?.built;
  const calm = (tone) => (planned && tone === "red" ? "amber" : tone);
  const tx = cancer ? journey(profile).cards[0] : null;
  // After head and neck radiotherapy, the jaw opening test sits with the other checks.
  const jawCheck = (cancer && (profile.treatments || []).includes("rt_hn")) || [].concat(r ? risk.answers.cancer || [] : []).includes("rt_hn");
  const jaw = latestOf(entries, "jaw");
  const jawDue = jawCheck && (!jaw || Date.now() - jaw.ts > 30 * 864e5);
  const trend = recent.length < 2 ? null : change >= 2 ? { label: "Getting drier", tone: "orange" } : change <= -2 ? { label: "Improving", tone: "good" } : { label: "Steady", tone: null };

  return (
    <div className="screen home4">
      <header className="brand-head">
        <p className="brand"><BrandMark size={26} />Mouthkind <span className="brand-sub">Dry Mouth Care</span></p>
        <h1 className="display hello-line" style={{ "--chars": greeting.length }}>{greeting}</h1>
        {who && <p className="carer-line">Looking after {who}'s mouth</p>}
        {tx && <button type="button" className="tx-line" onClick={() => open("journey")}><span>{tx.title} · {tx.when}</span><b>What to expect and tools <Icon name="chev" size={15} /></b></button>}
      </header>


      {buildCard ? <SetupCard setup={setup} onSetup={onSetup} /> : (
      <section className={`today t-${today.tone}`} aria-label="Today">
        <span className="today-icon" aria-hidden="true"><Icon name={today.icon} size={24} /></span>
        <div className="today-text"><p className="today-k">Today</p><h2>{today.title}</h2>{today.sub && <p>{today.sub}</p>}</div>
        {today.act && <button className={`btn ${today.tone === "red" ? "danger" : today.quiet ? "ghost" : "primary"}`} onClick={today.go}>{today.act}</button>}
      </section>
      )}
      {building && !buildCard && <SetupCard slim setup={setup} onSetup={onSetup} />}



      {ask}
      <FocusList plan={plan.filter((it) => !it.id.startsWith("start") && !(profile.planDone || {})[it.id] && !it.kept)} skip={today.id ? [today.id] : []} onOpen={() => go("advice", "plan")} />

      <div className="boxes">
        <Box kind="risk" title="Dry mouth risk" icon={<Icon name="shield" size={22} />}
          value={r ? r.band.label : null} valueTone={r ? calm(r.band.tone) : null} sub={r ? `${r.factors.length} risk factor${r.factors.length === 1 ? "" : "s"}` : "Medicines, health and habits"}
          status={r ? (planned && ["high", "veryhigh"].includes(r.band.id) ? "Covered in your plan" : "See result") : "Check now · 2 min"} due={!r}
          onClick={() => open(r ? "riskresult" : "risk")} />
        <Box kind="decay" title="Tooth decay risk" icon={<Icon name="tooth" size={22} />}
          value={d ? (d.noTeeth ? "No natural teeth" : d.band.label) : null} valueTone={d && !d.noTeeth ? calm(d.band.tone) : null}
          sub={d ? (d.noTeeth ? "Denture care" : `${d.factors.length} risk factor${d.factors.length === 1 ? "" : "s"}`) : "Food, cleaning and your teeth"}
          status={d ? (planned && ["high", "veryhigh"].includes(d.band.id) ? "Covered in your plan" : "See result") : "Check now · 2 min"} due={!d}
          onClick={() => open(d ? "decayresult" : "decay")} />
        <Box kind="sip" title="Dry mouth score" icon={<Icon name="drop" size={22} />}
          value={sip ? sipLevel(sip.sip).label : null} valueTone={sip ? calm(sipLevel(sip.sip).tone) : null}
          sub={sip ? (trend && !empty ? trend.label : `Checked ${fmtShort(sip.ts)}`) : "5 quick questions"}
          status={sipNext ? when(sipNext) : "Not done yet"} due={!sip || sipNext?.due}
          onClick={() => open("sip")} />
        <Box kind="ph" title="Saliva pH" icon={<span className="tile-swatches">{[5.4, 6.2, 7.0].map((v) => <i key={v} style={{ background: phColor(v) }} />)}</span>}
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
      </div>

      {every && <div className="tk-foot home-foot"><span>Checking {every === 1 ? "every day" : every === 7 ? "once a week" : "every two weeks"}</span><span className="home-foot-acts"><button className="link-btn" onClick={() => open("freq")}>Change</button><button className="link-btn" onClick={() => open("remind")}><Icon name="bell" size={15} /> Remind me</button></span></div>}

      <p className="foot-note">Made by Dr Rakesh Jivan, who works for GC Australasia, maker of GC Tooth Mousse and GC Dry Mouth Gel. General information, not a diagnosis.</p>
    </div>
  );
}
