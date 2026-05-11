import React, { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import JobSearch from './components/JobSearch.jsx'
import Tracker from './components/Tracker.jsx'
import Settings from './components/Settings.jsx'
import { storage } from './utils/storage.js'

export default function App() {
  const [activeTab, setActiveTab] = useState('search')
  const [settings, setSettings] = useState(storage.getSettings())
  const [stats, setStats] = useState({ saved: 0, applied: 0, interviews: 0, offers: 0 })

  const refreshStats = () => {
    const tracker = storage.getTracker()
    const saved = storage.getSavedJobs().length
    const applied = Object.values(tracker).filter(v => v.stage === 'Applied').length
    const interviews = Object.values(tracker).filter(v =>
      ['HR Round', 'Technical Interview', 'Final Round'].includes(v.stage)
    ).length
    const offers = Object.values(tracker).filter(v => v.stage === 'Offer').length
    setStats({ saved, applied, interviews, offers })
  }

  useEffect(() => {
    refreshStats()
    // Refresh settings when tab changes (in case settings were updated)
    setSettings(storage.getSettings())
  }, [activeTab])

  const needsSetup = !settings.anthropicKey || !settings.apifyToken

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      {/* Setup banner */}
      {needsSetup && activeTab !== 'settings' && (
        <div style={{
          background: 'var(--amber-bg)', borderBottom: '1px solid var(--amber)',
          padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--amber)' }}>
            ⚠️ API keys not configured. Job search and AI features require setup.
          </span>
          <button className="btn btn-sm" style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }} onClick={() => setActiveTab('settings')}>
            Configure now →
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'search' && (
        <JobSearch settings={settings} onStatsChange={refreshStats} />
      )}
      {activeTab === 'tracker' && (
        <Tracker onJobClick={() => setActiveTab('search')} />
      )}
      {activeTab === 'settings' && (
        <Settings />
      )}
    </div>
  )
}
