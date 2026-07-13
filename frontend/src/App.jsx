import { useEffect, useState } from 'react'
import { api, clearTokens, getToken } from './api'
import { ROLE_LABEL } from './theme'
import AuthPage from './pages/AuthPage'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'
import MyCourses from './pages/MyCourses'
import ThrottleTest from './pages/ThrottleTest'

export default function App() {
  const [user, setUser] = useState(null) // {id, username, role}
  const [checking, setChecking] = useState(!!getToken())
  const [view, setView] = useState('home') // home | my | lab | detail
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    if (!getToken()) return
    api('GET', '/auth/me')
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setChecking(false))
  }, [])

  function go(v) {
    setView(v)
    window.scrollTo(0, 0)
  }

  function logout() {
    clearTokens()
    setUser(null)
    setView('home')
    setDetailId(null)
  }

  function openDetail(id) {
    setDetailId(id)
    go('detail')
  }

  if (checking) return <div className="page-loading">Memuat Josua University…</div>
  if (!user) return <AuthPage onLogin={setUser} />

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-inner">
          <a className="brand" onClick={() => go('home')}>
            <span className="brand-mark">🎓</span>
            <span className="brand-text">Josua <b>University</b></span>
          </a>
          <nav className="nav-links">
            <a className={view === 'home' || view === 'detail' ? 'active' : ''} onClick={() => go('home')}>
              Katalog
            </a>
            {user.role === 'student' && (
              <a className={view === 'my' ? 'active' : ''} onClick={() => go('my')}>
                Pembelajaran Saya
              </a>
            )}
            <a className={view === 'lab' ? 'active' : ''} onClick={() => go('lab')}>
              Lab API
            </a>
          </nav>
          <div className="nav-user">
            <span className={`role-badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
            <span className="avatar">{user.username[0].toUpperCase()}</span>
            <span className="nav-username">{user.username}</span>
            <button className="btn ghost small" onClick={logout}>Keluar</button>
          </div>
        </div>
      </header>

      <main>
        {view === 'home' && <CourseList user={user} onOpen={openDetail} />}
        {view === 'my' && <MyCourses onOpen={openDetail} />}
        {view === 'lab' && <ThrottleTest />}
        {view === 'detail' && (
          <CourseDetail
            courseId={detailId}
            user={user}
            onBack={() => go('home')}
            onDeleted={() => go('home')}
          />
        )}
      </main>

      <footer className="footer">
        <div className="foot-inner">
          <div>
            <span className="brand-text">Josua <b>University</b></span>
            <p className="tagline">
              Platform pembelajaran daring untuk uji coba Simple LMS REST API —
              Django Ninja, JWT, throttling, pagination, dan filtering.
            </p>
          </div>
          <div>
            <h4>Jelajahi</h4>
            <ul>
              <li>Katalog Course</li>
              <li>Pembelajaran Saya</li>
              <li>Lab API</li>
            </ul>
          </div>
          <div>
            <h4>Dokumentasi</h4>
            <ul>
              <li>Swagger v1 — /api/v1/docs</li>
              <li>Swagger v2 — /api/v2/docs</li>
              <li>Silk Profiler — /silk/</li>
            </ul>
          </div>
        </div>
        <div className="copyright">© 2026 Josua University · Tugas PSS Pertemuan 11 · Dibangun dengan Django Ninja + React</div>
      </footer>
    </div>
  )
}
