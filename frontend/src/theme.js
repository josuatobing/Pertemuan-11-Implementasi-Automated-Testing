// Tema visual per kategori: gradient thumbnail + ikon.
// Course di API tidak punya gambar di list response, jadi thumbnail
// digenerate dari kategori (fallback: rotasi berdasarkan id).

const CATEGORY_THEMES = {
  'Pemrograman': { gradient: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%)', emoji: '💻' },
  'Basis Data': { gradient: 'linear-gradient(135deg,#0891b2 0%,#2563eb 100%)', emoji: '🗄️' },
  'Jaringan': { gradient: 'linear-gradient(135deg,#059669 0%,#0d9488 60%,#14b8a6 100%)', emoji: '🌐' },
  'Desain': { gradient: 'linear-gradient(135deg,#db2777 0%,#e11d48 60%,#f43f5e 100%)', emoji: '🎨' },
}

const FALLBACK_THEMES = [
  { gradient: 'linear-gradient(135deg,#4f46e5,#a855f7)', emoji: '📚' },
  { gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)', emoji: '🚀' },
  { gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', emoji: '🧠' },
  { gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)', emoji: '⚡' },
]

export function courseTheme(category, seed = 0) {
  if (category && CATEGORY_THEMES[category]) return CATEGORY_THEMES[category]
  return FALLBACK_THEMES[Math.abs(seed) % FALLBACK_THEMES.length]
}

export function formatPrice(price) {
  return price === 0 ? 'Gratis' : `Rp${Number(price).toLocaleString('id-ID')}`
}

export const ROLE_LABEL = { student: 'Mahasiswa', instructor: 'Dosen', admin: 'Admin' }
