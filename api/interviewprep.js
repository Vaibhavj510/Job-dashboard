// api/interviewprep.js — Vercel serverless function

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

  const system = `You are an expert interview coach for engineering and technology roles in Germany.
Generate interview preparation in English. Return only valid JSON.`

  const user = `Candidate Resume:
${resume}

Job: ${job.title} at ${job.company}
Description: ${job.description?.slice(0, 1500)}
Match Score: ${job.scoring?.score}%
Matched Skills: ${job.scoring?.matchedSkills?.join(', ')}
Missing Skills: ${job.scoring?.missingSkills?.join(', ')}

Return JSON:
{
  "technicalQuestions": [{"question": "...", "suggestedAnswer": "..."}],
  "behavioralQuestions": [{"question": "...", "suggestedAnswer": "..."}],
  "studyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "companyTips": ["tip1", "tip2", "tip3"],
  "openingPitch": "3-sentence pitch tailored to this role"
}
Include 5 technical and 5 behavioral questions with answers tailored to candidate background.`

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
        max_tokens: 2000,
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
    return res.status(200).json(JSON.parse(clean))
  } catch (e) {
    console.error('[API/interviewprep] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
