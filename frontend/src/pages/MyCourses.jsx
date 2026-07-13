import { useEffect, useState } from 'react'
import { api } from '../api'
import { courseTheme } from '../theme'

export default function MyCourses({ onOpen }) {
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('GET', '/enrollments/my-courses')
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container" style={{ paddingTop: 36, paddingBottom: 48 }}>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h2>🎒 Pembelajaran Saya</h2>
          <div className="sub">Course yang sudah kamu ikuti (enrolled) — lanjutkan belajarmu!</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <p className="muted">Memuat…</p>}

      {!loading && courses.length === 0 && (
        <div className="empty-state">
          <div className="big">📭</div>
          <b>Belum ada course yang kamu ikuti.</b>
          <p>Buka Katalog, pilih course menarik, lalu klik “Daftar Sekarang”.</p>
        </div>
      )}

      <div className="course-grid">
        {courses.map((c) => {
          const theme = courseTheme(null, c.id)
          return (
            <article className="ccard" key={c.enrollment_id} onClick={() => onOpen(c.id)}>
              <div className="thumb" style={{ background: theme.gradient }}>
                {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <span>{theme.emoji}</span>}
                <span className="cat-chip">Enrolled #{c.enrollment_id}</span>
              </div>
              <div className="body">
                <div className="title">{c.name}</div>
                <div className="desc">{c.description}</div>
                <div className="instructor">
                  <span className="mini-avatar">{c.instructor[0].toUpperCase()}</span>
                  {c.instructor}
                </div>
              </div>
              <div className="cfoot">
                <span className="price" style={{ fontSize: 14 }}>Lanjutkan belajar →</span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
