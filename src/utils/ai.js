import { RESUME_EN, RESUME_DE, COVER_LETTER_TEMPLATE } from '../data/resume.js'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'
async function callClaude(apiKey, systemPrompt, userMessage, maxTokens = 1000) {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0]?.text || ''
}

// Detect if job description is in German or English
export function detectLanguage(text) {
  const deWords = ['und', 'der', 'die', 'das', 'ist', 'für', 'mit', 'wir', 'Sie', 'Erfahrung', 'Kenntnisse', 'Anforderungen', 'Aufgaben', 'Stellenanzeige']
  const matches = deWords.filter(w => text.includes(w)).length
  return matches >= 3 ? 'de' : 'en'
}

// Score a job against Vaibhav's resume
export async function scoreJob(apiKey, job) {
  const lang = detectLanguage(job.description)
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN

  const system = `You are a senior technical recruiter in Germany specialising in Industry 4.0, MES, IIoT and manufacturing engineering roles.
Your task is to score how well a candidate matches a job, using SEMANTIC matching — not just keyword matching.

CRITICAL SCORING RULES:
1. Treat equivalent terms as identical matches:
   - "MES" = "Manufacturing Execution System" = "Fertigungssteuerung" = "MES-System"
   - "Industry 4.0" = "Industrie 4.0" = "I4.0" = "Digitale Fertigung"
   - "IT/OT Convergence" = "IT/OT-Konvergenz" = "OT Integration"
   - "IIoT" = "Industrial IoT" = "industrielles Internet der Dinge"
   - "OPC UA" = "OPC-UA" = "OPCUA"
   - "SAP DM" = "SAP Digital Manufacturing" = "SAP DMC"
   - "Rollout" = "Implementierung" = "Einführung" = "Go-live"
   - "Solution Engineer" = "Consultant" = "Berater" = "Implementation Specialist"
   - "Shopfloor" = "Werksebene" = "Produktionsebene" = "shop floor"

2. Score based on EXPERIENCE DEPTH not just skill listing:
   - Candidate has 5+ years hands-on MES/IIoT → weight heavily
   - 17-plant rollout experience → matches any "multi-site" requirement
   - Deloitte consulting background → matches "consulting" or "solution" roles

3. Scoring weights:
   - Core technical skills match: 50%
   - Seniority / experience level match: 20%
   - Industry domain match (manufacturing/process industry): 15%
   - Location (Germany, permanent resident): 10%
   - Language match (German B2+, English fluent): 5%

4. Score thresholds: 90-100 = near-perfect, 80-89 = strong, 70-79 = good match, below 70 = not shown

Return ONLY valid JSON, no markdown, no explanation outside the JSON.`

  const user = `CANDIDATE RESUME:
${resume}

JOB TO SCORE:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description.slice(0, 2000)}

Return JSON with EXACTLY this structure (no extra fields):
{
  "score": <integer 0-100 following the rules above>,
  "matchedSkills": [<max 8 short strings of matched skills/experiences>],
  "missingSkills": [<max 4 short strings of genuinely missing requirements>],
  "summary": "<one sentence in English: why this is or isn't a good match>",
  "resumeAdjustment": <null or "specific one-sentence tip to strengthen resume for this role">,
  "salaryRange": {"low": "<e.g. 70.000>", "mid": "<e.g. 82.000>", "high": "<e.g. 95.000>", "currency": "EUR"},
  "marketComment": "<one sentence on whether posted salary matches market rate in Germany for this role>"
}`

  try {
    const text = await callClaude(apiKey, system, user, 700)
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    console.error('Score error:', e)
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      summary: 'Scoring failed — check API key in Settings',
      resumeAdjustment: null,
      salaryRange: { low: '–', mid: '–', high: '–', currency: 'EUR' },
      marketComment: '',
    }
  }
}

// Score multiple jobs — two pass: ≥70% first, fallback to ≥50% if nothing found
export async function scoreAndFilterJobs(apiKey, jobs, onProgress) {
  const scored = []

  for (let i = 0; i < jobs.length; i++) {
    onProgress?.(i + 1, jobs.length)
    const scoring = await scoreJob(apiKey, jobs[i])
    const lang = detectLanguage(jobs[i].description)
    scored.push({ ...jobs[i], scoring, lang })
  }

  // First pass — strong matches ≥70%
  const strongMatches = scored
    .filter(j => j.scoring.score >= 70)
    .sort((a, b) => b.scoring.score - a.scoring.score)
    .slice(0, 10)

  if (strongMatches.length > 0) {
    return { strong: strongMatches, extended: [], usedFallback: false }
  }

  // Second pass — extended matches 50–69%
  const extendedMatches = scored
    .filter(j => j.scoring.score >= 50)
    .sort((a, b) => b.scoring.score - a.scoring.score)
    .slice(0, 10)

  return { strong: [], extended: extendedMatches, usedFallback: true }
}

// Generate cover letter
export async function generateCoverLetter(apiKey, job, salary, availability) {
  const lang = detectLanguage(job.description)
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN

  const system = `You are an expert German career coach. Generate a professional German cover letter.
The letter must ALWAYS be written in German regardless of the job description language.
Follow the template structure exactly. Return only the cover letter text, no explanation.`

  const user = `Candidate Resume:
${resume}

Cover Letter Template & Style Guide:
${COVER_LETTER_TEMPLATE}

Job Details:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Settings:
- Salary expectation: ${salary} Euro brutto jährlich
- Available from: ${availability}
- Matched skills to highlight: ${job.scoring?.matchedSkills?.join(', ') || ''}
- Missing skills to address honestly: ${job.scoring?.missingSkills?.slice(0,2).join(', ') || ''}

Generate the complete cover letter in formal German following the 5-block structure.
Weave in the personal story naturally (manufacturing background → mechanical engineering → mechatronics → MES/IIoT).
Make minimal but precise changes to adapt to this specific company and role.
End with: Mit freundlichen Grüßen`

  return await callClaude(apiKey, system, user, 1200)
}

// Generate interview prep
export async function generateInterviewPrep(apiKey, job) {
  const lang = detectLanguage(job.description)
  const resume = lang === 'de' ? RESUME_DE : RESUME_EN

  const system = `You are an expert interview coach for engineering and technology roles in Germany.
Generate interview preparation material in English. Return only valid JSON.`

  const user = `Candidate Resume:
${resume}

Job: ${job.title} at ${job.company}
Description: ${job.description}
Match Score: ${job.scoring?.score}%
Matched Skills: ${job.scoring?.matchedSkills?.join(', ')}
Missing Skills: ${job.scoring?.missingSkills?.join(', ')}

Return JSON with exactly:
{
  "technicalQuestions": [
    {"question": "...", "suggestedAnswer": "..."}
  ],
  "behavioralQuestions": [
    {"question": "...", "suggestedAnswer": "..."}
  ],
  "studyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "companyTips": ["tip1", "tip2", "tip3"],
  "openingPitch": "A 3-sentence pitch tailored to this role in English"
}
Include 5 technical and 5 behavioral questions. Answers tailored to candidate's background.`

  try {
    const text = await callClaude(apiKey, system, user, 2000)
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    console.error('Interview prep error:', e)
    return null
  }
}
