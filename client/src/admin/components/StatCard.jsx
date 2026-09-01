export default function StatCard({ label, value, hint, accent }) {
  return (
    <div className={`adm-stat ${accent ? `adm-stat-${accent}` : ""}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      {hint && <div className="adm-stat-hint">{hint}</div>}
    </div>
  );
}
