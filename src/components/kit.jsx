import { useState } from "react";
import { Icon } from "./ui.jsx";

// ─── "?" beside an option: a short explanation in a small pop-up ───────────
export function InfoPop({ title, text, onClose }) {
  return (
    <div className="infopop-wrap" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="infopop" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{text}</p>
        <p className="infopop-note">General information. A dentist, doctor or pharmacist can tell you how it applies to you.</p>
        <button type="button" className="btn primary" onClick={onClose} autoFocus>Got it</button>
      </div>
    </div>
  );
}
function InfoBtn({ o, info, setOpen }) {
  const text = info?.(o);
  if (!text) return null;
  return <button type="button" className="pick-info" aria-label={`What ${o.label} means for your mouth`} onClick={() => setOpen({ title: o.label, text })}>?</button>;
}

// ─── Pick one, big rows ────────────────────────────────────────────────────
export function Pick({ options, value, onPick, info }) {
  const [pop, setPop] = useState(null);
  return (
    <div className="pick">
      {options.map((o) => (
        <div key={String(o.v)} className={`pick-item${info?.(o) ? " has-info" : ""}`}>
          <button type="button" className={`pick-row${value === o.v ? " on" : ""}${o.danger ? " danger" : ""}`}
            onClick={() => onPick(o.v)} aria-pressed={value === o.v}>
            <span><strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}</span>
            <span className="pick-dot" aria-hidden="true">{value === o.v && <Icon name="check" size={18} stroke={3} />}</span>
          </button>
          <InfoBtn o={o} info={info} setOpen={setPop} />
        </div>
      ))}
      {pop && <InfoPop {...pop} onClose={() => setPop(null)} />}
    </div>
  );
}

// ─── Tick any, as chips ────────────────────────────────────────────────────
export function Chips({ options, value, onChange, tone = "" }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className={`chips ${tone}`}>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" className={`chip${on ? " on" : ""}`} onClick={() => toggle(o.id)} aria-pressed={on}>
            {on && <Icon name="check" size={16} stroke={3} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── A small series of single values (SIP, pH) ─────────────────────────────
export function DotSeries({ points, min, max, line, lineLabel, tone, fmt = (v) => v, ticks, gutter = 30 }) {
  const W = 340, H = 120, L = gutter, R = 10, T = 12, B = ticks ? 30 : 22;
  const n = points.length;
  const x = (i) => (n === 1 ? (W + L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart2" role="img" aria-label={points.map((p) => `${p.label}: ${fmt(p.v)}`).join("; ")}>
      {(ticks || [min, max]).map((v) => <text key={v} x={L - 8} y={y(v) + 4} className="c-axis" textAnchor="end">{fmt(v)}</text>)}
      {line != null && <g><line x1={L} x2={W - R} y1={y(line)} y2={y(line)} className="c-ref" /><text x={L + 4} y={y(line) + 14} className="c-mlabel">{lineLabel}</text></g>}
      <path d={d} className={`c-line ${tone}`} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="4" className={`c-pt ${tone}`} />)}
      {points.map((p, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) && <text key={`t${i}`} x={x(i)} y={H - 5} className="c-axis" textAnchor="middle">{p.label}</text>)}
    </svg>
  );
}

// ─── Symptom log over time: dryness and pain (0–10), sores strip, tooth and gum markers ───
export function SymptomChart({ days, fmt }) {
  const W = 340, L = 26, R = 10, T = 12, H = 150, B = 22, strip = 14, mark = 12;
  const plotB = H - B - strip - mark - 10;
  const n = days.length;
  const x = (i) => (n === 1 ? (W + L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((10 - v) * (plotB - T)) / 10;
  const path = (k) => days.map((d, i) => [i, d[k]]).filter(([, v]) => v != null).map(([i, v], j) => `${j ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const cw = n > 1 ? Math.min(18, (W - L - R) / (n - 1) - 2) : 14;
  const desc = days.map((d) => `${fmt(d.ts)}: dryness ${d.dryness ?? "not logged"}, pain ${d.pain ?? "not logged"}`).join("; ");
  return (
    <figure className="symchart">
      <div className="sym-legend" aria-hidden="true">{[["dry", "Dryness"], ["pain", "Pain"], ["sore", "Sores"], ["tooth", "Tooth or gum problem"]].map(([k, t]) => <span key={k} className="item"><span className={`k ${k}`} />{t}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart2" role="img" aria-label={`Dryness and pain, 0 to 10, by day. ${desc}`}>
        {[0, 5, 10].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="c-grid" /><text x={L - 6} y={y(v) + 4} className="c-axis" textAnchor="end">{v}</text></g>)}
        <path d={path("dryness")} className="c-line dry" /><path d={path("pain")} className="c-line red" />
        {days.map((d, i) => d.dryness != null && <circle key={`d${i}`} cx={x(i)} cy={y(d.dryness)} r="3.5" className="c-pt dry" />)}
        {days.map((d, i) => d.pain != null && <circle key={`p${i}`} cx={x(i)} cy={y(d.pain)} r="3.5" className="c-pt red" />)}
        {days.map((d, i) => d.sores != null && <rect key={`s${i}`} x={x(i) - cw / 2} y={plotB + 8} width={cw} height={strip} rx="3" className={`c-sore g${d.grade ?? 0}`} />)}
        {days.map((d, i) => d.tooth && <circle key={`t${i}`} cx={x(i)} cy={plotB + 8 + strip + 8} r="4" className="c-tooth" />)}
        {days.map((d, i) => (n <= 7 || i % Math.ceil(n / 7) === 0) && <text key={`x${i}`} x={x(i)} y={H - 4} className="c-axis" textAnchor="middle">{fmt(d.ts)}</text>)}
      </svg>
    </figure>
  );
}

// ─── Tick any, as full rows with a hint line ───────────────────────────────
export function TickRows({ options, value, onChange, info }) {
  const [pop, setPop] = useState(null);
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="pick">
      {options.map((o) => {
        const on = value.includes(o.v);
        return (
          <div key={o.v} className={`pick-item${info?.(o) ? " has-info" : ""}`}>
            <button type="button" className={`pick-row tick${on ? " on" : ""}`} onClick={() => toggle(o.v)} aria-pressed={on}>
              <span className="tick-box" aria-hidden="true">{on && <Icon name="check" size={18} stroke={3} />}</span>
              <span><strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}</span>
            </button>
            <InfoBtn o={o} info={info} setOpen={setPop} />
          </div>
        );
      })}
      {pop && <InfoPop {...pop} onClose={() => setPop(null)} />}
    </div>
  );
}

// ─── Risk dial: 0–100 on a half circle, coloured by band ───────────────────
export function RiskDial({ score, tone }) {
  const r = 80, c = Math.PI * r, frac = Math.min(1, score / 60);
  return (
    <svg viewBox="0 0 200 118" className={`riskdial ${tone}`} role="img" aria-label={`Risk score ${score}`}>
      <path d="M20 100A80 80 0 0 1 180 100" className="rd-track" />
      <path d="M20 100A80 80 0 0 1 180 100" className="rd-fill" strokeDasharray={`${c * frac} ${c}`} />
      <text x="100" y="92" className="rd-num">{score}</text>
    </svg>
  );
}

// ─── Level meter: low, moderate or high — no numbers ──────────────────────
const LEVEL_ZONES = [{ id: "low", label: "Low", tone: "good" }, { id: "moderate", label: "Moderate", tone: "amber" }, { id: "high", label: "High", tone: "red" }];
export const levelId = (bandId) => (bandId === "veryhigh" ? "high" : bandId);
export function LevelMeter({ level, what = "risk" }) {
  const on = levelId(level);
  return (
    <div className="lmeter" role="img" aria-label={`${LEVEL_ZONES.find((z) => z.id === on)?.label} ${what}, on a scale of low, moderate and high`}>
      {LEVEL_ZONES.map((z) => (
        <span key={z.id} className={`lm-zone ${z.tone}${z.id === on ? " on" : ""}`}><i />{z.label}</span>
      ))}
    </div>
  );
}

// ─── One bar split into the groups that make up a score ────────────────────
export function Breakdown({ groups }) {
  const total = groups.reduce((s, g) => s + g.pts, 0) || 1;
  return (
    <div className="breakdown">
      <div className="bd-bar" role="img" aria-label={`Made up of: ${groups.map((g) => g.label).join(", ")}`}>
        {groups.map((g) => <span key={g.id} className={`bd-seg g-${g.id}`} style={{ width: `${(g.pts / total) * 100}%` }} />)}
      </div>
      <ul className="bd-legend">
        {groups.map((g) => <li key={g.id}><i className={`g-${g.id}`} /><span>{g.label}</span></li>)}
      </ul>
    </div>
  );
}

// ─── Recent pH results as coloured drops on the three zones ────────────────
export function PhTimeline({ readings, zones, color, fmt, max = 7 }) {
  const shown = readings.slice(-max);
  // Plot on the left, zone names in their own column on the right so they never sit under a dot.
  const W = 340, H = 160, L = 6, GUT = 96, T = 6, B = 22, PR = W - GUT;
  const y = (v) => T + ((7.9 - v) / 3.0) * (H - T - B);
  const edge = { ok: [7.9, 6.7], mod: [6.7, 5.9], high: [5.9, 4.9] };
  const x = (i) => (shown.length === 1 ? (L + PR) / 2 : L + 14 + (i * (PR - L - 28)) / (shown.length - 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="phline" role="img" aria-label={shown.map((r) => `${fmt(r.ts)}: pH ${r.ph.toFixed(1)}`).join("; ")}>
      {zones.map((z) => {
        const [top, bot] = edge[z.id];
        return (
          <g key={z.id}>
            <rect x={L} y={y(top)} width={PR - L} height={y(bot) - y(top)} className={`phz ${z.tone}`} />
            <rect x={PR + 8} y={y(top) + 2} width="5" height={y(bot) - y(top) - 4} rx="2.5" className={`phz-key ${z.tone}`} />
            {z.label.split(" ").map((w, i, arr) => (
              <text key={w} x={PR + 19} y={(y(top) + y(bot)) / 2 + 4 + (i - (arr.length - 1) / 2) * 13} className="phz-label">{w}</text>
            ))}
          </g>
        );
      })}
      {shown.length > 1 && <path d={shown.map((r, i) => `${i ? "L" : "M"}${x(i)} ${y(r.ph)}`).join("")} className="phl-line" />}
      {shown.map((r, i) => (
        <g key={r.id || i}>
          <circle cx={x(i)} cy={y(r.ph)} r="8.5" fill={color(r.ph)} className="phl-dot" />
          {(shown.length <= 5 || i % 2 === (shown.length - 1) % 2) && <text x={x(i)} y={H - 5} className="c-axis" textAnchor="middle">{fmt(r.ts)}</text>}
        </g>
      ))}
    </svg>
  );
}
