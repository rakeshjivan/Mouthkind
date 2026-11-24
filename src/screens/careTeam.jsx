import { useState } from "react";
import { Icon, Sheet } from "../components/ui.jsx";
import { PUBLIC_DENTAL_URL, addExtraContact, careContacts, contactRoles, findNearHref, getContact, openQuestionCount, removeExtraContact, rolesText, setContact, stateFromPostcode, telHref } from "../data/careTeam.js";

/** Home: everyone to contact, and the questions to ask them, in one box. */
export function CareTeamCard({ profile, onEdit, onQuestions }) {
  const list = careContacts(profile);
  const n = openQuestionCount(profile);
  const total = (profile.ownQuestions || []).length;
  return (
    <section className="team-card" aria-labelledby="team-h">
      <div className="team-head">
        <h2 id="team-h"><Icon name="phone" size={20} /> Contact my care team</h2>
        <button type="button" className="link-btn" onClick={onEdit}>{list.length ? "Edit" : "Add numbers"}</button>
      </div>
      {list.length ? (
        <ul className="team-list">
          {list.map((c) => (
            <li key={c.id} className={c.urgent ? "urgent" : ""}>
              <span className="team-who"><strong>{c.role}</strong><em>{c.name && <>{c.name} · </>}<span className="team-num">{c.phone}</span></em></span>
              <a className={`btn ${c.urgent ? "primary" : "ghost"} team-call`} href={telHref(c.phone)} aria-label={`Call ${c.role}${c.name ? `, ${c.name}` : ""}`}><Icon name="phone" size={18} /> Call</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="team-empty">Add the numbers you might need — your {rolesText(profile)} — so they're one tap away.</p>
      )}
      <button type="button" className="team-qs" onClick={onQuestions}>
        <Icon name="doc" size={20} />
        <span><strong>Questions for my care team</strong><em>{n ? `${n} to ask at your next appointment` : total ? "All asked · add more" : "Write them down as they come to you"}</em></span>
        <Icon name="chev" size={18} />
      </button>
    </section>
  );
}

/** Edit every contact in one sheet. */
export function CareTeamEdit({ profile, setProfile, onClose, setup }) {
  const [p, setP] = useState(profile);
  const set = (id, patch) => setP((x) => setContact(x, id, patch));
  // An added person left completely empty isn't kept.
  const tidy = (x) => ({ ...x, extraContacts: (x.extraContacts || []).filter((c) => [c.role, c.name, c.phone].some((v) => (v || "").trim())) });
  const save = () => (setup ? setup.done(tidy(p)) : (setProfile(tidy(p)), onClose()));
  return (
    <Sheet title={setup ? "Build your plan" : "My care team"} onClose={onClose}
      footer={setup ? <>
        <button className="btn ghost" onClick={() => setup.done(profile)}>Skip for now</button>
        <button className="btn primary big" onClick={save}>Save and continue</button>
      </> : <button className="btn primary big" onClick={save}>Save</button>}>
      <h2 className="q">{setup ? "Your care team's numbers" : "My care team"}</h2>
      <p className="lede tight">{setup ? "Add the one or two you'd most likely call, so they're one tap away on Home. You can add the rest later." : "Add whoever you might need to call. Leave any you don't have blank."}</p>
      {contactRoles(p).map((r) => {
        const c = getContact(p, r.id);
        if (r.extra) return (
          <fieldset key={r.id} className="team-edit extra">
            <legend>{c.role.trim() || "Someone else"}</legend>
            <label className="field"><span>Who are they?</span><input value={c.role} placeholder="e.g. dietitian, speech pathologist" onChange={(e) => set(r.id, { role: e.target.value })} /></label>
            <div className="field-row">
              <label className="field"><span>Name or clinic</span><input value={c.name} onChange={(e) => set(r.id, { name: e.target.value })} /></label>
              <label className="field"><span>Phone</span><input type="tel" inputMode="tel" value={c.phone} onChange={(e) => set(r.id, { phone: e.target.value })} /></label>
            </div>
            <button type="button" className="link-btn team-remove" onClick={() => setP((x) => removeExtraContact(x, r.id))}>Remove {c.role.trim() || "this contact"}</button>
          </fieldset>
        );
        return (
          <fieldset key={r.id} className="team-edit">
            <legend>{r.role}</legend>
            {r.hint && <p className="small">{r.hint}</p>}
            <div className="field-row">
              <label className="field"><span>Name or clinic</span><input value={c.name} onChange={(e) => set(r.id, { name: e.target.value })} /></label>
              <label className="field"><span>Phone</span><input type="tel" inputMode="tel" value={c.phone} onChange={(e) => set(r.id, { phone: e.target.value })} /></label>
            </div>
            {r.find && !c.phone.trim() && <FindNear what={r.find} postcode={p.postcode || ""} onPostcode={(v) => setP((x) => ({ ...x, postcode: v }))} cancer={r.find === "dentist" && contactRoles(p).some((x) => x.id === "line24")} />}
          </fieldset>
        );
      })}
      <button type="button" className="btn ghost team-add" onClick={() => setP((x) => addExtraContact(x))}><Icon name="plus" size={18} /> Add someone else</button>
      <p className="small">For example a dietitian, speech pathologist, physiotherapist, social worker or oral medicine specialist.</p>
    </Sheet>
  );
}

/** "Find a dentist / pharmacy near me": a postcode, then the phone's Maps app does the searching.
 *  The postcode stays on the phone until the person taps. */
function FindNear({ what, postcode, onPostcode, cancer }) {
  const [open, setOpen] = useState(false);
  const ok = /^\d{4}$/.test(postcode.trim());
  const state = stateFromPostcode(postcode);
  if (!open) return <button type="button" className="btn ghost find-btn" onClick={() => setOpen(true)}><Icon name="search" size={18} /> Find a {what} near me</button>;
  return (
    <div className="find-near">
      <label className="field"><span>Your postcode</span>
        <input inputMode="numeric" autoComplete="postal-code" maxLength={4} value={postcode} onChange={(e) => onPostcode(e.target.value.replace(/\D/g, ""))} /></label>
      <a className={`btn primary find-go${ok ? "" : " disabled"}`} aria-disabled={!ok} href={ok ? findNearHref(what === "dentist" ? "dentists" : "pharmacies", postcode) : undefined}
        target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!ok) e.preventDefault(); }}>
        <Icon name="search" size={18} /> Show {what === "dentist" ? "dentists" : "pharmacies"} near {ok ? postcode : "me"}</a>
      <p className="small">Opens Maps with a list near you. When you've chosen one, add its name and number above.</p>
      {what === "dentist" && <p className="small">{cancer ? "Having cancer treatment? Ask your team about a hospital dental service. " : ""}Worried about cost? <a href={PUBLIC_DENTAL_URL} target="_blank" rel="noopener noreferrer">Public dental services{state ? ` in ${state}` : ""}</a> may be able to see you.</p>}
    </div>
  );
}
