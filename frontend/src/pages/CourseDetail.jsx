import { useCallback, useEffect, useState } from 'react'
import { api, downloadWithAuth } from '../api'

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
      flash(`Attachment "${lesson.title}" berhasil didownload`)
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
      <div className="card">
        {error ? <div className="alert error">{error}</div> : <p className="muted">Memuat…</p>}
        <button className="btn secondary small" onClick={onBack}>‹ Kembali</button>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
          ‹ Kembali ke katalog
        </button>
        <h2>{course.name}</h2>
        <p className="muted">
          Dosen: {course.instructor}
          {course.category ? ` · Kategori: ${course.category}` : ''} · Dibuat:{' '}
          {new Date(course.created_at).toLocaleDateString('id-ID')}
        </p>
        <p>{course.description}</p>
        <p className="price-tag">
          {course.price === 0 ? 'Gratis' : `Rp${course.price.toLocaleString('id-ID')}`}
        </p>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <div className="row">
          {isStudent && !enrollment && (
            <button className="btn success" onClick={enroll}>Enroll Course Ini</button>
          )}
          {isStudent && enrollment && <span className="alert success" style={{ margin: 0 }}>✓ Anda terdaftar di course ini</span>}
          {user.role === 'admin' && (
            <button className="btn danger" onClick={deleteCourse}>Hapus Course (admin)</button>
          )}
        </div>
      </div>

      {isOwner && <EditCoursePanel course={course} onChanged={load} />}

      <div className="card">
        <h3>Lessons ({course.lessons.length})</h3>
        {course.lessons.length === 0 && <p className="muted">Belum ada lesson.</p>}
        {course.lessons.map((l) => (
          <div className="lesson-item" key={l.id}>
            <span className="order">#{l.order}</span>
            <span className="title">{l.title}</span>
            {l.has_attachment ? (
              <button className="btn secondary small" onClick={() => download(l)}>Download materi</button>
            ) : (
              <span className="muted">tanpa attachment</span>
            )}
            {isStudent && enrollment && (
              <button className="btn success small" onClick={() => markComplete(l)}>Tandai selesai</button>
            )}
            {isOwner && <LessonOwnerTools lesson={l} onChanged={load} onNotice={flash} onError={fail} />}
          </div>
        ))}
        {isOwner && <AddLessonForm courseId={courseId} onAdded={load} />}
      </div>
    </>
  )
}

/* ---------- Panel dosen: edit course + upload gambar ---------- */

function EditCoursePanel({ course, onChanged }) {
  const [name, setName] = useState(course.name)
  const [description, setDescription] = useState(course.description)
  const [price, setPrice] = useState(course.price)
  const [file, setFile] = useState(null)
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

  async function uploadImage() {
    if (!file) return
    setMsg(''); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api('POST', `/courses/${course.id}/upload-image/`, { form })
      setMsg(`${res.message} (${res.filename})`)
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="card">
      <h3>Kelola Course (khusus dosen pemilik)</h3>
      {error && <div className="alert error">{error}</div>}
      {msg && <div className="alert success">{msg}</div>}
      <form onSubmit={save} className="row" style={{ marginBottom: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label>Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 180 }}>
          <label>Deskripsi</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Harga</label>
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 110 }} />
        </div>
        <button className="btn">Simpan (PATCH)</button>
      </form>
      <div className="row">
        <div className="field">
          <label>Gambar course (jpeg/png/webp, max 2MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button className="btn secondary" onClick={uploadImage} disabled={!file}>Upload Gambar</button>
      </div>
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
    <form onSubmit={submit} className="row" style={{ marginTop: 12 }}>
      {error && <div className="alert error" style={{ width: '100%' }}>{error}</div>}
      <div className="field" style={{ flex: 1, minWidth: 180 }}>
        <label>Judul lesson baru</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field">
        <label>Urutan</label>
        <input type="number" min="1" value={order} onChange={(e) => setOrder(e.target.value)} style={{ width: 90 }} />
      </div>
      <button className="btn">+ Tambah Lesson</button>
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
      <label className="btn secondary small" style={{ cursor: 'pointer' }}>
        Upload materi
        <input type="file" hidden onChange={uploadAttachment} />
      </label>
      <button className="btn secondary small" onClick={rename}>Edit judul</button>
    </>
  )
}
