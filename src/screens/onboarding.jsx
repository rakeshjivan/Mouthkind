import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { Pick, TickRows } from "../components/kit.jsx";
import { STAGES, TREATMENTS } from "../data/journey.js";

export const SITUATIONS = [
  { v: "cancer", label: "Cancer treatment", hint: "Before, during or after radiotherapy, chemotherapy or other treatment" },
  { v: "sjogren", label: "Sjögren's or another condition that dries the mouth" },
  { v: "meds", label: "Medicines that dry my mouth" },
  { v: "checking", label: "Just checking how my mouth is going" },
];

/** First run: who it's for, what brings them here, and (for cancer care) their treatment. Everything can be changed later in Me. */
export function Welcome({ profile, onDone }) {
  const [p, setP] = useState({ ...profile });
  const [step, setStep] = useState(0);
  const set = (x) => setP({ ...p, ...x });
  const cancer = (p.situation || []).includes("cancer");
  const steps = ["who", "why", ...(cancer ? ["tx", "dates", "team"] : [])];
  const at = steps[step];
  const last = step === steps.length - 1;
  const finish = () => onDone({ ...p, onboarded: true });
  const next = () => (last ? finish() : setStep(step + 1));
  const rt = (p.treatments || []).includes("rt_hn");
  const chemo = (p.treatments || []).some((t) => t === "chemo" || t === "transplant");

  const canNext = at === "who" ? p.carer != null : at === "why" ? (p.situation || []).length > 0 : true;
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Welcome to Mouthkind">
      <div className="welcome-in">
        <div className="welcome-top">
          {step > 0 ? <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Back"><Icon name="back" /></button> : <span />}
          <div className="pips" aria-hidden="true">{steps.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}</div>
          <button className="link-btn" onClick={finish}>Skip</button>
        </div>

        {at === "who" && (<>
          <p className="brand">Mouthkind</p>
          <h1 className="display">Looking after a dry or sore mouth, together.</h1>
          <p className="lede">A few taps so the app shows what matters to you. Everything stays on this phone.</p>
          <h2 className="q">Who are you using Mouthkind for?</h2>
          <Pick options={[{ v: false, label: "Myself" }, { v: true, label: "Someone I care for" }]} value={p.carer} onPick={(v) => set({ carer: v })} />
          {p.carer && (
            <label className="field"><span>Their first name</span>
              <input value={p.carerFor || ""} onChange={(e) => set({ carerFor: e.target.value })} autoComplete="off" placeholder="e.g. Dad" /></label>
          )}
        </>)}

        {at === "why" && (<>
          <h2 className="q">What brings you here?</h2>
          <p className="lede tight">Tick all that apply.</p>
          <TickRows options={SITUATIONS} value={p.situation || []} onChange={(v) => set({ situation: v })} />
        </>)}

        {at === "tx" && (<>
          <h2 className="q">Which treatments{p.carer ? ` is ${p.carerFor || "the person you care for"} having` : ""}?</h2>
          <p className="lede tight">Tick all that apply. This tailors what to expect and when.</p>
          <TickRows options={TREATMENTS} value={p.treatments || []} onChange={(v) => set({ treatments: v })} />
        </>)}

        {at === "dates" && (<>
          <h2 className="q">Where are you up to?</h2>
          <Pick options={STAGES} value={p.stage} onPick={(v) => set({ stage: v })} />
          {rt && (
            <div className="field-row">
              <label className="field"><span>Radiotherapy start date</span>
                <input type="date" value={p.rtStart || ""} onChange={(e) => set({ rtStart: e.target.value })} /></label>
              <label className="field"><span>Number of weeks</span>
                <select value={p.rtWeeks || 7} onChange={(e) => set({ rtWeeks: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7].map((w) => <option key={w} value={w}>{w}</option>)}
                </select></label>
            </div>
          )}
          {chemo && (
            <label className="field"><span>Date of the most recent chemotherapy</span>
              <input type="date" value={(p.chemoDates || []).at(-1) || ""} onChange={(e) => set({ chemoDates: e.target.value ? [...(p.chemoDates || []).slice(0, -1), e.target.value] : [] })} /></label>
          )}
          <p className="soft-note">Dates are optional, but they let the app tell you which days to watch.</p>
        </>)}

        {at === "team" && (<>
          <h2 className="q">Your treatment team's number</h2>
          <p className="lede tight">For the times you need to call quickly. Use the 24-hour number your team gave you.</p>
          <label className="field"><span>Team or hospital</span>
            <input value={p.team?.name || ""} onChange={(e) => set({ team: { ...p.team, name: e.target.value } })} placeholder="e.g. Sunshine Coast Cancer Care" /></label>
          <label className="field"><span>24-hour phone number</span>
            <input type="tel" inputMode="tel" value={p.team?.phone24 || ""} onChange={(e) => set({ team: { ...p.team, phone24: e.target.value } })} /></label>
          <label className="field"><span>Your dentist's phone (optional)</span>
            <input type="tel" inputMode="tel" value={p.dentist?.phone || ""} onChange={(e) => set({ dentist: { ...p.dentist, phone: e.target.value } })} /></label>
        </>)}

        <div className="welcome-foot">
          <button className="btn primary big" disabled={!canNext} onClick={next}>{last ? "Start" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
