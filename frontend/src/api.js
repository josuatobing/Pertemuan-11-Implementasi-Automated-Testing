// Helper fetch untuk Simple LMS API.
// Endpoint backend memakai query params untuk parameter sederhana
// (lihat catatan di README), jadi helper ini menyusun query string otomatis.

const BASE = '/api/v1'

export function getToken() {
  return localStorage.getItem('access_token')
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail)
    this.status = status
  }
}

async function parseError(res) {
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') detail = body.detail
    else if (body.detail) detail = JSON.stringify(body.detail)
    else detail = JSON.stringify(body)
  } catch {
    /* body bukan JSON */
  }
  if (res.status === 429) detail = 'Too many request (rate limit terlampaui, coba lagi ±1 menit)'
  return new ApiError(res.status, detail)
}

export async function api(method, path, { query, json, form, auth = true } = {}) {
  let url = BASE + path
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v)
    }
    const s = qs.toString()
    if (s) url += (url.includes('?') ? '&' : '?') + s
  }

  const headers = {}
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`

  let body
  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form // FormData: biarkan browser set Content-Type + boundary
  }

  const res = await fetch(url, { method, headers, body })
  if (!res.ok) throw await parseError(res)
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res
}

// Download file dengan header Authorization (link biasa tidak bisa bawa Bearer token)
export async function downloadWithAuth(path, fallbackName) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw await parseError(res)

  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  const filename = match ? match[1] : fallbackName

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
