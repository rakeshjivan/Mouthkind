import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { careContacts, telHref } from "../data/careTeam.js";
import { inCancerCare } from "../data/journey.js";
import { WORRY_REFS, worryList } from "../data/worry.js";

/** Who "Call my team" rings: the 24-hour line in cancer care, else the first number saved. */
export function callTarget(profile) {
  const list = careContacts(profile);
  return list.find((c) => c.id === "line24") || list[0] || null;
}

/** Always on screen, just above the footer: call, and when to worry. */
export function HelpBar({ profile, open }) {
  const c = callTarget(profile);
  return (
    <div className="helpbar" role="region" aria-label="Get help">
      {c ? (
        <a className="help-btn call" href={telHref(c.phone)} aria-label={`Call ${c.role}${c.name ? `, ${c.name}` : ""}`}>
          <Icon name="phone" size={20} stroke={2.2} /> Call my team
        </a>
      ) : (
        <button type="button" className="help-btn call" onClick={() => open("careteam")}><Icon name="phone" size={20} stroke={2.2} /> Call my team</button>
      )}
      <button type="button" className="help-btn worry" onClick={() => open("worry")}>When to worry</button>
    </div>
  );
}

/** When to worry: what needs help now, today, or soon, and every number to call. */
export function WorrySheet({ profile, onClose, open }) {
  const cancer = inCancerCare(profile);
  const tx = profile.treatments || [];
  const groups = worryList({ cancer, chemo: cancer && tx.some((t) => t === "chemo" || t === "transplant"), rtOrBone: tx.some((t) => t === "rt_hn" || t === "bone") });
  const list = careContacts(profile);
  return (
    <Sheet title="When to worry" onClose={onClose}>
      <h2 className="q">When to get help</h2>
      <p className="lede tight">If you're not sure, it's always OK to call.</p>
      {groups.map((g) => (
        <section key={g.level} className={`worry-g w-${g.level}`}>
          <h3>{g.title}</h3>
          <ul>{g.items.map((x) => <li key={x}>{x}</li>)}</ul>
          {g.level === "now" && <a className="btn danger big" href="tel:000"><Icon name="phone" size={20} /> Call 000</a>}
        </section>
      ))}
      <h3 className="worry-h">My care team</h3>
      {list.length ? (
        <ul className="team-list">
          {list.map((c) => (
            <li key={c.id}>
              <span className="team-who"><strong>{c.role}</strong><em>{c.name && <>{c.name} · </>}<span className="team-num">{c.phone}</span></em></span>
              <a className={`btn ${c.urgent ? "primary" : "ghost"} team-call`} href={telHref(c.phone)} aria-label={`Call ${c.role}`}><Icon name="phone" size={18} /> Call</a>
            </li>
          ))}
        </ul>
      ) : <p className="lede tight">No numbers saved yet.</p>}
      <button type="button" className="btn ghost" onClick={() => open("careteam")}>{list.length ? "Edit my care team" : "Add my care team's numbers"}</button>
      <Sources refs={WORRY_REFS} />
    </Sheet>
  );
}
