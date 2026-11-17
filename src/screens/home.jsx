import { Icon } from "../components/ui.jsx";
import { DotSeries, PhTimeline, RiskMeter } from "../components/kit.jsx";
import { phColor, sipBand } from "../data/clinical.js";
import { PH_ZONES, phPattern, phZone } from "../data/ph.js";
import { RISK_BANDS, scoreRisk } from "../data/risk.js";
import { CARE_TOPICS } from "../data/care.js";
import { dueWords, freqFor, nextCheck } from "../data/schedule.js";
import { dayKey, fmtShort } from "../lib/store.js";

export const latestOf = (entries, kind) => [...entries].filter((e) => e.kind === kind).sort((a, b) => b.ts - a.ts)[0];
export const phReadings = (entries) => entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
export const sipReadings = (entries) => entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);

export function Home({ profile, entries, prefs, careCtx, open, go }) {
  const risk = latestOf(entries, "risk");
  const r = risk && scoreRisk(risk.answers);
  const sips = sipReadings(entries);
  const sip = sips.at(-1);
  const phs = phReadings(entries);
  const ph = phs.at(-1);
  const pat = phPattern(phs);
  const testedToday = ph && dayKey(ph.ts) === dayKey(Date.now());
  const every = prefs.sipEvery;
  const next = every ? nextCheck(sip?.ts, every) : null;
  const care = CARE_TOPICS.filter((t) => t.forYou(careCtx)).slice(0, 3);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="screen home3">
      <header className="brand-head">
        <p className="brand">Mouthkind</p>
        <h1 className="display">{hello}{profile.name ? `, ${profile.name}` : ""}</h1>
      </header>

      {/* The two things people do most, always one tap away */}
      <div className="quick">
        <button className={`quick-tile ph${testedToday ? " done" : ""}`} onClick={() => open("ph")}>
          <span className="qt-swatches" aria-hidden="true">{[5.4, 6.2, 7.0].map((v) => <i key={v} style={{ background: phColor(v) }} />)}</span>
          <strong>Test my pH</strong>
          <em>{testedToday ? `Done today · ${ph.ph.toFixed(1)}` : ph ? `Last: ${fmtShort(ph.ts)}` : "With a test strip"}</em>
        </button>
        <button className={`quick-tile sip${next && !next.due ? " done" : ""}`} onClick={() => open("sip")}>
          <span className="qt-icon"><Icon name="drop" size={22} /></span>
          <strong>Dry mouth check</strong>
          <em>{next ? dueWords(next) : "Five questions"}</em>
        </button>
      </div>

      {pat.level === "flag" && (
        <section className="alert-x red">
          <strong>Your saliva has been acidic in {pat.acid} of your last {pat.n} tests.</strong>
          <p>Acidic saliva puts your teeth at risk of decay, even if your mouth doesn't feel dry. See your dentist and show them your results.</p>
          <button className="btn primary" onClick={() => go("care", "protect")}>What helps</button>
        </section>
      )}

      <section className="card-x ph-card">
        <div className="cx-head"><span className="cx-icon ph"><span className="ph-swatch" style={{ background: ph ? phColor(ph.ph) : "var(--soft)" }} /></span>
          <h2>Saliva pH</h2>{ph && <span className={`zone-pill ${phZone(ph.ph).tone}`}>{phZone(ph.ph).label}</span>}</div>
        {ph ? (<>
          <div className="sip-row">
            <p className="sip-big"><strong>{ph.ph.toFixed(1)}</strong><span>pH</span></p>
            <p className="cx-sub">{pat.level === "ok" ? "Your recent results are healthy." : pat.level === "flag" ? "Consistently acidic — see the steps in Care." : `${pat.acid} of your last ${pat.n} results were acidic.`}</p>
          </div>
          <PhTimeline readings={phs} zones={PH_ZONES} color={phColor} fmt={fmtShort} />
        </>) : <p className="cx-lead">Acidic saliva is one of the biggest risks for tooth decay. Test with a pH strip and record the colour here to see your pattern.</p>}
      </section>

      <section className="card-x sip-card">
        <div className="cx-head"><span className="cx-icon dry"><Icon name="drop" size={20} /></span><h2>How dry is your mouth?</h2></div>
        {sip ? (
          <div className="sip-row">
            <p className="sip-big"><strong>{sip.sip}</strong><span>of 15</span></p>
            <div>
              <p className="sip-word" style={{ color: sipBand(sip.sip).color }}>{sipBand(sip.sip).full}</p>
              <p className="cx-meta">GC SIP-SCORE · {fmtShort(sip.ts)}</p>
            </div>
          </div>
        ) : <p className="cx-lead">The GC SIP-SCORE: five quick questions that measure how much dryness affects you.</p>}
        {sips.length > 1 && <DotSeries points={sips.slice(-8).map((s) => ({ v: s.sip, label: fmtShort(s.ts) }))} min={5} max={15} tone="dry" />}
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

      <section className={`card-x risk-card${r ? ` ${r.band.tone}` : ""}`}>
        <div className="cx-head"><span className="cx-icon risk"><Icon name="shield" size={20} /></span><h2>Your dry mouth risk</h2></div>
        {r ? (<>
          <p className="risk-line"><span className="risk-band">{r.band.label}</span><span className="cx-meta"> · {r.score} points</span></p>
          <RiskMeter score={r.score} bands={RISK_BANDS} />
          {r.factors[0] && <p className="cx-sub">Biggest factor: {r.factors[0].label}</p>}
          <div className="cx-actions">
            <button className="btn primary" onClick={() => open("riskresult")}>See my risk</button>
            <button className="btn ghost" onClick={() => open("risk")}>Update</button>
          </div>
        </>) : (<>
          <p className="cx-lead">Even without symptoms, your medicines, health and habits can put you at risk. Find out where you stand.</p>
          <button className="btn primary huge" onClick={() => open("risk")}>Check my risk</button>
          <p className="cx-meta center">About 2 minutes · 9 questions</p>
        </>)}
      </section>

      {care.length > 0 && (
        <section className="block">
          <div className="block-h"><h2>What helps you most</h2><button className="link-btn" onClick={() => go("care")}>All care</button></div>
          {care.map((t) => (
            <button key={t.id} className={`ease care-${t.id}`} onClick={() => go("care", t.id)}>
              <strong>{t.title}</strong><span>{t.short}</span>
            </button>
          ))}
        </section>
      )}

      <p className="foot-note">Mouthkind is made by Dr Rakesh Jivan. It gives general information, not a diagnosis.</p>
    </div>
  );
}
