import React from 'react'
import { Search, LayoutDashboard, Kanban, Settings } from 'lucide-react'

export default function Header({ activeTab, setActiveTab, stats }) {
  const tabs = [
    { id: 'search', icon: Search, label: 'Job Search' },
    { id: 'tracker', icon: Kanban, label: 'Tracker' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <header style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        height: 56,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white',
            fontFamily: 'var(--font-display)',
          }}>J</div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>JobRadar</span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === id ? 'var(--accent-glow)' : 'transparent',
                color: activeTab === id ? 'var(--accent)' : 'var(--text2)',
                fontWeight: activeTab === id ? 500 : 400,
                fontSize: 13,
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'Saved', value: stats.saved, color: 'var(--accent)' },
            { label: 'Applied', value: stats.applied, color: 'var(--blue)' },
            { label: 'Interviews', value: stats.interviews, color: 'var(--amber)' },
            { label: 'Offers', value: stats.offers, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
