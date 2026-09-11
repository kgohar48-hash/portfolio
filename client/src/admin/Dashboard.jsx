import { useEffect, useState } from "react";
import { adminApi } from "./adminApi";
import { compactNum, duration } from "./format";
import StatCard from "./components/StatCard";
import { BarList, Columns, Funnel } from "./components/charts";
import TimeSeriesChart from "./components/TimeSeriesChart";
import SessionsTable from "./components/SessionsTable";
import VisitorsTable from "./components/VisitorsTable";
import JobsPanel from "./components/JobsPanel";
import MailPanel from "./components/MailPanel";
import CvPanel from "./components/CvPanel";

const RANGES = [
  ["24h", "24 hours"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["365d", "1 year"],
  ["all", "All time"]
];

const CHANNEL_LABEL = { organic: "Search", social: "Social", referral: "Referral", direct: "Direct", campaign: "Campaign" };

const VALID_TABS = ["overview", "sessions", "visitors", "jobs", "inbox", "cv"];
const TAB_LABEL = {
  overview: "Overview",
  sessions: "Sessions",
  visitors: "Visitors",
  jobs: "Job applications",
  inbox: "Inbox",
  cv: "CV & links"
};

export default function Dashboard({ onLogout }) {
  const [range, setRange] = useState("7d");
  const [tab, setTabState] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    return VALID_TABS.includes(t) ? t : "overview";
  });
  const setTab = (t) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("t", t);
    window.history.replaceState(null, "", url);
  };
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState("");
  const [includeBots, setIncludeBots] = useState(false);

  const analyticsTab = tab === "overview" || tab === "sessions" || tab === "visitors";

  useEffect(() => {
    if (!analyticsTab) return;
    let alive = true;
    setOv(null);
    setErr("");
    adminApi
      .overview({ range, includeBots: includeBots ? 1 : 0 })
      .then((d) => alive && setOv(d))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [range, includeBots, analyticsTab]);

  const c = ov?.cards;

  return (
    <div className="adm">
      <header className="adm-header">
        <div className="adm-header-l">
          <span className="adm-logo">G</span>
          <div>
            <div className="adm-h-title">Portfolio Admin</div>
            <div className="adm-h-sub">goharawan.com</div>
          </div>
        </div>
        <div className="adm-header-r">
          {analyticsTab && (
            <>
              <div className="adm-range">
                {RANGES.map(([v, label]) => (
                  <button key={v} className={range === v ? "active" : ""} onClick={() => setRange(v)}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="adm-check">
                <input type="checkbox" checked={includeBots} onChange={(e) => setIncludeBots(e.target.checked)} /> Bots
              </label>
            </>
          )}
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="adm-tabs">
        {VALID_TABS.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>

      <main className="adm-main">
        {err && <div className="adm-error-banner">{err}</div>}
        {ov && ov.db === false && (
          <div className="adm-error-banner">
            No database connected — analytics aren't being stored. Set <code>MONGO_URI</code> on the API service.
          </div>
        )}

        {tab === "overview" && (
          <>
            {!ov && !err && <div className="adm-loading">Loading analytics…</div>}
            {c && (
              <>
                <section className="adm-stats">
                  <StatCard label="Sessions" value={compactNum(c.sessions)} hint={`${compactNum(c.uniqueVisitors)} unique visitors`} />
                  <StatCard label="Returning" value={compactNum(c.returningVisitors)} hint={`${compactNum(c.newVisitors)} new`} />
                  <StatCard label="Avg. duration" value={duration(c.avgDurationMs)} hint={`${duration(c.avgEngagedMs)} engaged`} />
                  <StatCard label="Avg. scroll depth" value={`${Math.round(c.avgScrollPct)}%`} hint={`${c.avgClicks.toFixed(1)} clicks / session`} />
                  <StatCard label="Bounce rate" value={`${Math.round(c.bounceRate * 100)}%`} hint="≤1 section, <15% scroll, <10s" accent={c.bounceRate > 0.6 ? "warn" : undefined} />
                  <StatCard label="Contact form" value={compactNum(c.contactSubmitted)} hint={`${compactNum(c.contactStarted)} started · ${compactNum(c.outboundClicks)} outbound clicks`} accent={c.contactSubmitted > 0 ? "good" : undefined} />
                </section>

                <TimeSeriesChart data={ov.timeseries} />

                <section className="adm-grid">
                  <BarList
                    title="Channels"
                    data={ov.breakdowns.channels}
                    renderLabel={(d) => CHANNEL_LABEL[d.label] || d.label}
                  />
                  <BarList title="Sources" data={ov.breakdowns.sources} />
                  <BarList title="Referrers" data={ov.breakdowns.referrers} empty="No referrers — all direct" />
                  <BarList title="Countries" data={ov.breakdowns.countries} />
                  <BarList title="Cities" data={ov.breakdowns.cities} />
                  <BarList title="Browsers" data={ov.breakdowns.browsers} />
                  <BarList title="Operating systems" data={ov.breakdowns.os} />
                  <BarList
                    title="Device types"
                    data={ov.breakdowns.devices}
                    renderLabel={(d) => d.label[0].toUpperCase() + d.label.slice(1)}
                  />
                  <BarList title="Most-clicked" data={ov.breakdowns.topClicks} empty="No clicks tracked yet" />
                </section>

                <section className="adm-grid adm-grid-3">
                  <Funnel title="Section funnel" data={ov.engagement.funnel} />
                  <Columns title="Scroll depth" subtitle="Furthest each session scrolled" data={ov.engagement.scrollDistribution} />
                  <Columns title="Visit duration" data={ov.engagement.durationDistribution} />
                </section>
              </>
            )}
          </>
        )}

        {tab === "sessions" && <SessionsTable range={range} />}
        {tab === "visitors" && <VisitorsTable />}
        {tab === "jobs" && <JobsPanel />}
        {tab === "inbox" && <MailPanel />}
        {tab === "cv" && <CvPanel />}
      </main>
    </div>
  );
}
