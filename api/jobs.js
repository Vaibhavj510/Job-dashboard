// api/jobs.js — Vercel serverless function
// Fetches jobs from Adzuna + Arbeitsagentur in parallel
// Runs on Vercel server — no CORS issues

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/de/search'
const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs'

const ADZUNA_LOCATIONS = ['Bayern', 'Baden-Württemberg', 'Frankfurt am Main']
const BA_LOCATIONS = ['Bayern', 'Baden-Württemberg', 'Frankfurt', 'Düsseldorf']

export default async function handler(req, res) {
  // CORS headers — allow your frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })

  const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID
  const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY

  console.log('[API/jobs] Query:', query)

  const [adzunaResult, baResult] = await Promise.allSettled([
    ADZUNA_APP_ID && ADZUNA_APP_KEY
      ? searchAdzuna(query, ADZUNA_APP_ID, ADZUNA_APP_KEY)
      : Promise.resolve([]),
    searchArbeitsagentur(query),
  ])

  const adzunaJobs = adzunaResult.status === 'fulfilled' ? adzunaResult.value : []
  const baJobs     = baResult.status     === 'fulfilled' ? baResult.value     : []

  if (adzunaResult.status === 'rejected') console.warn('[Adzuna] Failed:', adzunaResult.reason?.message)
  if (baResult.status     === 'rejected') console.warn('[BA] Failed:', baResult.reason?.message)

  console.log(`[API/jobs] Adzuna=${adzunaJobs.length} BA=${baJobs.length}`)

  const merged = deduplicateJobs([...adzunaJobs, ...baJobs])
  console.log(`[API/jobs] Merged: ${merged.length}`)

  return res.status(200).json({ jobs: merged, sources: { adzuna: adzunaJobs.length, ba: baJobs.length } })
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function searchAdzuna(query, appId, appKey) {
  const results = await Promise.allSettled(
    ADZUNA_LOCATIONS.map(loc => fetchAdzunaPage(query, loc, appId, appKey))
  )
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
}

async function fetchAdzunaPage(query, location, appId, appKey) {
  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: 10, what: query, where: location,
    distance: 50, sort_by: 'relevance', full_description: 1,
  })
  const res = await fetch(`${ADZUNA_BASE}/1?${params}`)
  if (!res.ok) throw new Error(`Adzuna ${res.status}`)
  const data = await res.json()
  return (data.results || []).map((item, i) => ({
    id: `az-${item.id || Date.now() + i}`,
    title: item.title || '',
    company: item.company?.display_name || '',
    location: item.location?.display_name || item.location?.area?.join(', ') || 'Germany',
    description: item.description || '',
    salary: formatSalary(item),
    url: item.redirect_url || '#',
    postedAt: item.created || new Date().toISOString(),
    employmentType: item.contract_type || 'Full-time',
    remote: detectRemote(item),
    source: 'Adzuna',
  }))
}

function formatSalary(item) {
  if (!item.salary_min && !item.salary_max) return null
  const min = item.salary_min ? Math.round(item.salary_min).toLocaleString('de-DE') : null
  const max = item.salary_max ? Math.round(item.salary_max).toLocaleString('de-DE') : null
  if (min && max) return `${min} – ${max} EUR`
  if (min) return `ab ${min} EUR`
  return `bis ${max} EUR`
}

// ─── Arbeitsagentur ───────────────────────────────────────────────────────────

async function searchArbeitsagentur(query) {
  const results = await Promise.allSettled(
    BA_LOCATIONS.map(loc => fetchBAPage(query, loc))
  )
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
}

async function fetchBAPage(query, location) {
  const params = new URLSearchParams({
    was: query, wo: location, umkreis: 50, page: 1, size: 10, angebotsart: 1,
  })
  const res = await fetch(`${BA_BASE}?${params}`, {
    headers: { 'X-API-Key': 'jobboerse-jobsuche', 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`BA ${res.status}`)
  const data = await res.json()
  const items = data.stellenangebote || data.jobs || data.items || []
  return items.map((item, i) => {
    const city   = item.arbeitsort?.ort || item.ort || ''
    const region = item.arbeitsort?.region || item.bundesland || ''
    const refNr  = item.refnr || item.stellenangebotsnummer || ''
    return {
      id: `ba-${refNr || Date.now() + i}`,
      title:    item.titel || item.beruf || '',
      company:  item.arbeitgeber || item.arbeitgeberName || '',
      location: [city, region].filter(Boolean).join(', ') || 'Deutschland',
      description: item.stellenbeschreibung || item.beschreibung || item.kurzbeschreibung || '',
      salary:   item.vergütung || item.gehalt || null,
      url:      refNr ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}` : 'https://www.arbeitsagentur.de/jobsuche',
      postedAt: item.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
      employmentType: item.arbeitszeitmodell || 'Vollzeit',
      remote:   detectRemote(item),
      source:   'Arbeitsagentur',
    }
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deduplicateJobs(jobs) {
  const seen = new Set()
  return jobs.filter(job => {
    if (!job.title) return false
    const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function detectRemote(item) {
  return Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase()
    .match(/remote|home.?office|homeoffice|mobiles arbeiten/) !== null
}
