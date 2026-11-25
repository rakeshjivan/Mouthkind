import { useState } from "react";
import { Gauge, Icon, PhInput, Sheet, Sources } from "../components/ui.jsx";
import { Pick } from "../components/kit.jsx";
import { SIP_OPTIONS, SIP_QUESTIONS, phColor, sipLevel } from "../data/clinical.js";
import { PH_STEPS, PH_WINDOW, phPattern, phZone } from "../data/ph.js";
import { FREQUENCIES, freqFor, reminderIcs } from "../data/schedule.js";
import { downloadText } from "../lib/store.js";

// ─── How often ─────────────────────────────────────────────────────────────
export function FrequencyPicker({ value, onPick, onClose, first }) {
  const [v, setV] = useState(value ?? 14);
  return (
    <Sheet title="How often to check" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => onPick(v)}>{first ? "Continue" : "Save"}</button>}>
      <h2 className="q">How often would you like to check your mouth?</h2>
      <p className="lede tight">Each time: a pH test and the five dry mouth questions. You can change this whenever you like.</p>
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

/** A daily reminder to log, in the phone's calendar, at the time they choose. */
export function LogReminder({ prefs, setPrefs, onClose, weekly = false }) {
  const [hour, setHour] = useState(prefs.logRemind?.hour ?? 19);
  const [done, setDone] = useState(false);
  const times = [{ v: 9, label: "Morning, 9 am" }, { v: 13, label: "Lunchtime, 1 pm" }, { v: 19, label: "Evening, 7 pm" }];
  return (
    <Sheet title={weekly ? "Weekly log reminder" : "Daily log reminder"} onClose={onClose}
      footer={done ? <button className="btn primary big" onClick={onClose}>Done</button>
        : <button className="btn primary big" onClick={() => {
          downloadText("mouthkind-log-reminder.ics", reminderIcs(weekly ? 7 : 1, hour, Date.now(), "log"), "text/calendar");
          setPrefs({ ...prefs, logRemind: { hour, ts: Date.now() } }); setDone(true);
        }}><Icon name="bell" /> Add to my calendar</button>}>
      <div className="intro">
        <div className="intro-mark dry"><Icon name="bell" size={28} /></div>
        <h2 className="q">{done ? "Open the file to add it" : weekly ? "A reminder to log each week" : "A reminder to log each day"}</h2>
        <p className="lede">{done
          ? `Your phone will offer to add it to your calendar. It repeats every ${weekly ? "week" : "day"} at ${times.find((t) => t.v === hour).label.split(", ")[1]}.`
          : weekly ? "A quick log once a week shows you and your team how your mouth is changing. Pick a time that suits you." : "During treatment your mouth can change from day to day, so a quick log each day helps you and your team. Pick a time that suits you."}</p>
      </div>
      {!done && <div className="dseg remind-times" role="radiogroup" aria-label="Reminder time">
        {times.map((t) => <button key={t.v} type="button" role="radio" aria-checked={hour === t.v} className={`dseg-btn${hour === t.v ? " on" : ""}`} onClick={() => setHour(t.v)}>{t.label}</button>)}
      </div>}
    </Sheet>
  );
}

// ─── GC SIP-SCORE: five questions ──────────────────────────────────────────
export function SipFlow({ every, previous: prevAtOpen, onClose, onSave, followUp, next, plain }) {
  const f = freqFor(every);
  // Keep the score from before this one; the prop updates once we save.
  const [previous] = useState(prevAtOpen);
  const [items, setItems] = useState([null, null, null, null, null]);
  const [k, setK] = useState(-1);
  const [done, setDone] = useState(null);

  if (done) {
    const b = sipLevel(done.sip);
    const diff = previous ? done.sip - previous.sip : null;
    return (
      <Sheet title="Dry mouth score" onClose={onClose} footer={next ? <button className="btn primary big" onClick={next.go}>{next.label}</button> : <button className="btn primary big" onClick={onClose}>Done</button>}>
        <div className="sip-result">
          <Gauge score={done.sip} />
          <p className="sip-num">{b.label}</p>
          <p className="sip-band" style={{ color: b.color }}>{b.full}</p>
          {diff != null && <p className="soft-note center">{diff === 0 ? "The same as last time." : diff > 0 ? "Drier than last time." : "Less dry than last time."}</p>}
        </div>
        {plain ? <p className="lede">Saved to your records. Your scores over time are there to show your dentist or doctor.</p> : <p className="lede">{done.sip >= 11
          ? "That's a lot of dryness to live with. Show your scores to your dentist or doctor — there's more they can do, including checking your medicines and prescribing saliva stimulants."
          : done.sip >= 8 ? "Dryness is affecting you. Sip water often, use a saliva gel such as GC Dry Mouth Gel before meals and bed, and protect your teeth with fluoride."
            : "Your mouth isn't very dry right now. Keep protecting your teeth every day with fluoride toothpaste and GC Tooth Mousse™."}</p>}
        {followUp}
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
    <Sheet title="Dry mouth score" onClose={onClose}
      progress={intro ? null : { of: 5, at: k, label: `${k + 1} of 5` }}
      footer={intro ? <button className="btn primary big" onClick={() => setK(0)}>Start</button>
        : k > 0 ? <button className="btn ghost" onClick={() => setK(k - 1)}><Icon name="back" size={18} /> Back</button> : null}>
      {intro ? (
        <div className="intro">
          <div className="intro-mark dry"><Icon name="drop" size={28} /></div>
          <h2 className="q">Five quick questions</h2>
          <p className="lede">This is the {plain ? "SIP-SCORE" : "GC SIP-SCORE"}. Think about {f.days === 1 ? "today" : f.days === 7 ? "the last week" : "the last two weeks"}. Your result shows as low, moderate or high.</p>
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
export function PhFlow({ readings: atOpen, onClose, onSave, onCare, followUp, next, onSkip, plain }) {
  // Results from before this test; the prop updates once we save.
  const [readings] = useState(atOpen);
  const [ph, setPh] = useState(null);
  const [saved, setSaved] = useState(null);
  const [how, setHow] = useState(readings.length < 3);

  if (saved) {
    const z = phZone(saved.ph);
    const pat = phPattern([...readings, saved]);
    return (
      <Sheet title="Saliva pH" onClose={onClose}
        footer={next ? <button className="btn primary big" onClick={next.go}>{next.label}</button> : !plain && (pat.level === "flag" || pat.level === "watch")
          ? <><button className="btn ghost" onClick={onClose}>Done</button><button className="btn primary" onClick={onCare}>What helps</button></>
          : <button className="btn primary big" onClick={onClose}>Done</button>}>
        <div className={`ph-saved ${z.tone}`}>
          <span className="ph-big-swatch" style={{ background: phColor(saved.ph) }} />
          <p className="ph-big">pH {saved.ph.toFixed(1)}</p>
          <p className="ph-zone">{z.label}</p>
        </div>
        {plain ? <p className="lede">Saved to your records. The colour zones are the ones printed on saliva pH test strips; your dentist can tell you what your results mean for you.</p> : pat.level === "flag" ? (
          <div className="alert-x red">
            <strong>Your saliva has been acidic in {pat.acid} of your last {pat.n} tests.</strong>
            <p>Saliva that stays acidic lets acid-loving bacteria take over and strips minerals from your teeth — even if your mouth doesn't feel dry. Book a dentist visit and show them these results. Until then, follow the steps in Care: protect your teeth, and keep sugar and acid to mealtimes.</p>
          </div>
        ) : pat.level === "watch" ? (
          <p className="lede">{z.id === "ok" ? "Healthy today." : "One acidic result isn't a worry on its own."} Keep testing{readings.length + 1 < PH_WINDOW ? "" : " — if most of your results are acidic, it's time to see your dentist"}.</p>
        ) : <p className="lede">A healthy result. Keep testing to see your pattern over time.</p>}
        {followUp}
        {!plain && <Sources refs={["gcSalivaCheck"]} />}
      </Sheet>
    );
  }

  return (
    <Sheet title="Test my saliva pH" onClose={onClose}
      footer={<>
        {onSkip && <button className="btn ghost" onClick={onSkip}>No strips — skip</button>}
        <button className="btn primary big" disabled={ph == null}
          onClick={() => { const e = { id: `p_${Date.now()}`, ts: Date.now(), kind: "ph", ph }; onSave(e); setSaved(e); }}>Save result</button>
      </>}>
      <button className={`how-toggle${how ? " open" : ""}`} onClick={() => setHow(!how)} aria-expanded={how}>
        <span>How to test</span><Icon name="chev" className={how ? "rot" : ""} />
      </button>
      {how && <ol className="how-steps">{PH_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>}
      <h2 className="q">Which colour did your strip turn?</h2>
      <PhInput value={ph} onPick={setPh} />
    </Sheet>
  );
}
