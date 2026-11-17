import { useState } from "react";
import { Gauge, Icon, PhInput, Sheet, Sources } from "../components/ui.jsx";
import { Pick } from "../components/kit.jsx";
import { PH_ROOT_CRITICAL, SIP_OPTIONS, SIP_QUESTIONS, phBand, sipBand } from "../data/clinical.js";
import { FREQUENCIES, freqFor, reminderIcs } from "../data/schedule.js";
import { downloadText } from "../lib/store.js";

// ─── How often ─────────────────────────────────────────────────────────────
export function FrequencyPicker({ value, onPick, onClose, first }) {
  const [v, setV] = useState(value ?? 14);
  return (
    <Sheet title="How often to check" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => onPick(v)}>{first ? "Start the check" : "Save"}</button>}>
      <h2 className="q">How often would you like to check your dry mouth?</h2>
      <p className="lede tight">Five quick questions each time. You can change this whenever you like.</p>
      <Pick options={FREQUENCIES.map((f) => ({ v: f.days, label: f.label, hint: f.recommended ? "Recommended — most people's dryness changes slowly" : f.days === 1 ? "Useful when things are changing quickly, like during treatment" : "Useful when you're trying a new product or medicine" }))}
        value={v} onPick={setV} />
    </Sheet>
  );
}

export function Reminder({ every, onClose }) {
  const f = freqFor(every);
  const [done, setDone] = useState(false);
  return (
    <Sheet title="Reminder" onClose={onClose}
      footer={done ? <button className="btn primary big" onClick={onClose}>Done</button>
        : <button className="btn primary big" onClick={() => { downloadText("mouthkind-reminder.ics", reminderIcs(every), "text/calendar"); setDone(true); }}><Icon name="bell" /> Add to my calendar</button>}>
      <div className="intro">
        <div className="intro-mark dry"><Icon name="bell" size={28} /></div>
        <h2 className="q">{done ? "Open the file to add it" : `A reminder ${f.short === "daily" ? "every morning" : f.label.toLowerCase()}`}</h2>
        <p className="lede">{done
          ? "Your phone or computer will offer to add it to your calendar. It repeats at 9 am, " + f.label.toLowerCase() + "."
          : "This adds a repeating 9 am reminder to the calendar on your phone or computer. When Mouthkind is on the App Store, it will remind you itself."}</p>
      </div>
    </Sheet>
  );
}

// ─── GC SIP-SCORE: five questions ──────────────────────────────────────────
export function SipFlow({ every, previous: prevAtOpen, onClose, onSave }) {
  const f = freqFor(every);
  // Keep the score from before this one; the prop updates once we save.
  const [previous] = useState(prevAtOpen);
  const [items, setItems] = useState([null, null, null, null, null]);
  const [k, setK] = useState(-1);
  const [done, setDone] = useState(null);

  if (done) {
    const b = sipBand(done.sip);
    const diff = previous ? done.sip - previous.sip : null;
    return (
      <Sheet title="Dry mouth score" onClose={onClose} footer={<button className="btn primary big" onClick={onClose}>Done</button>}>
        <div className="sip-result">
          <Gauge score={done.sip} />
          <p className="sip-num">{done.sip}<span> of 15</span></p>
          <p className="sip-band" style={{ color: b.color }}>{b.full}</p>
          {diff != null && <p className="soft-note center">{diff === 0 ? "The same as last time." : diff > 0 ? `${diff} higher than last time — drier.` : `${-diff} lower than last time — less dry.`}</p>}
        </div>
        <p className="lede">{done.sip >= 11
          ? "That's a lot of dryness to live with. Show your scores to your dentist or doctor — there's more they can do, including checking your medicines and prescribing saliva stimulants."
          : done.sip >= 8 ? "Dryness is affecting you. Sip water often, use a saliva gel such as GC Dry Mouth Gel before meals and bed, and protect your teeth with fluoride."
            : "Your mouth isn't very dry right now. Keep protecting your teeth with fluoride."}</p>
        <Sources refs={["thomson2011", "mercadante2021"]} />
      </Sheet>
    );
  }

  const intro = k < 0;
  const finish = (all) => {
    const sip = all.reduce((a, b) => a + b, 0);
    const e = { id: `s_${Date.now()}`, ts: Date.now(), kind: "sip", sip, items: all, recall: f.days };
    onSave(e); setDone(e);
  };
  return (
    <Sheet title="Dry mouth score" onClose={onClose} onBack={k >= 0 ? () => setK(k - 1) : null}
      progress={intro ? null : { of: 5, at: k, label: `${k + 1} of 5` }}
      footer={intro ? <button className="btn primary big" onClick={() => setK(0)}>Start</button> : null}>
      {intro ? (
        <div className="intro">
          <div className="intro-mark dry"><Icon name="drop" size={28} /></div>
          <h2 className="q">Five quick questions</h2>
          <p className="lede">This is the GC SIP-SCORE. Think about {f.days === 1 ? "today" : f.days === 7 ? "the last week" : "the last two weeks"}. Scores run from 5 (no dryness) to 15.</p>
        </div>
      ) : (<>
        <p className="eyebrow-q">{f.recall}</p>
        <h2 className="q">{SIP_QUESTIONS[k]}</h2>
        <Pick options={SIP_OPTIONS.map((o) => ({ v: o.v, label: o.label, hint: o.hint }))} value={items[k]}
          onPick={(v) => {
            const all = items.map((x, j) => (j === k ? v : x)); setItems(all);
            setTimeout(() => (k === 4 ? finish(all) : setK(k + 1)), 180);
          }} />
      </>)}
    </Sheet>
  );
}

// ─── A saliva pH result ────────────────────────────────────────────────────
export function PhFlow({ onClose, onSave }) {
  const [ph, setPh] = useState(null);
  const [saved, setSaved] = useState(false);
  return (
    <Sheet title="Saliva pH" onClose={onClose}
      footer={saved ? <button className="btn primary big" onClick={onClose}>Done</button>
        : <button className="btn primary big" disabled={ph == null} onClick={() => { onSave({ id: `p_${Date.now()}`, ts: Date.now(), kind: "ph", ph }); setSaved(true); }}>Save result</button>}>
      {!saved ? (<>
        <h2 className="q">What colour did your strip turn?</h2>
        <p className="lede tight">Test first thing in the morning, before eating, drinking or brushing. Tap the closest colour.</p>
        <PhInput value={ph} onPick={setPh} />
      </>) : (
        <div className="intro">
          <div className="intro-mark dry"><Icon name="check" size={28} stroke={2.6} /></div>
          <h2 className="q">Saved: pH {ph.toFixed(1)} — {phBand(ph).toLowerCase()}</h2>
          <p className="lede">{ph < PH_ROOT_CRITICAL
            ? `Below ${PH_ROOT_CRITICAL}, exposed tooth roots start to lose mineral. One low result isn't a worry; if most of your results are low, ask your dentist about extra fluoride and GC Tooth Mousse Plus.`
            : "That's a comfortable level for your teeth."}</p>
          <Sources refs={["agarwal2022"]} />
        </div>
      )}
    </Sheet>
  );
}
