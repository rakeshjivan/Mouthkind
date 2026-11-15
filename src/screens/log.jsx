import { useState } from "react";
import { Icon, PhInput, Sheet } from "../components/ui.jsx";
import { Chips, MouthMap, Pick, Scale10 } from "../components/kit.jsx";
import { DRY_SIGNS, EAT_OPTIONS, SORE_SIGNS, dryWord, reliefFor, soreWord } from "../data/tracker.js";
import { redFlags, stillAtFeverRisk } from "../lib/rules.js";
import { AlertCard, CallButtons } from "./home.jsx";

const FEVER = [
  { v: "no", label: "No" },
  { v: "yes", label: "Yes, 38 °C or more" },
  { v: "shivery", label: "I feel hot, cold or shivery" },
  { v: "unknown", label: "I haven't checked" },
];

/**
 * The daily log: soreness, where, what you've noticed, eating, dryness —
 * about 30 seconds. Opening it again on the same day edits that day's log.
 */
export function LogFlow({ profile, today, onClose, onSave }) {
  const feverRisk = stillAtFeverRisk(profile);
  const you = profile.carer ? (profile.name ? `${profile.name}'s` : "their") : "your";
  const [e, setE] = useState(() => ({
    fever: null, pain: null, sites: [], symptoms: [], eating: null, dryness: null, dryExtras: [], ph: null,
    ...(today ? { ...today, symptoms: today.symptoms || [], sites: today.sites || [], dryExtras: today.dryExtras || [] } : {}),
  }));
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(null);
  const set = (p) => setE((x) => ({ ...x, ...p }));

  const steps = [
    feverRisk && "fever",
    "sore",
    (e.pain ?? 0) > 0 && "where",
    "notice",
    "eat",
    "dry",
    (e.dryness ?? 0) > 0 && "dryExtras",
    profile.phStrips && "ph",
  ].filter(Boolean);
  const at = Math.min(i, steps.length - 1);
  const step = steps[at];
  const last = at === steps.length - 1;
  const urgent = e.fever === "yes" || e.fever === "shivery" || e.eating === "saliva";

  const finish = () => {
    const entry = {
      id: today?.id || `d_${Date.now()}`, ts: today?.ts || Date.now(), kind: "daily", updated: today ? Date.now() : undefined,
      fever: e.fever, temp: null, pain: e.pain ?? 0, sites: (e.pain ?? 0) > 0 ? e.sites : [], symptoms: e.symptoms,
      eating: e.eating, danger: e.eating === "saliva" ? ["cant_swallow_saliva"] : [],
      dryness: e.dryness ?? 0, dryExtras: (e.dryness ?? 0) > 0 ? e.dryExtras : [], ph: e.ph,
    };
    onSave(entry);
    setSaved(entry);
  };
  const next = () => (last || urgent ? finish() : setI(at + 1));
  const pickThenGo = (patch) => { set(patch); setTimeout(() => setI((n) => n + 1), 180); };

  if (saved) return <Logged entry={saved} profile={profile} onClose={onClose} />;

  const needs = { sore: e.pain != null, eat: e.eating != null, dry: e.dryness != null, fever: e.fever != null };
  let body;
  switch (step) {
    case "fever": body = (<>
      <h2 className="q">Do you have a temperature of 38 °C or more?</h2>
      <Pick options={FEVER} value={e.fever} onPick={(v) => (v === "no" || v === "unknown" ? pickThenGo({ fever: v }) : set({ fever: v }))} />
      {e.fever === "unknown" && <p className="soft-note">If you can, check it today. During chemotherapy a fever needs help straight away.</p>}
    </>); break;
    case "sore": body = (<>
      <h2 className="q">How sore is {you} mouth?</h2>
      <Scale10 value={e.pain} onChange={(v) => set({ pain: v })} word={soreWord} tone="sore" label="Soreness, 0 to 10" minLabel="No soreness" maxLabel="Worst imaginable" />
    </>); break;
    case "where": body = (<>
      <h2 className="q">Where is it sore?</h2>
      <p className="lede tight">Tap the places that hurt. This helps your team see how it's changing.</p>
      <MouthMap value={e.sites} onChange={(v) => set({ sites: v })} />
    </>); break;
    case "notice": body = (<>
      <h2 className="q">Have you noticed any of these?</h2>
      <p className="lede tight">Tap any that you've seen or felt today.</p>
      <Chips options={SORE_SIGNS} value={e.symptoms} onChange={(v) => set({ symptoms: v })} tone="sore" />
    </>); break;
    case "eat": body = (<>
      <h2 className="q">How is eating and drinking?</h2>
      <Pick options={EAT_OPTIONS} value={e.eating} onPick={(v) => (v === "saliva" ? set({ eating: v }) : pickThenGo({ eating: v }))} />
    </>); break;
    case "dry": body = (<>
      <h2 className="q">How dry is {you} mouth?</h2>
      <Scale10 value={e.dryness} onChange={(v) => set({ dryness: v })} word={dryWord} tone="dry" label="Dryness, 0 to 10" minLabel="Not dry" maxLabel="Extremely dry" />
    </>); break;
    case "dryExtras": body = (<>
      <h2 className="q">Is the dryness causing any of these?</h2>
      <Chips options={DRY_SIGNS} value={e.dryExtras} onChange={(v) => set({ dryExtras: v })} tone="dry" />
    </>); break;
    case "ph": body = (<>
      <h2 className="q">Did you test your saliva pH today?</h2>
      <p className="lede tight">Match your strip to the nearest colour. If you didn't test, just finish.</p>
      <PhInput value={e.ph} onPick={(v) => set({ ph: v })} />
    </>); break;
  }

  const multi = step === "where" || step === "notice" || step === "dryExtras";
  const empty = (step === "where" && !e.sites.length) || (step === "notice" && !e.symptoms.length) || (step === "dryExtras" && !e.dryExtras.length);
  return (
    <Sheet title={today ? "Update today" : "Today's log"} onClose={onClose} onBack={at ? () => setI(at - 1) : null}
      progress={{ of: steps.length, at, label: `${at + 1} of ${steps.length}` }}
      footer={urgent ? (
        <button className="btn danger big" onClick={finish}>Show me what to do now</button>
      ) : (
        <button className="btn primary big" disabled={needs[step] === false} onClick={next}>
          {multi && empty ? (last ? "None — finish" : "None of these") : last ? "Finish" : "Next"}
        </button>
      )}>
      {body}
    </Sheet>
  );
}

// ─── After logging ─────────────────────────────────────────────────────────
function Logged({ entry, profile, onClose }) {
  const alerts = redFlags(entry, profile);
  const level = alerts[0]?.level;
  const emergency = level === "emergency";
  const relief = reliefFor(entry).slice(0, 3);
  const head = level === "sameday" ? { tone: "amber", title: "Please call your team today", sub: "Here's why." }
    : level ? { tone: "blue", title: "Logged — one thing to keep an eye on", sub: "Nothing urgent." }
      : { tone: "green", title: "Logged", sub: "Nothing in today's answers needs a call." };
  return (
    <Sheet title={emergency ? "Get help now" : "Today's log"} onClose={onClose} tone={emergency ? "urgent" : ""}
      footer={<button className="btn primary big" onClick={onClose}>{emergency ? "I've called for help" : "Done"}</button>}>
      {emergency ? (<>
        {alerts.filter((a) => a.level === "emergency").map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}
        <CallButtons profile={profile} emergency />
      </>) : (<>
        <div className={`verdict ${head.tone}`}>
          <span className="verdict-mark"><Icon name={head.tone === "green" ? "check" : "info"} size={26} stroke={2.6} /></span>
          <div><h2>{head.title}</h2><p>{head.sub}</p></div>
        </div>
        <div className="logged-sum">
          <span className="pill sore"><b>{entry.pain}</b> {soreWord(entry.pain)}</span>
          <span className="pill dry"><b>{entry.dryness}</b> {dryWord(entry.dryness)}</span>
        </div>
        {alerts.map((a) => <AlertCard key={a.id} a={a} profile={profile} />)}
        {relief.length > 0 && (
          <section className="relief-mini">
            <h3>What may help today</h3>
            {relief.map((r) => <div key={r.id} className={`rm ${r.need}`}><strong>{r.title}</strong><span>{r.steps[0]}</span></div>)}
            <p className="soft-note">More in Relief.</p>
          </section>
        )}
      </>)}
    </Sheet>
  );
}
