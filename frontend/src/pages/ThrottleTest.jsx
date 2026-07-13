import { useState } from 'react'

// Lab API — uji Pertemuan 10: AnonRateThrottle("50/m").
// Request anonim ke-(LIMIT+1) dalam 1 menit harus 429 {"detail": "Too many request"}.
const LIMIT = 50 // sinkron dengan AnonRateThrottle di config/api.py

export default function ThrottleTest() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  async function run() {
    setRunning(true)
    setLog([])
    let throttledCount = 0
    for (let i = 1; i <= LIMIT + 3; i++) {
      setProgress(i)
      const start = performance.now()
      let entry
      try {
        // sengaja TANPA Authorization header supaya kena bucket anonim
        const res = await fetch('/api/v1/courses/?page=1')
        const ms = Math.round(performance.now() - start)
        let detail = ''
        if (res.status === 429) {
          throttledCount++
          const body = await res.json().catch(() => ({}))
          detail = ` — "${body.detail || ''}"`
        }
        entry = { i, status: res.status, ms, detail }
      } catch (err) {
        entry = { i, status: 'ERR', ms: 0, detail: ` — ${err.message}` }
      }
      setLog((prev) => [...prev, entry])
      if (throttledCount >= 3) break // 429 sudah terbukti konsisten, hentikan lebih awal
    }
    setRunning(false)
  }

  return (
    <>
      <section className="lab-head">
        <div className="container">
          <h1>🧪 Lab API</h1>
          <p>
            Area uji coba fitur non-visual Simple LMS API. Fitur lain (auth per peran, CRUD,
            filter, pagination, upload/download) diuji langsung lewat halaman Katalog &amp; Detail.
          </p>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 48 }}>
        <div className="panel">
          <h3>Rate Limiting — Pertemuan 10</h3>
          <p className="panel-sub" style={{ marginBottom: 16 }}>
            Mengirim hingga {LIMIT + 3} request anonim beruntun ke <span className="mono">GET /api/v1/courses/</span>.
            Dengan limit <span className="mono">AnonRateThrottle("{LIMIT}/m")</span>, request ke-{LIMIT + 1} dst harus
            berstatus <b>429</b> dengan pesan <span className="mono">"Too many request"</span>
            (tes berhenti otomatis setelah 3× 429). Catatan: request browsing kamu sebelumnya ikut
            terhitung di bucket 1 menit yang sama, jadi 429 bisa muncul lebih awal.
          </p>
          <button className="btn" onClick={run} disabled={running}>
            {running ? `Mengirim… (${progress}/${LIMIT + 3})` : `🚀 Jalankan Uji (${LIMIT + 3} request)`}
          </button>
          {log.length > 0 && (
            <div className="throttle-log mono">
              {log.map((e) => (
                <div key={e.i}>
                  Request #{String(e.i).padStart(2, '0')} →{' '}
                  <span className={e.status === 429 ? 'status-429' : 'status-200'}>{e.status}</span>
                  {' '}({e.ms}ms){e.detail}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Referensi Pengujian Lain</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2 }}>
            <li><b>Filtering &amp; sorting</b> — filter bar di halaman Katalog (price_gte/lte, ordering, search).</li>
            <li><b>Pagination 5/halaman</b> — tombol Sebelumnya/Berikutnya di bawah katalog.</li>
            <li><b>Role student</b> — daftar course, tandai lesson selesai, download materi.</li>
            <li><b>Role instructor</b> — Studio Dosen (buat course), Kelola Course (PATCH + upload), tambah lesson.</li>
            <li><b>Role admin</b> — tombol hapus 🗑 di kartu course dan halaman detail.</li>
            <li><b>Swagger</b> — <span className="mono">localhost:8000/api/v1/docs</span> dan <span className="mono">/api/v2/docs</span>.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
