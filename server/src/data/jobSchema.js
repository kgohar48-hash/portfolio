/**
 * Canonical schema for a job-application record.
 *
 * This one file is the single source of truth: the Mongoose model validates
 * against these enums, the /api/admin/jobs/schema endpoint serves it to the
 * dashboard, and the dashboard shows the generated prompt so an LLM's JSON
 * output stays consistent with the tracker.
 */

export const JOB_STATUSES = [
  "to_apply",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "no_response"
];

export const WORK_MODES = ["onsite", "hybrid", "remote"];
export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship", "working-student"];
export const SENIORITY = ["intern", "junior", "mid", "senior", "lead", "principal"];
export const PRIORITIES = ["low", "medium", "high"];

/**
 * Every field an LLM may fill. `key` matches the DB field name exactly.
 */
export const JOB_FIELDS = [
  { key: "company", type: "string", required: true, desc: "Company name" },
  { key: "role", type: "string", required: true, desc: "Job title, exactly as posted" },
  { key: "location", type: "string", desc: "e.g. 'Munich, Germany' or 'Remote — EU'" },
  { key: "workMode", type: "enum", values: WORK_MODES, desc: "onsite | hybrid | remote" },
  { key: "employmentType", type: "enum", values: EMPLOYMENT_TYPES, desc: "Type of contract" },
  { key: "seniority", type: "enum", values: SENIORITY, desc: "Level the role targets" },
  { key: "jobUrl", type: "string", desc: "Link to the posting" },
  { key: "source", type: "string", desc: "Where it was found (LinkedIn, StepStone, referral, company site…)" },
  { key: "salary", type: "string", desc: "Range as stated, or an estimate, e.g. '€70k–85k'" },
  { key: "postedDate", type: "date", desc: "YYYY-MM-DD — when the job was posted" },
  { key: "deadline", type: "date", desc: "YYYY-MM-DD — application deadline, if any" },
  { key: "summary", type: "string", desc: "2–3 sentence plain-English summary of the role" },
  { key: "keyRequirements", type: "string[]", desc: "The hard requirements pulled from the JD" },
  { key: "matchedStrengths", type: "string[]", desc: "My experience / skills that directly match the JD" },
  { key: "gaps", type: "string[]", desc: "Requirements I only partially meet or don't meet" },
  { key: "fitScore", type: "number", desc: "0–100 — honest estimate of how well my profile matches" },
  { key: "atsKeywords", type: "string[]", desc: "Keywords to surface in the resume for ATS parsing" },
  { key: "resumeChanges", type: "string[]", desc: "Bullet list of the tailoring edits made to the resume" },
  { key: "coverLetter", type: "string", desc: "Full tailored cover letter text (or a short summary)" },
  { key: "contactName", type: "string", desc: "Recruiter / hiring manager name, if known" },
  { key: "contactEmail", type: "string", desc: "Contact email, if known" },
  { key: "priority", type: "enum", values: PRIORITIES, desc: "How much I want this one" },
  { key: "status", type: "enum", values: JOB_STATUSES, desc: "Pipeline stage — usually 'to_apply' or 'applied'" },
  { key: "appliedDate", type: "date", desc: "YYYY-MM-DD — only if already applied" },
  { key: "nextAction", type: "string", desc: "The next concrete thing I should do" },
  { key: "nextActionDate", type: "date", desc: "YYYY-MM-DD — when to do the next action" },
  { key: "tags", type: "string[]", desc: "Freeform labels, e.g. ['visa-sponsor','ai','startup']" },
  { key: "notes", type: "string", desc: "Anything else worth remembering" }
];

/** An example object with placeholder values, shown on the page. */
export function schemaTemplate() {
  const obj = {};
  for (const f of JOB_FIELDS) {
    if (f.type === "string[]") obj[f.key] = ["…"];
    else if (f.type === "number") obj[f.key] = 0;
    else if (f.type === "date") obj[f.key] = "YYYY-MM-DD";
    else if (f.type === "enum") obj[f.key] = f.values[0];
    else obj[f.key] = f.required ? "…" : null;
  }
  return obj;
}

/** The copy-paste instruction block for the LLM. */
export function llmPrompt() {
  const lines = JOB_FIELDS.map(
    (f) =>
      `- ${f.key} (${f.type}${f.values ? `: ${f.values.join(" | ")}` : ""})${f.required ? " — REQUIRED" : ""}: ${f.desc}`
  ).join("\n");

  return `After you tailor my resume and cover letter for the job description above, ALSO output one JSON object in its own \`\`\`json code block that matches this schema exactly.

Rules:
- Include every key. Use null for anything you can't determine (except "company" and "role", which must be filled).
- Dates are strings in YYYY-MM-DD format.
- enum fields must use exactly one of the listed values.
- Array fields are arrays of short strings.
- Put the FULL tailored cover letter text in "coverLetter".
- Output only the JSON in that code block — no commentary inside it.

Fields:
${lines}

Shape:
${JSON.stringify(schemaTemplate(), null, 2)}`;
}
