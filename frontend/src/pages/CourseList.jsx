import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

const PAGE_SIZE = 5 // sinkron dengan PageNumberPagination(page_size=5) di backend

export default function CourseList({ user, onOpen }) {
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [priceGte, setPriceGte] = useState('')
  const [priceLte, setPriceLte] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p = page) => {
    setLoading(true); setError('')
    try {
      const data = await api('GET', '/courses/', {
        query: {
          search, price_gte: priceGte, price_lte: priceLte, ordering, page: p,
        },
        auth: false,
      })
      setItems(data.items)
      setCount(data.count)
      setPage(p)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, priceGte, priceLte, ordering, page])

  useEffect(() => { load(1) }, [ordering]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function deleteCourse(c) {
    if (!confirm(`Hapus course "${c.name}"?`)) return
    setError(''); setNotice('')
    try {
      const res = await api('DELETE', `/courses/${c.id}`)
      setNotice(res.message || 'Course dihapus')
      load(1)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      {user.role === 'instructor' && <CreateCourseForm onCreated={() => load(1)} />}

      <div className="card">
        <h2>Katalog Course</h2>
        <p className="muted">
          Menguji: filtering (search, price_gte/lte), sorting (ordering), pagination (5/halaman)
        </p>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Search (nama/deskripsi)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="django…" />
          </div>
          <div className="field">
            <label>Harga ≥ (price_gte)</label>
            <input type="number" value={priceGte} onChange={(e) => setPriceGte(e.target.value)} style={{ width: 120 }} />
          </div>
          <div className="field">
            <label>Harga ≤ (price_lte)</label>
            <input type="number" value={priceLte} onChange={(e) => setPriceLte(e.target.value)} style={{ width: 120 }} />
          </div>
          <div className="field">
            <label>Urutkan (ordering)</label>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value)}>
              <option value="-created_at">Terbaru</option>
              <option value="created_at">Terlama</option>
              <option value="name">Nama A-Z</option>
              <option value="-name">Nama Z-A</option>
              <option value="price">Harga termurah</option>
              <option value="-price">Harga termahal</option>
            </select>
          </div>
          <button className="btn" onClick={() => load(1)} disabled={loading}>
            {loading ? 'Memuat…' : 'Terapkan'}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {items.length === 0 && !loading && <p className="muted">Tidak ada course.</p>}
        {items.map((c) => (
          <div className="course-item" key={c.id}>
            <div className="info">
              <div className="name">{c.name}</div>
              <div className="meta">
                oleh {c.instructor}
                {c.category ? ` · ${c.category}` : ''} · {new Date(c.created_at).toLocaleDateString('id-ID')}
              </div>
            </div>
            <span className="price-tag">
              {c.price === 0 ? 'Gratis' : `Rp${c.price.toLocaleString('id-ID')}`}
            </span>
            <button className="btn secondary small" onClick={() => onOpen(c.id)}>Detail</button>
            {user.role === 'admin' && (
              <button className="btn danger small" onClick={() => deleteCourse(c)}>Hapus</button>
            )}
          </div>
        ))}

        <div className="pagination">
          <button className="btn secondary small" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
            ‹ Sebelumnya
          </button>
          <span>Halaman {page} / {totalPages} ({count} course)</span>
          <button className="btn secondary small" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>
            Berikutnya ›
          </button>
        </div>
      </div>
    </>
  )
}

function CreateCourseForm({ onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(0)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setMsg(''); setError('')
    try {
      // POST /courses/ wajib trailing slash (lihat catatan README)
      const res = await api('POST', '/courses/', { query: { name, description, price } })
      setMsg(`${res.message} (id: ${res.id})`)
      setName(''); setDescription(''); setPrice(0)
      onCreated()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card">
      <h2>Buat Course Baru (khusus dosen)</h2>
      {error && <div className="alert error">{error}</div>}
      {msg && <div className="alert success">{msg}</div>}
      <form onSubmit={submit} className="row">
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label>Deskripsi</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="field">
          <label>Harga (Rp)</label>
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 120 }} />
        </div>
        <button className="btn">Buat</button>
      </form>
    </div>
  )
}
