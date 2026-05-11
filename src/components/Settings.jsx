import React, { useState } from 'react'
import { Key, Check, Eye, EyeOff, Info } from 'lucide-react'
import { storage } from '../utils/storage.js'

export default function Settings() {
  const [settings, setSettings] = useState(storage.getSettings())
  const [saved, setSaved] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [showAdzunaId, setShowAdzunaId] = useState(false)
  const [showAdzunaKey, setShowAdzunaKey] = useState(false)
  const [showApify, setShowApify] = useState(false)

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  const save = () => {
    storage.setSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({ label, field, placeholder, show, onToggleShow, hint }) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={settings[field] || ''}
          onChange={e => update(field, e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 40 }}
        />
        <button
          onClick={() => onToggleShow(!show)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
        >{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
      </div>
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>{hint}</p>}
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Settings</h2>

      {/* API Keys */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Key size={15} color="var(--accent)" /> API Keys
        </h3>

        <Field
          label="ANTHROPIC API KEY"
          field="anthropicKey"
          placeholder="sk-ant-api03-..."
          show={showAnthropic}
          onToggleShow={setShowAnthropic}
          hint="Get from console.anthropic.com → API Keys. Used for AI scoring, cover letters, and interview prep."
        />

        <Field
          label="ANTHROPIC API KEY (optional — overrides server key)"
          field="anthropicKey"
          placeholder="sk-ant-api03-..."
          show={showAnthropic}
          onToggleShow={setShowAnthropic}
          hint="Only needed if running locally. On Vercel, the key is configured server-side in Vercel dashboard."
        />
      </div>

      {/* Defaults */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Cover Letter Defaults</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>DEFAULT SALARY (€)</label>
            <input className="input" value={settings.salaryExpectation || ''} onChange={e => update('salaryExpectation', e.target.value)} placeholder="80.000" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>DEFAULT AVAILABILITY</label>
            <input className="input" value={settings.availability || ''} onChange={e => update('availability', e.target.value)} placeholder="01.08.2026" />
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>These are defaults — you can override them per application in the job detail view.</p>
      </div>

      {/* Info */}
      <div style={{
        padding: '14px 16px', background: 'var(--blue-bg)',
        border: '1px solid var(--blue)', borderRadius: 10,
        marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Info size={14} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          API keys are stored locally in your browser and never sent anywhere except directly to Anthropic and Apify APIs.
          When you deploy to GitHub Pages, add them to a <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>.env</code> file (never commit this file).
        </div>
      </div>

      <button className="btn btn-primary" onClick={save}>
        {saved ? <Check size={14} /> : <Key size={14} />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
