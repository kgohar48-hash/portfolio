import { useState } from "react";
import { compactNum } from "../format";

/* ---------------------------------------------------------------------------
 * BarList — horizontal ranked bars for a breakdown (single blue hue).
 * ------------------------------------------------------------------------- */
export function BarList({ title, data, total, format = compactNum, empty = "No data yet", renderLabel }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const sum = total ?? data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="adm-card">
      <div className="adm-card-title">{title}</div>
      {data.length === 0 ? (
        <div className="adm-empty">{empty}</div>
      ) : (
        <ul className="adm-barlist">
          {data.map((d, i) => (
            <li key={(d.label ?? "∅") + i} title={`${d.label}: ${d.count}`}>
              <div className="adm-barlist-row">
                <span className="adm-barlist-label">{renderLabel ? renderLabel(d) : d.label || "—"}</span>
                <span className="adm-barlist-val">
                  {format(d.count)}
                  {sum > 0 && <span className="adm-barlist-pct">{Math.round((d.count / sum) * 100)}%</span>}
                </span>
              </div>
              <div className="adm-barlist-track">
                <div className="adm-barlist-fill" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Columns — vertical bars for a small distribution (single blue hue).
 * ------------------------------------------------------------------------- */
export function Columns({ title, data, subtitle }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="adm-card">
      <div className="adm-card-title">{title}</div>
      {subtitle && <div className="adm-card-sub">{subtitle}</div>}
      <div className="adm-columns">
        {data.map((d, i) => (
          <div
            key={d.label + i}
            className="adm-column"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="adm-column-bar-wrap">
              {hover === i && (
                <div className="adm-column-tip">
                  {d.count} {d.count === 1 ? "session" : "sessions"}
                  {total > 0 && ` · ${Math.round((d.count / total) * 100)}%`}
                </div>
              )}
              <div className="adm-column-bar" style={{ height: `${(d.count / max) * 100}%` }} />
            </div>
            <div className="adm-column-label">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Funnel — section-by-section reach, ordinal blue ramp (light → dark).
 * ------------------------------------------------------------------------- */
const FUNNEL_RAMP = ["#b7d3f6", "#8fbcf0", "#6da7ec", "#4a8fe3", "#2f7ad4", "#256abf", "#1c5cab", "#184f95"];

export function Funnel({ title, data }) {
  const first = data.find((d) => d.count > 0)?.count || Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="adm-card">
      <div className="adm-card-title">{title}</div>
      <div className="adm-card-sub">How far down the page visitors actually get</div>
      <ul className="adm-funnel">
        {data.map((d, i) => {
          const rel = first > 0 ? d.count / first : 0;
          return (
            <li key={d.section}>
              <div className="adm-funnel-row">
                <span className="adm-funnel-label">{d.section}</span>
                <span className="adm-funnel-val">
                  {d.count}
                  <span className="adm-barlist-pct">{Math.round(rel * 100)}%</span>
                </span>
              </div>
              <div className="adm-funnel-track">
                <div
                  className="adm-funnel-fill"
                  style={{ width: `${Math.max(rel * 100, d.count > 0 ? 4 : 0)}%`, background: FUNNEL_RAMP[i % FUNNEL_RAMP.length] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
