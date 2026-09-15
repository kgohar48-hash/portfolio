// UI copy that isn't part of the portfolio content payload (nav labels,
// section headers, form copy, etc). Content itself lives in
// server/src/data/portfolio.js / portfolio.de.js.
export const uiStrings = {
  en: {
    loading: "loading portfolio…",
    nav: { about: "About", projects: "Projects", experience: "Experience", bookshelf: "Bookshelf", contact: "Contact" },
    hero: { cta: "See projects →" },
    about: {
      eyebrow: "About",
      title: "Builder mindset, systems discipline",
      sub: "Not a resume dump — a snapshot of how I think, build, and ship.",
      basedIn: "Based in",
      currently: "Currently",
      currentlyValue: "M.Sc. Data Science & AI, Hochschule Furtwangen",
      focus: "Focus",
      focusValue: "Backend systems · data pipelines · LLM products"
    },
    skills: {
      eyebrow: "Tech stack",
      title: "Tools — but more importantly, engineering habits",
      sub: "A practical, production-first stack with systems thinking underneath it."
    },
    projects: {
      eyebrow: "Featured projects",
      title: "Shipping products with measurable impact",
      sub: "Premium engineering is clarity under pressure: correctness, throughput, cost, and maintainability.",
      hint: "Hover a project for colour.",
      visitSite: "Visit site ↗"
    },
    philosophy: {
      eyebrow: "Engineering philosophy",
      title: "How I build systems",
      sub: "A systems builder's checklist — pragmatic, disciplined, and product-driven."
    },
    experience: {
      eyebrow: "Experience",
      title: "Leadership, scale, and outcome-driven execution"
    },
    education: {
      eyebrow: "Education",
      title: "A strong technical base with applied AI and systems work"
    },
    bookshelf: {
      eyebrow: "My bookshelf",
      title: "The company I keep"
    },
    contact: {
      eyebrow: "Contact",
      title: "Let's build something serious.",
      sub: "If you care about performance, clean architecture, and shipping products with real outcomes — reach out.",
      name: "Name",
      namePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "you@company.com",
      subject: "Subject (optional)",
      subjectPlaceholder: "Role, project, or just say hi",
      message: "Message",
      messagePlaceholder: "What are you building?",
      sending: "Sending…",
      send: "Send message",
      successFallback: "Thanks — your message is in.",
      errorFallback: "Please check the form and try again."
    },
    footer: {
      builtWith: "Built with the MERN stack.",
      privacy: "Privacy",
      designedBy: "Designed & engineered by",
      backToTop: "Back to top ↑"
    },
    consent: {
      ariaLabel: "Analytics consent",
      text: "This site uses privacy-friendly analytics to understand how visitors use it — approximate location (from your IP), device, and on-page activity. Nothing runs until you agree, and there are no ads or third-party trackers.",
      link: "What's collected →",
      decline: "Decline",
      accept: "Accept"
    },
    langToggle: { ariaLabel: "Language" }
  },
  de: {
    loading: "Portfolio wird geladen…",
    nav: { about: "Über mich", projects: "Projekte", experience: "Erfahrung", bookshelf: "Bücherregal", contact: "Kontakt" },
    hero: { cta: "Projekte ansehen →" },
    about: {
      eyebrow: "Über mich",
      title: "Macher-Mentalität, Systemdenken",
      sub: "Kein Lebenslauf-Dump — ein Einblick, wie ich denke, baue und ausliefere.",
      basedIn: "Wohnhaft in",
      currently: "Aktuell",
      currentlyValue: "M.Sc. Data Science & KI, Hochschule Furtwangen",
      focus: "Fokus",
      focusValue: "Backend-Systeme · Datenpipelines · LLM-Produkte"
    },
    skills: {
      eyebrow: "Tech-Stack",
      title: "Werkzeuge — aber vor allem Engineering-Gewohnheiten",
      sub: "Ein praxisorientierter, produktionsreifer Stack mit Systemdenken als Fundament."
    },
    projects: {
      eyebrow: "Ausgewählte Projekte",
      title: "Produkte mit messbarer Wirkung ausgeliefert",
      sub: "Erstklassiges Engineering bedeutet Klarheit unter Druck: Korrektheit, Durchsatz, Kosten und Wartbarkeit.",
      hint: "Projekt für Farbe berühren bzw. mit der Maus darüberfahren.",
      visitSite: "Website besuchen ↗"
    },
    philosophy: {
      eyebrow: "Engineering-Philosophie",
      title: "Wie ich Systeme baue",
      sub: "Die Checkliste eines Systembauers — pragmatisch, diszipliniert und produktorientiert."
    },
    experience: {
      eyebrow: "Erfahrung",
      title: "Führung, Skalierung und ergebnisorientierte Umsetzung"
    },
    education: {
      eyebrow: "Ausbildung",
      title: "Eine starke technische Basis mit angewandter KI- und Systemarbeit"
    },
    bookshelf: {
      eyebrow: "Mein Bücherregal",
      title: "Die Gesellschaft, die ich pflege"
    },
    contact: {
      eyebrow: "Kontakt",
      title: "Lass uns etwas Ernsthaftes bauen.",
      sub: "Wenn dir Performance, saubere Architektur und Produkte mit echten Ergebnissen wichtig sind — melde dich.",
      name: "Name",
      namePlaceholder: "Dein Name",
      email: "E-Mail",
      emailPlaceholder: "du@firma.com",
      subject: "Betreff (optional)",
      subjectPlaceholder: "Rolle, Projekt oder einfach nur Hallo",
      message: "Nachricht",
      messagePlaceholder: "Was baust du gerade?",
      sending: "Wird gesendet…",
      send: "Nachricht senden",
      successFallback: "Danke — deine Nachricht ist angekommen.",
      errorFallback: "Bitte überprüfe das Formular und versuche es erneut."
    },
    footer: {
      builtWith: "Gebaut mit dem MERN-Stack.",
      privacy: "Datenschutz",
      designedBy: "Design & Entwicklung von",
      backToTop: "Nach oben ↑"
    },
    consent: {
      ariaLabel: "Einwilligung zur Analyse",
      text: "Diese Website nutzt datenschutzfreundliche Analysen, um zu verstehen, wie Besucher sie nutzen — ungefährer Standort (aus deiner IP-Adresse), Gerät und Aktivität auf der Seite. Nichts läuft, bevor du zustimmst, und es gibt keine Werbung oder Tracker von Drittanbietern.",
      link: "Was erfasst wird →",
      decline: "Ablehnen",
      accept: "Akzeptieren"
    },
    langToggle: { ariaLabel: "Sprache" }
  }
};

export default uiStrings;
