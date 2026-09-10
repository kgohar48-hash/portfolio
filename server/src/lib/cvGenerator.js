/**
 * Tailor the master résumé into a job-specific CV + cover letter via Gemini.
 */

import Content from "../models/Content.js";
import { callGemini, GEMINI_MODEL } from "./gemini.js";
import { cvMaster as fallbackMaster } from "../data/cvMaster.js";
import { CV_RESPONSE_SCHEMA, cvLlmPrompt } from "../data/cvSchema.js";

const MASTER_KEY = "cv_master";

/** The editable master résumé — Content doc if present, else the bundled file. */
export async function getMaster() {
  try {
    const doc = await Content.findOne({ key: MASTER_KEY }).lean();
    if (doc?.data && typeof doc.data === "object") return doc.data;
  } catch {
    /* fall through */
  }
  return fallbackMaster;
}

export async function saveMaster(data) {
  const doc = await Content.findOneAndUpdate(
    { key: MASTER_KEY },
    { key: MASTER_KEY, data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.data;
}

const clampStr = (v, n) => (v == null ? "" : String(v).slice(0, n));
const clampArr = (v, items, len) =>
  Array.isArray(v) ? v.filter((x) => x != null && String(x).trim()).slice(0, items).map((x) => String(x).slice(0, len)) : [];

/** Coerce the model output into the shape the CV page expects. */
function sanitiseCv(raw, master) {
  const validKeys = new Set((master.projects || []).map((p) => p.key));
  return {
    name: master.name,
    title: master.title,
    location: master.location,
    summary: clampStr(raw.summary, 2000),
    skills: (raw.skills || [])
      .map((g) => ({
        group: clampStr(g && g.group, 120),
        items: clampArr(g && g.items, 30, 200)
      }))
      .filter((g) => g.group && g.items.length)
      .slice(0, 12),
    education: (raw.education || []).slice(0, 6).map((e) => ({
      school: clampStr(e.school, 200),
      degree: clampStr(e.degree, 200),
      location: clampStr(e.location, 120),
      start: clampStr(e.start, 40),
      end: clampStr(e.end, 40),
      bullets: clampArr(e.bullets, 8, 400)
    })),
    experience: (raw.experience || []).slice(0, 10).map((x) => ({
      company: clampStr(x.company, 200),
      role: clampStr(x.role, 200),
      location: clampStr(x.location, 120),
      start: clampStr(x.start, 40),
      end: clampStr(x.end, 40),
      bullets: clampArr(x.bullets, 12, 600)
    })),
    projects: (raw.projects || [])
      .slice(0, 6)
      .map((p) => {
        // trust the master for name/url/period; the model only picks + rewrites bullets
        const base = (master.projects || []).find((mp) => mp.key === p.key || mp.name === p.name);
        return {
          key: base?.key || (validKeys.has(p.key) ? p.key : undefined),
          name: base?.name || clampStr(p.name, 160),
          tagline: clampStr(p.tagline || base?.tagline, 160),
          period: clampStr(p.period || base?.period, 60),
          bullets: clampArr(p.bullets, 8, 500)
        };
      })
      .filter((p) => p.name),
    extras: (raw.extras || [])
      .map((x) => ({ label: clampStr(x && x.label, 60), value: clampStr(x && x.value, 400) }))
      .filter((x) => x.label && x.value)
      .slice(0, 8)
  };
}

function sanitiseJobMeta(raw = {}) {
  return {
    company: clampStr(raw.company, 200),
    role: clampStr(raw.role, 200),
    location: clampStr(raw.location, 200),
    keyRequirements: clampArr(raw.keyRequirements, 30, 400),
    matchedStrengths: clampArr(raw.matchedStrengths, 30, 400),
    atsKeywords: clampArr(raw.atsKeywords, 40, 80),
    fitScore:
      raw.fitScore != null && !Number.isNaN(Number(raw.fitScore))
        ? Math.max(0, Math.min(100, Math.round(Number(raw.fitScore))))
        : undefined
  };
}

/**
 * @returns {Promise<{ cv: object, coverLetter: string, jobMeta: object, model: string }>}
 */
export async function generateCv({ company, role, jobDescription }) {
  const master = await getMaster();
  const raw = await callGemini({
    prompt: cvLlmPrompt(master, jobDescription, { company, role }),
    schema: CV_RESPONSE_SCHEMA,
    temperature: 0.3,
    timeoutMs: 60000
  });

  return {
    cv: sanitiseCv(raw, master),
    coverLetter: clampStr(raw.coverLetter, 8000),
    jobMeta: sanitiseJobMeta(raw.job),
    model: GEMINI_MODEL
  };
}
