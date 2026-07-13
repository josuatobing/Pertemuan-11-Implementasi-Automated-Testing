import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { courseTheme, formatPrice } from '../theme'

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
        query: { search, price_gte: priceGte, price_lte: priceLte, ordering, page: p },
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

  async function deleteCourse(e, c) {
    e.stopPropagation()
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
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Josua University · Online Learning</div>
          <h1>Tingkatkan skill-mu bersama <span className="hl">dosen terbaik</span> kami</h1>
          <p>
            Jelajahi katalog course pemrograman, basis data, jaringan, dan desain.
            Belajar kapan saja, dari mana saja.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => { e.preventDefault(); load(1) }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mau belajar apa hari ini? Coba “django”…"
            />
            <button className="btn accent" disabled={loading}>Cari Course</button>
          </form>
          <div className="hero-stats">
            <div className="stat"><b>{count || '–'}</b><span>Course Aktif</span></div>
            <div className="stat"><b>3</b><span>Peran Pengguna</span></div>
            <div className="stat"><b>100%</b><span>REST API</span></div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="filter-bar">
          <div className="field">
            <label>Harga Minimum</label>
            <input type="number" min="0" placeholder="price_gte" value={priceGte} onChange={(e) => setPriceGte(e.target.value)} />
          </div>
          <div className="field">
            <label>Harga Maksimum</label>
            <input type="number" min="0" placeholder="price_lte" value={priceLte} onChange={(e) => setPriceLte(e.target.value)} />
          </div>
          <div className="field">
            <label>Urutkan</label>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value)}>
              <option value="-created_at">Terbaru</option>
              <option value="created_at">Terlama</option>
              <option value="name">Nama A–Z</option>
              <option value="-name">Nama Z–A</option>
              <option value="price">Harga termurah</option>
              <option value="-price">Harga termahal</option>
            </select>
          </div>
          <button className="btn" onClick={() => load(1)} disabled={loading}>
            {loading ? 'Memuat…' : 'Terapkan Filter'}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {user.role === 'instructor' && <InstructorStudio onCreated={() => load(1)} />}

        <div className="section-head">
          <div>
            <h2>Katalog Course</h2>
            <div className="sub">
              {count} course · halaman {page} dari {totalPages} · filter gte/lte, sorting &amp; pagination via API
            </div>
          </div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="big">🔍</div>
            <b>Tidak ada course yang cocok.</b>
            <p>Coba ubah kata kunci atau rentang harga, lalu terapkan lagi.</p>
          </div>
        ) : (
          <div className="course-grid">
            {items.map((c) => {
              const theme = courseTheme(c.category, c.id)
              return (
                <article className="ccard" key={c.id} onClick={() => onOpen(c.id)}>
                  <div className="thumb" style={{ background: theme.gradient }}>
                    {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <span>{theme.emoji}</span>}
                    {c.category && <span className="cat-chip">{c.category}</span>}
                    {user.role === 'admin' && (
                      <button className="del-btn" title="Hapus course (admin)" onClick={(e) => deleteCourse(e, c)}>
                        🗑
                      </button>
                    )}
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
                    <span className={`price ${c.price === 0 ? 'free' : ''}`}>{formatPrice(c.price)}</span>
                    <span className="date">{new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="pagination">
          <button className="btn ghost small" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
            ‹ Sebelumnya
          </button>
          <span className="info">Halaman {page} / {totalPages}</span>
          <button className="btn ghost small" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>
            Berikutnya ›
          </button>
        </div>
      </div>
    </>
  )
}

/* Panel dosen: buat course baru (collapsible) */
function InstructorStudio({ onCreated }) {
  const [open, setOpen] = useState(false)
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
    <div className="panel" style={{ marginTop: 24 }}>
      <div className="panel-head" onClick={() => setOpen(!open)}>
        <div>
          <h3>🧑‍🏫 Studio Dosen</h3>
          <p className="panel-sub">Buat dan publikasikan course baru sebagai instructor.</p>
        </div>
        <button className="btn outline small">{open ? 'Tutup' : '＋ Buat Course'}</button>
      </div>
      {open && (
        <div className="panel-body">
          {error && <div className="alert error">{error}</div>}
          {msg && <div className="alert success">{msg}</div>}
          <form onSubmit={submit} className="form-row">
            <div className="field">
              <label>Nama Course</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Machine Learning Dasar" required />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Deskripsi</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ringkasan singkat course" required />
            </div>
            <div className="field narrow">
              <label>Harga (Rp)</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <button className="btn">Publikasikan</button>
          </form>
        </div>
      )}
    </div>
  )
}
