import { Icon } from "./ui.jsx";

// ─── Pick one, big rows ────────────────────────────────────────────────────
export function Pick({ options, value, onPick }) {
  return (
    <div className="pick">
      {options.map((o) => (
        <button key={String(o.v)} type="button" className={`pick-row${value === o.v ? " on" : ""}${o.danger ? " danger" : ""}`}
          onClick={() => onPick(o.v)} aria-pressed={value === o.v}>
          <span><strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}</span>
          <span className="pick-dot" aria-hidden="true">{value === o.v && <Icon name="check" size={18} stroke={3} />}</span>
        </button>
      ))}
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
export function DotSeries({ points, min, max, line, lineLabel, tone, fmt = (v) => v }) {
  const W = 340, H = 120, L = 30, R = 10, T = 12, B = 22;
  const n = points.length;
  const x = (i) => (n === 1 ? (W + L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart2" role="img" aria-label={points.map((p) => `${p.label}: ${fmt(p.v)}`).join("; ")}>
      {[min, max].map((v) => <text key={v} x={L - 8} y={y(v) + 4} className="c-axis" textAnchor="end">{fmt(v)}</text>)}
      {line != null && <g><line x1={L} x2={W - R} y1={y(line)} y2={y(line)} className="c-ref" /><text x={L + 4} y={y(line) + 14} className="c-mlabel">{lineLabel}</text></g>}
      <path d={d} className={`c-line ${tone}`} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="4" className={`c-pt ${tone}`} />)}
      {points.map((p, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) && <text key={`t${i}`} x={x(i)} y={H - 5} className="c-axis" textAnchor="middle">{p.label}</text>)}
    </svg>
  );
}

// ─── Tick any, as full rows with a hint line ───────────────────────────────
export function TickRows({ options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="pick">
      {options.map((o) => {
        const on = value.includes(o.v);
        return (
          <button key={o.v} type="button" className={`pick-row tick${on ? " on" : ""}`} onClick={() => toggle(o.v)} aria-pressed={on}>
            <span className="tick-box" aria-hidden="true">{on && <Icon name="check" size={18} stroke={3} />}</span>
            <span><strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}</span>
          </button>
        );
      })}
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

// ─── Risk meter: where the score sits across the four bands ────────────────
// The scale runs 0–60; anything above 60 sits at the end of "very high".
export function RiskMeter({ score, bands }) {
  const MAX = 60, pos = Math.min(score, MAX) / MAX * 100;
  return (
    <div className="rmeter" role="img" aria-label={`Score ${score}, on a scale with bands ${bands.map((b) => b.label).join(", ")}`}>
      <div className="rm-track">
        {bands.map((b, i) => {
          const hi = i < bands.length - 1 ? bands[i + 1].lo : MAX;
          return <span key={b.id} className={`rm-zone ${b.tone}`} style={{ width: `${(hi - b.lo) / MAX * 100}%` }} />;
        })}
        <span className="rm-marker" style={{ left: `${pos}%` }}><i /></span>
      </div>
      <div className="rm-labels">
        {bands.map((b, i) => {
          const hi = i < bands.length - 1 ? bands[i + 1].lo : MAX;
          return <span key={b.id} style={{ width: `${(hi - b.lo) / MAX * 100}%` }}>{b.label}</span>;
        })}
      </div>
    </div>
  );
}

// ─── One bar split into the groups that make up a score ────────────────────
export function Breakdown({ groups }) {
  const total = groups.reduce((s, g) => s + g.pts, 0) || 1;
  return (
    <div className="breakdown">
      <div className="bd-bar" role="img" aria-label={groups.map((g) => `${g.label} ${g.pts}`).join(", ")}>
        {groups.map((g) => <span key={g.id} className={`bd-seg g-${g.id}`} style={{ width: `${(g.pts / total) * 100}%` }} />)}
      </div>
      <ul className="bd-legend">
        {groups.map((g) => <li key={g.id}><i className={`g-${g.id}`} /><span>{g.label}</span><b>{g.pts}</b></li>)}
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
