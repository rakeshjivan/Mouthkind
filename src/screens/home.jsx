import { Icon } from "../components/ui.jsx";
import { BrandMark } from "../components/brandMark.jsx";
import { phColor, sipLevel } from "../data/clinical.js";
import { phPattern, phZone } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { scoreDecay } from "../data/decay.js";
import { daysSinceLog, logCadence, logDue, nextCheck } from "../data/schedule.js";
import { fmtShort } from "../lib/store.js";
import { firstName } from "../data/person.js";
import { activeTreatment, inCancerCare, journey } from "../data/journey.js";
import { sameDay, triageFor } from "../data/daily.js";
import { SetupCard } from "./plan.jsx";
import { RoutineCard } from "./routine.jsx";

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

/** The four checks as boxes (and the jaw test after head and neck radiotherapy). On Progress. */
export function CheckBoxes({ profile, entries, prefs, open, planned = true }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
  const decay = latestOf(entries, "decay");
  const d = decay && scoreDecay(decay.answers, decay.ctx);
  const sips = sipReadings(entries), sip = sips.at(-1);
  const phs = phReadings(entries), ph = phs.at(-1);
  const every = prefs.sipEvery;
  const sipNext = every ? nextCheck(sip?.ts, every) : null;
  const phNext = every ? nextCheck(ph?.ts, every) : null;
  const empty = !sips.length && !phs.length;
  const recent = sips.slice(-4).map((x) => x.sip);
  const change = recent.length > 1 ? recent.at(-1) - recent[0] : 0;
  const trend = recent.length < 2 ? null : change >= 2 ? { label: "Getting drier", tone: "orange" } : change <= -2 ? { label: "Improving", tone: "good" } : { label: "Steady", tone: null };
  const calm = (tone) => (planned && tone === "red" ? "amber" : tone);
  const cancer = inCancerCare(profile);
  const jawCheck = (cancer && (profile.treatments || []).includes("rt_hn")) || [].concat(r ? risk.answers.cancer || [] : []).includes("rt_hn");
  const jaw = latestOf(entries, "jaw");
  const jawDue = jawCheck && (!jaw || Date.now() - jaw.ts > 30 * 864e5);
  return (<>
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
        <Box kind="sip" title="Dry mouth assessment" icon={<Icon name="drop" size={22} />}
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
  </>);
}

// `clin`: the clinician-in-the-loop build. Today then shows only reminders that something is
// due, and the plan card (`clin.card`) from the patient's professional.
export function Home({ profile, entries, prefs, open, go, plan = [], setup, onSetup, phSkip, onMe, routine = [], ticks = [], onTick, onWhy, clin }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
  const sips = sipReadings(entries), sip = sips.at(-1);
  const phs = phReadings(entries), ph = phs.at(-1);
  const pat = phPattern(phs);
  const every = prefs.sipEvery;
  const sipNext = every ? nextCheck(sip?.ts, every) : null;
  const phNext = every ? nextCheck(ph?.ts, every) : null;
  const hour = new Date().getHours();
  // A carer is greeted by their own name; the patient's name is on the line below.
  const greetName = profile.carer ? (profile.carerName || "").trim() : firstName(profile);
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greeting = `${hello}${greetName ? `, ${greetName}` : ""}`;
  const initial = (greetName || "").trim().charAt(0).toUpperCase();
  // One line of progress since they started: the dry mouth score band, else the dryness log.
  const progress = (() => {
    if (sips.length >= 2) {
      const a = sipLevel(sips[0].sip), z = sipLevel(sip.sip);
      if (a.id !== z.id) return { good: z.lo < a.lo, text: `Your dry mouth assessment has ${z.lo < a.lo ? "improved" : "gone up"} from ${a.label.toLowerCase()} to ${z.label.toLowerCase()} since you started.` };
    }
    const logs = entries.filter((e) => e.kind === "daily" && e.dryness != null).sort((x, y) => x.ts - y.ts);
    if (logs.length >= 8) {
      const avg = (xs) => Math.round(xs.reduce((n, e) => n + e.dryness, 0) / xs.length);
      const first = avg(logs.slice(0, 7)), last = avg(logs.slice(-7));
      if (first !== last) return { good: last < first, text: `Dryness has averaged ${last} out of 10 this week, ${last < first ? "down" : "up"} from ${first} when you started logging.` };
    }
    return null;
  })();
  const cancer = inCancerCare(profile);
  const active = activeTreatment(profile);
  const daily = latestOf(entries, "daily");
  const dailyToday = daily && sameDay(daily.ts, Date.now());
  const triage = dailyToday ? triageFor(daily, profile) : null;
  const who = profile.carer && profile.carerFor ? profile.carerFor : null;
  const building = setup && !setup.built;
  // One alert, only when something needs doing: urgent first, then checks that are due,
  // then the most important thing in the plan that isn't part of the daily routine.
  const inRoutine = new Set(routine.map((x) => x.why).filter(Boolean));
  const action = plan.find((it) => it.pri >= 80 && !inRoutine.has(it.id) && !it.id.startsWith("start") && !(profile.planDone || {})[it.id] && !it.kept);
  const reviewDue = clin?.plan && Date.now() >= clin.plan.review;
  const alert = clin ? (building ? null
    : reviewDue ? { tone: "accent", title: "Your plan review is due", sub: `Book in with ${clin.plan.by.name} or another health professional`, act: "Call", go: () => open("call") }
    : sipNext?.due ? { tone: "accent", title: "Your dry mouth assessment is due", sub: "5 quick questions", act: "Start", go: () => open("sip") }
    : !phSkip && (phNext?.due || !ph) ? { tone: "accent", title: ph ? "Your pH test is due" : "Record your saliva pH", sub: "2 minutes with a test strip", act: "Test now", go: () => open("ph") }
    : null)
    : triage?.level === "now" ? { tone: "red", title: cancer ? "Contact your treatment team now" : "Get help now", sub: triage.now[0], act: "See what to do", go: () => open("dailyresult") }
    : triage?.level === "today" ? { tone: "amber", title: cancer ? "Let your treatment team know today" : "See a dentist or doctor today", sub: triage.today[0], act: "What to do", go: () => open("dailyresult") }
    : building ? null
    : pat.level === "flag" ? { tone: "amber", title: "Your saliva has been acidic", sub: `${pat.acid} of your last ${pat.n} pH tests. Show your dentist.`, act: "What helps", go: () => go("advice", "plan") }
    : action ? { tone: "amber", title: action.title, sub: action.because?.[0], act: "What to do", go: () => onWhy(action.id) }
    : sipNext?.due ? { tone: "accent", title: "Your dry mouth assessment is due", sub: "5 quick questions", act: "Start", go: () => open("sip") }
    : !phSkip && (phNext?.due || !ph) ? { tone: "accent", title: ph ? "Your pH test is due" : "Test your saliva pH", sub: "2 minutes with a test strip", act: "Test now", go: () => open("ph") }
    : null;
  // The log: daily during cancer treatment, weekly otherwise.
  const weekly = logCadence(active) === "weekly";
  const due = logDue(entries, active);
  const since = daysSinceLog(entries);
  const tx = cancer ? journey(profile, Date.now(), { general: !!clin }).cards[0] : null;

  return (
    <div className="screen home5">
      <header className="brand-head">
        <div className="brand-row">
          <p className="brand"><BrandMark size={24} />Mouthkind <span className="test-badge">Testing</span></p>
          {onMe && <button type="button" className="me-avatar" onClick={onMe} aria-label="My details">{initial || <Icon name="user" size={20} />}</button>}
        </div>
        <h1 className="display hello-line" style={{ "--chars": greeting.length }}>{greeting}</h1>
        {who && <p className="carer-line">Looking after {who}'s mouth</p>}
        {tx && <button type="button" className="tx-line" onClick={() => open("journey")}><span>{tx.title} · {tx.when}</span><b>What to expect <Icon name="chev" size={15} /></b></button>}
        {progress && !building && <p className={`progress-line${progress.good ? " good" : ""}`}>{progress.text}</p>}
      </header>

      {alert && (
        <section className={`alert5 t-${alert.tone}`} aria-label="Needs attention">
          <span><strong>{alert.title}</strong>{alert.sub && <em>{alert.sub}</em>}</span>
          <button type="button" className={`btn ${alert.tone === "red" ? "danger" : "ghost"}`} onClick={alert.go}>{alert.act}</button>
        </section>
      )}

      {building ? <SetupCard setup={setup} onSetup={onSetup} clin={!!clin} /> : (<>
        {clin?.card}
        <button type="button" className={`log5${due ? " due" : ""}`} onClick={() => open("daily")}>
          <span className="log5-icon" aria-hidden="true"><Icon name="plus" size={20} stroke={2.6} /></span>
          <span className="log5-text">
            <strong>{dailyToday ? "Today's mouth log" : weekly ? "Your weekly mouth check" : `How's ${who ? `${who}'s` : "your"} mouth today?`}</strong>
            <em>{dailyToday ? [daily.dryness != null && `Dryness ${daily.dryness}`, daily.pain != null && `Pain ${daily.pain}`].filter(Boolean).join(" · ") + " · Update"
              : due ? (since != null && since >= 2 ? `Last logged ${since} days ago · under a minute` : "Not logged yet · under a minute")
              : `Logged ${since === 1 ? "yesterday" : `${since} days ago`} · next in ${7 - since} day${7 - since === 1 ? "" : "s"}`}</em>
          </span>
          <Icon name="chev" size={16} />
        </button>
        <RoutineCard routine={routine} done={ticks} onTick={onTick} onWhy={onWhy} />
      </>)}
    </div>
  );
}
