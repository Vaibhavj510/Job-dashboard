import { searchApify } from './apify.js'

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/de/search'
const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs'

export async function searchJobs(query, location = 'Germany', adzunaAppId, adzunaAppKey, apifyToken) {
  console.log('[Jobs] Parallel search across all 3 sources:', query)

  const [adzunaResult, baResult, apifyResult] = await Promise.allSettled([
    adzunaAppId && adzunaAppKey ? searchAdzuna(query, adzunaAppId, adzunaAppKey) : Promise.resolve([]),
    searchArbeitsagentur(query),
    apifyToken ? searchApify(query, apifyToken) : Promise.resolve([]),
  ])

  const adzunaJobs = adzunaResult.status === 'fulfilled' ? adzunaResult.value : []
  const baJobs     = baResult.status     === 'fulfilled' ? baResult.value     : []
  const apifyJobs  = apifyResult.status  === 'fulfilled' ? apifyResult.value  : []

  if (adzunaResult.status === 'rejected') console.warn('[Adzuna] Failed:', adzunaResult.reason?.message)
  if (baResult.status     === 'rejected') console.warn('[BA] Failed:', baResult.reason?.message)
  if (apifyResult.status  === 'rejected') console.warn('[Apify] Failed:', apifyResult.reason?.message)

  console.log(`[Jobs] Raw: Adzuna=${adzunaJobs.length} BA=${baJobs.length} Apify=${apifyJobs.length}`)

  const merged = deduplicateJobs([...adzunaJobs, ...baJobs, ...apifyJobs])
  console.log(`[Jobs] Merged unique: ${merged.length}`)

  if (merged.length === 0) {
    console.warn('[Jobs] All sources 0 — using demo data')
    return getMockJobs()
  }
  return merged
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

async function searchAdzuna(query, appId, appKey) {
  const locations = ['Bayern', 'Baden-Württemberg', 'Frankfurt am Main']
  const results = await Promise.allSettled(
    locations.map(loc => fetchAdzunaPage(query, loc, appId, appKey))
  )
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
}

async function fetchAdzunaPage(query, location, appId, appKey) {
  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: 10, what: query, where: location,
    distance: 50, sort_by: 'relevance', full_description: 1, language: 'de_DE',
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
    salary: formatAdzunaSalary(item),
    url: item.redirect_url || '#',
    postedAt: item.created || new Date().toISOString(),
    employmentType: item.contract_type || 'Full-time',
    remote: detectRemote(item),
    source: 'Adzuna',
  }))
}

function formatAdzunaSalary(item) {
  if (!item.salary_min && !item.salary_max) return null
  const min = item.salary_min ? Math.round(item.salary_min).toLocaleString('de-DE') : null
  const max = item.salary_max ? Math.round(item.salary_max).toLocaleString('de-DE') : null
  if (min && max) return `${min} – ${max} EUR`
  if (min) return `ab ${min} EUR`
  return `bis ${max} EUR`
}

// ─── Arbeitsagentur ───────────────────────────────────────────────────────────

async function searchArbeitsagentur(query) {
  const locations = ['Bayern', 'Baden-Württemberg', 'Frankfurt', 'Düsseldorf']
  const results = await Promise.allSettled(
    locations.map(loc => fetchBAPage(query, loc))
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
    const city    = item.arbeitsort?.ort || item.ort || ''
    const region  = item.arbeitsort?.region || item.bundesland || ''
    const refNr   = item.refnr || item.stellenangebotsnummer || ''
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

// ─── Deduplication ────────────────────────────────────────────────────────────

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

// ─── Mock fallback ────────────────────────────────────────────────────────────

export function getMockJobs() {
  return [
    { id: 'mock-1', title: 'Senior MES Engineer', company: 'Siemens AG', location: 'München, Bayern', description: 'Wir suchen einen Senior MES Engineer mit fundierter Erfahrung in ISA-95, OPC UA, MQTT und SAP Digital Manufacturing. IT/OT-Konvergenz und IEC 62443 Kenntnisse erforderlich. Sie leiten die Implementierung von MES-Lösungen über mehrere Fertigungsstandorte. Erfahrung mit SAP S/4HANA-Integration und REST APIs erwünscht. Python-Kenntnisse und Agile-Projekterfahrung von Vorteil.', salary: '75.000 – 90.000 EUR', url: 'https://siemens.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
    { id: 'mock-2', title: 'IIoT Solution Architect', company: 'Bosch Rexroth', location: 'Stuttgart, Baden-Württemberg', description: 'Join our Industrie 4.0 team as IIoT Solution Architect. Required: OPC UA, MQTT, Edge Computing, IT/OT convergence. SAP DM and PTC Kepware experience strongly preferred. ISA-95 levels 1-4 essential. Multi-site rollout experience a strong plus.', salary: '80.000 – 95.000 EUR', url: 'https://boschrexroth.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: true, source: 'Demo' },
    { id: 'mock-3', title: 'Industry 4.0 Solution Engineer', company: 'Deloitte Consulting', location: 'Frankfurt, Hessen', description: 'Senior consultant for digital manufacturing transformation. MES architecture, SAP Digital Manufacturing, ISA-95 standards required. Multi-site international rollout experience essential. German language and stakeholder management skills required. REST API, IEC 62443, Power BI, KPI frameworks valued.', salary: '85.000 – 100.000 EUR', url: 'https://deloitte.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: false, source: 'Demo' },
    { id: 'mock-4', title: 'SAP Digital Manufacturing Spezialist', company: 'BASF SE', location: 'Ludwigshafen, Baden-Württemberg', description: 'SAP DM Implementierungsspezialist für die Prozessindustrie. Vorausgesetzt: SAP Digital Manufacturing, S/4HANA, EWM, SFC-Lebenszyklus, POD-Plugins. OPC UA Konnektivität erforderlich. Deutsch B2 Minimum. MES-ERP-Integration und ISA-95 notwendig.', salary: '70.000 – 85.000 EUR', url: 'https://basf.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
    { id: 'mock-5', title: 'OT Security & IIoT Engineer', company: 'TÜV SÜD', location: 'München, Bayern', description: 'OT/ICS cybersecurity engineer for industrial manufacturing. IEC 62443 expertise required. OT network hardening, SCADA, Siemens S7 essential. OPC UA, Modbus, MQTT required. AWS or Azure beneficial. PTC Kepware a plus.', salary: '72.000 – 88.000 EUR', url: 'https://tuvsud.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: false, source: 'Demo' },
    { id: 'mock-6', title: 'Projektmanager Digitale Fertigung', company: 'BMW Group', location: 'München, Bayern', description: 'Projektmanager für die Digitalisierung unserer Fertigungsanlagen. MES-Systeme, Shopfloor-Digitalisierung und IT/OT-Konvergenz. OPC UA, SCADA. Agile/Scrum Methodik erforderlich. PSM I von Vorteil.', salary: '78.000 – 92.000 EUR', url: 'https://bmwgroup.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
  ]
}
