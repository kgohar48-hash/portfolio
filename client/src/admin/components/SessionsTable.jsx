import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import { compactNum, duration, dateTime, timeAgo, flag, locationLabel, deviceLabel } from "../format";
import SessionDrawer from "./SessionDrawer";

export default function SessionsTable({ range }) {
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [includeBots, setIncludeBots] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [range, query, includeBots]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .sessions({ range, page, limit: 40, q: query, includeBots: includeBots ? 1 : 0 })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ items: [], pages: 1, total: 0 }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range, page, query, includeBots]);

  return (
    <div className="adm-card adm-card-wide">
      <div className="adm-card-head">
        <div className="adm-card-title">Sessions {data.total ? `(${compactNum(data.total)})` : ""}</div>
        <div className="adm-table-controls">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
            }}
          >
            <input
              className="adm-input adm-input-sm"
              placeholder="Search city, country, source, visitor id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <label className="adm-check">
            <input type="checkbox" checked={includeBots} onChange={(e) => setIncludeBots(e.target.checked)} /> Show bots
          </label>
          <button
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={async () => {
              const blob = await adminApi.exportSessionsCsv({ range, includeBots: includeBots ? 1 : 0 });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `sessions-${range}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Visitor</th>
              <th>Location</th>
              <th>Device</th>
              <th>Source</th>
              <th className="adm-num">Duration</th>
              <th className="adm-num">Scroll</th>
              <th className="adm-num">Clicks</th>
              <th>Reached</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s.sessionId} onClick={() => setSelected(s.sessionId)} className="adm-row-click">
                <td title={dateTime(s.startedAt)}>{timeAgo(s.startedAt)}</td>
                <td>
                  <span className="adm-vid">{s.visitorId.slice(0, 8)}</span>
                  {s.isReturning ? (
                    <span className="adm-tag adm-tag-return">return #{s.visitNumber}</span>
                  ) : (
                    <span className="adm-tag">new</span>
                  )}
                  {s.isBot && <span className="adm-tag adm-tag-bot">bot</span>}
                </td>
                <td>
                  {flag(s.geo?.countryCode)} {locationLabel(s.geo)}
                </td>
                <td>
                  <span className="adm-dot" data-t={s.device?.deviceType} /> {deviceLabel(s.device)}
                </td>
                <td>
                  <span className="adm-chan">{s.channel}</span>
                  {s.source && s.source !== "direct" ? ` · ${s.source}` : ""}
                </td>
                <td className="adm-num">{duration(s.durationMs)}</td>
                <td className="adm-num">{Math.round(s.maxScrollPct || 0)}%</td>
                <td className="adm-num">{s.clickCount || 0}</td>
                <td>
                  <span className="adm-reached">{s.sectionsViewed?.slice(-1)[0] || "—"}</span>
                  {s.contactSubmitted && <span className="adm-tag adm-tag-good">contacted</span>}
                  {s.bounced && <span className="adm-tag adm-tag-warn">bounce</span>}
                </td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={9} className="adm-empty">
                  No sessions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="adm-pager">
        <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span>
          Page {page} / {data.pages || 1}
        </span>
        <button
          className="adm-btn adm-btn-ghost adm-btn-sm"
          disabled={page >= (data.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </button>
      </div>

      {selected && <SessionDrawer sessionId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
