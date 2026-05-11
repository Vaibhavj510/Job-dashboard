# JobRadar — AI Job Search & Tracker Dashboard

A fully AI-powered job search and application tracking dashboard built for Senior MES & IIoT engineers targeting roles in Germany.

## Features

- **Live job search** via Apify (LinkedIn jobs)
- **AI match scoring** — only jobs ≥70% match shown, ranked by score
- **Cover letter generator** — in German, matched to your tone and story
- **Interview prep** — 10 tailored Q&As, study topics, opening pitch
- **Salary insights** — market rate Low/Mid/High for each role in Germany
- **Application tracker** — Kanban: Applied → HR Round → Technical Interview → Final Round → Offer / Rejected
- **Notes per job** — persistent, saved across sessions
- **Resume adjustment alerts** — flags missing keywords per role
- **Bilingual** — handles EN and DE job descriptions, always applies in German

---

## Setup

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Git ([git-scm.com](https://git-scm.com))
- Apify account ([apify.com](https://apify.com)) — free tier
- Anthropic API account ([console.anthropic.com](https://console.anthropic.com)) — $5 credit

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/job-dashboard.git
cd job-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API keys
```bash
cp .env.example .env
```

Open `.env` and fill in your keys:
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
VITE_APIFY_TOKEN=apify_api_your-token-here
```

> ⚠️ **NEVER commit `.env` to GitHub.** It is already in `.gitignore`.

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to GitHub Pages

### 1. Update `vite.config.js`
Change the `base` to match your GitHub repo name:
```js
base: '/job-dashboard/',   // replace with your actual repo name
```

### 2. Install gh-pages
```bash
npm install gh-pages --save-dev
```

### 3. Add deploy script to `package.json`
Already included:
```json
"deploy": "vite build && gh-pages -d dist"
```

### 4. Deploy
```bash
npm run deploy
```

### 5. Enable GitHub Pages
- Go to your GitHub repo → Settings → Pages
- Source: `gh-pages` branch → `/root`
- Your app will be live at: `https://YOUR_USERNAME.github.io/job-dashboard/`

### 6. API keys on GitHub Pages
Since the app runs in the browser, keys from `.env` are baked into the build.
To keep them secure:
- Either set keys in the **Settings panel** inside the app (stored in localStorage)
- Or use the `.env` file for local builds only

---

## How to Use

### Daily workflow
1. Open the app
2. Go to **Job Search**
3. Pick a quick-search term or type your own
4. Wait ~30–60 seconds for Apify + AI scoring
5. Top 10 matches (≥70%) appear ranked
6. Click any job to see full details

### Per job
- **Overview** — full description + AI summary
- **Cover Letter** — set salary & availability → Generate
- **Interview Prep** — generate tailored questions + answers
- **Salary Insights** — market rate Low/Mid/High
- **Notes** — free text, saved persistently

### Tracker
- Click any stage button on a job card to track it
- View all applications by stage in the Tracker tab
- Move cards between stages as you progress

---

## Estimated API costs

| Action | ~Cost |
|--------|-------|
| Score 1 job | $0.002 |
| Generate cover letter | $0.008 |
| Generate interview prep | $0.010 |
| Full workflow for 1 application | ~$0.02 |
| $5 credit | ~250 full workflows |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Job data | Apify (LinkedIn Jobs Scraper) |
| AI | Claude Sonnet 4 (Anthropic API) |
| Storage | localStorage (browser) |
| Hosting | GitHub Pages |
| Fonts | Syne + Inter + DM Mono |

---

## File Structure

```
src/
├── components/
│   ├── Header.jsx        # Navigation + stats bar
│   ├── JobSearch.jsx     # Search + results list
│   ├── JobDetail.jsx     # Job detail + all AI features
│   ├── Tracker.jsx       # Kanban application tracker
│   └── Settings.jsx      # API keys + defaults
├── utils/
│   ├── ai.js             # All Claude API calls
│   ├── apify.js          # Apify job fetching
│   └── storage.js        # localStorage wrapper
├── data/
│   └── resume.js         # Vaibhav's resume + cover letter template
├── App.jsx
├── main.jsx
└── index.css
```

---

*Built for Vaibhav Jadhav — Senior MES & IIoT Engineer, Leipzig*
