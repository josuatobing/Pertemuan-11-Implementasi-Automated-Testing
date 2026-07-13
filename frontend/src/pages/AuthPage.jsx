import { useState } from 'react'
import { api, setTokens } from '../api'

const ROLES = [
  { value: 'student', label: 'Mahasiswa', ic: '🎓' },
  { value: 'instructor', label: 'Dosen', ic: '🧑‍🏫' },
  { value: 'admin', label: 'Admin', ic: '🛡️' },
]

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function doLogin(u, p) {
    const tokens = await api('POST', '/auth/login', { query: { username: u, password: p }, auth: false })
    setTokens(tokens)
    const me = await api('GET', '/auth/me')
    onLogin(me)
  }

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'register') {
        await api('POST', '/auth/register', { query: { username, password, role }, auth: false })
        setInfo('Registrasi berhasil, login otomatis…')
      }
      await doLogin(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="brand">
          <span className="brand-mark">🎓</span>
          <span className="brand-text">Josua <b>University</b></span>
        </div>
        <h1>Gerbang menuju <span className="hl">masa depanmu</span> dimulai di sini.</h1>
        <p>Platform pembelajaran daring dengan course berkualitas dari dosen-dosen terbaik.</p>
        <ul>
          <li><span className="ic">📚</span> Katalog course dengan filter &amp; pencarian canggih</li>
          <li><span className="ic">🧑‍🏫</span> Dosen bisa membuat &amp; mengelola course sendiri</li>
          <li><span className="ic">📈</span> Lacak progress belajarmu di setiap lesson</li>
          <li><span className="ic">🔐</span> Aman dengan JWT Authentication &amp; role-based access</li>
        </ul>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <h2>{mode === 'login' ? 'Selamat datang kembali 👋' : 'Buat akun baru ✨'}</h2>
          <p className="sub">
            {mode === 'login'
              ? 'Masuk untuk melanjutkan pembelajaranmu.'
              : 'Pilih peranmu dan mulai perjalanan belajarmu.'}
          </p>
          {error && <div className="alert error">{error}</div>}
          {info && <div className="alert success">{info}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cth: mahasiswa" required />
            </div>
            <div className="field">
              <label>Password {mode === 'register' && '(min. 6 karakter)'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {mode === 'register' && (
              <div className="field">
                <label>Daftar sebagai</label>
                <div className="role-pills">
                  {ROLES.map((r) => (
                    <div
                      key={r.value}
                      className={`role-pill ${role === r.value ? 'selected' : ''}`}
                      onClick={() => setRole(r.value)}
                    >
                      <span className="ic">{r.ic}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn block" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar & Masuk'}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? (
              <>Belum punya akun? <a onClick={() => setMode('register')}>Daftar sekarang</a></>
            ) : (
              <>Sudah punya akun? <a onClick={() => setMode('login')}>Masuk</a></>
            )}
          </div>
          <p className="muted" style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5 }}>
            Akun seeder: <span className="mono">mahasiswa/mahasiswa123</span> · <span className="mono">dosen/dosen123</span> · <span className="mono">admin/admin123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
