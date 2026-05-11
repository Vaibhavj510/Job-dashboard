const LINKEDIN_ACTOR = 'misceres~linkedin-jobs-scraper'
const INDEED_ACTOR = 'misceres~indeed-scraper'
const APIFY_BASE = 'https://api.apify.com/v2'

export async function searchApify(query, token) {
  console.log('[Apify] Starting LinkedIn search:', query)
  try {
    const jobs = await searchLinkedIn(query, token)
    if (jobs.length > 0) {
      console.log(`[Apify] LinkedIn: ${jobs.length} jobs`)
      return jobs
    }
    console.log('[Apify] LinkedIn 0 results — trying Indeed...')
  } catch (e) {
    console.warn('[Apify] LinkedIn failed:', e.message)
  }

  try {
    const jobs = await searchIndeed(query, token)
    console.log(`[Apify] Indeed: ${jobs.length} jobs`)
    return jobs
  } catch (e) {
    console.warn('[Apify] Indeed failed:', e.message)
    return []
  }
}

async function searchLinkedIn(query, token) {
  const encoded = encodeURIComponent(query)
  const input = {
    searchUrls: [
      `https://www.linkedin.com/jobs/search/?keywords=${encoded}&location=Germany&f_TPR=r604800`,
      `https://www.linkedin.com/jobs/search/?keywords=${encoded}&location=Bayern%2C%20Germany&f_TPR=r604800`,
      `https://www.linkedin.com/jobs/search/?keywords=${encoded}&location=Baden-W%C3%BCrttemberg%2C%20Germany&f_TPR=r604800`,
    ],
    maxJobs: 20,
    parseCompanyDetails: false,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  }
  return runActor(LINKEDIN_ACTOR, input, token, normalizeLinkedIn)
}

async function searchIndeed(query, token) {
  const input = {
    queries: [
      `${query} München Bayern`,
      `${query} Stuttgart Baden-Württemberg`,
      `${query} Frankfurt Deutschland`,
    ],
    maxItems: 20,
    country: 'DE',
    proxy: { useApifyProxy: true },
  }
  return runActor(INDEED_ACTOR, input, token, normalizeIndeed)
}

function normalizeLinkedIn(item, i) {
  return {
    id: `li-${item.id || item.jobId || Date.now() + i}`,
    title: item.title || item.positionName || '',
    company: item.companyName || item.company || '',
    location: item.location || item.jobLocation || 'Germany',
    description: item.description || item.jobDescription || item.descriptionHtml?.replace(/<[^>]+>/g, '') || '',
    salary: item.salary || item.salaryRange || null,
    url: item.jobUrl || item.applyUrl || item.url || '#',
    postedAt: item.postedAt || item.listedAt || new Date().toISOString(),
    employmentType: item.employmentType || 'Full-time',
    remote: detectRemote(item),
    source: 'LinkedIn',
  }
}

function normalizeIndeed(item, i) {
  return {
    id: `in-${item.id || item.jobKey || Date.now() + i}`,
    title: item.positionName || item.title || '',
    company: item.company || item.companyName || '',
    location: item.location || item.jobLocation || 'Germany',
    description: item.description || item.jobDescription || item.summary || '',
    salary: item.salary || item.salarySnippet || null,
    url: item.url || item.jobUrl || '#',
    postedAt: item.postedAt || item.date || new Date().toISOString(),
    employmentType: item.jobType || 'Full-time',
    remote: detectRemote(item),
    source: 'Indeed',
  }
}

async function runActor(actorId, input, token, normalizer) {
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${token}&timeout=120`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )
  if (!startRes.ok) throw new Error(`Actor start failed ${startRes.status}`)
  const { data: runData } = await startRes.json()
  const runId = runData?.id
  if (!runId) throw new Error('No runId')
  console.log(`[Apify] Run: ${runId}`)
  const datasetId = await pollRun(runId, token)
  const items = await fetchDataset(datasetId, token)
  return items
    .map((item, i) => normalizer(item, i))
    .filter(j => j.title && j.description && j.description.length > 80)
}

async function pollRun(runId, token, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(4000)
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`)
    if (!res.ok) continue
    const { data } = await res.json()
    console.log(`[Apify] Poll ${i + 1}: ${data?.status}`)
    if (data?.status === 'SUCCEEDED') return data.defaultDatasetId
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(data?.status)) throw new Error(`Run ${data?.status}`)
  }
  throw new Error('Polling timeout')
}

async function fetchDataset(datasetId, token) {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=50&clean=true`)
  if (!res.ok) throw new Error(`Dataset fetch ${res.status}`)
  return res.json()
}

function detectRemote(item) {
  return Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase()
    .match(/remote|home.?office|homeoffice/) !== null
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
