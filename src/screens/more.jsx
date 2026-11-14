import { useMemo, useState } from "react";
import { Gauge, Icon, Sheet, Sources, Toggle } from "../components/ui.jsx";
import { dryWord, painWord } from "./check.jsx";
import { TrendPanels } from "../components/charts.jsx";
import {
  CARER_SIGNS, DANGER_SIGNS, OLD_LABELS, EATING, OPENING, PHASES, PH_ROOT_CRITICAL, QUESTIONS, REGIONS, SIP_QUESTIONS, SYMPTOMS, TREATMENTS, sipBand, telHref,
} from "../data/clinical.js";
import { JOBS, visibleProducts } from "../data/products.js";
import { LEARN } from "../data/learn.js";
import { host, supportFor } from "../data/support.js";
import { REFS } from "../data/references.js";
import { adviceFor, redFlags, trendFlags, LEVELS } from "../lib/rules.js";
import { DAY, downloadText, fmtDate, fmtShort, fmtTime, makeBackup, readBackup, dayKey } from "../lib/store.js";

const symLabel = (id) => [...SYMPTOMS, ...CARER_SIGNS, ...DANGER_SIGNS].find((s) => s.id === id)?.label || OLD_LABELS[id] || id;
const eatLabel = (id) => EATING.find((s) => s.id === id)?.label || "—";

// ═══ Trends ════════════════════════════════════════════════════════════════
export function Trends({ entries, profile, onDelete, open }) {
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState([]);
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const latestSip = sorted.find((e) => e.sip != null);
  const week = sorted.filter((e) => e.kind === "daily" && Date.now() - e.ts <= 7 * DAY);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="screen">
      <header className="hero"><h1 className="display">My notes</h1>
        <p className="lede">Everything you've recorded, to look back on or show your team.</p></header>
      {entries.length === 0 ? (
        <section className="card"><p className="lede">Nothing here yet. After a few check-ins you'll see how things are going.</p></section>
      ) : (
        <>
          <section className="card">
            <h2 className="card-h">This week</h2>
            <div className="week-dots" aria-label="Last 7 days">
              {Array.from({ length: 7 }, (_, k) => {
                const d = new Date(Date.now() - (6 - k) * DAY);
                const e = sorted.find((x) => x.kind === "daily" && dayKey(x.ts) === dayKey(d.getTime()));
                const lvl = e ? (redFlags(e, profile)[0]?.level || "ok") : "none";
                return (
                  <div key={k} className="wd">
                    <span className={`wd-dot ${lvl}`} title={e ? painWord(e.pain) || "" : "No check-in"} />
                    <span className="wd-day">{d.toLocaleDateString("en-AU", { weekday: "narrow" })}</span>
                  </div>
                );
              })}
            </div>
            <p className="soft-note">{week.length} check-in{week.length === 1 ? "" : "s"} this week. Green means nothing needed a call.</p>
          </section>
          {latestSip && (
            <section className="card gauge-card">
              <h2 className="card-h">Dry mouth score</h2>
              <Gauge score={latestSip.sip} />
              <p className="score-band" style={{ color: sipBand(latestSip.sip).color }}>{sipBand(latestSip.sip).full}</p>
              <p className="score-meta">{latestSip.sip} out of 15 · {fmtDate(latestSip.ts)}</p>
            </section>
          )}
          <section className="card"><h2 className="card-h">Over time</h2><TrendPanels entries={entries} /></section>
          <section className="card">
            <h2 className="card-h">Share with your team</h2>
            <p className="muted">A one-page summary to print or save as a PDF.</p>
            <button className="btn primary big" onClick={() => open("report")}><Icon name="doc" /> Make a report</button>
          </section>
          <div className="list-head">
            <h2 className="card-h">Every entry</h2>
            <button className="link-btn" onClick={() => { setSelecting(!selecting); setSel([]); }}>{selecting ? "Cancel" : "Delete some"}</button>
          </div>
          <div className="entries">
            {sorted.slice(0, 120).map((e) => {
              const on = sel.includes(e.id);
              const bits = [painWord(e.pain), dryWord(e.dryness)?.toLowerCase(),
                e.sip != null && `dry mouth score ${e.sip}`, e.weight != null && `${e.weight} kg`,
                ...[...(e.danger || []), ...(e.symptoms || [])].map((x) => symLabel(x).toLowerCase())].filter(Boolean);
              const lvl = redFlags(e, profile)[0]?.level;
              return (
                <button key={e.id} className={`entry${selecting ? " sel-mode" : ""}${on ? " sel" : ""}`}
                  onClick={() => selecting && toggle(e.id)} disabled={!selecting}>
                  {selecting && <span className={`box${on ? " on" : ""}`}>{on && <Icon name="check" size={14} stroke={3} />}</span>}
                  <span className={`entry-bar ${lvl || "ok"}`} />
                  <span className="entry-main">
                    <strong>{new Date(e.ts).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}</strong>
                    <span>{bits.join(", ") || "—"}</span>
                  </span>
                  <span className="entry-date">{fmtTime(e.ts)}</span>
                </button>
              );
            })}
          </div>
          {selecting && sel.length > 0 && (
            <div className="sticky-bar">
              <button className="btn danger big" onClick={() => { onDelete(sel); setSel([]); setSelecting(false); }}>
                <Icon name="trash" /> Delete {sel.length} {sel.length === 1 ? "entry" : "entries"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══ Help (tips, products, background) ═════════════════════════════════════
export function Help({ profile, entries }) {
  const [view, setView] = useState("tips");
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const latest = sorted.find((e) => e.kind === "daily");
  const cards = adviceFor({ ...(latest || {}), sip: sorted.find((e) => e.sip != null)?.sip }, profile);
  const [openCard, setOpenCard] = useState(cards[0]?.id);
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Help</h1></header>
      <div className="seg full" style={{ marginBottom: 18 }}>
        {[["tips", "Tips"], ["products", "Products"], ["support", "Support"], ["learn", "Learn"]].map(([v, t]) => (
          <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)} aria-pressed={view === v}>{t}</button>
        ))}
      </div>
      {view === "tips" && cards.map((c) => (
        <section key={c.id} className={`advice${c.tone === "key" ? " key" : ""}`}>
          <button className="advice-head" onClick={() => setOpenCard(openCard === c.id ? "" : c.id)} aria-expanded={openCard === c.id}>
            <span>{c.title}</span><Icon name="chev" className={openCard === c.id ? "rot" : ""} />
          </button>
          {openCard === c.id && (
            <div className="advice-body"><ul>{c.points.map((p, i) => <li key={i}>{p}</li>)}</ul><Sources refs={c.refs} /></div>
          )}
        </section>
      ))}
      {view === "products" && <Products profile={profile} embedded />}
      {view === "support" && <Support profile={profile} />}
      {view === "learn" && <Learn profile={profile} embedded />}
    </div>
  );
}

// ═══ Support groups ════════════════════════════════════════════════════════
export function Support({ profile }) {
  const [region, setRegion] = useState(profile.region || "AU");
  const list = supportFor(region, profile.treatments);
  return (
    <div>
      <p className="lede tight">Cancer charities with nurses and counsellors you can call. Free, and you don't need a referral.</p>
      <div className="seg full" style={{ marginBottom: 18 }}>
        {Object.entries(REGIONS).map(([k, r]) => (
          <button key={k} className={region === k ? "on" : ""} onClick={() => setRegion(k)}>{r.name}</button>
        ))}
      </div>
      {list.map((s) => (
        <article key={s.id} className="org">
          <h3>{s.name}</h3>
          <p>{s.what}</p>
          <div className="org-actions">
            <a className="call-row primary" href={telHref(s.phone)}>
              <Icon name="phone" /><span><strong>Call</strong><em>{s.phone}</em></span>
            </a>
            <a className="call-row ghost" href={s.web} target="_blank" rel="noopener noreferrer">
              <Icon name="globe" /><span><strong>Website</strong><em>{host(s.web)}</em></span>
            </a>
          </div>
          {(s.hours || s.email) && <p className="soft-note">{[s.hours, s.email].filter(Boolean).join(" · ")}</p>}
        </article>
      ))}
      <p className="disclaimer"><Icon name="info" size={16} /> These groups give support and information. For a fever or anything urgent, call your treatment team.</p>
    </div>
  );
}

// ═══ Products ══════════════════════════════════════════════════════════════
export function Products({ profile, embedded }) {
  const [region, setRegion] = useState(profile.region || "AU");
  const list = visibleProducts(region, profile.treatments);
  const [openId, setOpenId] = useState(null);
  return (
    <div className={embedded ? "" : "screen"}>
      <p className="lede tight">Grouped by what they do. Tap one to see how to use it.</p>
      <div className="seg full" style={{ marginBottom: 18 }}>
        {Object.entries(REGIONS).map(([k, r]) => (
          <button key={k} className={region === k ? "on" : ""} onClick={() => setRegion(k)}>{r.name}</button>
        ))}
      </div>
      {JOBS.map((j) => {
        const items = list.filter((p) => p.job === j.id);
        if (!items.length) return null;
        return (
          <section key={j.id} className="job">
            <h2 className="section-h">{j.label}</h2>
            <p className="job-blurb">{j.blurb}</p>
            {items.map((p) => {
              const open = openId === p.id;
              const avail = p.regions[region];
              return (
                <article key={p.id} className="prod">
                  <button className="prod-head" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open}>
                    <span className="prod-name"><strong>{p.name}</strong><em>{p.form}{avail === "dental" ? " · from your dentist" : avail === "check" ? " · ask your pharmacy" : ""}</em></span>
                    <Icon name="chev" className={open ? "rot" : ""} />
                  </button>
                  {open && (
                    <div className="prod-body">
                      <p>{p.why}</p>
                      {p.use && <p><strong>How to use: </strong>{p.use}</p>}
                      {p.evidence && <p className="evidence">{p.evidence}</p>}
                      {p.flavours && <p className="muted">Flavours: {p.flavours}</p>}
                      {p.cautions?.length > 0 && <div className="warn">{p.cautions.map((c, i) => <p key={i}>{c}</p>)}</div>}
                      {p.buy?.[region] && (
                        <a className="btn primary big order" href={p.buy[region]} target="_blank" rel="noopener noreferrer">
                          <Icon name="cart" /> Order online
                        </a>
                      )}
                      <Sources refs={p.refs} />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
      <p className="disclaimer"><Icon name="info" size={16} /> Always read the label and follow the directions for use.
        Check with your treatment team or pharmacist before starting anything new during treatment.</p>
      {/* Pre-launch: settle the maker / interest wording here (see README). */}
      <p className="disclaimer credit">Mouthkind is made by Dr Rakesh Jivan.</p>
    </div>
  );
}

// ═══ Learn ═════════════════════════════════════════════════════════════════
export function Learn({ profile, embedded }) {
  const mine = (s) => !s.for || s.for.some((t) => profile.treatments.includes(t));
  const sections = [...LEARN.filter(mine), ...LEARN.filter((s) => !mine(s))];
  const [open, setOpen] = useState(sections[0]?.id);
  const [showRefs, setShowRefs] = useState(false);
  return (
    <div className={embedded ? "" : "screen"}>
      <p className="lede tight">Why treatment affects the mouth. Topics for your treatment come first.</p>
      {sections.map((s) => (
        <section key={s.id} className={`advice${mine(s) && s.for ? " key" : ""}`}>
          <button className="advice-head" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
            <span>{s.title}</span><Icon name="chev" className={open === s.id ? "rot" : ""} />
          </button>
          {open === s.id && (
            <div className="advice-body">{s.body.map((p, i) => <p key={i}>{p}</p>)}<Sources refs={s.refs} /></div>
          )}
        </section>
      ))}
      <section className="advice">
        <button className="advice-head" onClick={() => setShowRefs(!showRefs)} aria-expanded={showRefs}>
          <span>Where this advice comes from</span><Icon name="chev" className={showRefs ? "rot" : ""} />
        </button>
        {showRefs && (
          <div className="advice-body">
            <p>Advice in this app follows international supportive-care guidelines (MASCC/ISOO and ASCO), Australian and New Zealand
              cancer charity guidance, and published clinical trials.</p>
            <ol className="refs">
              {Object.values(REFS).map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> — {r.where}</li>)}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

// ═══ Report (print → PDF) ══════════════════════════════════════════════════
export function Report({ profile, entries, onClose }) {
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const sips = sorted.filter((e) => e.sip != null);
  const daily = sorted.filter((e) => e.kind === "daily");
  const recent = daily.filter((e) => Date.now() - e.ts <= 14 * DAY);
  const avg = (k) => { const v = recent.filter((e) => e[k] != null).map((e) => e[k]); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—"; };
  const flags = [...(daily[0] ? redFlags(daily[0], profile) : []), ...trendFlags(entries)];
  const counts = {};
  recent.forEach((e) => [...(e.danger || []), ...(e.symptoms || [])].forEach((s) => (counts[s] = (counts[s] || 0) + 1)));
  const phs = sorted.filter((e) => e.ph != null);

  return (
    <div className="sheet-wrap report-wrap" role="dialog" aria-modal="true" aria-label="Report for your team">
      <div className="sheet report-sheet">
        <div className="sheet-top no-print">
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          <span className="sheet-title">Report for your team</span>
          <button className="link-btn" onClick={() => window.print()}>Print or save PDF</button>
        </div>
        <div className="sheet-body report">
          <div className="rep-head">
            <h1>Oral health during cancer treatment — patient record</h1>
            <p>Generated {fmtDate(Date.now())} from the patient's own device</p>
          </div>
          <section><h2>Patient</h2>
            <div className="rr"><span>Name</span><b>{profile.name || "—"}</b></div>
            <div className="rr"><span>Treatment</span><b>{profile.treatments.map((t) => TREATMENTS.find((x) => x.id === t)?.label).join("; ") || "—"}</b></div>
            <div className="rr"><span>Stage</span><b>{PHASES.find((p) => p.id === profile.phase)?.label}{profile.endDate ? ` (finished ${profile.endDate})` : ""}</b></div>
            <div className="rr"><span>Monitoring since</span><b>{entries.length ? fmtDate(Math.min(...entries.map((e) => e.ts))) : "—"}</b></div>
          </section>
          <section><h2>Last 14 days</h2>
            <div className="rr"><span>Check-ins</span><b>{recent.length}</b></div>
            <div className="rr"><span>Mean mouth pain (0–10)</span><b>{avg("pain")}</b></div>
            <div className="rr"><span>Mean dryness (0–10)</span><b>{avg("dryness")}</b></div>
            <div className="rr"><span>Days eating less than normally</span><b>{recent.filter((e) => e.eating && e.eating !== "normal").length}</b></div>
            <div className="rr"><span>Highest temperature recorded</span><b>{recent.some((e) => e.temp != null) ? `${Math.max(...recent.filter((e) => e.temp != null).map((e) => e.temp))} °C` : "not recorded"}</b></div>
            <div className="rr"><span>Symptoms reported (days)</span><b>{Object.entries(counts).map(([k, n]) => `${symLabel(k)} (${n})`).join("; ") || "none"}</b></div>
          </section>
          {flags.length > 0 && (
            <section><h2>Flags raised by the app</h2>
              <ul>{flags.map((f) => <li key={f.id}><b>{LEVELS[f.level].label}:</b> {f.title}</li>)}</ul></section>
          )}
          {sips.length > 0 && (
            <section><h2>GC SIP-SCORE (5–15)</h2>
              <table className="rep-table"><thead><tr><th>Date</th><th>Items</th><th>Total</th><th>Band</th></tr></thead>
                <tbody>{sips.map((s) => <tr key={s.id}><td>{fmtShort(s.ts)}</td><td>{s.items?.join(" / ")}</td><td>{s.sip}</td><td>{sipBand(s.sip).label}</td></tr>)}</tbody></table>
              <p className="rep-foot">Items in order: {SIP_QUESTIONS.join(" / ")}. 1 = never, 2 = sometimes, 3 = often.
                Items from the shortened Xerostomia Inventory (Thomson 2011).</p>
            </section>
          )}
          {phs.length > 0 && (
            <section><h2>Resting saliva pH</h2>
              <p>{phs.slice(0, 12).map((e) => `${fmtShort(e.ts)}: ${e.ph.toFixed(1)}`).join(" · ")}</p>
              <p className="rep-foot">{phs.filter((e) => e.ph < PH_ROOT_CRITICAL).length} of {phs.length} readings below {PH_ROOT_CRITICAL} (root dentine critical pH).</p>
            </section>
          )}
          {sorted.some((e) => e.weight != null || e.opening != null) && (
            <section><h2>Weight and mouth opening</h2>
              <table className="rep-table"><thead><tr><th>Date</th><th>Weight (kg)</th><th>Mouth opening (finger test)</th></tr></thead>
                <tbody>{sorted.filter((e) => e.weight != null || e.opening != null).slice(0, 12).map((e) => (
                  <tr key={e.id}><td>{fmtShort(e.ts)}</td><td>{e.weight ?? "—"}</td><td>{OPENING.find((o) => o.v === e.opening)?.label || "—"}</td></tr>))}</tbody></table>
            </section>
          )}
          {(profile.ownQuestions?.length > 0) && (
            <section><h2>Questions the patient wants to ask</h2>
              <ul>{profile.ownQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></section>
          )}
          <section><h2>Daily log (most recent 30)</h2>
            <table className="rep-table"><thead><tr><th>Date</th><th>Pain</th><th>Dry</th><th>Eating</th><th>Temp</th><th>Symptoms</th></tr></thead>
              <tbody>{daily.slice(0, 30).map((e) => (
                <tr key={e.id}><td>{fmtShort(e.ts)}</td><td>{e.pain ?? "—"}</td><td>{e.dryness ?? "—"}</td><td>{eatLabel(e.eating)}</td>
                  <td>{e.temp ?? "—"}</td><td>{[...(e.danger || []), ...(e.symptoms || [])].map(symLabel).join(", ") || "—"}</td></tr>))}</tbody></table>
          </section>
          <p className="rep-foot strong">Patient-reported data. Not a diagnosis. Escalation rules follow MASCC/ISOO guidance and Australian public health advice.</p>
        </div>
      </div>
    </div>
  );
}

// ═══ Backup ════════════════════════════════════════════════════════════════
export function Backup({ payload, onRestore, onClose }) {
  const [mode, setMode] = useState("save");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const run = async (fn) => { setMsg(null); try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } };
  return (
    <Sheet title="Backup" onClose={onClose}>
      <div className="seg full">
        <button className={mode === "save" ? "on" : ""} onClick={() => { setMode("save"); setMsg(null); }}>Save a backup</button>
        <button className={mode === "restore" ? "on" : ""} onClick={() => { setMode("restore"); setMsg(null); }}>Restore</button>
      </div>
      <p className="lede" style={{ marginTop: 16 }}>Your records live only on this device. A backup file means a new phone or computer doesn't mean starting again.</p>
      <label className="field"><span>Passphrase {mode === "save" ? "(recommended)" : "(if you set one)"}</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></label>
      <p className="note">The file is locked on this device with AES-256. Nobody — including us — can open it without the passphrase, so keep it somewhere safe.</p>
      {mode === "save" ? (
        <button className="btn primary big" onClick={() => run(async () => {
          downloadText(`mouthkind-backup-${dayKey(Date.now())}.json`, await makeBackup(payload, pass || null));
          setMsg({ ok: true, text: pass ? "Locked backup saved." : "Backup saved. It isn't locked, so store it somewhere private." });
        })}>Save backup file</button>
      ) : (
        <label className="btn ghost big file-btn">Choose a backup file
          <input type="file" accept=".json,application/json" hidden onChange={(ev) => ev.target.files[0] && run(async () => {
            const data = await readBackup(await ev.target.files[0].text(), pass || null);
            onRestore(data); setMsg({ ok: true, text: "Restored." });
          })} />
        </label>
      )}
      {msg && <p className={msg.ok ? "ok-msg" : "err-msg"} role="status">{msg.text}</p>}
    </Sheet>
  );
}

// ═══ You ═══════════════════════════════════════════════════════════════════
export function You({ profile, setProfile, prefs, setPrefs, open, onErase }) {
  const [confirm, setConfirm] = useState(false);
  const set = (patch) => setProfile({ ...profile, ...patch });
  const toggleT = (id) => set({ treatments: profile.treatments.includes(id) ? profile.treatments.filter((t) => t !== id) : [...profile.treatments, id] });
  const R = REGIONS[profile.region];
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Me</h1></header>

      <section className="card">
        <h2 className="card-h">Who to call</h2>
        {profile.team.phone24 && <a className="btn primary big" href={telHref(profile.team.phone24)}><Icon name="phone" /> {profile.team.name || "Treatment team"} (24 hours)</a>}
        {profile.dentist.phone && <a className="btn ghost big" href={telHref(profile.dentist.phone)}><Icon name="phone" /> {profile.dentist.name || "My dentist"}</a>}
        <a className="btn ghost big" href={telHref(R.cancerLine.number)}><Icon name="phone" /> {R.cancerLine.name} {R.cancerLine.number}</a>
        <p className="note">In an emergency call {R.emergency}.</p>
      </section>

      <section className="card">
        <h2 className="card-h">Share with your team</h2>
        <p className="muted">A one-page summary of your scores, symptoms and flags to print or save as a PDF.</p>
        <button className="btn primary big" onClick={() => open("report")}><Icon name="doc" /> Make a report</button>
      </section>

      {(profile.treatments.includes("rt_hn") || profile.treatments.includes("bone")) && (
        <section className="card alerty">
          <h2 className="card-h"><Icon name="alert" size={18} /> Dental alert card</h2>
          <p className="muted">After {profile.treatments.includes("rt_hn") ? "head and neck radiotherapy" : "bone-strengthening injections"}, having a tooth out
            without planning can damage the jawbone — for the rest of your life. Keep this card with you and show it to any dentist.</p>
          <button className="btn primary big" onClick={() => open("alertcard")}>Show my alert card</button>
        </section>
      )}

      <section className="card">
        <h2 className="card-h">Questions to ask</h2>
        <p className="muted">A ready list for your dentist and treatment team, plus your own.</p>
        <button className="btn ghost big" onClick={() => open("questions")}>Open my questions</button>
      </section>

      {(profile.treatments.includes("chemo") || profile.treatments.includes("transplant")) && (
        <section className="card">
          <h2 className="card-h">Chemotherapy dates</h2>
          <p className="muted">Add the days you have chemotherapy. The app will tell you when your mouth and infection risk are likely to be at their worst.</p>
          <DateList dates={profile.chemoDates || []} onChange={(d) => set({ chemoDates: d })} />
        </section>
      )}

      <section className="card">
        <h2 className="card-h">Your details</h2>
        <div className="set-row"><span>I'm helping someone else (carer mode)</span><Toggle on={!!profile.carer} onChange={(v) => set({ carer: v })} label="Carer mode" /></div>
        <div className="set-row"><span>I test my saliva with pH strips</span><Toggle on={!!profile.phStrips} onChange={(v) => set({ phStrips: v })} label="pH strips" /></div>
        <label className="field"><span>Name</span><input value={profile.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <div className="field"><span>Country</span>
          <div className="seg full">{Object.entries(REGIONS).map(([k, r]) => (
            <button key={k} className={profile.region === k ? "on" : ""} onClick={() => set({ region: k })}>{r.name}</button>))}</div></div>
        <div className="field"><span>Treatments</span>
          <div className="chips-grid">{TREATMENTS.map((t) => {
            const on = profile.treatments.includes(t.id);
            return <button key={t.id} className={`chip-b${on ? " on" : ""}`} onClick={() => toggleT(t.id)} aria-pressed={on}>{on && <Icon name="check" size={15} stroke={3} />}{t.label}</button>;
          })}</div></div>
        <div className="field"><span>Stage</span>
          <div className="seg full">{PHASES.map((p) => (
            <button key={p.id} className={profile.phase === p.id ? "on" : ""} onClick={() => set({ phase: p.id })}>{p.label}</button>))}</div></div>
        {profile.phase === "after" && <label className="field"><span>Finished on</span><input type="date" value={profile.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>}
        <label className="field"><span>Treatment team</span><input value={profile.team.name} onChange={(e) => set({ team: { ...profile.team, name: e.target.value } })} /></label>
        <label className="field"><span>24-hour number</span><input type="tel" value={profile.team.phone24} onChange={(e) => set({ team: { ...profile.team, phone24: e.target.value } })} /></label>
        <label className="field"><span>Dentist</span><input value={profile.dentist.name} onChange={(e) => set({ dentist: { ...profile.dentist, name: e.target.value } })} /></label>
        <label className="field"><span>Dentist's phone</span><input type="tel" value={profile.dentist.phone} onChange={(e) => set({ dentist: { ...profile.dentist, phone: e.target.value } })} /></label>
      </section>

      <section className="card">
        <h2 className="card-h">Settings</h2>
        <div className="set-row"><span>Ask about my temperature</span><Toggle on={prefs.askTemp} onChange={(v) => setPrefs({ ...prefs, askTemp: v })} label="Ask about temperature" /></div>
        <div className="set-row"><span>Text size</span>
          <div className="seg">{[["m", "A"], ["l", "A"], ["xl", "A"]].map(([v, t], i) => (
            <button key={v} className={prefs.text === v ? "on" : ""} style={{ fontSize: 13 + i * 3 }} onClick={() => setPrefs({ ...prefs, text: v })} aria-label={`Text size ${i + 1}`}>{t}</button>))}</div></div>
        <div className="set-row"><span>Appearance</span>
          <div className="seg">{[["light", "Light"], ["dark", "Dark"], ["auto", "Auto"]].map(([v, t]) => (
            <button key={v} className={prefs.theme === v ? "on" : ""} onClick={() => setPrefs({ ...prefs, theme: v })}>{t}</button>))}</div></div>
      </section>

      <section className="card">
        <h2 className="card-h"><Icon name="lock" size={18} /> Your data</h2>
        <p className="muted">Stored only on this device.</p>
        <button className="btn ghost big" onClick={() => open("backup")}>Back up or restore</button>
        {!confirm
          ? <button className="btn ghost big danger-text" onClick={() => setConfirm(true)}><Icon name="trash" /> Erase everything</button>
          : <div className="row-btns"><button className="btn danger" onClick={() => { onErase(); setConfirm(false); }}>Yes, erase it all</button>
              <button className="btn ghost" onClick={() => setConfirm(false)}>Keep it</button></div>}
      </section>
      <p className="disclaimer">Mouthkind {__APP_VERSION__} · Made by Dr Rakesh Jivan</p>
    </div>
  );
}

function DateList({ dates, onChange }) {
  const [d, setD] = useState("");
  const sorted = [...dates].sort().reverse();
  return (
    <>
      {sorted.length > 0 && (
        <div className="date-list">
          {sorted.map((x) => (
            <span key={x} className="date-chip">{fmtDate(Date.parse(x))}
              <button onClick={() => onChange(dates.filter((y) => y !== x))} aria-label={`Remove ${x}`}><Icon name="x" size={16} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="add-row">
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} aria-label="Chemotherapy date" />
        <button className="btn primary" disabled={!d || dates.includes(d)} onClick={() => { onChange([...dates, d]); setD(""); }}>Add</button>
      </div>
    </>
  );
}

// ═══ Dental alert card ═════════════════════════════════════════════════════
export function AlertCardSheet({ profile, onClose }) {
  const rt = profile.treatments.includes("rt_hn"), bone = profile.treatments.includes("bone");
  return (
    <div className="sheet-wrap report-wrap" role="dialog" aria-modal="true" aria-label="Dental alert card">
      <div className="sheet report-sheet">
        <div className="sheet-top no-print">
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          <span className="sheet-title">Dental alert card</span>
          <button className="link-btn" onClick={() => window.print()}>Print</button>
        </div>
        <div className="sheet-body report">
          <div className="alert-card">
            <h2><Icon name="alert" size={20} /> Dental alert</h2>
            <p><strong>{profile.name || "This patient"}</strong> has had:</p>
            <ul>
              {rt && <li>Radiotherapy to the head or neck</li>}
              {bone && <li>Bone-modifying medicine (bisphosphonate or denosumab)</li>}
            </ul>
            <p><strong>Before any extraction or surgery involving bone,</strong> please contact the treating oncology team. There is a risk of
              {rt ? " osteoradionecrosis" : ""}{rt && bone ? " and" : ""}{bone ? " medication-related osteonecrosis of the jaw" : ""}.</p>
            {profile.team.name && <div className="rr"><span>Oncology team</span><b>{profile.team.name}</b></div>}
            {profile.team.phone24 && <div className="rr"><span>Phone</span><b>{profile.team.phone24}</b></div>}
            {profile.dentist.name && <div className="rr"><span>Regular dentist</span><b>{profile.dentist.name}</b></div>}
            <p className="rep-foot">Guidance: ISOO/MASCC/ASCO osteoradionecrosis guideline 2024; MASCC/ISOO/ASCO MRONJ guideline 2019.</p>
          </div>
          <p className="note no-print">Tip: take a screenshot and set it as your lock screen, or print it and keep it in your wallet.</p>
        </div>
      </div>
    </div>
  );
}

// ═══ Questions ═════════════════════════════════════════════════════════════
export function QuestionsSheet({ profile, setProfile, onClose }) {
  const [own, setOwn] = useState("");
  const asked = profile.asked || [];
  const list = QUESTIONS.filter((q) => !q.for || q.for.some((t) => profile.treatments.includes(t)));
  const order = { [profile.phase]: 0 };
  const sorted = [...list].sort((a, b) => (order[a.when] ?? 1) - (order[b.when] ?? 1));
  const toggle = (id) => setProfile({ ...profile, asked: asked.includes(id) ? asked.filter((x) => x !== id) : [...asked, id] });
  return (
    <Sheet title="Questions to ask" onClose={onClose}>
      <p className="muted">Tick them off as you ask. Questions for where you are now come first.</p>
      <ul className="q-list">
        {sorted.map((q) => {
          const on = asked.includes(q.id);
          return (
            <li key={q.id}>
              <button className={`q-item${on ? " done" : ""}`} onClick={() => toggle(q.id)} aria-pressed={on}>
                <span className={`box${on ? " on" : ""}`}>{on && <Icon name="check" size={14} stroke={3} />}</span>
                <span><span className="q-who">{q.who === "dentist" ? "Dentist" : "Treatment team"} · {PHASES.find((p) => p.id === q.when)?.label.toLowerCase()}</span>{q.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="sub">My own questions</h3>
      {(profile.ownQuestions || []).map((q, i) => (
        <div key={i} className="date-chip" style={{ display: "flex", marginBottom: 8, borderRadius: 14 }}>
          <span style={{ flex: 1 }}>{q}</span>
          <button onClick={() => setProfile({ ...profile, ownQuestions: profile.ownQuestions.filter((_, j) => j !== i) })} aria-label="Remove"><Icon name="x" size={16} /></button>
        </div>
      ))}
      <div className="add-row">
        <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Type a question" aria-label="Your question" />
        <button className="btn primary" disabled={!own.trim()} onClick={() => { setProfile({ ...profile, ownQuestions: [...(profile.ownQuestions || []), own.trim()] }); setOwn(""); }}>Add</button>
      </div>
      <p className="note">Your own questions are included in the report you share with your team.</p>
    </Sheet>
  );
}
