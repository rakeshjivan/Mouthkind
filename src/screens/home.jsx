import { Icon } from "../components/ui.jsx";
import { DotSeries, RiskDial } from "../components/kit.jsx";
import { PH_ROOT_CRITICAL, phBand, phColor, sipBand } from "../data/clinical.js";
import { scoreRisk } from "../data/risk.js";
import { dueWords, freqFor, nextCheck } from "../data/schedule.js";
import { fmtDate, fmtShort } from "../lib/store.js";

export const latestOf = (entries, kind) => [...entries].filter((e) => e.kind === kind).sort((a, b) => b.ts - a.ts)[0];

export function Home({ entries, prefs, open }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
  const sips = entries.filter((e) => e.kind === "sip" || (e.sip != null && e.kind !== "risk")).sort((a, b) => a.ts - b.ts);
  const sip = sips.at(-1);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const ph = phs.at(-1);
  const every = prefs.sipEvery;
  const next = every ? nextCheck(sip?.ts, every) : null;

  return (
    <div className="screen home3">
      <header className="brand-head">
        <p className="brand">Mouthkind</p>
        <h1 className="display">Dry mouth, checked and tracked.</h1>
      </header>

      <section className={`card-x risk-card${r ? ` ${r.band.tone}` : ""}`}>
        <div className="cx-head"><span className="cx-icon risk"><Icon name="shield" size={20} /></span><h2>Your dry mouth risk</h2></div>
        {r ? (<>
          <div className="risk-row">
            <RiskDial score={r.score} tone={r.band.tone} />
            <div>
              <p className="risk-band">{r.band.label}</p>
              <p className="cx-sub">{r.factors[0] ? `Biggest factor: ${r.factors[0].label}` : "No common risk factors"}</p>
              <p className="cx-meta">Checked {fmtDate(risk.ts)}</p>
            </div>
          </div>
          <div className="cx-actions">
            <button className="btn primary" onClick={() => open("riskresult")}>See what it means</button>
            <button className="btn ghost" onClick={() => open("risk")}>Update</button>
          </div>
        </>) : (<>
          <p className="cx-lead">Find out how likely you are to get a dry mouth — from your medicines, health and habits.</p>
          <button className="btn primary huge" onClick={() => open("risk")}>Check my risk</button>
          <p className="cx-meta center">About 2 minutes · 9 questions</p>
        </>)}
      </section>

      <section className="card-x sip-card">
        <div className="cx-head"><span className="cx-icon dry"><Icon name="drop" size={20} /></span><h2>How dry is your mouth?</h2></div>
        {sip ? (
          <div className="sip-row">
            <p className="sip-big"><strong>{sip.sip}</strong><span>of 15</span></p>
            <div>
              <p className="sip-word" style={{ color: sipBand(sip.sip).color }}>{sipBand(sip.sip).full}</p>
              <p className="cx-meta">Last checked {fmtShort(sip.ts)}</p>
            </div>
          </div>
        ) : <p className="cx-lead">The GC SIP-SCORE: five quick questions that measure how much dryness is affecting you.</p>}
        {sips.length > 1 && <DotSeries points={sips.slice(-8).map((s) => ({ v: s.sip, label: fmtShort(s.ts) }))} min={5} max={15} tone="dry" />}
        <button className={`btn ${!sip || next?.due ? "primary huge" : "ghost big"}`} onClick={() => open("sip")}>
          {sip ? (next?.due ? "Do my check" : "Check again now") : "Do my first check"}
        </button>
        {every && (
          <div className="sched">
            <span className={next.due ? "due" : ""}>{dueWords(next)}</span>
            <span className="sched-links">
              <button className="link-btn" onClick={() => open("freq")}>{freqFor(every).label}</button>
              <button className="link-btn" onClick={() => open("remind")}><Icon name="bell" size={16} /> Remind me</button>
            </span>
          </div>
        )}
      </section>

      <section className="card-x ph-card">
        <div className="cx-head"><span className="cx-icon ph"><span className="ph-swatch" style={{ background: ph ? phColor(ph.ph) : "var(--soft)" }} /></span><h2>Saliva pH</h2></div>
        {ph ? (
          <div className="sip-row">
            <p className="sip-big"><strong>{ph.ph.toFixed(1)}</strong><span>pH</span></p>
            <div>
              <p className="sip-word">{phBand(ph.ph)}</p>
              <p className="cx-meta">{fmtShort(ph.ts)} · {phs.filter((p) => p.ph < PH_ROOT_CRITICAL).length} of {phs.length} results below {PH_ROOT_CRITICAL}</p>
            </div>
          </div>
        ) : <p className="cx-lead">If your dentist has given you pH test strips, record your results here.</p>}
        <button className="btn ghost big" onClick={() => open("ph")}>Add a pH result</button>
      </section>

      <p className="foot-note">Mouthkind is made by Dr Rakesh Jivan. It gives general information, not a diagnosis.</p>
    </div>
  );
}
