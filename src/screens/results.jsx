import { USED, usedDays, usedInsights } from "../data/used.js";
import { GRADES, TEETH_FLAGS, painBand, teethFlags } from "../data/daily.js";
import { useState } from "react";
import { Icon, Sheet } from "../components/ui.jsx";
import { DotSeries, PhTimeline, SymptomChart, levelId } from "../components/kit.jsx";
import { SIP_QUESTIONS, SIP_OPTIONS, phBand, phColor, sipBand, sipLevel } from "../data/clinical.js";
import { PH_ZONES, isAcidic, phPattern } from "../data/ph.js";
import { RISK_BANDS, scoreRisk } from "../data/risk.js";
import { DECAY_BANDS, scoreDecay } from "../data/decay.js";
import { freqFor } from "../data/schedule.js";
import { fmtDate, fmtShort, fmtTime } from "../lib/store.js";

const by = (kind) => (e) => e.kind === kind;

const DAY = 86400000;

/** A history of levels as a simple line on three rows: low, moderate, high. */
const LEVEL_ROWS = ["low", "moderate", "high"];
const LEVEL_NAME = { low: "Low", moderate: "Moderate", high: "High" };
function LevelSeries({ items, tone }) {
  return <DotSeries points={items.map((x) => ({ v: LEVEL_ROWS.indexOf(x.id), label: fmtShort(x.ts) }))} min={0} max={2} ticks={[0, 1, 2]} gutter={74} tone={tone} fmt={(v) => LEVEL_NAME[LEVEL_ROWS[v]]} />;
}

/** What was used on which days, over the last 6 weeks, plus any before/after pattern in the SIP score. */
function UsedPanel({ entries, open }) {
  const days = usedDays(entries);
  const items = USED.filter((u) => days[u.v]?.length);
  const ins = usedInsights(entries);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cols = Array.from({ length: 42 }, (_, i) => +today - (41 - i) * DAY);
  return (
    <section className="panel">
      <div className="panel-h"><h2>What I used</h2><button className="link-btn" onClick={() => open("used")}>Log</button></div>
      {ins.map((x) => (
        <p key={x.v} className={`insight ${x.change < 0 ? "better" : x.change > 0 ? "worse" : ""}`}>
          Since starting <b>{x.label}</b> on {fmtShort(x.first)}, your dry mouth score has {x.change < 0 ? "dropped" : x.change > 0 ? "risen" : "stayed"} {x.change ? `from ${x.before} to ${x.after}` : `at about ${x.after}`} on average.
        </p>
      ))}
      {ins.length > 0 && <p className="panel-foot">A pattern in your own results, not proof — other things change at the same time.</p>}
      {items.length ? (
        <div className="used-grid" role="img" aria-label={items.map((u) => `${u.label}: ${days[u.v].length} days`).join("; ")}>
          {items.map((u) => {
            const set = new Set(days[u.v].map((t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return +d; }));
            return (
              <div key={u.v} className="used-row">
                <span>{u.label}</span>
                <span className="used-days">{cols.map((c) => <i key={c} className={set.has(c) ? "on" : ""} />)}</span>
              </div>
            );
          })}
          <p className="panel-foot">Last 6 weeks.</p>
        </div>
      ) : <p className="soft-note">Log what you use — gel, Tooth Mousse™, rinses — and after a few weeks this shows whether your dry mouth score changed.</p>}
    </section>
  );
}

export function Results({ entries, open, onDelete, onShowRisk, onShowDecay }) {
  const [openId, setOpenId] = useState(null);
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const risks = entries.filter(by("risk")).sort((a, b) => a.ts - b.ts);
  const decays = entries.filter(by("decay")).sort((a, b) => a.ts - b.ts);
  const all = [...entries].filter((e) => e.kind === "risk" || e.kind === "decay" || e.sip != null || e.ph != null).sort((a, b) => b.ts - a.ts);
  const dailies = entries.filter(by("daily")).sort((a, b) => a.ts - b.ts);
  const jaws = entries.filter(by("jaw")).sort((a, b) => a.ts - b.ts);
  const anyUsed = entries.some(by("used"));

  if (!all.length && !dailies.length && !anyUsed && !jaws.length) return (
    <div className="screen">
      <header className="hero"><h1 className="display">Tracker</h1></header>
      <section className="empty-card"><p>Your risk checks, dry mouth scores and pH results will appear here, with charts once you have a few.</p>
        <button className="btn primary big" onClick={() => open("risk")}>Check my risk</button></section>
    </div>
  );

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Tracker</h1>
        <p className="lede">Everything you've recorded, to look back on or show your dentist.</p></header>

      {dailies.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>My mouth log</h2><button className="link-btn" onClick={() => open("daily")}>Log today</button></div>
          {(() => { const d = dailies.at(-1), b = painBand(d.pain ?? 0); return (
            <ul className="sym-now">{d.dryness != null && <li>Dryness {d.dryness} of 10</li>}<li>{d.pain ? `Pain ${d.pain} of 10 · ${b.label.toLowerCase()}` : "No pain"}</li>{d.sores != null && <li>{GRADES[d.grade ?? 0].label}</li>}</ul>); })()}
          <p className="panel-foot">Last logged {fmtShort(dailies.at(-1).ts)}</p>
          {dailies.length > 1 && <SymptomChart days={dailies.slice(-21).map((d) => ({ ...d, tooth: teethFlags(d).length > 0 }))} fmt={fmtShort} />}
          {(() => { const t = dailies.slice(-21).filter((d) => teethFlags(d).length); return t.length > 0 && (
            <ul className="sym-flags">{t.reverse().slice(0, 4).map((d) => <li key={d.id}><strong>{fmtShort(d.ts)}</strong> {teethFlags(d).map((v) => TEETH_FLAGS.find((f) => f.v === v)?.label).join(", ")}</li>)}</ul>); })()}
          <p className="panel-foot">Dryness and pain, 0 (none) to 10. The strip shows mouth sores: darker is worse.</p>
        </section>
      )}

      <section className="panel">
        <div className="panel-h"><h2>Dry mouth score</h2><button className="link-btn" onClick={() => open("sip")}>Check now</button></div>
        {sips.length ? (<>
          <p className="big-read"><strong>{sipLevel(sips.at(-1).sip).label}</strong> · <span style={{ color: sipLevel(sips.at(-1).sip).color }}>{sipLevel(sips.at(-1).sip).full.toLowerCase()}</span></p>
          {sips.length > 1 && <LevelSeries items={sips.slice(-20).map((s) => ({ id: sipLevel(s.sip).id, ts: s.ts }))} tone="dry" />}
          <p className="panel-foot">GC SIP-SCORE: low, moderate or high dryness.</p>
        </>) : <p className="soft-note">No checks yet.</p>}
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Saliva pH</h2><button className="link-btn" onClick={() => open("ph")}>Check now</button></div>
        {phs.length ? (<>
          <PhTimeline readings={phs} zones={PH_ZONES} color={phColor} fmt={fmtShort} max={14} />
          <p className="panel-foot">{phs.filter((p) => isAcidic(p.ph)).length} of {phs.length} results acidic (6.6 or lower).{phPattern(phs).level === "flag" ? " Your recent results are consistently acidic — show your dentist." : ""}</p>
        </>) : <p className="soft-note">No results yet.</p>}
      </section>

      <UsedPanel entries={entries} open={open} />

      {jaws.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>Jaw opening</h2><button className="link-btn" onClick={() => open("jaw")}>Check now</button></div>
          <p className="big-read"><strong>{jaws.at(-1).fingers === 3 ? "3 or more" : jaws.at(-1).fingers} finger{jaws.at(-1).fingers === 1 ? "" : "s"}</strong></p><p className="panel-foot">Last checked {fmtShort(jaws.at(-1).ts)}</p>
          {jaws.length > 1 && <DotSeries points={jaws.slice(-12).map((j) => ({ v: j.fingers, label: fmtShort(j.ts) }))} min={1} max={3} tone="accent" />}
          <p className="panel-foot">Fewer than 3 fingers can be an early sign of a stiff jaw — tell your team.</p>
        </section>
      )}

      {risks.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>Dry mouth risk</h2><button className="link-btn" onClick={onShowRisk}>See result</button></div>
          {risks.length > 1
            ? <LevelSeries items={risks.map((r) => ({ id: levelId(r.band), ts: r.ts }))} tone="accent" />
            : <p className="big-read"><strong>{RISK_BANDS.find((b) => b.id === risks[0].band)?.label}</strong> risk</p>}
        </section>
      )}

      {decays.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>Tooth decay risk</h2><button className="link-btn" onClick={onShowDecay}>See result</button></div>
          {decays.length > 1
            ? <LevelSeries items={decays.map((r) => ({ id: levelId(r.band), ts: r.ts }))} tone="accent" />
            : <p className="big-read"><strong>{DECAY_BANDS.find((b) => b.id === decays[0].band)?.label}</strong> risk</p>}
        </section>
      )}

      <section className="panel share">
        <div><h2>Show your dentist</h2><p>A one-page summary of your risk factors, scores and pH results, to print or save as a PDF.</p></div>
        <button className="btn primary big" onClick={() => open("report")}><Icon name="doc" /> Make a summary</button>
      </section>

      <h2 className="list-h">Every result</h2>
      <div className="entries2">
        {all.slice(0, 120).map((e) => {
          const isOpen = openId === e.id;
          return (
            <article key={e.id} className={`entry2${isOpen ? " open" : ""}`}>
              <button className="entry2-head" onClick={() => setOpenId(isOpen ? null : e.id)} aria-expanded={isOpen}>
                <span className={`entry-bar ${e.kind === "risk" || e.kind === "decay" ? "risk" : e.ph != null && e.sip == null ? "ph" : "dry"}`} />
                <span className="entry2-main">
                  <strong>{new Date(e.ts).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong>
                  <span className="entry2-pills">
                    {e.kind === "decay" && <span className="pill">Decay risk: {DECAY_BANDS.find((b) => b.id === e.band)?.label.toLowerCase()}</span>}
                    {e.kind === "risk" && <span className="pill">Dry mouth risk: {RISK_BANDS.find((b) => b.id === e.band)?.label.toLowerCase()}</span>}
                    {e.sip != null && e.kind !== "risk" && <span className="pill dry">Dry mouth score: {sipLevel(e.sip).label.toLowerCase()}</span>}
                    {e.ph != null && <span className="pill">pH {e.ph.toFixed(1)}</span>}
                  </span>
                </span>
                <Icon name="chev" className={isOpen ? "rot" : ""} />
              </button>
              {isOpen && (
                <div className="entry2-body">
                  <p><span>Time</span>{fmtTime(e.ts)}</p>
                  {e.items && SIP_QUESTIONS.map((q, i) => <p key={i}><span>{q}</span>{SIP_OPTIONS.find((o) => o.v === e.items[i])?.label}</p>)}
                  {e.recall && <p><span>Thinking about</span>{freqFor(e.recall).recall.toLowerCase()}</p>}
                  {e.kind === "decay" && <p><span>Factors</span>{scoreDecay(e.answers, e.ctx).factors.map((f) => f.label).join("; ") || "none"}</p>}
                  {e.kind === "risk" && <p><span>Factors</span>{scoreRisk(e.answers).factors.map((f) => f.label).join("; ") || "none"}</p>}
                  <button className="link-btn danger-text" onClick={() => { onDelete([e.id]); setOpenId(null); }}><Icon name="trash" size={16} /> Delete this result</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** A printable one-page summary for the dentist or doctor. */
export function Summary({ entries, profile, onClose }) {
  const risk = [...entries].filter(by("risk")).sort((a, b) => b.ts - a.ts)[0];
  const r = risk && scoreRisk(risk.answers);
  const fullName = [profile.firstName ?? profile.name, profile.lastName].filter(Boolean).join(" ").trim();
  const decay = [...entries].filter(by("decay")).sort((a, b) => b.ts - a.ts)[0];
  const dr = decay && scoreDecay(decay.answers, decay.ctx);
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts).slice(0, 12);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => b.ts - a.ts).slice(0, 12);
  return (
    <Sheet title="Summary for your dentist" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => window.print()}><Icon name="doc" /> Print or save as PDF</button>}>
      <article className="report2">
        <h1>Dry mouth and decay risk summary{fullName ? ` — ${fullName}` : ""}</h1>
        {profile.dob && <p className="rep-meta">Date of birth {fmtDate(new Date(`${profile.dob}T00:00:00`).getTime())}</p>}
        <p className="rep-meta">Prepared {fmtDate(Date.now())} with Mouthkind. Patient-reported.</p>
        <section>
          <h2>Dry mouth risk factors</h2>
          {r ? (<>
            <p><b>Risk score {r.score}/100 — {r.band.label}</b> (checked {fmtDate(risk.ts)}). Points-based checklist of known risk factors; not a validated instrument.</p>
            <table><thead><tr><th>Factor</th><th>Points</th></tr></thead>
              <tbody>{r.factors.map((f) => <tr key={f.q + f.v}><td>{f.label}</td><td>{f.pts}</td></tr>)}</tbody></table>
          </>) : <p>No risk check recorded.</p>}
        </section>
        <section>
          <h2>Tooth decay risk (CAMBRA-based)</h2>
          {dr ? (dr.noTeeth ? <p>No natural teeth (checked {fmtDate(decay.ts)}).</p> : (<>
            <p><b>{dr.band.label} risk — {dr.score} points</b> (checked {fmtDate(decay.ts)}). Patient-answered items from CAMBRA; clinical indicators not included. Not a validated instrument.</p>
            <table><thead><tr><th>Factor</th><th>Points</th></tr></thead>
              <tbody>{[...dr.factors, ...dr.protective].map((f) => <tr key={f.q + f.v}><td>{f.label}</td><td>{f.pts}</td></tr>)}</tbody></table>
          </>)) : <p>No decay risk check recorded.</p>}
        </section>
        <section>
          <h2>GC SIP-SCORE (5–15)</h2>
          {sips.length ? (
            <table><thead><tr><th>Date</th><th>Score</th><th>Band</th><th>Recall</th></tr></thead>
              <tbody>{sips.map((s) => <tr key={s.id}><td>{fmtDate(s.ts)}</td><td>{s.sip}</td><td>{sipBand(s.sip).label}</td><td>{s.recall ? freqFor(s.recall).recall : "Last two weeks"}</td></tr>)}</tbody></table>
          ) : <p>None recorded.</p>}
        </section>
        <section>
          <h2>Resting saliva pH (test strip)</h2>
          {phs.length ? (
            <table><thead><tr><th>Date</th><th>pH</th><th>Zone</th></tr></thead>
              <tbody>{phs.map((p) => <tr key={p.id}><td>{fmtDate(p.ts)}</td><td>{p.ph.toFixed(1)}</td><td>{phBand(p.ph)}</td></tr>)}</tbody></table>
          ) : <p>None recorded.</p>}
          <p className="rep-foot">Zones as GC Saliva-Check BUFFER: 5.0–5.8 highly acidic, 6.0–6.6 moderately acidic, 6.8–7.8 healthy.{phPattern([...phs].reverse()).level === "flag" ? " Recent results consistently acidic." : ""}</p>
        </section>
      </article>
    </Sheet>
  );
}
