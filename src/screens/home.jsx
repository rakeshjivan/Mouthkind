import { Icon } from "../components/ui.jsx";
import { phColor, sipBand } from "../data/clinical.js";
import { phPattern, phZone } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { scoreDecay } from "../data/decay.js";
import { CARE_TOPICS } from "../data/care.js";
import { nextCheck } from "../data/schedule.js";
import { fmtShort } from "../lib/store.js";
import { firstName } from "../data/person.js";

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
function Box({ kind, title, icon, value, valueTone, sub, status, due, onClick, extra }) {
  return (
    <button className={`tile ${kind}${due ? " due" : ""}`} onClick={onClick}>
      <span className="tile-in">
      <span className="tile-icon">{icon}</span>
      <strong className="tile-title">{title}</strong>
      {value && <span className={`tile-value${valueTone ? ` t-${valueTone}` : ""}`}>{value}</span>}
      {sub && <span className="tile-sub">{sub}</span>}
      {extra}
      {status && <span className="tile-status">{due && <i />}{status}</span>}
      </span>
    </button>
  );
}

export function Home({ profile, entries, prefs, careCtx, open, go }) {
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
  const trend = recent.length < 2 ? null : change >= 2 ? { label: "Getting drier", tone: "orange" } : change <= -2 ? { label: "Improving", tone: "good" } : { label: "Steady", tone: null };

  return (
    <div className="screen home4">
      <header className="brand-head">
        <p className="brand">Mouthkind</p>
        <h1 className="display hello-line" style={{ "--chars": greeting.length }}>{greeting}</h1>
        {due.length > 0 && <p className="due-line"><i />Due today: {due.join(" and ")}</p>}
      </header>

      <div className="boxes">
        <Box kind="risk" title="My dry mouth risk" icon={<Icon name="shield" size={22} />}
          value={r ? r.band.label : null} valueTone={r?.band.tone} sub={r ? `${r.score} points` : "Medicines, health and habits"}
          status={r ? "See details" : "Start here · 2 min"} due={!r}
          onClick={() => open(r ? "riskresult" : "risk")} />
        <Box kind="decay" title="My tooth decay risk" icon={<Icon name="tooth" size={22} />}
          value={d ? (d.noTeeth ? "No natural teeth" : d.band.label) : null} valueTone={d && !d.noTeeth ? d.band.tone : null}
          sub={d ? (d.noTeeth ? "Denture care" : `${d.score} points`) : "Food, cleaning and your teeth"}
          status={d ? "See my plan" : "2 min"} due={!d}
          onClick={() => open(d ? "decayresult" : "decay")} />
        <Box kind="sip" title="Dry mouth check" icon={<Icon name="drop" size={22} />}
          value={sip ? `${sip.sip} of 15` : null} sub={sip ? sipBand(sip.sip).label : "SIP score · 5 questions"}
          status={sipNext ? when(sipNext) : "Not done yet"} due={!sip || sipNext?.due}
          onClick={() => open("sip")} />
        <Box kind="ph" title="Check my saliva pH" icon={<span className="tile-swatches">{[5.4, 6.2, 7.0].map((v) => <i key={v} style={{ background: phColor(v) }} />)}</span>}
          value={ph ? `pH ${ph.ph.toFixed(1)}` : null} valueTone={ph ? phZone(ph.ph).tone : null} sub={ph ? phZone(ph.ph).label : "With a test strip"}
          status={phNext ? when(phNext) : "Not done yet"} due={!ph || phNext?.due}
          onClick={() => open("ph")} />
        <Box kind="advice" title="Mouth care advice" icon={<Icon name="leaf" size={22} />}
          value={null} sub={care.length ? `Start with: ${care[0].title.toLowerCase()}` : "Water, diet, teeth and more"}
          status="Open" onClick={() => go("advice")} />
        <Box kind="tracker" title="My mouth tracker" icon={<Icon name="chart" size={22} />}
          value={trend ? trend.label : null} valueTone={trend?.tone}
          sub={empty ? "Your results over time" : `${count} result${count === 1 ? "" : "s"} · last ${fmtShort(lastTs)}`}
          extra={sips.length > 1 ? <Spark values={sips.slice(-8).map((x) => x.sip)} /> : null}
          status={empty ? "No results yet" : "See charts"} onClick={() => go("tracker")} />
      </div>

      {pat.level === "flag" && (
        <div className="alert-x red home-alert">
          <strong>Your saliva has been acidic in {pat.acid} of your last {pat.n} tests.</strong>
          <p>Acidic saliva puts your teeth at risk of decay, even if your mouth doesn't feel dry. See your dentist and show them your results.</p>
          <button className="btn primary" onClick={() => go("advice", "protect")}>What helps</button>
        </div>
      )}
      {every && <p className="tk-foot home-foot">Checking {every === 1 ? "every day" : every === 7 ? "once a week" : "every two weeks"} · <button className="link-btn" onClick={() => open("freq")}>Change</button> · <button className="link-btn" onClick={() => open("remind")}><Icon name="bell" size={15} /> Remind me</button></p>}

      <p className="foot-note">Mouthkind is made by Dr Rakesh Jivan. It gives general information, not a diagnosis.</p>
    </div>
  );
}
