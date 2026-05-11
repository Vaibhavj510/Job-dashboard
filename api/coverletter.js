// api/coverletter.js — Vercel serverless function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { job, resume, salary, availability, coverLetterTemplate } = req.body
  if (!job || !resume) return res.status(400).json({ error: 'job and resume required' })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic API key not configured' })

  const system = `You are an expert German career coach. Generate a professional German cover letter.
ALWAYS write in German regardless of job description language.
Follow the template structure exactly. Return only the cover letter text.`

  const user = `Candidate Resume:
${resume}

Cover Letter Template & Style:
${coverLetterTemplate}

Job:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description?.slice(0, 1500)}

Settings:
- Salary: ${salary} Euro brutto jährlich
- Available from: ${availability}
- Matched skills: ${job.scoring?.matchedSkills?.join(', ') || ''}
- Missing skills to address: ${job.scoring?.missingSkills?.slice(0, 2).join(', ') || ''}

Generate complete cover letter in formal German following the 5-block structure.
Weave in personal story naturally (manufacturing background → mechanical engineering → mechatronics → MES/IIoT).
End with: Mit freundlichen Grüßen`

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
        max_tokens: 1200,
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
    return res.status(200).json({ coverLetter: text })
  } catch (e) {
    console.error('[API/coverletter] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
