import { useState } from 'react'

// Uji Pertemuan 10: AnonRateThrottle("10/m") — request anonim ke-11 dalam
// 1 menit harus mendapat 429 {"detail": "Too many request"}.
export default function ThrottleTest() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    setLog([])
    for (let i = 1; i <= 13; i++) {
      const start = performance.now()
      let entry
      try {
        // sengaja TANPA Authorization header supaya kena bucket anonim (10/menit)
        const res = await fetch('/api/v1/courses/?page=1')
        const ms = Math.round(performance.now() - start)
        let detail = ''
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}))
          detail = ` — "${body.detail || ''}"`
        }
        entry = { i, status: res.status, ms, detail }
      } catch (err) {
        entry = { i, status: 'ERR', ms: 0, detail: ` — ${err.message}` }
      }
      setLog((prev) => [...prev, entry])
    }
    setRunning(false)
  }

  return (
    <div className="card">
      <h2>Uji Rate Limiting (Pertemuan 10)</h2>
      <p className="muted">
        Mengirim 13 request anonim beruntun ke <span className="mono">GET /api/v1/courses/</span>.
        Dengan limit <span className="mono">AnonRateThrottle("10/m")</span>, request ke-11 dst harus
        berstatus <b>429</b> dengan pesan <span className="mono">"Too many request"</span>.
        Catatan: request browsing Anda sebelumnya ikut dihitung dalam bucket 1 menit yang sama.
      </p>
      <button className="btn" onClick={run} disabled={running}>
        {running ? 'Mengirim…' : 'Kirim 13 Request'}
      </button>
      {log.length > 0 && (
        <div className="throttle-log mono" style={{ marginTop: 12 }}>
          {log.map((e) => (
            <div key={e.i}>
              Request #{e.i}: <span className={e.status === 429 ? 'status-429' : 'status-200'}>{e.status}</span>
              {' '}({e.ms}ms){e.detail}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
