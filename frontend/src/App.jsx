import { useEffect, useState } from 'react'
import { api, clearTokens, getToken } from './api'
import AuthPage from './pages/AuthPage'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'
import MyCourses from './pages/MyCourses'
import ThrottleTest from './pages/ThrottleTest'

export default function App() {
  const [user, setUser] = useState(null) // {id, username, role}
  const [checking, setChecking] = useState(!!getToken())
  const [tab, setTab] = useState('courses')
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    if (!getToken()) return
    api('GET', '/auth/me')
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setChecking(false))
  }, [])

  function logout() {
    clearTokens()
    setUser(null)
    setTab('courses')
    setDetailId(null)
  }

  function openDetail(id) {
    setDetailId(id)
    setTab('detail')
  }

  if (checking) return <div className="container muted">Memuat sesi…</div>
  if (!user) return <AuthPage onLogin={setUser} />

  return (
    <>
      <header className="topbar">
        <div className="container">
          <h1>Simple LMS — Uji Coba API</h1>
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
          <span className="muted">{user.username}</span>
          <button className="btn secondary small" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <nav className="tabs">
          <button className={tab === 'courses' ? 'active' : ''} onClick={() => setTab('courses')}>
            Katalog Course
          </button>
          {user.role === 'student' && (
            <button className={tab === 'my' ? 'active' : ''} onClick={() => setTab('my')}>
              Course Saya
            </button>
          )}
          <button className={tab === 'throttle' ? 'active' : ''} onClick={() => setTab('throttle')}>
            Uji Rate Limit
          </button>
          {tab === 'detail' && <button className="active">Detail Course #{detailId}</button>}
        </nav>

        {tab === 'courses' && <CourseList user={user} onOpen={openDetail} />}
        {tab === 'my' && <MyCourses onOpen={openDetail} />}
        {tab === 'throttle' && <ThrottleTest />}
        {tab === 'detail' && (
          <CourseDetail
            courseId={detailId}
            user={user}
            onBack={() => setTab('courses')}
            onDeleted={() => setTab('courses')}
          />
        )}
      </div>
    </>
  )
}
