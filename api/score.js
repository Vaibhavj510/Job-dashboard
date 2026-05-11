// api/score.js — Vercel serverless function
// Calls Claude API to score a job against Vaibhav's resume

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { job, resume } = req.body
  if (!job || !resume) return res.status(400).json({ error: 'job and resume required' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const system = `You are a senior technical recruiter in Germany specialising in Industry 4.0, MES, IIoT and manufacturing engineering roles.
Score how well a candidate matches a job using SEMANTIC matching — not just keyword matching.

CRITICAL SCORING RULES:
1. Treat equivalent terms as identical matches:
   - "MES" = "Manufacturing Execution System" = "Fertigungssteuerung"
   - "Industry 4.0" = "Industrie 4.0" = "Digitale Fertigung"
   - "IT/OT Convergence" = "IT/OT-Konvergenz"
   - "IIoT" = "Industrial IoT" = "industrielles Internet der Dinge"
   - "OPC UA" = "OPC-UA" = "OPCUA"
   - "SAP DM" = "SAP Digital Manufacturing"
   - "Rollout" = "Implementierung" = "Einführung"
   - "Solution Engineer" = "Consultant" = "Berater"
   - "Shopfloor" = "Werksebene" = "Produktionsebene"

2. Score based on EXPERIENCE DEPTH:
   - Candidate has 5+ years hands-on MES/IIoT → weight heavily
   - 17-plant rollout → matches any "multi-site" requirement
   - Deloitte consulting → matches "consulting" or "solution" roles

3. Scoring weights:
   - Core technical skills: 50%
   - Seniority/experience level: 20%
   - Industry domain (manufacturing/process): 15%
   - Location (Germany, permanent resident): 10%
   - Language (German B2+, English fluent): 5%

Return ONLY valid JSON, no markdown.`

  const user = `CANDIDATE RESUME:
${resume}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description?.slice(0, 2000)}

Return JSON:
{
  "score": <integer 0-100>,
  "matchedSkills": [<max 8 matched skills>],
  "missingSkills": [<max 4 missing skills>],
  "summary": "<one sentence in English>",
  "resumeAdjustment": <null or "one sentence tip">,
  "salaryRange": {"low": "<e.g. 70.000>", "mid": "<e.g. 82.000>", "high": "<e.g. 95.000>", "currency": "EUR"},
  "marketComment": "<one sentence on market rate in Germany>"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || `Claude API ${response.status}`)
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const scoring = JSON.parse(clean)
    return res.status(200).json(scoring)
  } catch (e) {
    console.error('[API/score] Error:', e.message)
    return res.status(500).json({
      score: 0, matchedSkills: [], missingSkills: [],
      summary: 'Scoring failed: ' + e.message,
      resumeAdjustment: null,
      salaryRange: { low: '–', mid: '–', high: '–', currency: 'EUR' },
      marketComment: '',
    })
  }
}
