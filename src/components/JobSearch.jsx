import React, { useState, useCallback } from 'react'
import { Search, MapPin, Briefcase, RefreshCw, Bookmark, BookmarkCheck, ExternalLink, ChevronRight, AlertCircle, TrendingUp } from 'lucide-react'
import { searchJobs } from '../utils/jobs.js'
import { scoreAndFilterJobs } from '../utils/ai.js'
import { storage } from '../utils/storage.js'
import { DEFAULT_SEARCH_TERMS } from '../data/resume.js'
import JobDetail from './JobDetail.jsx'

export default function JobSearch({ settings }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('Germany')
  const [jobs, setJobs] = useState({ strong: [], extended: [], usedFallback: false })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ step: '', current: 0, total: 0 })
  const [selectedJob, setSelectedJob] = useState(null)
  const [savedIds, setSavedIds] = useState(() => new Set(storage.getSavedJobs().map(j => j.id)))
  const [error, setError] = useState(null)

  const handleSearch = useCallback(async (searchQuery) => {
    const q = searchQuery || query
    if (!q.trim()) return
    if (!settings.anthropicKey) {
      setError('Please configure your Anthropic API key in Settings first.')
      return
    }

    setLoading(true)
    setError(null)
    setJobs({ strong: [], extended: [], usedFallback: false })
    storage.addSearchHistory(q)

    try {
      setProgress({ step: 'Fetching jobs from Arbeitsagentur, Adzuna & LinkedIn...', current: 0, total: 0 })
      const rawJobs = await searchJobs(
        q, location,
        settings.adzunaAppId,
        settings.adzunaAppKey,
        settings.apifyToken
      )

      setProgress({ step: `Scoring ${rawJobs.length} jobs against your resume...`, current: 0, total: rawJobs.length })

      const result = await scoreAndFilterJobs(
        settings.anthropicKey,
        rawJobs,
        (current, total) => setProgress({ step: `Scoring job ${current} of ${total}...`, current, total })
      )

      storage.setLastSearch({ query: q, location, results: result })
      setJobs(result)

      if (result.strong.length === 0 && result.extended.length === 0) {
        setError('No matches found even at 50% threshold. Try broader keywords.')
      }
    } catch (e) {
      setError(`Search failed: ${e.message}`)
    } finally {
      setLoading(false)
      setProgress({ step: '', current: 0, total: 0 })
    }
  }, [query, location, settings])

  const toggleSave = (job) => {
    if (savedIds.has(job.id)) {
      storage.removeSavedJob(job.id)
      setSavedIds(prev => { const s = new Set(prev); s.delete(job.id); return s })
    } else {
      storage.saveJob(job)
      setSavedIds(prev => new Set([...prev, job.id]))
    }
  }

  if (selectedJob) {
    return <JobDetail job={selectedJob} settings={settings} onBack={() => setSelectedJob(null)} />
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Search bar */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="MES Engineer, IIoT, SAP DM..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div style={{ position: 'relative', minWidth: 180 }}>
            <MapPin size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Bavaria, Stuttgart, Frankfurt..."
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading}>
            {loading ? <span className="spinner" /> : <Search size={14} />}
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>

        {/* Quick search defaults */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>Quick:</span>
          {DEFAULT_SEARCH_TERMS.slice(0, 6).map(term => (
            <button
              key={term}
              className="tag tag-purple"
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'var(--font-mono)' }}
              onClick={() => { setQuery(term); handleSearch(term) }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {loading && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <span className="spinner" />
            <span style={{ color: 'var(--text2)', fontSize: 14 }}>{progress.step}</span>
          </div>
          {progress.total > 0 && (
            <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'var(--accent)',
                width: `${(progress.current / progress.total) * 100}%`,
                transition: 'width 0.3s',
                borderRadius: 4,
              }} />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card fade-in" style={{ padding: 16, marginBottom: 20, borderColor: 'var(--red)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--red)" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {(jobs.strong.length > 0 || jobs.extended.length > 0) && (
        <div className="fade-in">
          {/* Strong matches ≥70% */}
          {jobs.strong.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                    {jobs.strong.length} top matches
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>≥70% score · ranked by match</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {jobs.strong.map((job, idx) => (
                  <JobCard key={job.id} job={job} rank={idx + 1} isSaved={savedIds.has(job.id)} onToggleSave={() => toggleSave(job)} onClick={() => setSelectedJob(job)} tier="strong" />
                ))}
              </div>
            </>
          )}

          {/* Extended matches 50–69% */}
          {jobs.extended.length > 0 && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 14px',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{
                  fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)',
                  background: 'var(--amber-bg)', padding: '3px 10px', borderRadius: 20,
                  border: '1px solid var(--amber)', whiteSpace: 'nowrap',
                }}>
                  Extended matches · 50–69%
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              {jobs.usedFallback && (
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                  No ≥70% matches found — showing partial matches below. Consider adjusting your search keywords.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobs.extended.map((job, idx) => (
                  <JobCard key={job.id} job={job} rank={idx + 1} isSaved={savedIds.has(job.id)} onToggleSave={() => toggleSave(job)} onClick={() => setSelectedJob(job)} tier="extended" />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.strong.length === 0 && jobs.extended.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 6 }}>Ready to find your next role</p>
          <p style={{ fontSize: 13 }}>Search above or pick a quick search to get your top 10 matches</p>
        </div>
      )}
    </div>
  )
}

function JobCard({ job, rank, isSaved, onToggleSave, onClick, tier }) {
  const score = job.scoring?.score || 0
  const scoreClass = score >= 85 ? 'score-high' : 'score-mid'

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start',
        borderColor: tier === 'extended' ? 'rgba(240,164,41,0.2)' : undefined,
      }}
      onClick={onClick}
    >
      <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', paddingTop: 4 }}>#{rank}</div>
      <div className={`score-ring ${scoreClass}`} style={{ flexShrink: 0 }}>{score}%</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{job.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text2)', fontSize: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={11} /> {job.company}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {job.location}</span>
              {job.remote && <span className="tag tag-green" style={{ fontSize: 10 }}>Remote</span>}
              {job.lang === 'de' && <span className="tag tag-blue" style={{ fontSize: 10 }}>DE</span>}
              <span className="tag tag-purple" style={{ fontSize: 10 }}>{job.source}</span>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onToggleSave() }} style={{ padding: 6, background: 'transparent', border: 'none', color: isSaved ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', flexShrink: 0 }}>
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {job.scoring?.matchedSkills?.slice(0, 5).map(skill => <span key={skill} className="tag tag-green">{skill}</span>)}
          {job.scoring?.missingSkills?.slice(0, 2).map(skill => <span key={skill} className="tag tag-amber">{skill}</span>)}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
          {job.scoring?.summary}
          {job.scoring?.resumeAdjustment && (
            <span style={{ color: 'var(--amber)', marginLeft: 6 }}>
              <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              Resume tip available
            </span>
          )}
        </p>
      </div>

      <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0, marginTop: 4 }} />
    </div>
  )
}
