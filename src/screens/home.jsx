import { Icon } from "../components/ui.jsx";
import { DotSeries, PhTimeline } from "../components/kit.jsx";
import { phColor, sipBand } from "../data/clinical.js";
import { PH_ZONES, phPattern, phZone } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { CARE_TOPICS } from "../data/care.js";
import { nextCheck } from "../data/schedule.js";
import { fmtShort } from "../lib/store.js";

export const latestOf = (entries, kind) => [...entries].filter((e) => e.kind === kind).sort((a, b) => b.ts - a.ts)[0];
export const phReadings = (entries) => entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
export const sipReadings = (entries) => entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);

const when = (n) => (n.due ? "Due today" : n.days === 1 ? "Next: tomorrow" : `Next: ${new Date(n.at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`);

/** One of the four boxes. The whole box is the button. */
function Box({ kind, title, icon, value, valueTone, sub, status, due, onClick }) {
  return (
    <button className={`tile ${kind}${due ? " due" : ""}`} onClick={onClick}>
      <span className="tile-in">
      <span className="tile-icon">{icon}</span>
      <strong className="tile-title">{title}</strong>
      {value && <span className={`tile-value${valueTone ? ` t-${valueTone}` : ""}`}>{value}</span>}
      {sub && <span className="tile-sub">{sub}</span>}
      {status && <span className="tile-status">{due && <i />}{status}</span>}
      </span>
    </button>
  );
}

export function Home({ profile, entries, prefs, careCtx, open, go }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
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
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const empty = !sips.length && !phs.length;

  return (
    <div className="screen home4">
      <header className="brand-head">
        <p className="brand">Mouthkind</p>
        <h1 className="display">{hello}{profile.name ? `, ${profile.name}` : ""}</h1>
        {due.length > 0 && <p className="due-line"><i />Due today: {due.join(" and ")}</p>}
      </header>

      <div className="boxes">
        <Box kind="risk" title="My dry mouth risk" icon={<Icon name="shield" size={22} />}
          value={r ? r.band.label : null} valueTone={r?.band.tone} sub={r ? `${r.score} points` : "Medicines, health and habits"}
          status={r ? "See details" : "Start here · 2 min"} due={!r}
          onClick={() => open(r ? "riskresult" : "risk")} />
        <Box kind="sip" title="Dry mouth check" icon={<Icon name="drop" size={22} />}
          value={sip ? `${sip.sip} of 15` : null} sub={sip ? sipBand(sip.sip).label : "SIP score · 5 questions"}
          status={sipNext ? when(sipNext) : "Not done yet"} due={!sip || sipNext?.due}
          onClick={() => open("sip")} />
        <Box kind="ph" title="Check my saliva pH" icon={<span className="tile-swatches">{[5.4, 6.2, 7.0].map((v) => <i key={v} style={{ background: phColor(v) }} />)}</span>}
          value={ph ? `pH ${ph.ph.toFixed(1)}` : null} valueTone={ph ? phZone(ph.ph).tone : null} sub={ph ? phZone(ph.ph).label : "With a test strip"}
          status={phNext ? when(phNext) : "Not done yet"} due={!ph || phNext?.due}
          onClick={() => open("ph")} />
        <Box kind="advice" title="Dry mouth advice" icon={<Icon name="leaf" size={22} />}
          value={null} sub={care.length ? `Start with: ${care[0].title.toLowerCase()}` : "Water, diet, teeth and more"}
          status="Open" onClick={() => go("advice")} />
      </div>

      <section className="tracker">
        <div className="tracker-h"><h2>My mouth tracker</h2>{!empty && <button className="link-btn" onClick={() => go("tracker")}>See all</button>}</div>
        {pat.level === "flag" && (
          <div className="alert-x red">
            <strong>Your saliva has been acidic in {pat.acid} of your last {pat.n} tests.</strong>
            <p>Acidic saliva puts your teeth at risk of decay, even if your mouth doesn't feel dry. See your dentist and show them your results.</p>
            <button className="btn primary" onClick={() => go("advice", "protect")}>What helps</button>
          </div>
        )}
        {empty ? (
          <p className="tracker-empty">Your dry mouth scores and pH results will build up here, so you can see whether things are getting better or worse.</p>
        ) : (<>
          <div className="tk-row">
            <p className="tk-label"><span className="tk-dot dry" />Dry mouth score</p>
            {sip ? <p className="tk-now"><b>{sip.sip}</b> of 15 <span style={{ color: sipBand(sip.sip).color }}>· {sipBand(sip.sip).label.toLowerCase()}</span></p> : <p className="tk-now muted">No checks yet</p>}
          </div>
          {sips.length > 1 && <DotSeries points={sips.slice(-8).map((s) => ({ v: s.sip, label: fmtShort(s.ts) }))} min={5} max={15} tone="dry" />}
          <div className="tk-row">
            <p className="tk-label"><span className="tk-dot ph" style={{ background: ph ? phColor(ph.ph) : undefined }} />Saliva pH</p>
            {ph ? <p className="tk-now"><b>{ph.ph.toFixed(1)}</b> <span className={`tk-zone ${phZone(ph.ph).tone}`}>· {phZone(ph.ph).label.toLowerCase()}</span></p> : <p className="tk-now muted">No results yet</p>}
          </div>
          {phs.length > 0 && <PhTimeline readings={phs} zones={PH_ZONES} color={phColor} fmt={fmtShort} />}
        </>)}
        {every && <p className="tk-foot">Checking {every === 1 ? "every day" : every === 7 ? "once a week" : "every two weeks"} · <button className="link-btn" onClick={() => open("freq")}>Change</button> · <button className="link-btn" onClick={() => open("remind")}><Icon name="bell" size={15} /> Remind me</button></p>}
      </section>

      <p className="foot-note">Mouthkind is made by Dr Rakesh Jivan. It gives general information, not a diagnosis.</p>
    </div>
  );
}
