# Gohar Khan Awan — Portfolio (MERN)

Personal portfolio built on the MERN stack (MongoDB, Express, React, Node.js), meant to be hosted at **goharawan.com**.

## Structure

```
Portfolio/
├── client/          React + Vite frontend
│   └── src/
│       ├── components/   Nav, Hero, Projects, Contact, etc.
│       ├── data/          client-side fallback content
│       ├── styles/        design system (index.css)
│       └── App.jsx
│       ├── admin/          the /admin analytics dashboard (separate bundle)
│       ├── pages/Privacy.jsx  the /privacy page (separate bundle)
│       ├── lib/            analytics tracker + consent gate
│       └── App.jsx
├── server/          Express + MongoDB (Mongoose) API
│   └── src/
│       ├── data/portfolio.js   single source of truth for all content
│       ├── models/             Content, Message, Visitor, Session, Event, JobApplication
│       ├── lib/                geo lookup, UA parsing, admin auth
│       ├── routes/             /api/portfolio, /api/contact, /api/track, /api/admin
│       └── index.js
├── render.yaml      Render Blueprint — static client + free API
└── package.json     root scripts (runs both together)
```

The API serves portfolio content from MongoDB when available (see `npm run seed`),
and falls back to the checked-in `server/src/data/portfolio.js` file otherwise —
so the site works even before a database is connected. The contact form
persists messages to MongoDB, or to `server/data/messages.local.json` if no
database is configured, so nothing is ever silently dropped.

## Getting started

```bash
npm run install:all       # installs root, client, and server deps

cp server/.env.example server/.env
# edit server/.env — at minimum set MONGO_URI if you want persistence

npm run dev                # runs client (5173) + server (5050) together
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the
Express server, so the site works exactly as it will in production.

### Optional: push content into MongoDB

```bash
npm run seed
```

This upserts the content from `server/src/data/portfolio.js` into a
`portfolio` document in Mongo. After seeding, edit the site's content by
either editing that file and re-running `seed`, or editing the document
directly in the database — no redeploy required for the latter.

## Building for production

```bash
npm run build              # builds client/dist
NODE_ENV=production npm start   # server serves the API AND client/dist
```

A single Node process (the Express server) can serve both the API and the
built frontend — handy for local testing or a one-service deploy. The actual
deploy target for this project is two separate Render services (below),
which is why `render.yaml` doesn't use this path.

## Deploying to Render (static client + free API, per `render.yaml`)

This repo includes a [render.yaml](render.yaml) Blueprint that deploys:

- **`gohar-portfolio-client`** — a static site (the Vite build). Static
  sites on Render are free with no sleep/cold-start behavior — this is what
  keeps hosting cost near zero.
- **`gohar-portfolio-api`** — a free Node web service running Express. Free
  web services sleep after ~15 min idle and take **30–50s to wake up** on
  the next request. The client is built to tolerate this: it shows the
  bundled fallback content almost immediately instead of blocking on a cold
  API, then swaps in live data silently if/when it arrives (see the
  `useEffect` in `client/src/App.jsx`).
- Render doesn't offer a free managed MongoDB — use a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) M0 cluster instead and pass
  its connection string in as `MONGO_URI`.

### One-time setup

1. **Push this repo to GitHub** (or GitLab/Bitbucket) — Render Blueprints
   deploy from a connected git repo:
   ```bash
   git init                       # if not already a repo
   git add -A
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Create a MongoDB Atlas cluster** (free M0 tier) and copy its connection
   string — you'll paste it into Render in step 4.
3. **Pick the API's public hostname.** `render.yaml` assumes
   `api.goharawan.com` for `VITE_API_BASE` (it's baked into the client
   at build time, so it needs to be decided up front). If you'd rather use
   the `*.onrender.com` URL Render assigns instead of a custom subdomain,
   edit that value in `render.yaml` before the first deploy.
4. **In the Render dashboard:** New → Blueprint → select this repo → Apply.
   Render reads `render.yaml` and creates both services. When prompted, set
   the `sync: false` secrets on the API service:
   - `MONGO_URI` — your Atlas connection string
   - `ADMIN_PASSWORD` — the password for the `/admin` analytics dashboard
     (leave blank to keep `/admin` disabled)
5. **Custom domains:** in each service's Settings → Custom Domains, add
   `goharawan.com` + `www.goharawan.com` to the client and
   `api.goharawan.com` to the API, then follow Render's DNS instructions
   for your registrar (it shows the exact records to add — usually a CNAME
   for `www`/`api` and an ALIAS/ANAME or A record for the apex domain).
   Render issues free SSL certificates automatically once DNS resolves.
6. **Seed content into MongoDB** (optional but recommended, so you can edit
   content from the database later without redeploying):
   ```bash
   MONGO_URI="<your atlas connection string>" npm --prefix server run seed
   ```

After that, pushing to the connected branch auto-deploys both services
(`autoDeploy: true` in `render.yaml`).

## Visitor analytics + `/admin` dashboard

The public site loads a small first-party tracker (`client/src/lib/analytics.js`)
that records, per visit:

- **Who** — a UUID kept in `localStorage`, so returning visitors are recognised
  and stitched into one history (visit number, days since last visit).
- **Where** — IP (server-side only), resolved to city / region / country /
  coordinates / ISP via a keyless geo API (`ipwho.is`, `ipapi.co` fallback).
- **How they arrived** — referrer, UTM tags, and a derived channel
  (organic / social / referral / direct / campaign) + source.
- **Device** — browser, OS, device type, screen + viewport, DPR, language,
  timezone, connection type, CPU/RAM hints, touch, Do-Not-Track, bot flag.
- **Behaviour** — time on page (wall-clock + engaged), scroll depth (% and px),
  which sections were seen and for how long, every click (with element +
  viewport position), outbound clicks, copies, prints, tab switches, resizes,
  and the full contact-form funnel (started → submitted → sent).
- **Performance** — TTFB, DOM-ready, and load time as the visitor experienced it.

Data lands in three collections: `visitors` (identity + lifetime rollups),
`sessions` (one per visit, with all the enriched context), and `events` (the
raw per-action timeline, which auto-expires after `EVENTS_TTL_DAYS`, default
365 — the rollups are kept forever).

**The dashboard is at `/admin`.** It's not linked from anywhere — reachable only
by typing the URL — and everything behind it needs the admin password
(`ADMIN_PASSWORD`), exchanged for a 30-day signed token. Without `ADMIN_PASSWORD`
set, `/admin` and all `/api/admin/*` routes return 503. It has four tabs:

- **Overview** — headline stats, a traffic-over-time chart, breakdowns
  (channels, sources, referrers, countries, cities, browsers, OS, devices,
  most-clicked elements), a section-by-section scroll funnel, and scroll-depth /
  visit-duration distributions. Filter by date range; toggle bot traffic.
- **Sessions** — a searchable, paginated table; click any row for the full
  per-visit detail + event timeline. CSV export.
- **Visitors** — every unique visitor, newest activity first; expand one to see
  all of their visits.
- **Job applications** — a personal application tracker (nothing to do with site
  visitors). Paste the JSON an LLM produced after tailoring your resume + cover
  letter for a job description; the tracker upserts it (by company + role, with a
  confirm before overwriting). Shows the canonical schema + a copy-paste prompt
  so the LLM's JSON always matches. Pipeline stats, inline status editing, a
  detail drawer with cover letter, interviews, status history, and "Copy JSON"
  for a round-trip LLM update. Schema lives in `server/src/data/jobSchema.js`
  (single source of truth for the model, the API, and the on-page prompt).

### Consent & privacy

Analytics are **opt-in**. On first visit a consent banner shows Accept / Decline
(equally prominent); nothing in `analytics.js` runs — and no visitor ID is
stored — until the visitor accepts. The choice is remembered in `localStorage`
(`pf_consent`). A browser "Do Not Track" / Global Privacy Control signal is
treated as a decline, and the banner is skipped. There's a full privacy policy
at **`/privacy`** (linked from the footer) with a live control to change the
choice at any time. Consent logic lives in `client/src/lib/consent.js`.

This is a reasonable GDPR baseline, but **not legal advice** — review the
`/privacy` copy, confirm your MongoDB Atlas region (pick an EU one), and adjust
retention / wording to your situation before relying on it.

## Editing content

Everything you see on the site — bio, metrics, skills, projects, philosophy,
experience, education, contact links — comes from one object:
`server/src/data/portfolio.js`. Edit that file (and optionally re-run
`npm run seed`) to update the site; no component code needs to change for
content edits.

## Notes

- Design: dark, editorial "systems engineer" aesthetic — Clash Display
  headlines, Fragment Mono labels, Switzer body (all self-hosted from
  `client/public/fonts`, no font CDN), a prismatic accent sweep, animated
  count-up stats, scroll reveals, hairline section rules, and a
  "grayscale by default, colour on hover" motif on the portrait and project
  cards. Fully responsive, reduced-motion aware.
- The contact form has a honeypot field and server-side rate limiting
  (5 requests / 15 min / IP) against spam.
- `GET /api/health` reports server + DB + admin status for uptime checks.
- The `/admin` dashboard is a lazy-loaded chunk — the public portfolio never
  downloads it. Its charts use a colorblind-safe palette (validated per the
  `dataviz` method); it's dark-only by design.
- Analytics tracking is skipped entirely on `/admin`, for visitors with an
  ad-blocker that blocks `/api/track`, and whenever no database is connected
  (requests are accepted and dropped).
