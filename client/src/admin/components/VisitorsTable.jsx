import { Fragment, useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import { compactNum, duration, timeAgo, dateTime, flag, locationLabel } from "../format";

export default function VisitorsTable() {
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [returningOnly, setReturningOnly] = useState(false);
  const [knownOnly, setKnownOnly] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => setPage(1), [returningOnly, knownOnly]);

  useEffect(() => {
    let alive = true;
    adminApi
      .visitors({ page, limit: 40, returning: returningOnly ? 1 : 0, known: knownOnly ? 1 : 0 })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ items: [], pages: 1, total: 0 }));
    return () => {
      alive = false;
    };
  }, [page, returningOnly, knownOnly]);

  return (
    <div className="adm-card adm-card-wide">
      <div className="adm-card-head">
        <div className="adm-card-title">Visitors {data.total ? `(${compactNum(data.total)})` : ""}</div>
        <div className="adm-check-row">
          <label className="adm-check">
            <input type="checkbox" checked={knownOnly} onChange={(e) => setKnownOnly(e.target.checked)} /> Known only
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={returningOnly} onChange={(e) => setReturningOnly(e.target.checked)} /> Returning only
          </label>
        </div>
      </div>

      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>First seen</th>
              <th>Last seen</th>
              <th className="adm-num">Visits</th>
              <th className="adm-num">Engaged</th>
              <th>Location</th>
              <th>First source</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <Fragment key={v.visitorId}>
                <tr className="adm-row-click" onClick={() => setOpen(open === v.visitorId ? null : v.visitorId)}>
                  <td>
                    <span className="adm-vid">{v.visitorId.slice(0, 8)}</span>
                    {v.sessionCount > 1 && <span className="adm-tag adm-tag-return">×{v.sessionCount}</span>}
                    {v.label && (
                      <div className="adm-vid-label" title={`Known via ${v.knownVia}`}>
                        ★ {v.label}
                      </div>
                    )}
                  </td>
                  <td title={dateTime(v.firstSeenAt)}>{timeAgo(v.firstSeenAt)}</td>
                  <td title={dateTime(v.lastSeenAt)}>{timeAgo(v.lastSeenAt)}</td>
                  <td className="adm-num">{v.sessionCount}</td>
                  <td className="adm-num">{duration(v.totalEngagedMs)}</td>
                  <td>
                    {flag(v.lastGeo?.countryCode)} {locationLabel(v.lastGeo)}
                  </td>
                  <td>
                    <span className="adm-chan">{v.firstChannel || "—"}</span>
                    {v.firstSource && v.firstSource !== "direct" ? ` · ${v.firstSource}` : ""}
                  </td>
                </tr>
                {open === v.visitorId && <VisitorDetailRow id={v.visitorId} />}
              </Fragment>
            ))}
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
        <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={page >= (data.pages || 1)} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

function VisitorDetailRow({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    adminApi.visitor(id).then(setD).catch(() => setD({ sessions: [] }));
  }, [id]);
  return (
    <tr className="adm-subrow">
      <td colSpan={7}>
        {!d ? (
          "Loading…"
        ) : (
          <div className="adm-subrow-inner">
            {d.visitor?.firstReferrer && (
              <div className="adm-card-sub">
                First touch: <code>{d.visitor.firstReferrer || "direct"}</code> · landing{" "}
                <code>{d.visitor.firstLandingUrl}</code>
              </div>
            )}
            <ol className="adm-visit-list">
              {(d.sessions || []).map((s) => (
                <li key={s.sessionId}>
                  <span className="adm-timeline-t">{dateTime(s.startedAt)}</span>
                  <span>
                    {flag(s.geo?.countryCode)} {locationLabel(s.geo)} · {s.device?.browser}/{s.device?.os} ·{" "}
                    {s.channel}/{s.source} · {duration(s.durationMs)} · scroll {Math.round(s.maxScrollPct || 0)}% ·{" "}
                    {s.sectionsViewed?.length || 0} sections
                    {s.contactSubmitted && <span className="adm-tag adm-tag-good">contacted</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </td>
    </tr>
  );
}
