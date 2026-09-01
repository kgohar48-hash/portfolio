import { useMemo, useRef, useState } from "react";

const C_SESSIONS = "#3987e5"; // categorical slot 1 (blue)
const C_VISITORS = "#d95926"; // categorical slot 2 (orange)

/**
 * Two-series time chart: sessions (area+line) and unique visitors (line).
 * Hand-drawn SVG — crosshair + shared tooltip on hover, legend always present,
 * endpoints direct-labelled.
 */
export default function TimeSeriesChart({ data }) {
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const W = 760;
  const H = 240;
  const pad = { t: 16, r: 44, b: 26, l: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const series = useMemo(() => {
    const pts = data.map((d, i) => ({ ...d, i }));
    const maxY = Math.max(4, ...pts.map((d) => Math.max(d.sessions, d.visitors)));
    const x = (i) => pad.l + (pts.length <= 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
    const y = (v) => pad.t + innerH - (v / maxY) * innerH;
    const line = (key) => pts.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key])}`).join(" ");
    const area =
      pts.length > 0
        ? `${line("sessions")} L${x(pts.length - 1)},${pad.t + innerH} L${x(0)},${pad.t + innerH} Z`
        : "";
    return { pts, maxY, x, y, lineSessions: line("sessions"), lineVisitors: line("visitors"), area };
  }, [data]);

  if (!data.length) {
    return (
      <div className="adm-card adm-card-wide">
        <div className="adm-card-title">Traffic over time</div>
        <div className="adm-empty">No sessions in this range yet</div>
      </div>
    );
  }

  const { pts, maxY, x, y } = series;
  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxY * f));
  const last = pts[pts.length - 1];
  // nudge the two end-labels apart when the lines converge
  const labelGap = Math.abs(y(last.sessions) - y(last.visitors)) < 13;
  const sLabelY = y(last.sessions) + (labelGap ? -4 : 3);
  const vLabelY = y(last.visitors) + (labelGap ? 12 : 3);

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - pad.l) / innerW) * (pts.length - 1));
    setHoverIdx(Math.max(0, Math.min(pts.length - 1, idx)));
  }

  const hovered = hoverIdx != null ? pts[hoverIdx] : null;

  return (
    <div className="adm-card adm-card-wide">
      <div className="adm-card-head">
        <div className="adm-card-title">Traffic over time</div>
        <div className="adm-legend">
          <span className="adm-legend-item">
            <i style={{ background: C_SESSIONS }} /> Sessions
          </span>
          <span className="adm-legend-item">
            <i style={{ background: C_VISITORS }} /> Unique visitors
          </span>
        </div>
      </div>

      <div className="adm-ts-wrap" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="adm-ts" onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="adm-ts-grid" />
              <text x={pad.l - 8} y={y(t) + 3} className="adm-ts-tick" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          <path d={series.area} fill={C_SESSIONS} fillOpacity="0.1" />
          <path d={series.lineSessions} fill="none" stroke={C_SESSIONS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={series.lineVisitors} fill="none" stroke={C_VISITORS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* endpoint markers + direct labels */}
          <circle cx={x(last.i)} cy={y(last.sessions)} r="4" fill={C_SESSIONS} stroke="var(--adm-surface)" strokeWidth="2" />
          <circle cx={x(last.i)} cy={y(last.visitors)} r="4" fill={C_VISITORS} stroke="var(--adm-surface)" strokeWidth="2" />
          <text x={x(last.i) + 8} y={sLabelY} className="adm-ts-endlabel" fill={C_SESSIONS}>
            {last.sessions}
          </text>
          <text x={x(last.i) + 8} y={vLabelY} className="adm-ts-endlabel" fill={C_VISITORS}>
            {last.visitors}
          </text>

          {hovered && (
            <>
              <line x1={x(hovered.i)} x2={x(hovered.i)} y1={pad.t} y2={pad.t + innerH} className="adm-ts-crosshair" />
              <circle cx={x(hovered.i)} cy={y(hovered.sessions)} r="4" fill={C_SESSIONS} stroke="var(--adm-surface)" strokeWidth="2" />
              <circle cx={x(hovered.i)} cy={y(hovered.visitors)} r="4" fill={C_VISITORS} stroke="var(--adm-surface)" strokeWidth="2" />
            </>
          )}

          {/* x labels: first, middle, last */}
          {[0, Math.floor((pts.length - 1) / 2), pts.length - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((i) => (
              <text key={i} x={x(i)} y={H - 8} className="adm-ts-tick" textAnchor="middle">
                {fmtDate(pts[i].date)}
              </text>
            ))}
        </svg>

        {hovered && (
          <div
            className="adm-ts-tip"
            style={{ left: `${(x(hovered.i) / W) * 100}%` }}
          >
            <div className="adm-ts-tip-date">{fmtDate(hovered.date, true)}</div>
            <div>
              <i style={{ background: C_SESSIONS }} /> {hovered.sessions} sessions
            </div>
            <div>
              <i style={{ background: C_VISITORS }} /> {hovered.visitors} visitors
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(s, long = false) {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString(undefined, long ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}
