import { PH_ROOT_CRITICAL, SIP_BANDS } from "../data/clinical.js";
import { DAY, fmtShort } from "../lib/store.js";

// Stacked panels on one shared time axis. No dual axes: two scales on one
// frame invite readers to see correlations that aren't there.
export function TrendPanels({ entries }) {
  const W = 340, PL = 30, PR = 12, H = 78, PT = 8, PB = 10;
  const ts = entries.map((e) => e.ts);
  if (!ts.length) return null;
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 - t0 < 2 * DAY) { t0 -= DAY; t1 += DAY; }
  const x = (t) => PL + ((t - t0) / (t1 - t0)) * (W - PL - PR);

  const Panel = ({ title, unit, k, lo, hi, ticks, color, bands, crit }) => {
    const d = entries.filter((e) => e[k] != null).sort((a, b) => a.ts - b.ts);
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    return (
      <div className="panel">
        <div className="panel-head"><span>{title}</span><em>{unit}</em></div>
        {d.length === 0 ? <div className="panel-empty">Nothing recorded yet</div> : (
          <svg viewBox={`0 0 ${W} ${H}`} className="panel-svg" role="img" aria-label={`${title} over time`}>
            {bands?.map((b, i) => (
              <rect key={i} x={PL} y={y(Math.min(hi, b.hi + 0.5))} width={W - PL - PR}
                height={Math.abs(y(Math.max(lo, b.lo - 0.5)) - y(Math.min(hi, b.hi + 0.5)))} fill={b.color} opacity="0.12" />
            ))}
            {ticks.map((tk) => (
              <g key={tk}>
                <line x1={PL} x2={W - PR} y1={y(tk)} y2={y(tk)} stroke="var(--line)" />
                <text x={PL - 6} y={y(tk) + 3.5} textAnchor="end" className="ax">{tk}</text>
              </g>
            ))}
            {crit != null && <line x1={PL} x2={W - PR} y1={y(crit)} y2={y(crit)} stroke="var(--red)" strokeDasharray="4 3" strokeWidth="1.3" />}
            {d.length > 1 && (
              <path d={d.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(" ")}
                fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {d.map((p) => <circle key={p.id} cx={x(p.ts)} cy={y(p[k])} r="3.4" fill="var(--card)" stroke={color} strokeWidth="2.2" />)}
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className="panels">
      <Panel title="Mouth pain" unit="0–10" k="pain" lo={0} hi={10} ticks={[0, 5, 10]} color="#C2563A" />
      <Panel title="Dryness" unit="0–10" k="dryness" lo={0} hi={10} ticks={[0, 5, 10]} color="var(--accent)" />
      <Panel title="Dry mouth score (SIP)" unit="5–15, every 2 weeks" k="sip" lo={5} hi={15} ticks={[5, 10, 15]} color="var(--ink)" bands={SIP_BANDS} />
      <Panel title="Saliva pH" unit={`dashed line = ${PH_ROOT_CRITICAL}`} k="ph" lo={5} hi={7.8} ticks={[5, 6, 7]} color="#8A5A2B" crit={PH_ROOT_CRITICAL} />
      <div className="axis-dates"><span>{fmtShort(t0)}</span><span>{fmtShort(t1)}</span></div>
    </div>
  );
}
