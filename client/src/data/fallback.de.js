// German client-side fallback so the site still renders in German if the API
// is unreachable. Keep in sync with server/src/data/portfolio.de.js.
export const fallbackPortfolioDe = {
  person: {
    name: "Gohar Khan Awan",
    role: "Software-Ingenieur | Entwickler für KI-Systeme",
    tagline: "Ich baue skalierbare, intelligente Systeme, die aus Rohdaten Entscheidungen machen.",
    location: "Vaihingen-Stuttgart, Deutschland",
    available: "Offen für Software-Engineering- & KI-Rollen — 2026",
    resumeUrl: "",
    summary: [
      "Masterstudent für Data Science & KI in Deutschland mit einem soliden Fundament in Softwareentwicklung und skalierbarem Systemdesign. Mein Fokus liegt auf dem Aufbau leistungsstarker Backend-Systeme, intelligenter Datenpipelines und praxisnaher Anwendungen, die von Tausenden Nutzern verwendet werden.",
      "Mir liegen die schwierigen Teile am Herzen: Zuverlässigkeit unter Nebenläufigkeit, vorhersagbare Performance, saubere Architektur und praktische Kompromisse, die das Produkt voranbringen, ohne brüchige Komplexität anzuhäufen."
    ]
  },
  metrics: [
    { label: "Betreute Nutzer", value: "10,000+", note: "über ausgelieferte Produktivprodukte hinweg" },
    { label: "Umsatz im ersten Monat", value: "$10K", note: "VisaAutomate.com, aus dem Stand" },
    { label: "Ausgelieferte Nutzer-Sessions", value: "87M+", note: "durch systematisches A/B-Testing & Optimierung" },
    { label: "Erwirtschafteter Gewinn", value: "$287K+", note: "als Mitgründer & Operations Lead" }
  ],
  skills: [
    { title: "Sprachen", items: ["JavaScript (Node.js, React)", "TypeScript", "Python", "R", "SQL", "C++"] },
    { title: "Systeme & Performance", items: ["Caching", "Rate Limiting", "Nebenläufigkeit (Event Loop)", "Queue-Systeme", "Retry-Logik", "Komplexitäts-Trade-offs"] },
    { title: "Backend & APIs", items: ["REST-APIs", "Node.js-Architektur", "MongoDB", "Express", "Git", "Docker", "Cloud-Deployment (Render / Serverless)"] },
    { title: "Daten & KI", items: ["LLM-Integration", "RAG-Pipelines", "NLP", "ML & Deep Learning", "Datenvisualisierung", "Databricks"] }
  ],
  projects: [
    {
      name: "MyChatWrap",
      status: "Datenschutzorientiertes Produkt",
      accent: "violet",
      url: "https://mychatwrap.com",
      blurb:
        "Ein datenschutzorientierter WhatsApp-Chat-Analyzer, der jeden exportierten Chat in ein „Wrapped“-artiges Dashboard verwandelt — mit einer Reihe eigens entwickelter Analysen, die ich von Grund auf konzipiert und gebaut habe.",
      details: [
        "Zeigt Antwortzeit-Muster, Stimmungstrends, Gesprächs-Streaks sowie Wort-/Emoji-Gewohnheiten aus einer einzigen exportierten Chat-Datei.",
        "Eigene Modelle, die ich entwickelt habe: ein mehrdimensionaler Beziehungs-Gesundheitswert, ein „Interessen-Rate“-Modell pro Teilnehmer, eine Erkennung sprachlicher Spiegelung (gleichen sich die Wortwahlen zweier Personen im Lauf der Zeit an?) und eine Zeitleiste der Beziehungsentwicklung, bewertet über die echte Chat-Historie.",
        "Das gesamte Parsing und die Analyse laufen clientseitig in einem Web Worker gegen IndexedDB — Nachrichteninhalte erreichen niemals den Server.",
        "Dahinter steht ein vollständiges Admin-Dashboard: Traffic-/Retention-Analysen, Partnerprogramm und Feature-Flags."
      ],
      stack: ["Next.js", "React", "TypeScript", "Web Worker", "IndexedDB", "Express", "MongoDB"],
      highlights: ["Keine Nachrichteninhalte an den Server gesendet", "Eigene Beziehungs-Analysemodelle", "Clientseitige Rechenpipeline"]
    },
    {
      name: "AnalyzeBankStatement.com",
      status: "Aktuelles Projekt",
      accent: "indigo",
      url: "https://analyzebankstatement.com",
      blurb: "KI-gestützte Plattform zur Finanzdatenanalyse, die aus unübersichtlichen Kontoauszügen saubere, strukturierte Erkenntnisse extrahiert.",
      details: [
        "LLM-basierte Extraktionspipeline, die PDF- und CSV-Auszüge in normalisierte, abfragbare Transaktionen umwandelt.",
        "RAG-Pipeline für fundierte Antworten über die Finanzhistorie eines Nutzers.",
        "Backend für Skalierung entwickelt: Batching, Caching und Latenzbudgets unter gleichzeitiger Last."
      ],
      stack: ["React", "Node.js", "LLM APIs", "RAG", "MongoDB"],
      highlights: ["LLM-basierte Extraktion", "RAG-Pipeline", "Skalierbares Backend", "Performance-Optimierung"]
    },
    {
      name: "VisaAutomate.com",
      status: "Umsatzgenerierend",
      accent: "emerald",
      url: "",
      blurb: "Echtzeit-Automatisierungsplattform, gebaut für Nebenläufigkeit, Zuverlässigkeit und kosteneffizienten Durchsatz.",
      details: [
        "800 Nutzer in den ersten 2 Wochen; 10.000 $ Umsatz im ersten Monat.",
        "Hochgradig nebenläufige Monitoring-Workloads mit Queueing und adaptivem Rate Limiting.",
        "Darauf ausgelegt, günstig im Betrieb zu bleiben und dabei auch bei sprunghafter Nachfrage reaktionsschnell zu sein."
      ],
      stack: ["Node.js", "Queues", "Rate limiting", "Cloud"],
      highlights: ["800 Nutzer in 2 Wochen", "10.000 $ Umsatz im ersten Monat", "Hochgradig nebenläufiges Monitoring", "Queueing + adaptives Rate Limiting"]
    },
    {
      name: "Grademy.org",
      status: "EdTech-Plattform",
      accent: "amber",
      url: "",
      blurb: "MERN-Plattform für Studierende, mit analysegetriebener Iteration und skalierbaren Datenmodellen.",
      details: [
        "10.000+ Nutzer auf einer wartbaren MERN-Architektur.",
        "Performance-bewusstes Frontend und Datenmodelle, die ohne Neuentwicklung mitwachsen.",
        "Produktiteration auf Basis echter Nutzungsanalysen."
      ],
      stack: ["MongoDB", "Express", "React", "Node.js"],
      highlights: ["10.000+ Nutzer", "MERN-Stack", "Performance-bewusstes Frontend", "Wartbare Architektur"]
    }
  ],
  philosophy: [
    { title: "Performance zuerst", body: "Messen, optimieren und Latenz unter Last schützen. Effizienz ist ein Feature." },
    { title: "Skalierbarkeit von Anfang an", body: "Nebenläufigkeit, Queues, Caching und Fehlertoleranz von Tag eins an eingebaut." },
    { title: "Saubere, wartbare Architektur", body: "Modulare Grenzen, vorhersagbare Codepfade und einfache Abstraktionen." },
    { title: "Datengetriebene Entscheidungen", body: "Schnell ausliefern, das System instrumentieren und anhand echter Signale iterieren." }
  ],
  experience: [
    {
      company: "Interdigital Limited",
      role: "Mitgründer & Operations Lead",
      period: "Jun. 2022 – Feb. 2025",
      tag: "Führung im großen Maßstab",
      bullets: [
        "Datengetriebenen Content- und Performance-Marketing-Betrieb auf ein 22-köpfiges Team skaliert.",
        "287.000+ $ Gewinn erwirtschaftet und 87M+ Nutzer-Sessions durch systematisches A/B-Testing und Optimierung geliefert.",
        "Operative Effizienz während der branchenweiten Krise 2024 aufrechterhalten (von der PubPlus-Führung anerkannt)."
      ]
    }
  ],
  education: [
    {
      degree: "M.Sc. Data Science & Künstliche Intelligenz im Wirtschaftsmanagement",
      school: "Hochschule Furtwangen University",
      period: "Apr. 2025 – Nov. 2026 (voraussichtlich)",
      note: "Note 2.0",
      tags: ["Machine Learning", "Neuronale Netze", "Datenbanken", "Datenvisualisierung", "Computer Vision"]
    },
    {
      degree: "B.E. Maschinenbau",
      school: "NUST, Islamabad",
      period: "2017 – 2021",
      note: "",
      tags: ["Starkes analytisches Fundament", "Ingenieurdisziplin", "Angewandte Problemlösung"]
    }
  ],
  bookshelf: [
    { title: "Die Errettung aus dem Irrtum", author: "Al-Ghazali", year: "1108", coverId: "deliverance-from-error", quote: "", tags: ["Islam", "Erkenntnistheorie", "Zweifel"] },
    { title: "Weiße Nächte", author: "Fjodor Dostojewski", year: "1848", coverId: "white-nights", quote: "", tags: ["Einsamkeit", "Sehnsucht", "Romantik"] },
    { title: "Zur Genealogie der Moral", author: "Friedrich Nietzsche", year: "1887", coverId: "genealogy-of-morals", quote: "Irgendein Sinn ist besser als gar kein Sinn.", tags: ["Moral", "Ressentiment", "Genealogie"] },
    { title: "Schnelles Denken, langsames Denken", author: "Daniel Kahneman", year: "2011", coverId: "thinking-fast-slow", quote: "", tags: ["Kognition", "Denkfehler", "Entscheidungsfindung"] },
    { title: "Du musst nicht von allen gemocht werden", author: "Ichiro Kishimi & Fumitake Koga", year: "2013", coverId: "courage-to-be-disliked", quote: "", tags: ["Adlerianische Psychologie", "Freiheit", "Beziehungen"] }
  ],
  contact: {
    email: "gohar@goharawan.com",
    links: [
      { label: "E-Mail", value: "gohar@goharawan.com", href: "mailto:gohar@goharawan.com" },
      { label: "LinkedIn", value: "linkedin.com/in/kgohar48", href: "https://linkedin.com/in/kgohar48" },
      { label: "GitHub", value: "github.com/kgohar48-hash", href: "https://github.com/kgohar48-hash" }
    ]
  }
};

export default fallbackPortfolioDe;
