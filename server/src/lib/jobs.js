/**
 * Shared job-application helpers: field normalisation + the company/role upsert.
 * Used by the Jobs tab route (adminJobs.js) and the CV generator (adminCv.js).
 */

import JobApplication from "../models/JobApplication.js";
import { JOB_STATUSES, WORK_MODES, EMPLOYMENT_TYPES, SENIORITY, PRIORITIES } from "../data/jobSchema.js";

export const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
export const str = (v, max) => (v == null ? undefined : String(v).slice(0, max));
export const oneOf = (v, list) => (list.includes(v) ? v : undefined);
export const strArr = (v, maxItems = 50, maxLen = 500) =>
  Array.isArray(v)
    ? v
        .filter((x) => x != null && String(x).trim())
        .slice(0, maxItems)
        .map((x) => String(x).slice(0, maxLen))
    : undefined;
export const asDate = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Pull the known job fields out of an arbitrary object, typed + clamped. */
export function normalizeInput(body = {}) {
  const out = {};
  const setStr = (k, max) => {
    const v = str(body[k], max);
    if (v !== undefined && v !== "") out[k] = v;
  };
  const setArr = (k) => {
    const v = strArr(body[k]);
    if (v) out[k] = v;
  };
  const setDate = (k) => {
    const v = asDate(body[k]);
    if (v) out[k] = v;
  };

  setStr("company", 200);
  setStr("role", 200);
  setStr("location", 200);
  setStr("jobUrl", 1000);
  setStr("source", 200);
  setStr("salary", 200);
  setStr("summary", 4000);
  setStr("coverLetter", 20000);
  setStr("contactName", 200);
  setStr("contactEmail", 200);
  setStr("nextAction", 2000);
  setStr("notes", 10000);

  const wm = oneOf(body.workMode, WORK_MODES);
  if (wm) out.workMode = wm;
  const et = oneOf(body.employmentType, EMPLOYMENT_TYPES);
  if (et) out.employmentType = et;
  const sn = oneOf(body.seniority, SENIORITY);
  if (sn) out.seniority = sn;
  const pr = oneOf(body.priority, PRIORITIES);
  if (pr) out.priority = pr;
  const st = oneOf(body.status, JOB_STATUSES);
  if (st) out.status = st;

  if (body.fitScore != null && !Number.isNaN(Number(body.fitScore))) {
    out.fitScore = Math.max(0, Math.min(100, Math.round(Number(body.fitScore))));
  }

  setArr("keyRequirements");
  setArr("matchedStrengths");
  setArr("gaps");
  setArr("atsKeywords");
  setArr("resumeChanges");
  setArr("tags");

  setDate("postedDate");
  setDate("deadline");
  setDate("appliedDate");
  setDate("nextActionDate");

  return out;
}

/** Apply normalised fields onto a JobApplication doc, tracking status changes. */
export function applyFields(job, fields, { via = "json" } = {}) {
  if (fields.status && fields.status !== job.status) {
    job.statusHistory.push({ at: new Date(), from: job.status, to: fields.status, via });
    if (fields.status === "applied" && !fields.appliedDate && !job.appliedDate) {
      job.appliedDate = new Date();
    }
  }
  Object.assign(job, fields);
  if (fields.company) job.companyKey = norm(fields.company);
  if (fields.role) job.roleKey = norm(fields.role);
  job.lastJson = fields;
}

/**
 * Create-or-update the job for a generated CV. No client round-trip / duplicate
 * prompt — a CV for the same company+role just updates the existing entry and
 * attaches the new CV.
 */
export async function upsertJobForCv({ company, role, fields = {}, cvSlug, cvUrl, coverLetter }) {
  const companyKey = norm(company);
  const roleKey = norm(role);
  let job = await JobApplication.findOne({ companyKey, roleKey });
  const isNew = !job;

  if (!job) {
    job = new JobApplication({
      company,
      role,
      companyKey,
      roleKey,
      status: "to_apply",
      createdVia: "cv",
      statusHistory: [{ at: new Date(), from: "to_apply", to: "to_apply", via: "cv", note: "CV generated" }]
    });
  }

  applyFields(job, { ...fields, company, role }, { via: "cv" });

  if (coverLetter) job.coverLetter = String(coverLetter).slice(0, 20000);
  if (cvUrl) job.cvUrl = cvUrl;
  if (cvSlug) {
    job.cvSlug = cvSlug;
    if (!job.cvSlugs.includes(cvSlug)) job.cvSlugs.push(cvSlug);
  }

  await job.save();
  return { job, isNew };
}

/**
 * Append a capped activity entry to a job + bump the denormalised counters.
 * Atomic ($push/$inc) so concurrent open / click / visit writes never collide.
 */
export async function recordCvActivity(jobId, entry, { cap = 200 } = {}) {
  if (!jobId) return;
  const update = {
    $push: { cvActivity: { $each: [entry], $slice: -cap } }
  };
  if ((entry.type === "open" || entry.type === "site_visit") && !entry.isBot) {
    update.$inc = { employerViewCount: 1 };
    update.$set = { employerLastViewAt: entry.at || new Date() };
  }
  await JobApplication.updateOne({ _id: jobId }, update);
}
