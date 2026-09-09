// Client-side fallback so the site still renders if the API is unreachable.
// Keep in sync with server/src/data/portfolio.js (the API is the source of truth).
export const fallbackPortfolio = {
  person: {
    name: "Gohar Khan Awan",
    role: "Software Engineer | AI Systems Builder",
    tagline: "Building scalable, intelligent systems that turn raw data into decisions.",
    location: "Vaihingen-Stuttgart, Germany",
    available: "Open to software engineering & AI roles — 2026",
    resumeUrl: "",
    summary: [
      "Data Science & AI master's student in Germany with a strong foundation in software engineering and scalable system design. My work focuses on building high-performance backend systems, intelligent data pipelines, and real-world applications used by thousands of users.",
      "I care about the hard parts: reliability under concurrency, predictable performance, clean architecture, and practical trade-offs that move the product forward without accumulating brittle complexity."
    ]
  },
  metrics: [
    { label: "Users served", value: "10,000+", note: "across shipped production products" },
    { label: "Revenue, first month", value: "$10K", note: "VisaAutomate.com, from a standing start" },
    { label: "User sessions delivered", value: "87M+", note: "via systematic A/B testing & optimization" },
    { label: "Profit generated", value: "$287K+", note: "as co-founder & operations lead" }
  ],
  skills: [
    { title: "Languages", items: ["JavaScript (Node.js, React)", "TypeScript", "Python", "R", "SQL", "C++"] },
    { title: "Systems & Performance", items: ["Caching", "Rate limiting", "Concurrency (event loop)", "Queue systems", "Retry logic", "Complexity trade-offs"] },
    { title: "Backend & APIs", items: ["REST APIs", "Node.js architecture", "MongoDB", "Express", "Git", "Docker", "Cloud deployment (Render / serverless)"] },
    { title: "Data & AI", items: ["LLM integration", "RAG pipelines", "NLP", "ML & deep learning", "Data visualization", "Databricks"] }
  ],
  projects: [
    {
      name: "MyChatWrap",
      status: "Privacy-first product",
      accent: "violet",
      url: "https://mychatwrap.com",
      blurb:
        "A privacy-first WhatsApp chat analyzer that turns any exported chat into a “Wrapped”-style dashboard — with a set of original analytics I designed and built from scratch.",
      details: [
        "Surfaces response-time patterns, mood trends, conversation streaks, and word / emoji habits from a single exported chat file.",
        "Original models I built: a multi-dimension relationship health score, a per-participant “interest rate” model, linguistic-mirroring detection (do two people's word choices converge over time?), and a relationship-evolution timeline scored across the chat's real history.",
        "All parsing and analysis runs client-side in a Web Worker against IndexedDB — message content never touches the server.",
        "Full admin dashboard behind it: traffic / retention analytics, affiliate program, and feature flags."
      ],
      stack: ["Next.js", "React", "TypeScript", "Web Worker", "IndexedDB", "Express", "MongoDB"],
      highlights: ["Zero message content sent to server", "Original relationship-analytics models", "Client-side compute pipeline"]
    },
    {
      name: "AnalyzeBankStatement.com",
      status: "Current project",
      accent: "indigo",
      url: "https://analyzebankstatement.com",
      blurb: "AI-powered financial data analysis platform that extracts clean, structured insights from messy bank statements.",
      details: [
        "LLM-based extraction pipeline that turns PDF and CSV statements into normalized, queryable transactions.",
        "RAG pipeline for grounded answers over a user's financial history.",
        "Backend engineered for scale: batching, caching, and latency budgets under concurrent load."
      ],
      stack: ["React", "Node.js", "LLM APIs", "RAG", "MongoDB"],
      highlights: ["LLM-based extraction", "RAG pipeline", "Scalable backend", "Performance optimization"]
    },
    {
      name: "VisaAutomate.com",
      status: "Revenue generating",
      accent: "emerald",
      url: "",
      blurb: "Real-time automation platform built for concurrency, reliability, and cost-efficient throughput.",
      details: [
        "800 users in the first 2 weeks; $10K revenue in the first month.",
        "High-concurrency monitoring workloads with queueing and adaptive rate limiting.",
        "Designed to stay cheap to run while staying responsive under spiky demand."
      ],
      stack: ["Node.js", "Queues", "Rate limiting", "Cloud"],
      highlights: ["800 users in 2 weeks", "$10K first-month revenue", "High-concurrency monitoring", "Queueing + adaptive rate limiting"]
    },
    {
      name: "Grademy.org",
      status: "EdTech platform",
      accent: "amber",
      url: "",
      blurb: "MERN platform serving students, with analytics-driven iteration and scalable data models.",
      details: [
        "10,000+ users on a maintainable MERN architecture.",
        "Performance-minded frontend and data models designed to grow without rewrites.",
        "Product iteration driven by real usage analytics."
      ],
      stack: ["MongoDB", "Express", "React", "Node.js"],
      highlights: ["10,000+ users", "MERN stack", "Performance-minded frontend", "Maintainable architecture"]
    }
  ],
  philosophy: [
    { title: "Performance first", body: "Measure, optimize, and protect latency under load. Efficiency is a feature." },
    { title: "Scalability by design", body: "Concurrency, queues, caching, and fault tolerance baked in from day one." },
    { title: "Clean, maintainable architecture", body: "Modular boundaries, predictable code paths, and simple abstractions." },
    { title: "Data-driven decisions", body: "Ship fast, instrument the system, and iterate on real signals." }
  ],
  experience: [
    {
      company: "Interdigital Limited",
      role: "Co-Founder & Operations Lead",
      period: "Jun 2022 – Feb 2025",
      tag: "Leadership at scale",
      bullets: [
        "Scaled a data-driven content + performance marketing operation to a 22-person team.",
        "Generated $287K+ profit and delivered 87M+ user sessions via systematic A/B testing and optimization.",
        "Maintained operational efficiency during the 2024 industry-wide crisis (recognized by PubPlus leadership)."
      ]
    }
  ],
  education: [
    {
      degree: "M.Sc. Data Science & Artificial Intelligence in Business Management",
      school: "Hochschule Furtwangen University",
      period: "Apr 2025 – Nov 2026 (expected)",
      note: "Grade 2.0",
      tags: ["Machine Learning", "Neural Networks", "Databases", "Data Visualization", "Computer Vision"]
    },
    {
      degree: "B.E. Mechanical Engineering",
      school: "NUST, Islamabad",
      period: "2017 – 2021",
      note: "",
      tags: ["Strong analytical foundation", "Engineering discipline", "Applied problem solving"]
    }
  ],
  bookshelf: [
    { title: "Deliverance from Error", author: "Al-Ghazali", year: "1108", coverId: "deliverance-from-error", quote: "", tags: ["islam", "epistemology", "doubt"] },
    { title: "White Nights", author: "Fyodor Dostoevsky", year: "1848", coverId: "white-nights", quote: "", tags: ["solitude", "longing", "romanticism"] },
    { title: "On the Genealogy of Morals", author: "Friedrich Nietzsche", year: "1887", coverId: "genealogy-of-morals", quote: "any meaning is better than no meaning at all", tags: ["morality", "ressentiment", "genealogy"] },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", year: "2011", coverId: "thinking-fast-slow", quote: "", tags: ["cognition", "biases", "decision-making"] },
    { title: "The Courage to Be Disliked", author: "Ichiro Kishimi & Fumitake Koga", year: "2013", coverId: "courage-to-be-disliked", quote: "", tags: ["adlerian psychology", "freedom", "relationships"] }
  ],
  contact: {
    email: "gohar@goharawan.com",
    links: [
      { label: "Email", value: "gohar@goharawan.com", href: "mailto:gohar@goharawan.com" },
      { label: "LinkedIn", value: "linkedin.com/in/kgohar48", href: "https://linkedin.com/in/kgohar48" },
      { label: "GitHub", value: "github.com/kgohar48-hash", href: "https://github.com/kgohar48-hash" }
    ]
  }
};

export default fallbackPortfolio;
