import { useState } from "react";
import { Icon } from "./ui.jsx";
import { medicineById, searchMedicines } from "../data/medicines.js";
import { RISK_QUESTIONS } from "../data/risk.js";

// The friendly group name for a medicine's group ("medTypes.glp1" → "Weight-loss or diabetes injections (GLP-1)").
const groupLabel = (c) => {
  if (!c) return "";
  const [q, v] = c.split(".");
  for (const x of RISK_QUESTIONS) if (x.id === q && x.options) { const o = x.options.find((o) => o.v === v); if (o) return o.label; }
  return "";
};

/** What we know about a medicine, in one short line. */
function Note({ m }) {
  if (!m) return <em className="unknown">We don't know this one — your pharmacist can check whether it dries the mouth</em>;
  if (!m.c) return <em className="safe"><Icon name="check" size={14} stroke={2.6} /> Not known to dry the mouth</em>;
  if (m.c === "rep") return <em className="rep">Sometimes reported to dry the mouth</em>;
  return <em className="dries">Can dry the mouth · {groupLabel(m.c)}</em>;
}

/** Type a medicine or brand, pick from matches or add it as typed. Everything added counts towards how many medicines. */
export function MedLookup({ value = [], onChange }) {
  const [q, setQ] = useState("");
  const hits = searchMedicines(q, 6);
  const typed = q.trim();
  const has = (item) => value.some((x) => (item.id ? x.id === item.id : !x.id && x.name.toLowerCase() === item.name.toLowerCase()));
  const add = (item) => { if (!has(item)) onChange([...value, item]); setQ(""); };
  const addTyped = () => { if (!typed) return; const best = hits.find((h) => h.rank <= 1); add(best ? { id: best.m.id, brand: best.brand } : { name: typed }); };
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  const exact = hits.some(({ m, brand }) => (brand || m.g).toLowerCase() === typed.toLowerCase());
  return (
    <div className="medlook">
      <div className="medlook-row">
        <label className="medlook-box">
          <Icon name="search" size={20} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Panadol"
            autoComplete="off" autoCorrect="off" spellCheck="false" aria-label="Medicine name" enterKeyHint="done"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }} />
        </label>
        <button type="button" className="btn primary medlook-add" onClick={addTyped} disabled={!typed}><Icon name="plus" size={18} /> Add</button>
      </div>
      {typed.length >= 2 && (
        <ul className="medlook-hits" role="listbox" aria-label="Matching medicines">
          {hits.map(({ m, brand }) => (
            <li key={m.id}><button type="button" onClick={() => add({ id: m.id, brand })}>
              <strong>{brand || m.g}</strong>{brand && <span> ({m.g})</span>}<Note m={m} />
            </button></li>
          ))}
          {!exact && (
            <li><button type="button" className="other" onClick={() => add({ name: typed })}>
              <strong>Add “{typed}” as typed</strong><em className="unknown">For anything not in our list</em>
            </button></li>
          )}
        </ul>
      )}
      {value.length > 0 && (<>
        <p className="medlook-count">{value.length} medicine{value.length === 1 ? "" : "s"} added</p>
        <ul className="medlook-list" aria-label="Your medicines">
          {value.map((x, i) => {
            const m = x.id && medicineById(x.id);
            const name = m ? x.brand || m.g : x.name;
            return (
              <li key={(x.id || x.name) + i} className={m ? (m.c === "rep" ? "rep" : m.c ? "dries" : "safe") : "unknown"}>
                <span><strong>{name}</strong>{m && x.brand && <span> ({m.g})</span>}<Note m={m} /></span>
                <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label={`Remove ${name}`}><Icon name="x" size={18} /></button>
              </li>
            );
          })}
        </ul>
      </>)}
      <p className="soft-note">Your list stays on this device. You can skip this — we'll go by what you take medicines for.</p>
    </div>
  );
}
