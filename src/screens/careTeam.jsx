import { useState } from "react";
import { Icon, Sheet } from "../components/ui.jsx";
import { careContacts, contactRoles, getContact, openQuestionCount, setContact, telHref } from "../data/careTeam.js";

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
        <p className="team-empty">Add the numbers you might need — your specialist, nurse, dentist and GP — so they're one tap away.</p>
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
export function CareTeamEdit({ profile, setProfile, onClose }) {
  const [p, setP] = useState(profile);
  const set = (id, patch) => setP((x) => setContact(x, id, patch));
  return (
    <Sheet title="My care team" onClose={onClose}
      footer={<button className="btn primary big" onClick={() => { setProfile(p); onClose(); }}>Save</button>}>
      <h2 className="q">My care team</h2>
      <p className="lede tight">Add whoever you might need to call. Leave any you don't have blank.</p>
      {contactRoles(p).map((r) => {
        const c = getContact(p, r.id);
        return (
          <fieldset key={r.id} className="team-edit">
            <legend>{r.role}</legend>
            {r.hint && <p className="small">{r.hint}</p>}
            <div className="field-row">
              <label className="field"><span>Name or clinic</span><input value={c.name} onChange={(e) => set(r.id, { name: e.target.value })} /></label>
              <label className="field"><span>Phone</span><input type="tel" inputMode="tel" value={c.phone} onChange={(e) => set(r.id, { phone: e.target.value })} /></label>
            </div>
          </fieldset>
        );
      })}
    </Sheet>
  );
}
