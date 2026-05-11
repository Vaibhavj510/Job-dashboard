const KEYS = {
  JOBS: 'jd_saved_jobs',
  TRACKER: 'jd_tracker',
  SEARCH_HISTORY: 'jd_search_history',
  SETTINGS: 'jd_settings',
  NOTES: 'jd_notes',
  COVER_LETTERS: 'jd_cover_letters',
  INTERVIEW_PREPS: 'jd_interview_preps',
  LAST_SEARCH: 'jd_last_search',
}

const get = (key) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch { return null }
}

const set = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export const storage = {
  // Saved jobs (bookmarked from search results)
  getSavedJobs: () => get(KEYS.JOBS) || [],
  saveJob: (job) => {
    const jobs = storage.getSavedJobs()
    if (!jobs.find(j => j.id === job.id)) {
      set(KEYS.JOBS, [{ ...job, savedAt: Date.now() }, ...jobs])
    }
  },
  removeSavedJob: (id) => set(KEYS.JOBS, storage.getSavedJobs().filter(j => j.id !== id)),

  // Tracker (kanban)
  getTracker: () => get(KEYS.TRACKER) || {},
  setJobStage: (jobId, stage, jobData) => {
    const tracker = storage.getTracker()
    tracker[jobId] = { stage, jobData, updatedAt: Date.now(), addedAt: tracker[jobId]?.addedAt || Date.now() }
    set(KEYS.TRACKER, tracker)
  },
  removeFromTracker: (jobId) => {
    const tracker = storage.getTracker()
    delete tracker[jobId]
    set(KEYS.TRACKER, tracker)
  },

  // Notes per job
  getNotes: () => get(KEYS.NOTES) || {},
  setNote: (jobId, note) => {
    const notes = storage.getNotes()
    notes[jobId] = { text: note, updatedAt: Date.now() }
    set(KEYS.NOTES, notes)
  },

  // Cover letters per job
  getCoverLetters: () => get(KEYS.COVER_LETTERS) || {},
  setCoverLetter: (jobId, data) => {
    const cls = storage.getCoverLetters()
    cls[jobId] = { ...data, generatedAt: Date.now() }
    set(KEYS.COVER_LETTERS, cls)
  },

  // Interview preps per job
  getInterviewPreps: () => get(KEYS.INTERVIEW_PREPS) || {},
  setInterviewPrep: (jobId, data) => {
    const preps = storage.getInterviewPreps()
    preps[jobId] = { ...data, generatedAt: Date.now() }
    set(KEYS.INTERVIEW_PREPS, preps)
  },

  // Settings
  getSettings: () => get(KEYS.SETTINGS) || {
    anthropicKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    adzunaAppId: import.meta.env.VITE_ADZUNA_APP_ID || '',
    adzunaAppKey: import.meta.env.VITE_ADZUNA_APP_KEY || '',
    apifyToken: import.meta.env.VITE_APIFY_TOKEN || '',
    salaryExpectation: '80.000',
    availability: '01.08.2026',
  },
  setSettings: (s) => set(KEYS.SETTINGS, s),

  // Search history
  getSearchHistory: () => get(KEYS.SEARCH_HISTORY) || [],
  addSearchHistory: (query) => {
    const h = storage.getSearchHistory().filter(q => q !== query).slice(0, 9)
    set(KEYS.SEARCH_HISTORY, [query, ...h])
  },

  // Last search results (cache for today)
  getLastSearch: () => get(KEYS.LAST_SEARCH),
  setLastSearch: (data) => set(KEYS.LAST_SEARCH, { ...data, timestamp: Date.now() }),
}
