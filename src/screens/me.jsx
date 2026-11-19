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
        <h2 className="panel-title">{profile.carer ? `About ${profile.firstName || "the person you care for"}` : "About you"}</h2>
        {profile.carer
          ? <div className="carer-note"><Icon name="info" size={18} /><p><b>These are their details, not yours.</b> The checks, results and plan are all about them.</p></div>
          : <p className="soft-note tight">Your age and gender are used in your risk checks, so they aren't asked again. All optional.</p>}
        <div className="field-row">
          <label className="field"><span>{profile.carer ? "Their first name" : "First name"}</span>
            <input value={profile.firstName ?? profile.name ?? ""} onChange={(e) => set({ firstName: e.target.value, name: e.target.value, ...(profile.carer ? { carerFor: e.target.value } : {}) })} autoComplete={profile.carer ? "off" : "given-name"} /></label>
          <label className="field"><span>{profile.carer ? "Their last name" : "Last name"}</span>
            <input value={profile.lastName || ""} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" /></label>
        </div>
        <div className="field-row">
          <label className="field"><span>{profile.carer ? "Their date of birth" : "Date of birth"}{ageFrom(profile.dob) != null ? ` · ${ageFrom(profile.dob)} years` : ""}</span>
            <input type="date" value={profile.dob || ""} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" onChange={(e) => set({ dob: e.target.value })} autoComplete="bday" /></label>
          <label className="field"><span>{profile.carer ? "Their gender" : "Gender"}</span>
            <select value={profile.gender || ""} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Choose…</option>
              {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
            </select></label>
        </div>
        {profile.carer && (
          <label className="field"><span>Your first name (carer, optional)</span>
            <input value={profile.carerName || ""} onChange={(e) => set({ carerName: e.target.value })} autoComplete="given-name" /></label>
        )}
        <div className="field"><span>{profile.carer ? "Where they live" : "Where you live"}</span>
          <div className="seg full">{Object.entries(REGIONS).map(([k, r]) => <button key={k} className={profile.region === k ? "on" : ""} onClick={() => set({ region: k })}>{r.name}</button>)}</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">{profile.carer ? "Their situation and treatment" : "Situation and treatment"}</h2>
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
            <div className="set-row"><span><strong>Chemotherapy dates</strong><em>{(profile.chemoDates || []).slice(-3).map((d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })).join(", ") || "None added"}</em></span>
              <button className="btn ghost" onClick={() => open("chemoday")}><Icon name="plus" size={18} /> Add</button></div>
          )}
          <div className="set-row"><span><strong>Tools</strong><em>Jaw check, dental alert card, questions</em></span>
            <button className="btn ghost" onClick={() => open("journey")}>Open</button></div>
        </>)}
      </section>

      <section className="panel">
        <h2 className="panel-title">Care team</h2>
        {(profile.situation || []).includes("cancer") && (<>
          <label className="field"><span>Treatment team</span><input value={profile.team?.name || ""} onChange={(e) => set({ team: { ...profile.team, name: e.target.value } })} /></label>
          <label className="field"><span>Team's 24-hour number</span><input type="tel" inputMode="tel" value={profile.team?.phone24 || ""} onChange={(e) => set({ team: { ...profile.team, phone24: e.target.value } })} /></label>
        </>)}
        <label className="field"><span>Dentist's phone</span><input type="tel" inputMode="tel" value={profile.dentist?.phone || ""} onChange={(e) => set({ dentist: { ...profile.dentist, phone: e.target.value } })} /></label>
      </section>

      <h2 className="me-group">App settings</h2>
      <section className="panel">
        <h2 className="panel-title">Reminders</h2>
        <div className="set-row"><span><strong>How often I check</strong><em>{prefs.sipEvery ? freqFor(prefs.sipEvery).label : "Not set yet"}</em></span>
          <button className="btn ghost" onClick={() => open("freq")}>Change</button></div>
        <div className="set-row"><span><strong>Reminder</strong><em>Add a repeating reminder to your calendar</em></span>
          <button className="btn ghost" aria-label="Add a reminder to my calendar" onClick={() => open(prefs.sipEvery ? "remind" : "freq")}><Icon name="bell" size={18} /></button></div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Display</h2>
        <div className="field"><span>Text size</span>
          <div className="seg full">{[["m", "Standard"], ["l", "Larger"], ["xl", "Largest"]].map(([k, t]) => <button key={k} className={prefs.text === k ? "on" : ""} onClick={() => setPrefs({ ...prefs, text: k })}>{t}</button>)}</div>
        </div>
        <div className="field"><span>Appearance</span>
          <div className="seg full">{[["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(([k, t]) => <button key={k} className={prefs.theme === k ? "on" : ""} onClick={() => setPrefs({ ...prefs, theme: k })}>{t}</button>)}</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Your data</h2>
        <div className="set-row"><span><strong>Back up or move your results</strong><em>Save a file, optionally locked with a passphrase</em></span>
          <button className="btn ghost" onClick={() => open("backup")}>Open</button></div>
        <div className="set-row"><span><strong>Delete everything</strong><em>Removes all results from this device</em></span>
          {sure ? <button className="btn danger" onClick={() => { onErase(); setSure(false); }}>Yes, delete</button>
            : <button className="btn ghost" onClick={() => setSure(true)}>Delete</button>}</div>
      </section>

      <details className="panel about">
        <summary><h2 className="panel-title">About Mouthkind</h2><Icon name="chev" size={18} /></summary>
        <p><strong>Who made it.</strong> Dr Rakesh Jivan, a dentist with over 25 years in practice. He is Scientific Affairs Manager at GC Australasia, which makes GC Tooth Mousse™, GC Tooth Mousse™ Plus, GC Dry Mouth Gel and GC Saliva-Check BUFFER. Those products are recommended where they fit, alongside other brands and non-product advice.</p>
        <p><strong>How the checks work.</strong> The dry mouth score is the GC SIP-SCORE, which uses the five questions of the Summated Xerostomia Inventory, a validated measure of dry mouth. The dry mouth and tooth decay risk checks are screening checks: they add up known risk factors from published research and guidelines (including CAMBRA), weighted by clinical judgement, and are not yet validated against saliva tests or dental examinations. Even the best-validated decay risk tools are only moderately accurate, so your dentist's examination comes first.</p>
        <p><strong>Where the advice comes from.</strong> Guidelines and studies are listed under "Sources" on each piece of advice.</p>
        <p><strong>Your privacy.</strong> Everything stays on this device. Nothing is sent anywhere unless you choose to share or back it up.</p>
      </details>

      <p className="foot-note">Mouthkind {__APP_VERSION__} · General information only, not a diagnosis — talk to your dentist, GP or pharmacist about your results.</p>
    </div>
  );
}
