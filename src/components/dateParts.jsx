import { useEffect, useState } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const daysIn = (y, m) => new Date(y || 2000, m, 0).getDate(); // m is 1–12; a leap year when the year isn't chosen yet
const pad = (n) => String(n).padStart(2, "0");
const split = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : { y: "", m: "", d: "" };
};

/**
 * Day, month and year as three selects. On a phone each opens the phone's own
 * scroll wheel, so a date of birth is three quick spins instead of paging a calendar
 * back decades. Saves an ISO date once all three are chosen; "" while incomplete.
 */
export function DateParts({ label, value, onChange, minYear = 1900, autoComplete }) {
  const [p, setP] = useState(() => split(value));
  useEffect(() => { if (value) setP(split(value)); }, [value]);
  const now = new Date();
  const years = Array.from({ length: now.getFullYear() - minYear + 1 }, (_, i) => now.getFullYear() - i);
  const maxDay = p.m ? daysIn(p.y, p.m) : 31;
  const set = (k, v) => {
    const n = { ...p, [k]: v === "" ? "" : +v };
    if (n.d && n.m && n.d > daysIn(n.y, n.m)) n.d = daysIn(n.y, n.m); // 31 → 30 when the month is shorter
    setP(n);
    const iso = n.y && n.m && n.d ? `${n.y}-${pad(n.m)}-${pad(n.d)}` : "";
    const future = iso && new Date(iso) > now;
    if (iso !== (value || "") && !future) onChange(iso);
  };
  const ac = (part) => (autoComplete === "bday" ? `bday-${part}` : "off");
  return (
    <fieldset className="field date-parts">
      <legend>{label}</legend>
      <div className="dp-row">
        <select aria-label="Day" value={p.d} onChange={(e) => set("d", e.target.value)} autoComplete={ac("day")}>
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Month" value={p.m} onChange={(e) => set("m", e.target.value)} autoComplete={ac("month")}>
          <option value="">Month</option>
          {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <select aria-label="Year" value={p.y} onChange={(e) => set("y", e.target.value)} autoComplete={ac("year")}>
          <option value="">Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </fieldset>
  );
}
