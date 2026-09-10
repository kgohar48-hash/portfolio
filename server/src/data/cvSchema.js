/**
 * Canonical schema for a generated CV + cover letter.
 *
 * Mirrors the jobSchema.js pattern: this file drives the Gemini structured-output
 * response schema, the /api/admin/cv/schema endpoint (transparency), the
 * server-side sanitiser, and the CV page renderer's expectations.
 */

/** Sections the renderer knows how to lay out, in order. */
export const CV_SECTIONS = ["summary", "skills", "education", "experience", "projects", "extras"];

/**
 * Gemini `responseSchema` — a subset of OpenAPI. One call returns the tailored
 * CV, the cover letter, and the extracted job metadata.
 */
export const CV_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          group: { type: "string" },
          items: { type: "array", items: { type: "string" } }
        },
        required: ["group", "items"]
      }
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          school: { type: "string" },
          degree: { type: "string" },
          location: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["school", "degree"]
      }
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["company", "role", "bullets"]
      }
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          tagline: { type: "string" },
          period: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["name", "bullets"]
      }
    },
    extras: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"]
      }
    },
    coverLetter: { type: "string" },
    job: {
      type: "object",
      properties: {
        company: { type: "string" },
        role: { type: "string" },
        location: { type: "string" },
        keyRequirements: { type: "array", items: { type: "string" } },
        matchedStrengths: { type: "array", items: { type: "string" } },
        atsKeywords: { type: "array", items: { type: "string" } },
        fitScore: { type: "number" }
      },
      required: ["company", "role"]
    }
  },
  required: ["summary", "skills", "education", "experience", "projects", "coverLetter", "job"]
};

/** The instruction block sent to the LLM. */
export function cvLlmPrompt(master, jobDescription, { company, role }) {
  return `You are tailoring ${master.name}'s CV and writing a matching cover letter for one specific job.

MASTER PROFILE — the ONLY source of facts. You may reorder, trim, merge, and reword,
but you must NOT invent employers, job titles, dates, numbers, degrees, or skills
that do not appear here. Keep every quantitative claim exactly as written.

${JSON.stringify(master, null, 2)}

TARGET JOB
Company: ${company}
Role: ${role}
Job description:
"""
${String(jobDescription || "").slice(0, 12000)}
"""

PRODUCE ONE JSON OBJECT:

- "summary": 3–4 sentences rewritten to foreground the experience and skills this
  job cares about. No leading "I" on every sentence. Confident, specific, factual.

- "skills": reorder the groups and the items within them so the most
  job-relevant come first. You may rename or merge groups to fit the role. Every
  item must trace back to the master's skills.

- "education": keep both entries, factual. Bullets may be trimmed.

- "experience": keep every role from the master. Rewrite the bullets to
  emphasise what matches this JD and to surface its terminology — without
  fabricating. Numbers stay exact.

- "projects": include the 2–3 projects most relevant to this role. For each,
  copy the master's "key" verbatim (the CV links depend on it).

- "extras": keep the useful ones for this application (languages, work
  authorization, enrollment).

- "job": extract the company, role, and location; list the key requirements from
  the JD; list which of ${master.name}'s real strengths match them; list ATS
  keywords worth surfacing; and give an honest fitScore from 0 to 100.

- "coverLetter": 250–350 words, professional European register, in
  ${master.name}'s first-person voice, addressed to ${company}. Reference concrete
  achievements from the master that line up with the JD. Use the real company
  name throughout — never a "[Company]" placeholder. End with a courteous close.

Return only the JSON object, no commentary.`;
}

/** Placeholder object shown on the schema endpoint. */
export function cvTemplate() {
  return {
    summary: "…",
    skills: [{ group: "…", items: ["…"] }],
    education: [{ school: "…", degree: "…", location: "…", start: "…", end: "…", bullets: ["…"] }],
    experience: [{ company: "…", role: "…", location: "…", start: "…", end: "…", bullets: ["…"] }],
    projects: [{ key: "…", name: "…", tagline: "…", period: "…", bullets: ["…"] }],
    extras: [{ label: "…", value: "…" }],
    coverLetter: "…",
    job: {
      company: "…",
      role: "…",
      location: "…",
      keyRequirements: ["…"],
      matchedStrengths: ["…"],
      atsKeywords: ["…"],
      fitScore: 0
    }
  };
}
