import { useCallback, useEffect, useState } from 'react'
import { api, downloadWithAuth } from '../api'
import { courseTheme, formatPrice } from '../theme'

export default function CourseDetail({ courseId, user, onBack, onDeleted }) {
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null) // {enrollment_id} kalau student sudah enroll
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isOwner = user.role === 'instructor' && course && course.instructor === user.username
  const isStudent = user.role === 'student'

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await api('GET', `/courses/${courseId}`, { auth: false })
      setCourse(data)
      if (user.role === 'student') {
        const mine = await api('GET', '/enrollments/my-courses')
        const found = mine.find((m) => m.id === data.id)
        setEnrollment(found || null)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [courseId, user.role])

  useEffect(() => { load() }, [load])

  function flash(msg) { setNotice(msg); setError('') }
  function fail(err) { setError(err.message); setNotice('') }

  async function enroll() {
    try {
      const res = await api('POST', '/enrollments/', { query: { course_id: courseId } })
      flash(res.message)
      load()
    } catch (err) { fail(err) }
  }

  async function markComplete(lesson) {
    try {
      const res = await api('POST', `/enrollments/${enrollment.enrollment_id}/progress`, {
        query: { lesson_id: lesson.id },
      })
      flash(`${res.message}: ${res.lesson_title}`)
    } catch (err) { fail(err) }
  }

  async function download(lesson) {
    try {
      await downloadWithAuth(`/lessons/${lesson.id}/download/`, `${lesson.title}.bin`)
      flash(`Materi "${lesson.title}" berhasil didownload`)
    } catch (err) { fail(err) }
  }

  async function deleteCourse() {
    if (!confirm(`Hapus course "${course.name}"?`)) return
    try {
      const res = await api('DELETE', `/courses/${courseId}`)
      flash(res.message)
      onDeleted()
    } catch (err) { fail(err) }
  }

  if (!course) {
    return (
      <div className="container" style={{ padding: '48px 24px' }}>
        {error ? <div className="alert error">{error}</div> : <p className="muted">Memuat course…</p>}
        <button className="btn ghost small" onClick={onBack}>‹ Kembali ke katalog</button>
      </div>
    )
  }

  const theme = courseTheme(course.category, course.id)

  return (
    <>
      <section className="detail-hero" style={{ background: theme.gradient }}>
        <div className="container">
          <button className="back" onClick={onBack}>‹ Kembali ke katalog</button>
          {course.category && <div><span className="chip light">{course.category}</span></div>}
          <h1 style={{ marginTop: 10 }}>{course.name}</h1>
          <div className="meta">
            <span>👨‍🏫 Dosen: <b>{course.instructor}</b></span>
            <span>📖 {course.lessons.length} lesson</span>
            <span>🗓 {new Date(course.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="detail-grid">
          <div className="detail-main">
            {error && <div className="alert error">{error}</div>}
            {notice && <div className="alert success">{notice}</div>}

            <div className="panel">
              <h3>Tentang Course Ini</h3>
              <p style={{ marginBottom: 0 }}>{course.description}</p>
            </div>

            {isOwner && <ManageCoursePanel course={course} onChanged={load} />}

            <div className="panel">
              <h3>📚 Kurikulum</h3>
              <p className="panel-sub" style={{ marginBottom: 16 }}>
                {course.lessons.length === 0
                  ? 'Belum ada lesson di course ini.'
                  : `${course.lessons.length} lesson tersusun berurutan.`}
              </p>
              <ul className="curriculum">
                {course.lessons.map((l) => (
                  <li key={l.id}>
                    <span className="num">{l.order}</span>
                    <span className="lesson-title">{l.title}</span>
                    {l.has_attachment ? (
                      <button className="btn outline small" onClick={() => download(l)}>⬇ Materi</button>
                    ) : (
                      <span className="lesson-note">belum ada materi</span>
                    )}
                    {isStudent && enrollment && (
                      <button className="btn success small" onClick={() => markComplete(l)}>✓ Selesai</button>
                    )}
                    {isOwner && (
                      <LessonOwnerTools lesson={l} onChanged={load} onNotice={flash} onError={fail} />
                    )}
                  </li>
                ))}
              </ul>
              {isOwner && <AddLessonForm courseId={courseId} onAdded={load} />}
            </div>
          </div>

          <aside>
            <div className="sidebar-card">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.name}
                  style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 18, display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    background: theme.gradient, borderRadius: 12, height: 120,
                    display: 'grid', placeItems: 'center', fontSize: 42, marginBottom: 18,
                  }}
                >
                  {theme.emoji}
                </div>
              )}
              <div className={`price-big ${course.price === 0 ? 'free' : ''}`}>{formatPrice(course.price)}</div>

              <div style={{ marginTop: 16 }}>
                {isStudent && !enrollment && (
                  <button className="btn accent block" onClick={enroll}>Daftar Sekarang</button>
                )}
                {isStudent && enrollment && (
                  <div className="enrolled-banner">✓ Anda terdaftar di course ini</div>
                )}
                {user.role === 'admin' && (
                  <button className="btn danger block" onClick={deleteCourse}>🗑 Hapus Course (Admin)</button>
                )}
                {isOwner && (
                  <div className="enrolled-banner" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
                    🧑‍🏫 Anda pemilik course ini
                  </div>
                )}
              </div>

              <ul className="includes">
                <li>📖 {course.lessons.length} lesson terstruktur</li>
                <li>📎 Materi bisa didownload (member)</li>
                <li>✅ Pelacakan progress belajar</li>
                <li>🔐 Akses via JWT Authentication</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

/* ---------- Panel dosen pemilik: edit course + upload gambar ---------- */

function ManageCoursePanel({ course, onChanged }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(course.name)
  const [description, setDescription] = useState(course.description)
  const [price, setPrice] = useState(course.price)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    try {
      // PATCH memakai JSON body (CourseUpdate schema)
      const res = await api('PATCH', `/courses/${course.id}`, {
        json: { name, description, price: Number(price) },
      })
      setMsg(res.message)
      onChanged()
    } catch (err) { setError(err.message) }
  }

  // Upload langsung saat file dipilih — tidak perlu tombol terpisah,
  // supaya tidak tertukar dengan tombol "Simpan" (PATCH) yang hanya mengirim teks.
  async function uploadImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setMsg(''); setError(''); setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api('POST', `/courses/${course.id}/upload-image/`, { form })
      setMsg(`${res.message} (${res.filename})`)
      onChanged()
    } catch (err) { setError(err.message) }
    finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="panel">
      <div className="panel-head" onClick={() => setOpen(!open)}>
        <div>
          <h3>⚙️ Kelola Course</h3>
          <p className="panel-sub">Edit info (PATCH) dan upload gambar thumbnail — khusus dosen pemilik.</p>
        </div>
        <button className="btn outline small">{open ? 'Tutup' : 'Kelola'}</button>
      </div>
      {open && (
        <div className="panel-body">
          {error && <div className="alert error">{error}</div>}
          {msg && <div className="alert success">{msg}</div>}
          <form onSubmit={save} className="form-row" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Nama</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Deskripsi</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field narrow">
              <label>Harga (Rp)</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <button className="btn">Simpan</button>
          </form>
          <div className="form-row" style={{ alignItems: 'center' }}>
            {course.image && (
              <img
                src={course.image}
                alt="Gambar course saat ini"
                style={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
              />
            )}
            <div className="field" style={{ flex: 2 }}>
              <label>
                {uploading ? 'Mengupload gambar…' : 'Ganti gambar course (jpeg/png/webp, maks 2MB) — langsung tersimpan saat dipilih'}
              </label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddLessonForm({ courseId, onAdded }) {
  const [title, setTitle] = useState('')
  const [order, setOrder] = useState(1)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api('POST', '/lessons/', { query: { course_id: courseId, title, order } })
      setTitle('')
      setOrder((o) => Number(o) + 1)
      onAdded()
    } catch (err) { setError(err.message) }
  }

  return (
    <form onSubmit={submit} className="form-row" style={{ marginTop: 16 }}>
      {error && <div className="alert error" style={{ width: '100%' }}>{error}</div>}
      <div className="field" style={{ flex: 2 }}>
        <label>Judul lesson baru</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth: Pengenalan REST API" required />
      </div>
      <div className="field narrow">
        <label>Urutan</label>
        <input type="number" min="1" value={order} onChange={(e) => setOrder(e.target.value)} />
      </div>
      <button className="btn">＋ Tambah Lesson</button>
    </form>
  )
}

function LessonOwnerTools({ lesson, onChanged, onNotice, onError }) {
  async function uploadAttachment(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api('POST', `/lessons/${lesson.id}/upload-attachment/`, { form })
      onNotice(`${res.message} (${res.filename})`)
      onChanged()
    } catch (err) { onError(err) }
    e.target.value = ''
  }

  async function rename() {
    const title = prompt('Judul baru lesson:', lesson.title)
    if (!title || title === lesson.title) return
    try {
      // PATCH /lessons/{id}/ memakai trailing slash + JSON body
      await api('PATCH', `/lessons/${lesson.id}/`, { json: { title } })
      onNotice('Lesson berhasil di-update')
      onChanged()
    } catch (err) { onError(err) }
  }

  return (
    <>
      <label className="btn ghost small" style={{ cursor: 'pointer' }}>
        📎 Upload materi
        <input type="file" hidden onChange={uploadAttachment} />
      </label>
      <button className="btn ghost small" onClick={rename}>✏️ Edit</button>
    </>
  )
}
