import { useState } from 'react'
import { api, setTokens } from '../api'

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
    <div className="auth-wrap">
      <div className="card">
        <h2>{mode === 'login' ? 'Login' : 'Registrasi Akun Baru'}</h2>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password {mode === 'register' && '(min. 6 karakter)'}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label>Peran</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Mahasiswa (student)</option>
                <option value="instructor">Dosen (instructor)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Memproses…' : mode === 'login' ? 'Login' : 'Daftar & Login'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? (
            <>Belum punya akun? <a onClick={() => setMode('register')}>Daftar</a></>
          ) : (
            <>Sudah punya akun? <a onClick={() => setMode('login')}>Login</a></>
          )}
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>
        Pastikan backend jalan di <span className="mono">localhost:8000</span> (docker compose up)
      </p>
    </div>
  )
}
