import { useState } from "react";
import { Icon } from "./ui.jsx";
import { medicineById, searchMedicines } from "../data/medicines.js";
import { RISK_QUESTIONS } from "../data/risk.js";

// The friendly group name for a medicine's group ("medTypes.glp1" → "Weight-loss or diabetes injections (GLP-1)").
const groupLabel = (c) => {
  const [q, v] = c.split(".");
  for (const x of RISK_QUESTIONS) if (x.id === q && x.options) { const o = x.options.find((o) => o.v === v); if (o) return o.label; }
  return "";
};

/** Type a medicine or brand, pick from matches, see which group it belongs to. Unknown names are kept as typed. */
export function MedLookup({ value = [], onChange }) {
  const [q, setQ] = useState("");
  const hits = searchMedicines(q);
  const add = (item) => { if (!value.some((x) => (item.id ? x.id === item.id : x.name === item.name))) onChange([...value, item]); setQ(""); };
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  const typed = q.trim();
  return (
    <div className="medlook">
      <label className="medlook-box">
        <Icon name="search" size={20} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Ozempic, sertraline, Lyrica"
          autoComplete="off" autoCorrect="off" spellCheck="false" aria-label="Search medicines"
          onKeyDown={(e) => { if (e.key === "Enter" && typed) { e.preventDefault(); hits[0] ? add({ id: hits[0].m.id, brand: hits[0].brand }) : add({ name: typed }); } }} />
      </label>
      {typed.length >= 2 && (
        <ul className="medlook-hits" role="listbox">
          {hits.map(({ m, brand }) => (
            <li key={m.id}><button type="button" onClick={() => add({ id: m.id, brand })}>
              <strong>{brand || m.g}</strong>{brand && <span> ({m.g})</span>}<em>{groupLabel(m.c)}</em>
            </button></li>
          ))}
          {!hits.some(({ m, brand }) => (brand || m.g).toLowerCase() === typed.toLowerCase()) && (
            <li><button type="button" className="other" onClick={() => add({ name: typed })}>
              <strong>Add “{typed}”</strong><em>Not in our list — we'll keep it, but it won't change your score</em>
            </button></li>
          )}
        </ul>
      )}
      {value.length > 0 && (
        <ul className="medlook-list" aria-label="Your medicines">
          {value.map((x, i) => {
            const m = x.id && medicineById(x.id);
            return (
              <li key={(x.id || x.name) + i}>
                <span><strong>{m ? x.brand || m.g : x.name}</strong>{m && x.brand && <span> ({m.g})</span>}
                  <em className={m ? "" : "unknown"}>{m ? groupLabel(m.c) : "Not in our list — ask your pharmacist if it can dry the mouth"}</em></span>
                <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label={`Remove ${m ? x.brand || m.g : x.name}`}><Icon name="x" size={18} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="soft-note">Your list stays on this device. It's a guide, not a full medicines database — your pharmacist can check anything not listed.</p>
    </div>
  );
}
