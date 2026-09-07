export const STATUS_LABEL = {
  to_apply: "To apply",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No response"
};

export const STATUS_ORDER = [
  "to_apply",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "no_response"
];

// which stat pill a status rolls into
export const STATUS_GROUP = {
  to_apply: "toApply",
  applied: "active",
  screening: "active",
  interviewing: "interviewing",
  offer: "offer",
  rejected: "closed",
  withdrawn: "closed",
  no_response: "closed"
};

export function jobDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function toDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
