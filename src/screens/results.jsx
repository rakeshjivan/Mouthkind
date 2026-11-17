import { useState } from "react";
import { Icon, Sheet } from "../components/ui.jsx";
import { DotSeries } from "../components/kit.jsx";
import { PH_ROOT_CRITICAL, SIP_QUESTIONS, SIP_OPTIONS, phBand, sipBand } from "../data/clinical.js";
import { RISK_BANDS, scoreRisk } from "../data/risk.js";
import { freqFor } from "../data/schedule.js";
import { fmtDate, fmtShort, fmtTime } from "../lib/store.js";

const by = (kind) => (e) => e.kind === kind;

export function Results({ entries, open, onDelete, onShowRisk }) {
  const [openId, setOpenId] = useState(null);
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => a.ts - b.ts);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const risks = entries.filter(by("risk")).sort((a, b) => a.ts - b.ts);
  const all = [...entries].filter((e) => e.kind === "risk" || e.sip != null || e.ph != null).sort((a, b) => b.ts - a.ts);

  if (!all.length) return (
    <div className="screen">
      <header className="hero"><h1 className="display">My results</h1></header>
      <section className="empty-card"><p>Your risk checks, dry mouth scores and pH results will appear here, with charts once you have a few.</p>
        <button className="btn primary big" onClick={() => open("risk")}>Check my risk</button></section>
    </div>
  );

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">My results</h1>
        <p className="lede">Everything you've recorded, to look back on or show your dentist.</p></header>

      <section className="panel">
        <div className="panel-h"><h2>Dry mouth score</h2><button className="link-btn" onClick={() => open("sip")}>Check now</button></div>
        {sips.length ? (<>
          <p className="big-read"><strong>{sips.at(-1).sip}</strong> of 15 · <span style={{ color: sipBand(sips.at(-1).sip).color }}>{sipBand(sips.at(-1).sip).full.toLowerCase()}</span></p>
          {sips.length > 1 && <DotSeries points={sips.slice(-20).map((s) => ({ v: s.sip, label: fmtShort(s.ts) }))} min={5} max={15} tone="dry" />}
          <p className="panel-foot">GC SIP-SCORE. 5 means no dryness, 15 is severe.</p>
        </>) : <p className="soft-note">No checks yet.</p>}
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Saliva pH</h2><button className="link-btn" onClick={() => open("ph")}>Add a result</button></div>
        {phs.length ? (<>
          {phs.length > 1
            ? <DotSeries points={phs.slice(-20).map((p) => ({ v: p.ph, label: fmtShort(p.ts) }))} min={5} max={7.8} line={PH_ROOT_CRITICAL} lineLabel={`Roots at risk below ${PH_ROOT_CRITICAL}`} tone="accent" fmt={(v) => v.toFixed(1)} />
            : <p className="big-read"><strong>{phs[0].ph.toFixed(1)}</strong> · {phBand(phs[0].ph).toLowerCase()}</p>}
          <p className="panel-foot">{phs.filter((p) => p.ph < PH_ROOT_CRITICAL).length} of {phs.length} results below {PH_ROOT_CRITICAL}.</p>
        </>) : <p className="soft-note">No results yet.</p>}
      </section>

      {risks.length > 0 && (
        <section className="panel">
          <div className="panel-h"><h2>Risk score</h2><button className="link-btn" onClick={onShowRisk}>See details</button></div>
          {risks.length > 1
            ? <DotSeries points={risks.map((r) => ({ v: r.score, label: fmtShort(r.ts) }))} min={0} max={Math.max(60, ...risks.map((r) => r.score))} tone="accent" />
            : <p className="big-read"><strong>{risks[0].score}</strong> · {RISK_BANDS.find((b) => b.id === risks[0].band)?.label.toLowerCase()} risk</p>}
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
                <span className={`entry-bar ${e.kind === "risk" ? "risk" : e.ph != null && e.sip == null ? "ph" : "dry"}`} />
                <span className="entry2-main">
                  <strong>{new Date(e.ts).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong>
                  <span className="entry2-pills">
                    {e.kind === "risk" && <span className="pill">Risk {e.score} · {RISK_BANDS.find((b) => b.id === e.band)?.label}</span>}
                    {e.sip != null && e.kind !== "risk" && <span className="pill dry"><b>{e.sip}</b> dry mouth score</span>}
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
  const sips = entries.filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts).slice(0, 12);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => b.ts - a.ts).slice(0, 12);
  return (
    <Sheet title="Summary for your dentist" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => window.print()}><Icon name="doc" /> Print or save as PDF</button>}>
      <article className="report2">
        <h1>Dry mouth summary{profile.name ? ` — ${profile.name}` : ""}</h1>
        <p className="rep-meta">Prepared {fmtDate(Date.now())} with Mouthkind. Patient-reported.</p>
        <section>
          <h2>Risk factors</h2>
          {r ? (<>
            <p><b>Risk score {r.score}/100 — {r.band.label}</b> (checked {fmtDate(risk.ts)}). Points-based checklist of known risk factors; not a validated instrument.</p>
            <table><thead><tr><th>Factor</th><th>Points</th></tr></thead>
              <tbody>{r.factors.map((f) => <tr key={f.q + f.v}><td>{f.label}</td><td>{f.pts}</td></tr>)}</tbody></table>
          </>) : <p>No risk check recorded.</p>}
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
            <table><thead><tr><th>Date</th><th>pH</th></tr></thead>
              <tbody>{phs.map((p) => <tr key={p.id}><td>{fmtDate(p.ts)}</td><td>{p.ph.toFixed(1)}</td></tr>)}</tbody></table>
          ) : <p>None recorded.</p>}
          <p className="rep-foot">Root-surface critical pH taken as {PH_ROOT_CRITICAL}.</p>
        </section>
      </article>
    </Sheet>
  );
}
