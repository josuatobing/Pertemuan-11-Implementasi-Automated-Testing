import { useEffect, useState } from 'react'
import { api } from '../api'

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
    <div className="card">
      <h2>Course Saya (enrolled)</h2>
      {error && <div className="alert error">{error}</div>}
      {loading && <p className="muted">Memuat…</p>}
      {!loading && courses.length === 0 && (
        <p className="muted">Belum terdaftar di course manapun. Buka Katalog lalu klik Enroll.</p>
      )}
      {courses.map((c) => (
        <div className="course-item" key={c.enrollment_id}>
          <div className="info">
            <div className="name">{c.name}</div>
            <div className="meta">oleh {c.instructor} · enrollment #{c.enrollment_id}</div>
          </div>
          <button className="btn secondary small" onClick={() => onOpen(c.id)}>Buka</button>
        </div>
      ))}
    </div>
  )
}
