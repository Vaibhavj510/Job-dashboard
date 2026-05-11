// Frontend job search — calls Vercel API route which handles CORS
// All actual API calls happen server-side

export async function searchJobs(query) {
  console.log('[Jobs] Searching via Vercel API:', query)

  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) throw new Error(`Jobs API ${res.status}`)

    const data = await res.json()
    console.log(`[Jobs] Adzuna=${data.sources?.adzuna} BA=${data.sources?.ba} Total=${data.jobs?.length}`)

    if (!data.jobs || data.jobs.length === 0) {
      console.warn('[Jobs] API returned 0 jobs — using demo data')
      return getMockJobs()
    }

    return data.jobs
  } catch (e) {
    console.error('[Jobs] Search failed:', e.message)
    return getMockJobs()
  }
}

export function getMockJobs() {
  console.log('[Jobs] Returning demo jobs')
  return [
    { id: 'mock-1', title: 'Senior MES Engineer', company: 'Siemens AG', location: 'München, Bayern', description: 'Wir suchen einen Senior MES Engineer mit fundierter Erfahrung in ISA-95, OPC UA, MQTT und SAP Digital Manufacturing. IT/OT-Konvergenz und IEC 62443 Kenntnisse erforderlich. Sie leiten die Implementierung von MES-Lösungen über mehrere Fertigungsstandorte. Erfahrung mit SAP S/4HANA-Integration und REST APIs erwünscht. Python-Kenntnisse und Agile-Projekterfahrung von Vorteil.', salary: '75.000 – 90.000 EUR', url: 'https://siemens.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
    { id: 'mock-2', title: 'IIoT Solution Architect', company: 'Bosch Rexroth', location: 'Stuttgart, Baden-Württemberg', description: 'Join our Industrie 4.0 team as IIoT Solution Architect. Required: OPC UA, MQTT, Edge Computing, IT/OT convergence. SAP DM and PTC Kepware experience strongly preferred. ISA-95 levels 1-4 essential. Multi-site rollout experience a strong plus.', salary: '80.000 – 95.000 EUR', url: 'https://boschrexroth.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: true, source: 'Demo' },
    { id: 'mock-3', title: 'Industry 4.0 Solution Engineer', company: 'Deloitte Consulting', location: 'Frankfurt, Hessen', description: 'Senior consultant for digital manufacturing transformation. MES architecture, SAP Digital Manufacturing, ISA-95 standards required. Multi-site international rollout experience essential. German language and stakeholder management skills required.', salary: '85.000 – 100.000 EUR', url: 'https://deloitte.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: false, source: 'Demo' },
    { id: 'mock-4', title: 'SAP Digital Manufacturing Spezialist', company: 'BASF SE', location: 'Ludwigshafen, Baden-Württemberg', description: 'SAP DM Implementierungsspezialist für die Prozessindustrie. Vorausgesetzt: SAP Digital Manufacturing, S/4HANA, EWM, SFC-Lebenszyklus, POD-Plugins. OPC UA Konnektivität erforderlich. Deutsch B2 Minimum.', salary: '70.000 – 85.000 EUR', url: 'https://basf.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
    { id: 'mock-5', title: 'OT Security & IIoT Engineer', company: 'TÜV SÜD', location: 'München, Bayern', description: 'OT/ICS cybersecurity engineer for industrial manufacturing. IEC 62443 expertise required. OT network hardening, SCADA, Siemens S7 essential. OPC UA, Modbus, MQTT required. AWS or Azure beneficial.', salary: '72.000 – 88.000 EUR', url: 'https://tuvsud.com/careers', postedAt: new Date().toISOString(), employmentType: 'Full-time', remote: false, source: 'Demo' },
    { id: 'mock-6', title: 'Projektmanager Digitale Fertigung', company: 'BMW Group', location: 'München, Bayern', description: 'Projektmanager für die Digitalisierung unserer Fertigungsanlagen. MES-Systeme, Shopfloor-Digitalisierung und IT/OT-Konvergenz. OPC UA, SCADA. Agile/Scrum Methodik erforderlich. PSM I von Vorteil.', salary: '78.000 – 92.000 EUR', url: 'https://bmwgroup.com/careers', postedAt: new Date().toISOString(), employmentType: 'Vollzeit', remote: false, source: 'Demo' },
  ]
}
