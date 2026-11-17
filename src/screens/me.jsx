import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { freqFor } from "../data/schedule.js";
import { REGIONS } from "../data/clinical.js";

export function Me({ profile, setProfile, prefs, setPrefs, open, onErase }) {
  const [sure, setSure] = useState(false);
  const set = (p) => setProfile({ ...profile, ...p });
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Me</h1>
        <p className="lede">Everything stays on this device. Nothing is sent anywhere.</p></header>

      <section className="panel">
        <label className="field"><span>Your first name (optional)</span>
          <input value={profile.name || ""} onChange={(e) => set({ name: e.target.value })} autoComplete="given-name" placeholder="Shown on your summary" /></label>
        <div className="field"><span>Where you live</span>
          <div className="seg full">{Object.entries(REGIONS).map(([k, r]) => <button key={k} className={profile.region === k ? "on" : ""} onClick={() => set({ region: k })}>{r.name}</button>)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="set-row"><span><strong>Dry mouth check</strong><em>{prefs.sipEvery ? freqFor(prefs.sipEvery).label : "Not set yet"}</em></span>
          <button className="btn ghost" onClick={() => open("freq")}>Change</button></div>
        <div className="set-row"><span><strong>Reminder</strong><em>Add a repeating reminder to your calendar</em></span>
          <button className="btn ghost" onClick={() => open(prefs.sipEvery ? "remind" : "freq")}><Icon name="bell" size={18} /></button></div>
      </section>

      <section className="panel">
        <div className="field"><span>Text size</span>
          <div className="seg full">{[["m", "Standard"], ["l", "Larger"], ["xl", "Largest"]].map(([k, t]) => <button key={k} className={prefs.text === k ? "on" : ""} onClick={() => setPrefs({ ...prefs, text: k })}>{t}</button>)}</div>
        </div>
        <div className="field"><span>Appearance</span>
          <div className="seg full">{[["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(([k, t]) => <button key={k} className={prefs.theme === k ? "on" : ""} onClick={() => setPrefs({ ...prefs, theme: k })}>{t}</button>)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="set-row"><span><strong>Back up or move your results</strong><em>Save a file, optionally locked with a passphrase</em></span>
          <button className="btn ghost" onClick={() => open("backup")}>Open</button></div>
        <div className="set-row"><span><strong>Delete everything</strong><em>Removes all results from this device</em></span>
          {sure ? <button className="btn danger" onClick={() => { onErase(); setSure(false); }}>Yes, delete</button>
            : <button className="btn ghost" onClick={() => setSure(true)}>Delete</button>}</div>
      </section>

      <p className="foot-note">Mouthkind {__APP_VERSION__} · Made by Dr Rakesh Jivan. General information only, not a diagnosis — talk to your dentist, GP or pharmacist about your results.</p>
    </div>
  );
}
