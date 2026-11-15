import { useState } from "react";
import { Gauge, Icon, PhInput, Sheet, Sources } from "../components/ui.jsx";
import { Pick } from "../components/kit.jsx";
import { PH_ROOT_CRITICAL, SIP_OPTIONS, SIP_QUESTIONS, phBand, sipBand } from "../data/clinical.js";

// ─── GC SIP-SCORE: five questions, every two weeks ─────────────────────────
export function SipFlow({ previous: prevAtOpen, onClose, onSave }) {
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
          {diff != null && <p className="soft-note center">{diff === 0 ? "The same as last time." : diff > 0 ? `${diff} higher than last time — your mouth has got drier.` : `${-diff} lower than last time — a little less dry.`}</p>}
        </div>
        <p className="lede">{done.sip >= 11
          ? "That's a lot of dryness to live with. Show this score to your dentist or team — there's more they can do, including prescribed saliva stimulants after radiotherapy."
          : done.sip >= 8 ? "Dryness is affecting you. The tips in Relief → Dry mouth are a good place to start." : "Your mouth isn't very dry at the moment. Keep protecting your teeth with fluoride."}</p>
        <Sources refs={["thomson2011", "mercadante2021"]} />
      </Sheet>
    );
  }

  const intro = k < 0;
  const finish = (all) => { const sip = all.reduce((a, b) => a + b, 0); const e = { id: `s_${Date.now()}`, ts: Date.now(), kind: "sip", sip, items: all }; onSave(e); setDone(e); };
  return (
    <Sheet title="Dry mouth score" onClose={onClose} onBack={k >= 0 ? () => setK(k - 1) : null}
      progress={intro ? null : { of: 5, at: k, label: `${k + 1} of 5` }}
      footer={intro ? <button className="btn primary big" onClick={() => setK(0)}>Start</button> : null}>
      {intro ? (
        <div className="intro">
          <div className="intro-mark dry"><Icon name="drop" size={28} /></div>
          <h2 className="q">Five quick questions about the last two weeks</h2>
          <p className="lede">This is the GC SIP-SCORE. Done every two weeks, it shows whether dryness is getting better or worse — something a daily score can miss.</p>
        </div>
      ) : (<>
        <p className="eyebrow-q">Over the last two weeks</p>
        <h2 className="q">{SIP_QUESTIONS[k]}</h2>
        <Pick options={SIP_OPTIONS.map((o) => ({ v: o.v, label: o.label }))} value={items[k]}
          onPick={(v) => {
            const all = items.map((x, j) => (j === k ? v : x)); setItems(all);
            setTimeout(() => (k === 4 ? finish(all) : setK(k + 1)), 180);
          }} />
      </>)}
    </Sheet>
  );
}

// ─── A saliva pH reading ───────────────────────────────────────────────────
export function PhFlow({ onClose, onSave }) {
  const [ph, setPh] = useState(null);
  const [saved, setSaved] = useState(false);
  return (
    <Sheet title="Saliva pH" onClose={onClose}
      footer={saved ? <button className="btn primary big" onClick={onClose}>Done</button>
        : <button className="btn primary big" disabled={ph == null} onClick={() => { onSave({ id: `p_${Date.now()}`, ts: Date.now(), kind: "ph", ph }); setSaved(true); }}>Save reading</button>}>
      {!saved ? (<>
        <h2 className="q">What colour did your strip turn?</h2>
        <p className="lede tight">Test first thing in the morning, before eating, drinking or brushing.</p>
        <PhInput value={ph} onPick={setPh} />
      </>) : (
        <div className="intro">
          <div className="intro-mark dry"><Icon name="check" size={28} stroke={2.6} /></div>
          <h2 className="q">Saved: pH {ph.toFixed(1)} — {phBand(ph).toLowerCase()}</h2>
          <p className="lede">{ph < PH_ROOT_CRITICAL
            ? `Below ${PH_ROOT_CRITICAL}, tooth roots start to lose mineral. One low reading isn't a worry; if most readings are low, ask your dentist about extra fluoride and Tooth Mousse Plus.`
            : "That's a comfortable level for your teeth."}</p>
          <Sources refs={["agarwal2022"]} />
        </div>
      )}
    </Sheet>
  );
}
