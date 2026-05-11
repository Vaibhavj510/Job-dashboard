import { RESUME_EN, RESUME_DE, COVER_LETTER_TEMPLATE } from '../data/resume.js'

export function detectLanguage(text) {
  const deWords = ['und', 'der', 'die', 'das', 'ist', 'für', 'mit', 'wir', 'Sie',
    'Erfahrung', 'Kenntnisse', 'Anforderungen', 'Aufgaben', 'Stellenanzeige',
    'Wir suchen', 'gesucht', 'Bewerbung']
  const matches = deWords.filter(w => text.includes(w)).length
  return matches >= 3 ? 'de' : 'en'
}

export async function scoreJob(_apiKey, job) {
  const lang = detectLanguage(job.description || '')
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, resume }),
    })
    if (!res.ok) throw new Error(`Score API ${res.status}`)
    return await res.json()
  } catch (e) {
    console.error('[AI] Score error:', e.message)
    return { score: 0, matchedSkills: [], missingSkills: [], summary: 'Scoring failed: ' + e.message, resumeAdjustment: null, salaryRange: { low: '–', mid: '–', high: '–', currency: 'EUR' }, marketComment: '' }
  }
}

export async function scoreAndFilterJobs(_apiKey, jobs, onProgress) {
  const scored = []
  for (let i = 0; i < jobs.length; i++) {
    onProgress?.(i + 1, jobs.length)
    const scoring = await scoreJob(null, jobs[i])
    scored.push({ ...jobs[i], scoring, lang: detectLanguage(jobs[i].description || '') })
  }
  const strong = scored.filter(j => j.scoring.score >= 70).sort((a, b) => b.scoring.score - a.scoring.score).slice(0, 10)
  if (strong.length > 0) return { strong, extended: [], usedFallback: false }
  const extended = scored.filter(j => j.scoring.score >= 50).sort((a, b) => b.scoring.score - a.scoring.score).slice(0, 10)
  return { strong: [], extended, usedFallback: true }
}

export async function generateCoverLetter(_apiKey, job, salary, availability) {
  const lang = detectLanguage(job.description || '')
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN
  const res = await fetch('/api/coverletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job, resume, salary, availability, coverLetterTemplate: COVER_LETTER_TEMPLATE }),
  })
  if (!res.ok) throw new Error(`Cover letter API ${res.status}`)
  const data = await res.json()
  return data.coverLetter
}

export async function generateInterviewPrep(_apiKey, job) {
  const lang = detectLanguage(job.description || '')
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN
  const res = await fetch('/api/interviewprep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job, resume }),
  })
  if (!res.ok) throw new Error(`Interview prep API ${res.status}`)
  return await res.json()
}
