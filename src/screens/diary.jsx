import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { DotSeries, TwoLineChart } from "../components/kit.jsx";
import { PH_ROOT_CRITICAL, sipBand } from "../data/clinical.js";
import { DRY_SIGNS, SORE_LEVELS, SORE_SIGNS, areaWord, dryWord, eatWord, lastDays, soreLevel, soreWord } from "../data/tracker.js";
import { redFlags } from "../lib/rules.js";
import { dayKey, fmtShort, fmtTime } from "../lib/store.js";

const label = (list, id) => list.find((x) => x.id === id)?.label;

export function Diary({ profile, entries, open, onDelete }) {
  const [range, setRange] = useState(14);
  const [openId, setOpenId] = useState(null);
  const days = lastDays(entries, range);
  const logged = days.filter((d) => d.e);
  const chemo = (profile.chemoDates || []).map((d) => ({ key: dayKey(Date.parse(d)), label: "Chemo" }));
  const sips = entries.filter((e) => e.sip != null).sort((a, b) => a.ts - b.ts);
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts).slice(-20);
  const levels = days.map((d) => soreLevel(d.e));
  const worst = Math.max(-1, ...levels.filter((x) => x != null));
  const all = [...entries].sort((a, b) => b.ts - a.ts);

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Diary</h1>
        <p className="lede">How your mouth has been, to look back on or show your team.</p></header>

      {entries.length === 0 ? (
        <section className="empty-card">
          <p>Your diary fills up as you log each day. After a few days you'll see whether things are getting better or worse.</p>
          <button className="btn primary big" onClick={() => open("log")}>Log today</button>
        </section>
      ) : (<>
        <div className="seg full" role="group" aria-label="Time range">
          {[[14, "Two weeks"], [30, "30 days"]].map(([n, t]) => <button key={n} className={range === n ? "on" : ""} aria-pressed={range === n} onClick={() => setRange(n)}>{t}</button>)}
        </div>

        <section className="panel">
          <div className="panel-h"><h2>Soreness and dryness</h2><span className="legend"><i className="sore" />Sore <i className="dry" />Dry</span></div>
          {logged.length ? <TwoLineChart days={days} markers={chemo} /> : <p className="soft-note">Nothing logged in this period.</p>}
          {logged.length >= 2 && <p className="panel-foot">{trendWords(logged)}</p>}
        </section>

        {worst >= 0 && (
          <section className="panel">
            <div className="panel-h"><h2>Eating and mouth sores</h2></div>
            <div className="levels" aria-label="Mouth soreness level by day">
              {days.map((d, i) => <span key={d.key} className={`lv lv${levels[i] ?? "x"}`} title={levels[i] != null ? SORE_LEVELS[levels[i]] : "Not logged"} />)}
            </div>
            <p className="panel-foot">Worst day: <strong>{SORE_LEVELS[worst].toLowerCase()}</strong>.</p>
          </section>
        )}

        <section className="panel">
          <div className="panel-h"><h2>Dry mouth score</h2><button className="link-btn" onClick={() => open("sip")}>{sips.length ? "Do it again" : "Do it now"}</button></div>
          {sips.length ? (<>
            <p className="big-read"><strong>{sips.at(-1).sip}</strong> of 15 · <span style={{ color: sipBand(sips.at(-1).sip).color }}>{sipBand(sips.at(-1).sip).full.toLowerCase()}</span></p>
            {sips.length > 1 && <DotSeries points={sips.map((s) => ({ v: s.sip, label: fmtShort(s.ts) }))} min={5} max={15} tone="dry" />}
            <p className="panel-foot">GC SIP-SCORE, every two weeks. 5 is no dryness, 15 is severe.</p>
          </>) : <p className="soft-note">Five questions about the last two weeks. It tracks dryness more reliably than a daily number.</p>}
        </section>

        {(phs.length > 0 || profile.phStrips) && (
          <section className="panel">
            <div className="panel-h"><h2>Saliva pH</h2><button className="link-btn" onClick={() => open("ph")}>Add a reading</button></div>
            {phs.length ? (<>
              <DotSeries points={phs.map((p) => ({ v: p.ph, label: fmtShort(p.ts) }))} min={5} max={7.8} line={PH_ROOT_CRITICAL} lineLabel={`Roots at risk below ${PH_ROOT_CRITICAL}`} tone="accent" fmt={(v) => v.toFixed(1)} />
              <p className="panel-foot">{phs.filter((p) => p.ph < PH_ROOT_CRITICAL).length} of {phs.length} readings below {PH_ROOT_CRITICAL}.</p>
            </>) : <p className="soft-note">No readings yet.</p>}
          </section>
        )}

        <section className="panel share">
          <div><h2>Share with your team</h2><p>A one-page summary with your charts and notes, to print or save as a PDF.</p></div>
          <button className="btn primary big" onClick={() => open("report")}><Icon name="doc" /> Make a report</button>
          <button className="link-btn" onClick={() => open("backup")}>Back up or move your diary</button>
        </section>

        <h2 className="list-h">Every entry</h2>
        <div className="entries2">
          {all.slice(0, 90).map((e) => {
            const lvl = e.kind === "daily" ? redFlags(e, profile)[0]?.level || "ok" : "ok";
            const isOpen = openId === e.id;
            return (
              <article key={e.id} className={`entry2${isOpen ? " open" : ""}`}>
                <button className="entry2-head" onClick={() => setOpenId(isOpen ? null : e.id)} aria-expanded={isOpen}>
                  <span className={`entry-bar ${lvl}`} />
                  <span className="entry2-main">
                    <strong>{new Date(e.ts).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</strong>
                    <span className="entry2-pills">{summary(e)}</span>
                  </span>
                  <Icon name="chev" className={isOpen ? "rot" : ""} />
                </button>
                {isOpen && (
                  <div className="entry2-body">
                    {details(e).map(([k, v]) => <p key={k}><span>{k}</span>{v}</p>)}
                    <button className="link-btn danger-text" onClick={() => { onDelete([e.id]); setOpenId(null); }}><Icon name="trash" size={16} /> Delete this entry</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </>)}
    </div>
  );
}

function summary(e) {
  if (e.kind === "sip" || (e.sip != null && e.pain == null)) return <span className="pill dry">Dry mouth score {e.sip}</span>;
  if (e.kind === "ph") return <span className="pill">pH {e.ph.toFixed(1)}</span>;
  if (e.kind === "symptom") return <span className="pill">{e.title}</span>;
  return (<>
    {e.pain != null && <span className="pill sore"><b>{e.pain}</b> sore</span>}
    {e.dryness != null && <span className="pill dry"><b>{e.dryness}</b> dry</span>}
    {e.eating && e.eating !== "normal" && <span className="pill">{eatWord(e.eating) || e.eating}</span>}
  </>);
}

function details(e) {
  const rows = [["Time", fmtTime(e.ts)]];
  if (e.pain != null) rows.push(["Soreness", `${e.pain} — ${soreWord(e.pain)}`]);
  if (e.sites?.length) rows.push(["Where", e.sites.map(areaWord).join(", ")]);
  if (e.symptoms?.length) rows.push(["Noticed", e.symptoms.map((s) => label(SORE_SIGNS, s) || s).join(", ")]);
  if (e.eating) rows.push(["Eating", eatWord(e.eating) || e.eating]);
  if (e.dryness != null) rows.push(["Dryness", `${e.dryness} — ${dryWord(e.dryness)}`]);
  if (e.dryExtras?.length) rows.push(["Dryness causes", e.dryExtras.map((s) => label(DRY_SIGNS, s)).join(", ")]);
  if (e.fever) rows.push(["Temperature", { no: "No fever", yes: "38 °C or more", shivery: "Hot, cold or shivery", unknown: "Not checked" }[e.fever]]);
  if (e.sip != null) rows.push(["Dry mouth score", `${e.sip} of 15`]);
  if (e.ph != null) rows.push(["pH", e.ph.toFixed(1)]);
  return rows;
}

function trendWords(logged) {
  const half = Math.floor(logged.length / 2);
  const avg = (arr, k) => arr.reduce((a, d) => a + (d.e[k] ?? 0), 0) / arr.length;
  const a = logged.slice(0, half), b = logged.slice(half);
  const say = (k, name) => {
    const d = avg(b, k) - avg(a, k);
    return Math.abs(d) < 1 ? `${name} is about the same` : d > 0 ? `${name} is getting worse` : `${name} is easing`;
  };
  return `${say("pain", "Soreness")}; ${say("dryness", "dryness").toLowerCase()}, comparing the first and second half of this period.`;
}
