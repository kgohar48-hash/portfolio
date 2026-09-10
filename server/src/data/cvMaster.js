/**
 * The master résumé — the single source of factual truth the CV generator
 * tailors from. A `Content` document with key "cv_master" overrides this when
 * the admin edits the master in the dashboard; this file is the seed + fallback
 * (same pattern as portfolio.js / Content key "portfolio").
 *
 * The LLM is instructed to treat this as the ONLY source of facts — it may
 * reorder, trim, and reword for a specific job, but never invent employers,
 * dates, metrics, or skills that aren't here.
 */

export const cvMaster = {
  name: "Gohar Khan Awan",
  title: "Data Science & AI · Analytics Engineering",
  location: "Karlsruhe, Germany",
  phone: "+49 152 24967965",

  // shown in the CV header
  contacts: {
    email: "gohar@goharawan.com",
    portfolio: "goharawan.com",
    linkedin: "linkedin.com/in/kgohar48",
    github: "github.com/kgohar48-hash"
  },
  // real redirect destinations for the tracked links (keyed the same as the CV
  // header + project `key`s below)
  links: {
    portfolio: "https://goharawan.com",
    linkedin: "https://www.linkedin.com/in/kgohar48",
    github: "https://github.com/kgohar48-hash"
  },

  summary:
    "Data Science & AI Master's student (Hochschule Furtwangen University, expected Feb. 2027) with a background in building data-driven systems, analytics instrumentation, and high-traffic product operations. My work sits at the intersection of data engineering, product analytics and system performance: tracking pipelines, funnel instrumentation, A/B testing frameworks, and turning large-scale behavioural data into decisions that move metrics. At Interdigital I owned analytics-driven growth across 87M+ user sessions, ran systematic A/B testing cycles, and used attribution data to allocate budget and scale profitable campaigns. I build things that measure themselves: every product I have shipped includes observability, retention analytics, and user-behaviour instrumentation from day one.",

  skills: [
    {
      group: "Web & Product Analytics",
      items: [
        "Google Analytics 4 (GA4)",
        "Matomo",
        "event-based tracking architecture",
        "client-side and server-side tracking",
        "funnel analysis",
        "customer journey mapping",
        "KPI definition and ownership",
        "attribution modelling concepts"
      ]
    },
    {
      group: "Data Analysis & BI",
      items: [
        "SQL (advanced: complex queries, aggregations, joins, window functions)",
        "Python (Pandas, NumPy, Matplotlib, scikit-learn)",
        "Power BI",
        "Tableau (working knowledge)",
        "A/B test statistical analysis",
        "CLV modelling",
        "cohort analysis"
      ]
    },
    {
      group: "Tracking & Data Quality",
      items: [
        "JavaScript event tracking",
        "HTML/CSS/JS for tracking implementation",
        "data layer concepts",
        "post-cookie tracking strategies",
        "data quality validation pipelines",
        "observability tooling (PostHog, Sentry, analytics dashboards)"
      ]
    },
    {
      group: "Engineering & Infrastructure",
      items: [
        "Node.js",
        "Python",
        "REST APIs",
        "MongoDB",
        "Docker",
        "cloud deployment (AWS, Render)",
        "LLM/RAG pipelines",
        "caching and performance optimisation",
        "CI/CD basics"
      ]
    },
    {
      group: "Stakeholder Communication",
      items: [
        "translating complex analytical findings into management-level recommendations",
        "presenting data-backed decisions to non-technical stakeholders",
        "English C1+ (fluent)",
        "German A1 (basic, actively learning)"
      ]
    }
  ],

  education: [
    {
      school: "Hochschule Furtwangen University",
      degree: "M.Sc. Data Science & AI in Business Management",
      location: "Furtwangen, Germany",
      start: "Apr. 2025",
      end: "Feb. 2027 (expected)",
      bullets: [
        "Relevant: machine learning, statistical methods, A/B testing, data visualisation, NLP, databases, business analytics"
      ]
    },
    {
      school: "National University of Sciences and Technology (NUST)",
      degree: "B.E. Mechanical Engineering",
      location: "Islamabad, Pakistan",
      start: "2017",
      end: "2021",
      bullets: [
        "Analytical foundation: applied mathematics, statistics, data interpretation, engineering discipline"
      ]
    }
  ],

  experience: [
    {
      company: "Interdigital Limited",
      role: "Co-Founder & Operations Lead",
      location: "Islamabad, Pakistan",
      start: "Jun. 2022",
      end: "Feb. 2025",
      bullets: [
        "Owned analytics strategy and KPI ownership for a high-traffic content operation delivering 87M+ user sessions; defined success metrics, built reporting dashboards, and presented actionable insights to management for budget and product decisions.",
        "Designed and executed systematic A/B testing cycles across content, UX and monetisation surfaces; used statistical analysis to evaluate test impact and drive a $287K+ profit outcome; recognised by PubPlus leadership for operational performance during the 2024 industry-wide crisis.",
        "Built ML/DL automation for media buying (XGBoost, LightGBM, TensorFlow/Keras, scikit-learn): attribution-model-driven budget allocation and campaign scaling delivered a 3x profit increase vs. manual management.",
        "Managed tracking instrumentation and data quality across the operation; coordinated with engineering on client-side event tracking and data pipeline reliability."
      ]
    }
  ],

  projects: [
    {
      key: "analyzebankstatement",
      name: "AnalyzeBankStatement.com",
      url: "https://analyzebankstatement.com",
      tagline: "Analytics-Instrumented AI Platform",
      period: "Feb. 2026 – present",
      bullets: [
        "Full-stack platform with end-to-end analytics instrumentation: user behaviour tracking, funnel monitoring, retention analytics.",
        "LLM-based data extraction pipeline (RAG, batching, caching) with data quality validation built into every processing step."
      ]
    },
    {
      key: "mychatwrap",
      name: "MyChatWrap.com",
      url: "https://mychatwrap.com",
      tagline: "Behavioural Analytics Product",
      period: "2026",
      bullets: [
        "Designed and built original analytics models from scratch: relationship health scoring, per-participant interest-rate model, linguistic-mirroring detection, conversation-streak analysis.",
        "Full admin dashboard with traffic, retention and feature-flag management; client-side compute pipeline (Web Worker, IndexedDB) for privacy-first data processing."
      ]
    },
    {
      key: "visaautomate",
      name: "VisaAutomate.com",
      url: "https://visaautomate.com",
      tagline: "High-Traffic Automation Platform",
      period: "Oct. 2024 – Jan. 2025",
      bullets: [
        "800 users in 2 weeks, $10K revenue in month one; built with concurrency, queueing and adaptive rate limiting.",
        "Instrumented for real-time performance monitoring and cost tracking under spiky load."
      ]
    }
  ],

  extras: [
    { label: "Languages", value: "English (C1+, fluent) · German (A1, actively learning) · Urdu (native)" },
    { label: "Enrollment", value: "Enrolled as a student until Feb. 2027 (Hochschule Furtwangen University)" },
    { label: "Work Authorization", value: "Valid German student visa; authorized to work" }
  ]
};

/** Keys that a tracked `/r/<slug>/<target>` redirect will accept. */
export function linkTargets(master = cvMaster) {
  return [
    "portfolio",
    "linkedin",
    "github",
    ...(master.projects || []).map((p) => p.key).filter(Boolean)
  ];
}

/** Resolve a redirect target key → real destination URL (server-controlled). */
export function resolveTarget(target, master = cvMaster) {
  if (target === "portfolio") return master.links?.portfolio || "https://goharawan.com";
  if (target === "linkedin") return master.links?.linkedin || "https://www.linkedin.com/in/kgohar48";
  if (target === "github") return master.links?.github || "https://github.com/kgohar48-hash";
  const proj = (master.projects || []).find((p) => p.key === target);
  return proj?.url || null;
}

export default cvMaster;
