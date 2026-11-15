import { Icon } from "./ui.jsx";
import { MOUTH_AREAS } from "../data/tracker.js";

// ─── 0–10 slider with a word ───────────────────────────────────────────────
export function Scale10({ value, onChange, word, tone, minLabel, maxLabel, label }) {
  const v = value ?? 0;
  return (
    <div className={`scale10 ${tone}`} style={{ "--p": `${v * 10}%` }}>
      <div className="scale10-read" aria-hidden="true">
        <span className="scale10-num">{value == null ? "–" : v}</span>
        <span className="scale10-word">{value == null ? "Slide or tap a number" : word(v)}</span>
      </div>
      <input type="range" min="0" max="10" step="1" value={v} aria-label={label} aria-valuetext={`${v}, ${word(v)}`}
        onChange={(ev) => onChange(Number(ev.target.value))} onPointerDown={() => value == null && onChange(v)} />
      <div className="scale10-ticks">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" className={i === value ? "on" : ""} onClick={() => onChange(i)} aria-label={`${i}`}>{i}</button>
        ))}
      </div>
      <div className="scale10-ends"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  );
}

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

// ─── Tap where it hurts ────────────────────────────────────────────────────
// A front view of an open mouth. Each area is a separate tap target; the
// chips underneath do the same job for anyone who finds the picture fiddly.
export function MouthMap({ value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const on = (id) => value.includes(id);
  const area = (id, d, extra = {}) => (
    <path d={d} className={`mm-area${on(id) ? " on" : ""}`} onClick={() => toggle(id)} role="button" tabIndex={0}
      aria-pressed={on(id)} aria-label={MOUTH_AREAS.find((a) => a.id === id).label}
      onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), toggle(id))} {...extra} />
  );
  return (
    <div className="mouthmap">
      <svg viewBox="0 0 320 236" aria-label="Your mouth. Tap the sore areas.">
        <defs>
          <clipPath id="mm-cavity"><ellipse cx="160" cy="118" rx="122" ry="80" /></clipPath>
        </defs>
        {/* lips: the ring between the outer and inner outline */}
        {area("lips", "M160 8C254 8 310 62 310 118S254 228 160 228 10 174 10 118 66 8 160 8Z M160 38C93 38 38 74 38 118S93 198 160 198 282 162 282 118 227 38 160 38Z", { fillRule: "evenodd" })}
        <g clipPath="url(#mm-cavity)">
          <ellipse cx="160" cy="118" rx="122" ry="80" className="mm-back" />
          {area("roof", "M-10 30C40 92 280 92 330 30V0H-10Z")}
          {area("tongue", "M62 236C62 176 104 150 160 150S258 176 258 236Z")}
          {area("cheekL", "M20 40C92 66 98 170 20 196Z")}
          {area("cheekR", "M300 40C228 66 222 170 300 196Z")}
          {area("throat", "M160 92C178 92 190 104 190 118S178 142 160 142 130 132 130 118 142 92 160 92Z")}
        </g>
        <ellipse cx="160" cy="118" rx="122" ry="80" className="mm-outline" />
        <text x="160" y="66" className="mm-label">Roof</text>
        <text x="60" y="122" className="mm-label">Cheek</text>
        <text x="260" y="122" className="mm-label">Cheek</text>
        <text x="160" y="122" className="mm-label">Throat</text>
        <text x="160" y="182" className="mm-label">Tongue</text>
        <text x="160" y="27" className="mm-label lip">Lips</text>
      </svg>
      <Chips options={MOUTH_AREAS} value={value} onChange={onChange} tone="sore" />
    </div>
  );
}

// ─── Today's two rings ─────────────────────────────────────────────────────
export function Ring({ value, tone, label, word }) {
  const r = 46, c = 2 * Math.PI * r, frac = value == null ? 0 : value / 10;
  return (
    <div className={`ring ${tone}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="ring-track" />
        <circle cx="60" cy="60" r={r} className="ring-fill" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 60 60)" />
        <text x="60" y="62" className="ring-num">{value ?? "–"}</text>
        <text x="60" y="82" className="ring-of">of 10</text>
      </svg>
      <p className="ring-label">{label}</p>
      <p className="ring-word">{value == null ? "Not logged" : word}</p>
    </div>
  );
}

// ─── Two weeks at a glance: a rose dot over a water dot per day ─────────────
export function DayStrip({ days, onDay }) {
  const size = (v) => (v == null ? 0 : 6 + v * 1.4);
  return (
    <div className="daystrip" role="list" aria-label="Last two weeks">
      {days.map((d) => {
        const wd = new Date(d.ts).toLocaleDateString("en-AU", { weekday: "narrow" });
        const label = d.e ? `${new Date(d.ts).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}: soreness ${d.e.pain ?? "–"}, dryness ${d.e.dryness ?? "–"}` : "Not logged";
        return (
          <button key={d.key} role="listitem" className={`ds-day${d.e ? "" : " empty"}`} aria-label={label} onClick={() => onDay?.(d)}>
            <span className="ds-cell"><span className="ds-dot sore" style={{ width: size(d.e?.pain), height: size(d.e?.pain) }} /></span>
            <span className="ds-cell"><span className="ds-dot dry" style={{ width: size(d.e?.dryness), height: size(d.e?.dryness) }} /></span>
            <span className="ds-wd">{wd}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Soreness and dryness over time ────────────────────────────────────────
export function TwoLineChart({ days, markers = [] }) {
  const W = 340, H = 170, L = 26, R = 8, T = 10, B = 24;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, days.length - 1);
  const y = (v) => T + ((10 - v) * (H - T - B)) / 10;
  const line = (k) => {
    let d = "", pen = false;
    days.forEach((dd, i) => {
      const v = dd.e?.[k];
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; pen = true;
    });
    return d;
  };
  const tickEvery = days.length > 16 ? 7 : 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart2" role="img"
      aria-label={`Soreness and dryness over the last ${days.length} days`}>
      {[0, 5, 10].map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="c-grid" /><text x={L - 8} y={y(v) + 4} className="c-axis" textAnchor="end">{v}</text></g>
      ))}
      {markers.map((m) => {
        const i = days.findIndex((d) => d.key === m.key);
        return i < 0 ? null : <g key={m.key}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} className="c-marker" /><text x={x(i) + 3} y={T + 9} className="c-mlabel">{m.label}</text></g>;
      })}
      <path d={line("dryness")} className="c-line dry" />
      <path d={line("pain")} className="c-line sore" />
      {days.map((d, i) => d.e && (
        <g key={d.key}>
          {d.e.dryness != null && <circle cx={x(i)} cy={y(d.e.dryness)} r="3.4" className="c-pt dry" />}
          {d.e.pain != null && <circle cx={x(i)} cy={y(d.e.pain)} r="3.4" className="c-pt sore" />}
        </g>
      ))}
      {days.map((d, i) => (i % tickEvery === (days.length - 1) % tickEvery) && (
        <text key={d.key} x={x(i)} y={H - 6} className="c-axis" textAnchor="middle">{new Date(d.ts).getDate()}</text>
      ))}
    </svg>
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
