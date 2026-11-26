import { externalClick } from "../lib/external.js";
import { useEffect, useRef } from "react";
import { PH_VALUES, phColor, phBand, SIP_LEVELS, sipLevel } from "../data/clinical.js";
import { REFS } from "../data/references.js";

// ─── Icons (inline, stroke-based) ──────────────────────────────────────────
const P = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"],
  chart: ["M3 3v18h18", "M7 15l4-4 3 3 5-6"],
  bag: ["M6 7h12l1 13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 7z", "M9 7a3 3 0 0 1 6 0"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z", "M4 19a2 2 0 0 1 2-2h13"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  plus: ["M12 5v14", "M5 12h14"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"],
  cart: ["M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6", "M10 21h.01", "M18 21h.01"],
  minus: ["M5 12h14"],
  check: ["M20 6 9 17l-5-5"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  back: ["m15 18-6-6 6-6"],
  phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"],
  alert: ["m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z", "M12 9v4", "M12 17h.01"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  tooth: ["M7 3c-2.5 0-4 2-4 4.5 0 2 .7 3.3 1.3 5 .6 1.8.7 4 1.2 6.2.3 1.4.9 2.3 1.8 2.3 1.2 0 1.5-1.4 1.8-3 .3-1.6.6-3.5 1.9-3.5s1.6 1.9 1.9 3.5c.3 1.6.6 3 1.8 3 .9 0 1.5-.9 1.8-2.3.5-2.2.6-4.4 1.2-6.2.6-1.7 1.3-3 1.3-5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  drop: ["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"],
  heart: ["M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"],
  doc: ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4h8v2"],
  thermo: ["M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"],
  chev: ["m9 18 6-6-6-6"],
  jaw: ["M3.5 8.5c2.8-2.2 14.2-2.2 17 0-.8 7-4.4 11.5-8.5 11.5S4.3 15.5 3.5 8.5z", "M12 10.5v6.5", "m9.8 12.4 2.2-2.2 2.2 2.2", "m9.8 15.1 2.2 2.2 2.2-2.2"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  leaf: ["M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z", "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
  send: ["M22 2 11 13", "M22 2 15 22l-4-9-9-4z"],
  camera: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
};
export function Icon({ name, size = 22, stroke = 2, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {(P[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// ─── Gauge — three zones: low, moderate, high ─────────────────────────────
export function Gauge({ score }) {
  const CX = 150, CY = 152, R = 112, SW = 26;
  const polar = (r, deg) => { const a = (deg * Math.PI) / 180; return [CX + r * Math.cos(a), CY - r * Math.sin(a)]; };
  const arc = (r, t0, t1) => {
    const [x0, y0] = polar(r, 180 - t0 * 180), [x1, y1] = polar(r, 180 - t1 * 180);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const lvl = score == null ? null : sipLevel(score);
  const at = lvl ? SIP_LEVELS.findIndex((l) => l.id === lvl.id) : 1;
  // The needle points to the middle of the level, so the dial never reads as a number.
  const angle = 180 - ((at + 0.5) / 3) * 180;
  return (
    <svg viewBox="0 0 300 178" className="gauge" role="img"
      aria-label={lvl ? `Dry mouth assessment: ${lvl.full.toLowerCase()}` : "No dry mouth assessment yet"}>
      {SIP_LEVELS.map((l, i) => (
        <path key={l.id} d={arc(R, i / 3 + (i ? 0.006 : 0), (i + 1) / 3 - (i < 2 ? 0.006 : 0))}
          stroke={lvl ? l.color : "var(--dim)"} strokeWidth={SW} fill="none"
          opacity={!lvl || lvl.id === l.id ? 1 : 0.28} />
      ))}
      <text x="18" y="172" className="g-end">Minimal</text>
      <text x="282" y="172" className="g-end" textAnchor="end">Severe</text>
      <g className="needle" style={{ transform: `rotate(${90 - angle}deg)` }}>
        <path d="M 150 152 L 145 148 L 150 48 L 155 148 Z" fill="var(--ink)" />
      </g>
      <circle cx={CX} cy={CY} r="11" fill="var(--ink)" />
      <circle cx={CX} cy={CY} r="4.5" fill="var(--card)" />
    </svg>
  );
}

// ─── 0–10 scale ────────────────────────────────────────────────────────────
export function Scale({ value, onPick, low, high, label }) {
  return (
    <div className="scale" role="radiogroup" aria-label={label}>
      <div className="scale-row">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i}
            className={`scale-b${value === i ? " on" : ""}${i >= 7 ? " hi" : ""}`}
            onClick={() => onPick(i)} aria-label={`${i} out of 10`}>{i}</button>
        ))}
      </div>
      <div className="scale-ends"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

// ─── pH strip + stepper ────────────────────────────────────────────────────
export function PhInput({ value, onPick, readOnly }) {
  const idx = value == null ? -1 : PH_VALUES.indexOf(value);
  const step = (d) => onPick(PH_VALUES[idx < 0 ? (d > 0 ? 0 : 14) : Math.min(14, Math.max(0, idx + d))]);
  const groups = [["Highly acidic", PH_VALUES.slice(0, 5)], ["Moderately acidic", PH_VALUES.slice(5, 9)], ["Healthy", PH_VALUES.slice(9)]];
  return (
    <div>
      <div className="ph-card">
        {groups.map(([name, vals]) => (
          <div key={name} className="ph-group">
            <div className="ph-label">{name}</div>
            <div className="ph-row">
              {vals.map((v) => (
                <button key={v} type="button" disabled={readOnly} onClick={() => onPick?.(v)}
                  className={`ph-sw${value === v ? " on" : ""}`} aria-pressed={value === v} aria-label={`pH ${v.toFixed(1)}`}>
                  <span className="ph-chip" style={{ background: phColor(v) }} />
                  <span className="ph-num">{v.toFixed(1)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="stepper">
          <button type="button" onClick={() => step(-1)} aria-label="Lower pH"><Icon name="minus" /></button>
          <div className="stepper-val">
            <strong style={{ color: value == null ? "var(--ink3)" : phColor(value) }}>{value == null ? "—" : value.toFixed(1)}</strong>
            <span>{value == null ? "Tap the colour your strip turned" : phBand(value)}</span>
          </div>
          <button type="button" onClick={() => step(1)} aria-label="Raise pH"><Icon name="plus" /></button>
        </div>
      )}
    </div>
  );
}

// ─── Bottom sheet ──────────────────────────────────────────────────────────
export function Sheet({ title, onClose, onBack, progress, children, footer, tone }) {
  const ref = useRef(null);
  const bodyRef = useRef(null);
  // A new question (or step) always opens at the top.
  useEffect(() => { bodyRef.current?.scrollTo?.(0, 0); }, [progress?.at, title]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`sheet${tone ? " " + tone : ""}`} ref={ref} tabIndex={-1}>
        <div className="sheet-top">
          {/* Close is always here; going back is a labelled button in the footer, so nobody has to guess. */}
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
          {progress ? (
            <div className="pips" aria-hidden="true">
              {Array.from({ length: progress.of }, (_, i) => <span key={i} className={i <= progress.at ? "on" : ""} />)}
            </div>
          ) : <span className="sheet-title">{title}</span>}
          <span className="sheet-count">{progress?.label || ""}</span>
        </div>
        <div className="sheet-body" ref={bodyRef}>{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Sources line ──────────────────────────────────────────────────────────
export function Sources({ refs }) {
  if (!refs?.length) return null;
  return (
    <p className="sources">
      Based on{" "}
      {refs.map((k, i) => {
        const r = REFS[k];
        if (!r) return null;
        return (
          <span key={k}>
            {i > 0 && (i === refs.length - 1 ? " and " : ", ")}
            <a href={r.url} target="_blank" rel="noreferrer" onClick={externalClick(r.url)} title={`${r.title} — ${r.where}`}>{r.short}</a>
          </span>
        );
      })}
    </p>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`sw${on ? " on" : ""}`} onClick={() => onChange(!on)}><i /></button>
  );
}
