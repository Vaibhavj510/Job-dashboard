import React, { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, MapPin, Briefcase, TrendingUp, FileText, Brain, StickyNote, Plus, Check, Copy, RefreshCw, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react'
import { generateCoverLetter, generateInterviewPrep } from '../utils/ai.js'
import { storage } from '../utils/storage.js'

const STAGES = ['Applied', 'HR Round', 'Technical Interview', 'Final Round', 'Offer', 'Rejected']

export default function JobDetail({ job, settings, onBack }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [trackerStage, setTrackerStage] = useState(() => {
    const t = storage.getTracker()
    return t[job.id]?.stage || null
  })
  const [note, setNote] = useState(() => storage.getNotes()[job.id]?.text || '')
  const [noteSaved, setNoteSaved] = useState(false)

  const [coverLetter, setCoverLetter] = useState(() => storage.getCoverLetters()[job.id] || null)
  const [clLoading, setClLoading] = useState(false)
  const [clSalary, setClSalary] = useState(settings.salaryExpectation || '80.000')
  const [clAvailability, setClAvailability] = useState(settings.availability || '01.08.2026')
  const [clCopied, setClCopied] = useState(false)

  const [interviewPrep, setInterviewPrep] = useState(() => storage.getInterviewPreps()[job.id] || null)
  const [prepLoading, setPrepLoading] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  const isSaved = !!storage.getSavedJobs().find(j => j.id === job.id)
  const score = job.scoring?.score || 0
  const scoreClass = score >= 85 ? 'score-high' : 'score-mid'

  const setStage = (stage) => {
    storage.setJobStage(job.id, stage, job)
    storage.saveJob(job)
    setTrackerStage(stage)
  }

  const saveNote = () => {
    storage.setNote(job.id, note)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const handleGenerateCoverLetter = async () => {
    setClLoading(true)
    try {
      const text = await generateCoverLetter(settings.anthropicKey, job, clSalary, clAvailability)
      const cl = { text, salary: clSalary, availability: clAvailability }
      storage.setCoverLetter(job.id, cl)
      setCoverLetter(cl)
    } catch (e) {
      alert('Cover letter generation failed: ' + e.message)
    } finally {
      setClLoading(false)
    }
  }

  const handleGenerateInterviewPrep = async () => {
    setPrepLoading(true)
    try {
      const prep = await generateInterviewPrep(settings.anthropicKey, job)
      storage.setInterviewPrep(job.id, prep)
      setInterviewPrep(prep)
    } catch (e) {
      alert('Interview prep generation failed: ' + e.message)
    } finally {
      setPrepLoading(false)
    }
  }

  const copyCoverLetter = () => {
    navigator.clipboard.writeText(coverLetter.text)
    setClCopied(true)
    setTimeout(() => setClCopied(false), 2000)
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'coverletter', label: 'Cover Letter' },
    { id: 'interview', label: 'Interview Prep' },
    { id: 'salary', label: 'Salary Insights' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to results
      </button>

      {/* Job header */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className={`score-ring ${scoreClass}`} style={{ width: 56, height: 56, fontSize: 15, flexShrink: 0 }}>{score}%</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{job.title}</h1>
                <div style={{ display: 'flex', gap: 14, color: 'var(--text2)', fontSize: 13, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={13} /> {job.company}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {job.location}</span>
                  {job.salary && <span style={{ color: 'var(--green)' }}>{job.salary}</span>}
                  {job.remote && <span className="tag tag-green">Remote</span>}
                  <span className={`tag ${job.lang === 'de' ? 'tag-blue' : 'tag-purple'}`}>{job.lang === 'de' ? 'DE job' : 'EN job'}</span>
                </div>
              </div>
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                Apply <ExternalLink size={12} />
              </a>
            </div>

            {/* Skills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12 }}>
              {job.scoring?.matchedSkills?.map(s => <span key={s} className="tag tag-green">{s}</span>)}
              {job.scoring?.missingSkills?.map(s => <span key={s} className="tag tag-amber">{s}</span>)}
            </div>

            {/* Resume adjustment alert */}
            {job.scoring?.resumeAdjustment && (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'var(--amber-bg)', border: '1px solid var(--amber)',
                borderRadius: 8, fontSize: 12, color: 'var(--amber)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <TrendingUp size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>Resume adjustment:</strong> {job.scoring.resumeAdjustment}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stage tracker */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>APPLICATION STAGE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setStage(stage)}
                className="btn btn-sm"
                style={{
                  background: trackerStage === stage
                    ? stage === 'Offer' ? 'var(--green)' : stage === 'Rejected' ? 'var(--red)' : 'var(--accent)'
                    : 'transparent',
                  color: trackerStage === stage ? 'white' : 'var(--text3)',
                  borderColor: trackerStage === stage ? 'transparent' : 'var(--border)',
                }}
              >{stage}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: activeSection === s.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeSection === s.id ? 'var(--accent-glow)' : 'transparent',
              color: activeSection === s.id ? 'var(--accent)' : 'var(--text2)',
              fontSize: 13, cursor: 'pointer',
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Section content */}
      <div className="fade-in" key={activeSection}>

        {/* Overview */}
        {activeSection === 'overview' && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: 'var(--text2)' }}>Job Description</h3>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{job.description}</p>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
              AI summary: {job.scoring?.summary}
            </div>
          </div>
        )}

        {/* Cover Letter */}
        {activeSection === 'coverletter' && (
          <div>
            <div className="card" style={{ padding: 20, marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Cover Letter Settings</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>SALARY EXPECTATION (€)</label>
                  <input className="input" value={clSalary} onChange={e => setClSalary(e.target.value)} placeholder="80.000" />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>AVAILABLE FROM</label>
                  <input className="input" value={clAvailability} onChange={e => setClAvailability(e.target.value)} placeholder="01.08.2026" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleGenerateCoverLetter} disabled={clLoading}>
                  {clLoading ? <span className="spinner" /> : <FileText size={14} />}
                  {coverLetter ? 'Regenerate' : 'Generate Cover Letter'}
                </button>
              </div>
            </div>

            {coverLetter && (
              <div className="card fade-in" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 500 }}>Generated Cover Letter (DE)</h3>
                  <button className="btn btn-ghost btn-sm" onClick={copyCoverLetter}>
                    {clCopied ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
                    {clCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  fontSize: 13, lineHeight: 1.9, color: 'var(--text2)',
                  whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)',
                  background: 'var(--bg3)', padding: 16, borderRadius: 8,
                }}>{coverLetter.text}</pre>
              </div>
            )}
          </div>
        )}

        {/* Interview Prep */}
        {activeSection === 'interview' && (
          <div>
            {!interviewPrep ? (
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <Brain size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Generate tailored interview questions and answers based on this role and your background.</p>
                <button className="btn btn-primary" onClick={handleGenerateInterviewPrep} disabled={prepLoading}>
                  {prepLoading ? <span className="spinner" /> : <Brain size={14} />}
                  Generate Interview Prep
                </button>
              </div>
            ) : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Opening pitch */}
                <div className="card" style={{ padding: 16, borderColor: 'var(--accent)' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>OPENING PITCH</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)' }}>{interviewPrep.openingPitch}</p>
                </div>

                {/* Technical questions */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>TECHNICAL QUESTIONS</div>
                  {interviewPrep.technicalQuestions?.map((q, i) => (
                    <QAItem key={i} q={q} idx={i} expanded={expandedQ} setExpanded={setExpandedQ} prefix="t" />
                  ))}
                </div>

                {/* Behavioral questions */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>BEHAVIORAL QUESTIONS</div>
                  {interviewPrep.behavioralQuestions?.map((q, i) => (
                    <QAItem key={i} q={q} idx={i} expanded={expandedQ} setExpanded={setExpandedQ} prefix="b" />
                  ))}
                </div>

                {/* Study topics & tips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>STUDY TOPICS</div>
                    {interviewPrep.studyTopics?.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>COMPANY TIPS</div>
                    {interviewPrep.companyTips?.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 5 }} />
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleGenerateInterviewPrep} disabled={prepLoading}>
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {/* Salary Insights */}
        {activeSection === 'salary' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Market Salary Insights — Germany</h3>
            {job.scoring?.salaryRange ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Entry / Low', value: job.scoring.salaryRange.low, color: 'var(--text2)' },
                    { label: 'Mid Market', value: job.scoring.salaryRange.mid, color: 'var(--accent)', highlight: true },
                    { label: 'Senior / High', value: job.scoring.salaryRange.high, color: 'var(--green)' },
                  ].map(({ label, value, color, highlight }) => (
                    <div key={label} style={{
                      padding: 16, borderRadius: 10, textAlign: 'center',
                      background: highlight ? 'var(--accent-glow)' : 'var(--bg3)',
                      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>EUR / year</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{job.scoring.marketComment}</p>
                {job.salary && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
                    <strong>Posted salary:</strong> {job.salary}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Salary data not available for this job. Run a new search to get market insights.</p>
            )}
          </div>
        )}

        {/* Notes */}
        {activeSection === 'notes' && (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Notes for this application</h3>
            <textarea
              className="input"
              style={{ minHeight: 180, resize: 'vertical', lineHeight: 1.7 }}
              placeholder="Add notes — recruiter name, interview date, things to remember..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveNote}>
                {noteSaved ? <Check size={13} /> : <StickyNote size={13} />}
                {noteSaved ? 'Saved!' : 'Save note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QAItem({ q, idx, expanded, setExpanded, prefix }) {
  const key = `${prefix}-${idx}`
  const isOpen = expanded === key
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
      <button
        onClick={() => setExpanded(isOpen ? null : key)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          color: 'var(--text)', fontSize: 13, fontWeight: 500, padding: '2px 0',
        }}
      >
        <span>{q.question}</span>
        {isOpen ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
      </button>
      {isOpen && (
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginTop: 8, paddingLeft: 0 }}>
          {q.suggestedAnswer}
        </p>
      )}
    </div>
  )
}
