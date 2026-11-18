import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { freqFor } from "../data/schedule.js";
import { REGIONS } from "../data/clinical.js";
import { GENDERS, ageFrom } from "../data/person.js";
import { SITUATIONS } from "./onboarding.jsx";
import { TREATMENTS, hasTx } from "../data/journey.js";

export function Me({ profile, setProfile, prefs, setPrefs, open, onErase }) {
  const [sure, setSure] = useState(false);
  const set = (p) => setProfile({ ...profile, ...p });
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Me</h1>
        <p className="lede">Everything stays on this device. Nothing is sent anywhere.</p></header>

      <section className="panel">
        <h2 className="panel-title">About you</h2>
        <p className="soft-note tight">Your age and gender are used in your risk checks, so they aren't asked again. All optional.</p>
        <div className="field-row">
          <label className="field"><span>First name</span>
            <input value={profile.firstName ?? profile.name ?? ""} onChange={(e) => set({ firstName: e.target.value, name: e.target.value })} autoComplete="given-name" /></label>
          <label className="field"><span>Last name</span>
            <input value={profile.lastName || ""} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" /></label>
        </div>
        <div className="field-row">
          <label className="field"><span>Date of birth{ageFrom(profile.dob) != null ? ` · ${ageFrom(profile.dob)} years` : ""}</span>
            <input type="date" value={profile.dob || ""} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" onChange={(e) => set({ dob: e.target.value })} autoComplete="bday" /></label>
          <label className="field"><span>Gender</span>
            <select value={profile.gender || ""} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Choose…</option>
              {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
            </select></label>
        </div>
        <div className="field"><span>Where you live</span>
          <div className="seg full">{Object.entries(REGIONS).map(([k, r]) => <button key={k} className={profile.region === k ? "on" : ""} onClick={() => set({ region: k })}>{r.name}</button>)}</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">My situation</h2>
        <div className="set-row"><span><strong>{profile.carer ? `Caring for ${profile.carerFor || "someone"}` : "For myself"}</strong>
          <em>{(profile.situation || []).map((v) => SITUATIONS.find((x) => x.v === v)?.label).filter(Boolean).join(" · ") || "Not set"}</em></span>
          <button className="btn ghost" onClick={() => open("situation")}>Change</button></div>
        {(profile.situation || []).includes("cancer") && (<>
          <div className="set-row"><span><strong>Treatments</strong>
            <em>{(profile.treatments || []).map((v) => TREATMENTS.find((x) => x.v === v)?.label).filter(Boolean).join(" · ") || "Not set"}</em></span></div>
          {hasTx(profile, "rt_hn") && (
            <div className="field-row">
              <label className="field"><span>Radiotherapy start</span><input type="date" value={profile.rtStart || ""} onChange={(e) => set({ rtStart: e.target.value })} /></label>
              <label className="field"><span>Weeks</span><select value={profile.rtWeeks || 7} onChange={(e) => set({ rtWeeks: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
            </div>
          )}
          {(hasTx(profile, "chemo") || hasTx(profile, "transplant")) && (
            <div className="set-row"><span><strong>Chemotherapy dates</strong><em>{(profile.chemoDates || []).slice(-3).join(", ") || "None added"}</em></span>
              <button className="btn ghost" onClick={() => open("chemoday")}><Icon name="plus" size={18} /> Add</button></div>
          )}
          <label className="field"><span>Treatment team</span><input value={profile.team?.name || ""} onChange={(e) => set({ team: { ...profile.team, name: e.target.value } })} /></label>
          <label className="field"><span>Team's 24-hour number</span><input type="tel" inputMode="tel" value={profile.team?.phone24 || ""} onChange={(e) => set({ team: { ...profile.team, phone24: e.target.value } })} /></label>
          <div className="set-row"><span><strong>Tools</strong><em>Jaw check, dental alert card, questions</em></span>
            <button className="btn ghost" onClick={() => open("journey")}>Open</button></div>
        </>)}
        <label className="field"><span>Dentist's phone</span><input type="tel" inputMode="tel" value={profile.dentist?.phone || ""} onChange={(e) => set({ dentist: { ...profile.dentist, phone: e.target.value } })} /></label>
      </section>

      <section className="panel">
        <div className="set-row"><span><strong>How often I check</strong><em>{prefs.sipEvery ? freqFor(prefs.sipEvery).label : "Not set yet"}</em></span>
          <button className="btn ghost" onClick={() => open("freq")}>Change</button></div>
        <div className="set-row"><span><strong>Reminder</strong><em>Add a repeating reminder to your calendar</em></span>
          <button className="btn ghost" aria-label="Add a reminder to my calendar" onClick={() => open(prefs.sipEvery ? "remind" : "freq")}><Icon name="bell" size={18} /></button></div>
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
