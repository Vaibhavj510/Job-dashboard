import React, { useState, useEffect } from 'react'
import { MapPin, Briefcase, ExternalLink, Trash2, ChevronRight } from 'lucide-react'
import { storage } from '../utils/storage.js'

const STAGES = ['Applied', 'HR Round', 'Technical Interview', 'Final Round', 'Offer', 'Rejected']

const STAGE_COLORS = {
  'Applied': 'var(--blue)',
  'HR Round': 'var(--amber)',
  'Technical Interview': 'var(--accent)',
  'Final Round': '#e879f9',
  'Offer': 'var(--green)',
  'Rejected': 'var(--red)',
}

export default function Tracker({ onJobClick }) {
  const [tracker, setTracker] = useState({})
  const [notes, setNotes] = useState({})

  useEffect(() => {
    setTracker(storage.getTracker())
    setNotes(storage.getNotes())
  }, [])

  const moveJob = (jobId, newStage) => {
    const t = storage.getTracker()
    if (t[jobId]) {
      storage.setJobStage(jobId, newStage, t[jobId].jobData)
      setTracker(storage.getTracker())
    }
  }

  const removeJob = (jobId) => {
    storage.removeFromTracker(jobId)
    setTracker(storage.getTracker())
  }

  const jobsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = Object.entries(tracker)
      .filter(([, v]) => v.stage === stage)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.addedAt - a.addedAt)
    return acc
  }, {})

  const totalActive = Object.values(tracker).filter(v => v.stage !== 'Rejected').length

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Active applications', value: totalActive, color: 'var(--accent)' },
          { label: 'Interviews', value: jobsByStage['Technical Interview'].length + jobsByStage['Final Round'].length, color: 'var(--amber)' },
          { label: 'Offers', value: jobsByStage['Offer'].length, color: 'var(--green)' },
          { label: 'Rejected', value: jobsByStage['Rejected'].length, color: 'var(--red)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 20px', flex: 1, minWidth: 120,
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {STAGES.map(stage => (
          <div key={stage} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Column header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{stage}</span>
              </div>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                background: 'var(--bg3)', color: 'var(--text3)',
                padding: '1px 7px', borderRadius: 10,
              }}>{jobsByStage[stage].length}</span>
            </div>

            {/* Cards */}
            <div style={{ padding: 10, minHeight: 80, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jobsByStage[stage].length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text3)', fontSize: 11 }}>No applications</div>
              ) : (
                jobsByStage[stage].map(({ id, jobData, addedAt }) => (
                  <TrackerCard
                    key={id}
                    jobId={id}
                    job={jobData}
                    stage={stage}
                    addedAt={addedAt}
                    note={notes[id]?.text}
                    onMove={(newStage) => moveJob(id, newStage)}
                    onRemove={() => removeJob(id)}
                    onClick={() => onJobClick && onJobClick(jobData)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrackerCard({ jobId, job, stage, addedAt, note, onMove, onRemove, onClick }) {
  const [showMove, setShowMove] = useState(false)
  const score = job?.scoring?.score || 0

  const daysAgo = Math.floor((Date.now() - addedAt) / (1000 * 60 * 60 * 24))

  return (
    <div className="card" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job?.title || 'Unknown Role'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job?.company}
          </p>
        </div>
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: score >= 85 ? 'var(--green)' : 'var(--amber)',
          flexShrink: 0, marginLeft: 6,
        }}>{score}%</div>
      </div>

      {job?.location && (
        <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <MapPin size={9} /> {job.location}
        </div>
      )}

      {note && (
        <p style={{
          fontSize: 10, color: 'var(--text3)', fontStyle: 'italic',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 6,
        }}>"{note}"</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
        </span>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          {/* Move dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', fontSize: 10 }}
              onClick={() => setShowMove(!showMove)}
            >
              Move <ChevronRight size={9} />
            </button>
            {showMove && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: 8, overflow: 'hidden', zIndex: 10, minWidth: 140,
              }}>
                {STAGES.filter(s => s !== stage).map(s => (
                  <button
                    key={s}
                    style={{
                      width: '100%', textAlign: 'left', padding: '6px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: 'var(--text2)',
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.target.style.background = 'none'}
                    onClick={() => { onMove(s); setShowMove(false) }}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 6px' }}
            onClick={onRemove}
          ><Trash2 size={10} color="var(--red)" /></button>
        </div>
      </div>
    </div>
  )
}
