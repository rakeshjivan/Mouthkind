import { useMemo, useState } from "react";
import { Icon, PhInput, Sheet } from "../components/ui.jsx";
import { CARER_SIGNS, DANGER_SIGNS, OPENING, SIP_OPTIONS, SIP_QUESTIONS, SYMPTOMS } from "../data/clinical.js";
import { stillAtFeverRisk } from "../lib/rules.js";

// ─── Plain-word answers ────────────────────────────────────────────────────
// Numbers are stored so the rules and charts keep working; people only see words.
export const PAIN = [
  { v: 0, label: "No pain" },
  { v: 2, label: "A little sore" },
  { v: 4, label: "Sore" },
  { v: 7, label: "Very sore", hint: "It's hard to eat or talk" },
  { v: 9, label: "The worst it's been", hint: "Pain relief isn't helping" },
];
export const DRY = [
  { v: 0, label: "Not dry" },
  { v: 2, label: "A bit dry" },
  { v: 5, label: "Quite dry" },
  { v: 8, label: "Very dry", hint: "Hard to talk or swallow without water" },
];
const EAT = [
  { v: "normal", label: "Eating as usual" },
  { v: "soft", label: "Only soft food" },
  { v: "liquids", label: "Only drinks or very soft food" },
  { v: "none", label: "Hardly eating or drinking" },
];
const FEVER = [
  { v: "no", label: "No" },
  { v: "yes", label: "Yes, 38 °C or more" },
  { v: "shivery", label: "I feel hot, cold or shivery" },
  { v: "unknown", label: "I haven't checked" },
];
export const painWord = (v) => (v == null ? null : [...PAIN].reverse().find((p) => v >= p.v)?.label);
export const dryWord = (v) => (v == null ? null : [...DRY].reverse().find((p) => v >= p.v)?.label);

function Choice({ options, value, onPick }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <button key={String(o.v)} type="button" className={`choice${value === o.v ? " on" : ""}`}
          onClick={() => onPick(o.v)} aria-pressed={value === o.v}>
          <span className="choice-txt"><strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}</span>
          <span className="choice-mark">{value === o.v && <Icon name="check" size={20} stroke={3} />}</span>
        </button>
      ))}
    </div>
  );
}

function Many({ options, value, onChange, noneLabel }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="choices">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" className={`choice multi${on ? " on" : ""}`} onClick={() => toggle(o.id)} aria-pressed={on}>
            <span className="box">{on && <Icon name="check" size={16} stroke={3} />}</span>
            <span className="choice-txt"><strong>{o.label}</strong></span>
          </button>
        );
      })}
      {noneLabel && value.length === 0 && <p className="hint-line">{noneLabel}</p>}
    </div>
  );
}

/**
 * One check-in, one question per screen. Weekly and fortnightly questions
 * join in automatically when they're due. Everything optional can be skipped.
 */
export function CheckFlow({ profile, due, lastWeight, onClose, onSave }) {
  const feverRisk = stillAtFeverRisk(profile) || (profile.treatments || []).length > 0;
  const steps = useMemo(() => {
    const s = [];
    if (feverRisk) s.push("fever");
    s.push("danger", "pain", "dry", "eat", "mouth");
    if (profile.carer) s.push("carer");
    if (due.weekly) s.push("weekIntro", "weight", "opening");
    if (due.sip) s.push("sipIntro", "sip0", "sip1", "sip2", "sip3", "sip4");
    if (profile.phStrips) s.push("ph");
    return s;
  }, [feverRisk, profile.carer, profile.phStrips, due.weekly, due.sip]);

  const [i, setI] = useState(0);
  const [e, setE] = useState({ fever: null, temp: null, danger: [], pain: null, dryness: null, eating: null,
    symptoms: [], carerSigns: [], weight: "", opening: null, items: [null, null, null, null, null], ph: null });
  const [skipWeek, setSkipWeek] = useState(false);
  const [skipSip, setSkipSip] = useState(false);
  const set = (patch) => setE((x) => ({ ...x, ...patch }));

  const visible = steps.filter((k) =>
    !(skipWeek && (k === "weight" || k === "opening")) && !(skipSip && /^sip\d$/.test(k)));
  const step = visible[i];
  const last = i === visible.length - 1;
  const next = () => (last ? finish() : setI(i + 1));
  const auto = (patch) => { set(patch); setTimeout(() => setI((n) => Math.min(n + 1, visible.length - 1)), 220); };

  // Danger answers end the check-in at once — nothing else matters then.
  const urgentNow = e.danger.length > 0 || e.fever === "yes" || e.fever === "shivery";

  function finish(cutShort = false) {
    const sipDone = e.items.every(Boolean);
    const w = parseFloat(e.weight);
    onSave({
      id: `d_${Date.now()}`, ts: Date.now(), kind: "daily",
      fever: e.fever, temp: e.temp, danger: e.danger,
      pain: e.pain, dryness: e.dryness, eating: e.eating,
      symptoms: [...e.symptoms, ...e.carerSigns],
      weight: Number.isFinite(w) ? w : null, opening: e.opening,
      sip: sipDone ? e.items.reduce((a, b) => a + b, 0) : null, items: sipDone ? e.items : null,
      ph: e.ph, partial: cutShort || undefined,
    });
  }

  const needs = { pain: e.pain != null, dry: e.dryness != null, eat: e.eating != null };
  const canNext = needs[step] ?? true;
  const sipIdx = /^sip(\d)$/.exec(step || "")?.[1];

  let body;
  switch (step) {
    case "fever":
      body = (<>
        <h2 className="q">Do you have a temperature of 38 °C or more?</h2>
        <Choice options={FEVER} value={e.fever} onPick={(v) => (v === "yes" || v === "shivery" || (v === "unknown" && stillAtFeverRisk(profile))) ? set({ fever: v }) : auto({ fever: v })} />
        {e.fever === "unknown" && stillAtFeverRisk(profile) && (
          <p className="soft-note">If you can, check it today. During chemotherapy a fever needs help straight away.</p>
        )}
      </>);
      break;
    case "danger":
      body = (<>
        <h2 className="q">Right now, is any of this happening?</h2>
        <Many options={DANGER_SIGNS} value={e.danger} onChange={(v) => set({ danger: v })} />
        {e.danger.length === 0 && <button className="btn ghost big" onClick={next}>No, none of these</button>}
      </>);
      break;
    case "pain":
      body = (<><h2 className="q">How sore is your mouth today?</h2><Choice options={PAIN} value={e.pain} onPick={(v) => auto({ pain: v })} /></>);
      break;
    case "dry":
      body = (<><h2 className="q">How dry is your mouth?</h2><Choice options={DRY} value={e.dryness} onPick={(v) => auto({ dryness: v })} /></>);
      break;
    case "eat":
      body = (<><h2 className="q">What could you eat today?</h2><Choice options={EAT} value={e.eating} onPick={(v) => auto({ eating: v })} /></>);
      break;
    case "mouth":
      body = (<>
        <h2 className="q">Have you noticed anything new?</h2>
        <p className="lede tight">Tap any that apply.</p>
        <Many options={SYMPTOMS} value={e.symptoms} onChange={(v) => set({ symptoms: v })} />
      </>);
      break;
    case "carer":
      body = (<>
        <h2 className="q">Have you seen any of these?</h2>
        <Many options={CARER_SIGNS} value={e.carerSigns} onChange={(v) => set({ carerSigns: v })} />
      </>);
      break;
    case "weekIntro":
      body = (<div className="intro">
        <div className="intro-mark"><Icon name="chart" size={26} /></div>
        <h2 className="q">Two quick extras this week</h2>
        <p className="lede">Your weight and how wide your mouth opens. They help spot problems early.</p>
      </div>);
      break;
    case "weight":
      body = (<>
        <h2 className="q">What do you weigh today?</h2>
        <label className="temp-val wide"><input inputMode="decimal" value={e.weight} onChange={(ev) => set({ weight: ev.target.value })} aria-label="Weight in kilograms" placeholder="—" /><span>kg</span></label>
        <p className="soft-note">If you can't weigh yourself today, just tap Skip.</p>
      </>);
      break;
    case "opening":
      body = (<>
        <h2 className="q">How many fingers fit between your front teeth?</h2>
        <p className="lede tight">Stack your first three fingers on top of each other, sideways.</p>
        <Choice options={OPENING.map((o) => ({ v: o.v, label: o.label }))} value={e.opening} onPick={(v) => auto({ opening: v })} />
      </>);
      break;
    case "sipIntro":
      body = (<div className="intro">
        <div className="intro-mark"><Icon name="drop" size={26} /></div>
        <h2 className="q">Five questions about dryness</h2>
        <p className="lede">Every two weeks. They ask about the last two weeks, not just today.</p>
      </div>);
      break;
    case "ph":
      body = (<>
        <h2 className="q">Did you use a saliva pH strip today?</h2>
        <p className="lede tight">If you didn't test today, just tap Skip.</p>
        <PhInput value={e.ph} onPick={(v) => set({ ph: v })} />
      </>);
      break;
    default:
      if (sipIdx != null) {
        const k = Number(sipIdx);
        body = (<>
          <p className="eyebrow">Over the last two weeks · {k + 1} of 5</p>
          <h2 className="q">{SIP_QUESTIONS[k]}</h2>
          <Choice options={SIP_OPTIONS.map((o) => ({ v: o.v, label: o.label }))} value={e.items[k]}
            onPick={(v) => { const items = [...e.items]; items[k] = v; auto({ items }); }} />
        </>);
      }
  }

  // Tick-box steps: one button that reads "Nothing new" until something is ticked.
  const multi = step === "mouth" || step === "carer";
  const picked = step === "mouth" ? e.symptoms.length > 0 : e.carerSigns.length > 0;
  const skippable = ["weight", "opening", "ph"].includes(step) || /^sip\d$/.test(step || "");
  const introStep = step === "weekIntro" || step === "sipIntro";

  return (
    <Sheet title="Today's check" onClose={onClose} onBack={i ? () => setI(i - 1) : null}
      progress={{ of: visible.length, at: i, label: `${i + 1} of ${visible.length}` }}
      footer={urgentNow && (step === "fever" || step === "danger") ? (
        <button className="btn danger big" onClick={() => finish(true)}>Show me what to do now</button>
      ) : introStep ? (
        <>
          <button className="btn ghost" onClick={() => { step === "weekIntro" ? setSkipWeek(true) : setSkipSip(true); setI(i + 1); }}>Not today</button>
          <button className="btn primary" onClick={() => setI(i + 1)}>OK</button>
        </>
      ) : (
        <>
          {skippable && !multi && <button className="btn ghost" onClick={next}>Skip</button>}
          <button className="btn primary" disabled={!canNext} onClick={next}>
            {multi && !picked ? (last ? "Nothing new — finish" : "Nothing new") : last ? "Finish" : "Next"}
          </button>
        </>
      )}>
      {body}
    </Sheet>
  );
}
