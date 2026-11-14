import { useState } from "react";
import { Icon, PhInput, Scale, Sheet } from "../components/ui.jsx";
import {
  CARER_SIGNS, DANGER_SIGNS, EATING, OPENING, PHASES, REGIONS, SIP_OPTIONS, SIP_QUESTIONS, SYMPTOMS, TREATMENTS, sipBand,
} from "../data/clinical.js";

// ═══ Onboarding ════════════════════════════════════════════════════════════
export function Onboarding({ profile, onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState(profile);
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const toggleT = (id) => set({ treatments: p.treatments.includes(id) ? p.treatments.filter((t) => t !== id) : [...p.treatments, id] });
  const last = 2;

  return (
    <div className="onboard">
      <div className="onboard-inner">
        {step === 0 && (
          <>
            <div className="brand-row">
              <div className="onboard-mark" aria-hidden="true"><Icon name="heart" size={30} /></div>
              <span className="brand">Mouthkind</span>
            </div>
            <h1 className="display">Looking after your mouth during cancer treatment</h1>
            <p className="lede">Cancer treatment can make your mouth sore, dry or prone to infection. This app helps you notice changes early,
              shows you what helps, and tells you when to call your team.</p>
            <div className="field"><span>Who's using this app?</span>
              <div className="seg full">
                <button type="button" className={!p.carer ? "on" : ""} onClick={() => set({ carer: false })}>I'm the patient</button>
                <button type="button" className={p.carer ? "on" : ""} onClick={() => set({ carer: true })}>I'm helping someone</button>
              </div>
            </div>
            <label className="field"><span>{p.carer ? "Their first name" : "What should we call you?"}</span>
              <input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your first name" autoComplete="given-name" /></label>
            <div className="field"><span>Where do you live?</span>
              <div className="seg full">
                {Object.entries(REGIONS).map(([k, r]) => (
                  <button key={k} type="button" className={p.region === k ? "on" : ""} onClick={() => set({ region: k })}>{r.name}</button>
                ))}
              </div>
            </div>
            <p className="note">Everything you enter stays on this device. Nothing is sent anywhere unless you choose to share it.</p>
            <p className="maker">Made by Dr Rakesh Jivan, dentist</p>
          </>
        )}

        {step === 1 && (
          <>
            <p className="eyebrow">Your treatment</p>
            <h2 className="display sm">Which treatments are you having or have you had?</h2>
            <p className="lede">Choose all that apply. Each one affects the mouth differently, so this shapes the advice you see.</p>
            <div className="opts">
              {TREATMENTS.map((t) => {
                const on = p.treatments.includes(t.id);
                return (
                  <button key={t.id} type="button" className={`opt${on ? " on" : ""}`} onClick={() => toggleT(t.id)} aria-pressed={on}>
                    <span className="box">{on && <Icon name="check" size={14} stroke={3} />}</span>
                    <span><strong>{t.label}</strong><em>{t.hint}</em></span>
                  </button>
                );
              })}
            </div>
            <div className="field" style={{ marginTop: 22 }}><span>Where are you up to?</span>
              <div className="seg full">
                {PHASES.map((ph) => (
                  <button key={ph.id} type="button" className={p.phase === ph.id ? "on" : ""} onClick={() => set({ phase: ph.id })}>{ph.label}</button>
                ))}
              </div>
            </div>
            {p.phase === "after" && (
              <label className="field"><span>When did treatment finish?</span>
                <input type="date" value={p.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="eyebrow">Your care team</p>
            <h2 className="display sm">Who should you call?</h2>
            <p className="lede">Most cancer services give you a number to ring any time, day or night. Add it here so it's one tap away when you need it.</p>
            <label className="field"><span>Treatment team or hospital</span>
              <input value={p.team.name} onChange={(e) => set({ team: { ...p.team, name: e.target.value } })} placeholder="e.g. Sunshine Coast Cancer Care" /></label>
            <label className="field"><span>Their 24-hour phone number</span>
              <input type="tel" inputMode="tel" value={p.team.phone24} onChange={(e) => set({ team: { ...p.team, phone24: e.target.value } })} placeholder="Found on your treatment card or letter" /></label>
            <label className="field"><span>Your dentist</span>
              <input value={p.dentist.name} onChange={(e) => set({ dentist: { ...p.dentist, name: e.target.value } })} placeholder="Practice name" /></label>
            <label className="field"><span>Dentist's phone</span>
              <input type="tel" inputMode="tel" value={p.dentist.phone} onChange={(e) => set({ dentist: { ...p.dentist, phone: e.target.value } })} /></label>
            <p className="note">You can skip this and add it later under You.</p>
          </>
        )}
      </div>

      <div className="onboard-foot">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn primary" disabled={step === 1 && p.treatments.length === 0}
          onClick={() => (step < last ? setStep(step + 1) : onDone({ ...p, onboarded: true }))}>
          {step < last ? "Continue" : "Start"}
        </button>
      </div>
    </div>
  );
}

// ═══ Daily check-in ════════════════════════════════════════════════════════
export function CheckIn({ profile, prefs, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [tempOn, setTempOn] = useState(false);
  const [e, setE] = useState({ temp: null, danger: [], pain: null, dryness: null, eating: null, symptoms: [], ph: null, openingSudden: false });
  const set = (patch) => setE((x) => ({ ...x, ...patch }));
  const toggle = (k, id) => set({ [k]: e[k].includes(id) ? e[k].filter((x) => x !== id) : [...e[k], id] });
  const steps = 4;
  const canNext = [true, e.pain != null && e.dryness != null, e.eating != null, true][step];

  const finish = () => onSave({ ...e, temp: tempOn ? e.temp : null, id: `d_${Date.now()}`, ts: Date.now(), kind: "daily" });

  return (
    <Sheet title="Today's check-in" onClose={onClose} onBack={step ? () => setStep(step - 1) : null}
      progress={{ of: steps, at: step, label: `${step + 1} of ${steps}` }}
      footer={step < steps - 1
        ? <button className="btn primary big" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
        : <button className="btn primary big" onClick={finish}>Save today</button>}>

      {step === 0 && (
        <>
          <p className="eyebrow">First, a safety check</p>
          {prefs.askTemp && <h2 className="q">Have you checked your temperature today?</h2>}
          {prefs.askTemp && (
            !tempOn ? (
              <div className="row-btns">
                <button className="btn ghost" onClick={() => { setTempOn(true); set({ temp: e.temp ?? 36.8 }); }}><Icon name="thermo" /> Yes, add it</button>
                <button className="btn ghost quiet" onClick={() => setStep(1)}>Not today</button>
              </div>
            ) : (
              <div className="temp">
                <button type="button" onClick={() => set({ temp: Math.round((e.temp - 0.1) * 10) / 10 })} aria-label="Lower"><Icon name="minus" /></button>
                <label className="temp-val">
                  <input inputMode="decimal" value={e.temp ?? ""} aria-label="Temperature in degrees Celsius"
                    onChange={(ev) => { const v = parseFloat(ev.target.value); set({ temp: Number.isFinite(v) ? v : null }); }} />
                  <span>°C</span>
                </label>
                <button type="button" onClick={() => set({ temp: Math.round((e.temp + 0.1) * 10) / 10 })} aria-label="Higher"><Icon name="plus" /></button>
              </div>
            )
          )}
          {tempOn && e.temp >= 38 && (
            <p className="warn strong" role="alert"><Icon name="alert" size={18} /> 38 °C or more during treatment can be an emergency. Finish the check-in quickly — the next screen will tell you who to call.</p>
          )}
          <h3 className="sub">Is any of this happening right now?</h3>
          <div className="opts">
            {DANGER_SIGNS.map((d) => {
              const on = e.danger.includes(d.id);
              return (
                <button key={d.id} type="button" className={`opt danger${on ? " on" : ""}`} onClick={() => toggle("danger", d.id)} aria-pressed={on}>
                  <span className="box">{on && <Icon name="check" size={14} stroke={3} />}</span><span><strong>{d.label}</strong></span>
                </button>
              );
            })}
          </div>
          <p className="note">If any of these is happening, you can skip the rest — tap Next until Save.</p>
        </>
      )}

      {step === 1 && (
        <>
          <p className="eyebrow">How your mouth feels</p>
          <h2 className="q">How sore is your mouth right now?</h2>
          <Scale value={e.pain} onPick={(v) => set({ pain: v })} low="No pain" high="Worst pain" label="Mouth pain" />
          <h2 className="q" style={{ marginTop: 28 }}>How dry is your mouth?</h2>
          <Scale value={e.dryness} onPick={(v) => set({ dryness: v })} low="Not dry" high="As dry as it gets" label="Dryness" />
        </>
      )}

      {step === 2 && (
        <>
          <p className="eyebrow">Eating and drinking</p>
          <h2 className="q">What could you manage today?</h2>
          <div className="opts">
            {EATING.map((o) => (
              <button key={o.id} type="button" className={`opt single${e.eating === o.id ? " on" : ""}`} onClick={() => set({ eating: o.id })} aria-pressed={e.eating === o.id}>
                <span><strong>{o.label}</strong></span>{e.eating === o.id && <Icon name="check" className="tick" />}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="eyebrow">Anything new?</p>
          <h2 className="q">Tick anything you've noticed.</h2>
          {profile.carer && (
            <>
              <h3 className="sub" style={{ marginTop: 0 }}>Things you may have seen</h3>
              <div className="chips-grid" style={{ marginBottom: 20 }}>
                {CARER_SIGNS.map((s) => {
                  const on = e.symptoms.includes(s.id);
                  return (
                    <button key={s.id} type="button" className={`chip-b${on ? " on" : ""}`} onClick={() => toggle("symptoms", s.id)} aria-pressed={on}>
                      {on && <Icon name="check" size={15} stroke={3} />}{s.label}
                    </button>
                  );
                })}
              </div>
              <h3 className="sub" style={{ marginTop: 0 }}>Things they've told you</h3>
            </>
          )}
          <div className="chips-grid">
            {SYMPTOMS.map((s) => {
              const on = e.symptoms.includes(s.id);
              return (
                <button key={s.id} type="button" className={`chip-b${on ? " on" : ""}`} onClick={() => toggle("symptoms", s.id)} aria-pressed={on}>
                  {on && <Icon name="check" size={15} stroke={3} />}{s.label}
                </button>
              );
            })}
          </div>
          {e.symptoms.includes("opening") && (
            <label className="check-line">
              <input type="checkbox" checked={e.openingSudden} onChange={(ev) => set({ openingSudden: ev.target.checked })} />
              It came on suddenly (in the last day or two)
            </label>
          )}
          <details className="more">
            <summary>Add a saliva pH reading (optional)</summary>
            <PhInput value={e.ph} onPick={(v) => set({ ph: v })} />
          </details>
        </>
      )}
    </Sheet>
  );
}

// ═══ SIP score ═════════════════════════════════════════════════════════════
export function SipCheck({ onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState([null, null, null, null, null]);
  const total = ans.every(Boolean) ? ans.reduce((a, b) => a + b, 0) : null;
  const pick = (v) => {
    const next = [...ans]; next[step] = v; setAns(next);
    setTimeout(() => setStep((s) => Math.min(5, s + 1)), 180);
  };
  return (
    <Sheet title="Dry mouth score" onClose={onClose} onBack={step ? () => setStep(step - 1) : null}
      progress={{ of: 6, at: step, label: step < 5 ? `${step + 1} of 5` : "Done" }}
      footer={step === 5
        ? <button className="btn primary big" onClick={() => onSave({ id: `s_${Date.now()}`, ts: Date.now(), kind: "sip", sip: total, items: ans })}>Save score</button>
        : <p className="foot-note">{ans.filter(Boolean).length} of 5 answered</p>}>
      {step < 5 ? (
        <>
          <p className="eyebrow">Over the last two weeks</p>
          <h2 className="q">{SIP_QUESTIONS[step]}</h2>
          <div className="opts">
            {SIP_OPTIONS.map((o) => (
              <button key={o.v} type="button" className={`opt single${ans[step] === o.v ? " on" : ""}`} onClick={() => pick(o.v)} aria-pressed={ans[step] === o.v}>
                <span><strong>{o.label}</strong><em>{o.hint}</em></span>{ans[step] === o.v && <Icon name="check" className="tick" />}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="done-score">
          <p className="eyebrow">Your score</p>
          <div className="big-num" style={{ color: sipBand(total).color }}>{total}<span>/15</span></div>
          <p className="lede">{sipBand(total).full}</p>
          <p className="note">This is a screening score based on the validated shortened Xerostomia Inventory, not a diagnosis.
            What matters most is how it changes over time.</p>
        </div>
      )}
    </Sheet>
  );
}

// ═══ Weekly measures ═══════════════════════════════════════════════════════
export function WeeklyCheck({ lastWeight, onClose, onSave }) {
  const [weight, setWeight] = useState(lastWeight ?? "");
  const [opening, setOpening] = useState(null);
  const w = parseFloat(weight);
  return (
    <Sheet title="Weekly check" onClose={onClose}
      footer={<button className="btn primary big" disabled={opening == null && !Number.isFinite(w)}
        onClick={() => onSave({ id: `w_${Date.now()}`, ts: Date.now(), kind: "weekly", weight: Number.isFinite(w) ? w : null, opening })}>Save</button>}>
      <p className="eyebrow">Once a week</p>
      <h2 className="q">Weight</h2>
      <p className="muted">Weigh at the same time of day, ideally in the morning. Losing weight is often the first sign that eating has become too hard.</p>
      <label className="temp-val wide">
        <input inputMode="decimal" value={weight} onChange={(ev) => setWeight(ev.target.value)} aria-label="Weight in kilograms" placeholder="—" />
        <span>kg</span>
      </label>
      <h2 className="q" style={{ marginTop: 28 }}>Mouth opening</h2>
      <p className="muted">Stack your index, middle and ring fingers on top of each other, knuckles sideways, and see how many fit between your top and bottom front teeth.</p>
      <div className="opts">
        {OPENING.map((o) => (
          <button key={o.v} type="button" className={`opt single${opening === o.v ? " on" : ""}`} onClick={() => setOpening(o.v)} aria-pressed={opening === o.v}>
            <span><strong>{o.label}</strong><em>{o.hint}</em></span>{opening === o.v && <Icon name="check" className="tick" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
