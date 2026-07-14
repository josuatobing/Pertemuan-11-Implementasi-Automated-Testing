# Josua University — Simple LMS

## Dokumentasi Proyek UAS (Proyek 3: Mandiri)

**Mata kuliah:** Pengembangan Sistem/Perangkat Lunak Sisi Server (PSS)
**Nama:** Josua Tobing
**Repository:** https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing
**Aplikasi (live):** https://josua-university.netlify.app
**API + Swagger (live):** https://josuatobing.pythonanywhere.com/api/v1/docs

> Akun uji: `mahasiswa/mahasiswa123` (student) · `dosen/dosen123` (instructor) · `admin/admin123` (admin)

---

## 1. Pendahuluan

Josua University adalah aplikasi **Learning Management System (LMS)** full-stack:
REST API dibangun dengan **Django 5 + Django Ninja**, frontend dengan **React (Vite)**.
Fitur utama: katalog course dengan filtering/sorting/pagination, autentikasi JWT dengan
tiga peran (mahasiswa, dosen, admin), pengelolaan course & lesson oleh dosen (termasuk
upload gambar dan materi), pendaftaran course & pelacakan progress oleh mahasiswa,
rate limiting, API versioning, unit testing, dan hosting gratis.

**Teknologi:**

| Lapisan | Teknologi |
|---|---|
| Backend | Django 5, Django Ninja, PyJWT, django-ninja-simple-jwt, django-silk |
| Database | PostgreSQL 15 (dev, via Docker) / SQLite (produksi PythonAnywhere) |
| Frontend | React 18 + Vite, CSS custom |
| Dev environment | Docker Compose (web + db) |
| Hosting | Netlify (frontend) + PythonAnywhere (backend), gratis |

**Arsitektur produksi:**

```
Pengunjung ──> Netlify (React, static)
                  │ proxy /api/* dan /media/*
                  ▼
        PythonAnywhere (Django + Gunicorn/uWSGI + SQLite + media)
```

---

## 2. Desain Database, Model & Schema

Enam model utama (`courses/models.py`):

| Model | Field penting | Relasi |
|---|---|---|
| UserProfile | role (admin/instructor/student) | OneToOne → User |
| Category | name, parent | FK ke diri sendiri (subkategori) |
| Course | name, description, price, image, created_at | FK → User (instructor), FK → Category |
| Lesson | title, order, file_attachment | FK → Course |
| Enrollment | — | FK → User + FK → Course, **unique constraint** (user, course) |
| Progress | completed | FK → User + FK → Lesson |

Poin desain:
- Role disimpan di `UserProfile` terpisah dari `User` bawaan Django.
- `Enrollment` memakai `UniqueConstraint` agar mahasiswa tidak bisa mendaftar course yang sama dua kali.
- Custom `QuerySet` (`select_related`/`prefetch_related`) untuk menghindari query N+1.
- Schema request/response memakai **Django Ninja Schema** (`courses/schemas.py`): `CourseOut`, `CourseFilter`, `CourseUpdate`, `LessonOut`, `CourseOutV2`, dll.

> 📷 **[SS-1]** Kode `courses/models.py` (bagian Course, Lesson, Enrollment terlihat).

---

## 3. API

Semua endpoint terdokumentasi otomatis di Swagger: `/api/v1/docs` dan `/api/v2/docs`.

### Auth (`/api/v1/auth/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | - | daftar user + role |
| POST | `/auth/login` | - | return access & refresh token |
| POST | `/auth/refresh` | - | perbarui access token |
| GET | `/auth/me` | Bearer | profil user login |
| PUT | `/auth/me` | Bearer | update profil |

### Courses (`/api/v1/courses/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/courses/` | - | list + filter + sort + pagination |
| GET | `/courses/{id}` | - | detail + daftar lesson |
| POST | `/courses/` | instructor | buat course |
| PATCH | `/courses/{id}` | pemilik | partial update |
| DELETE | `/courses/{id}` | admin | hapus course |
| POST | `/courses/{id}/upload-image/` | pemilik | upload gambar (max 2MB, jpeg/png/webp) |

### Lessons (`/api/v1/lessons/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/lessons/` | pemilik course | buat lesson |
| PATCH | `/lessons/{id}/` | pemilik course | update judul/urutan |
| POST | `/lessons/{id}/upload-attachment/` | pemilik course | upload materi (max 10MB) |
| GET | `/lessons/{id}/download/` | member/pemilik | download materi |

### Enrollments (`/api/v1/enrollments/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/enrollments/` | student | daftar ke course |
| GET | `/enrollments/my-courses` | student | course yang diikuti |
| POST | `/enrollments/{id}/progress` | student | tandai lesson selesai |

### API Versioning (`/api/v2/`)
`GET /api/v2/courses/{id}/` — contoh *breaking change* yang aman: field `teacher`
menjadi objek `{id, username, full_name}` dan ada tambahan `member_count`,
sementara kontrak v1 tetap tidak berubah.

> 📷 **[SS-2]** Halaman Swagger `https://josuatobing.pythonanywhere.com/api/v1/docs` (daftar endpoint terlihat).
> 📷 **[SS-3]** Response `GET /api/v2/courses/1/` di Swagger v2 (field `teacher` objek + `member_count`).

---

## 4. Autentikasi & Otorisasi (AUTH)

- **JWT custom (PyJWT):** login menghasilkan *access token* (30 menit) dan *refresh
  token* (1 hari), algoritma HS256. Endpoint terproteksi memakai `JWTAuth`
  (HTTP Bearer) yang memvalidasi token dan memuat user dari database.
- **Library `django-ninja-simple-jwt` (RS256):** endpoint tambahan
  `auth/mobile/sign-in` dan `auth/web/sign-in` (refresh token via HttpOnly cookie)
  sebagai implementasi materi Pertemuan 9.
- **Otorisasi berbasis peran** (`courses/permissions.py`):
  - `student` → enroll, my-courses, progress, download materi (jika terdaftar)
  - `instructor` → buat/edit course miliknya, kelola lesson, upload gambar/materi
  - `admin` → hapus course
  - Pelanggaran menghasilkan `403 Forbidden`; tanpa token `401 Unauthorized`.

> 📷 **[SS-4]** Halaman login/registrasi frontend dengan pilihan peran (Mahasiswa/Dosen/Admin).
> 📷 **[SS-5]** Response `POST /auth/login` di Swagger/Postman yang memperlihatkan access & refresh token.

---

## 5. Throttling, Pagination, Filtering

- **Throttling** (`config/api.py`): `AnonRateThrottle("50/m")` untuk pengunjung anonim
  dan `AuthRateThrottle("200/m")` untuk user login, dengan custom exception handler
  yang mengembalikan `429 {"detail": "Too many request"}`. (Nilai awal 10/m sesuai
  materi, dinaikkan agar nyaman dipakai frontend.)
- **Pagination**: `PageNumberPagination(page_size=5)` — response berbentuk
  `{items: [...], count: N}`, dinavigasi dengan `?page=`.
- **Filtering** (`CourseFilter`, konvensi gte/lte): `?search=` (nama/deskripsi,
  icontains), `?price_gte=`, `?price_lte=`, `?created_gte=`, `?created_lte=`.
- **Sorting**: `?ordering=` (name, price, created_at, dan versi `-` untuk descending,
  divalidasi whitelist).

Contoh: `GET /api/v1/courses/?search=django&price_gte=100000&ordering=-price&page=1`

> 📷 **[SS-6]** Katalog frontend dengan filter harga terisi dan hasil terfilter.
> 📷 **[SS-7]** Navigasi pagination (halaman 2 dari 3) di katalog.
> 📷 **[SS-8]** Tab **Lab API** frontend: log uji rate limit dengan response 429 "Too many request" berwarna merah.

---

## 6. Unit Testing

File `courses/tests.py` — 9 test dengan Django `TestCase` (database uji terpisah,
otomatis dibuat dan dihapus):

| Test class | Yang diuji |
|---|---|
| CourseModelTest | pembuatan course, field, `__str__` |
| EnrollmentModelTest | pendaftaran mahasiswa ke course |
| LessonModelTest | pembuatan lesson + relasi course |
| CourseQueryTest | query course per instructor |
| ValidationTest | harga negatif & nama kosong ditolak (ValidationError) |
| CourseFilterTest | filter course berdasarkan harga |
| DuplicateEnrollmentTest | enrollment ganda ditolak (IntegrityError) |

Cara menjalankan: `docker compose exec web python manage.py test courses`

Hasil: **Ran 9 tests — OK** (semua lulus).

> 📷 **[SS-9]** Output terminal `manage.py test courses` yang menunjukkan `Ran 9 tests ... OK`.

---

## 7. Dokumentasi (Docs)

- **Swagger/OpenAPI otomatis** dari Django Ninja: `/api/v1/docs` dan `/api/v2/docs`
  (bisa mencoba endpoint langsung dari browser, termasuk otorisasi Bearer).
- **README.md** di GitHub: panduan setup dari clone sampai jalan, tabel referensi
  seluruh endpoint, akun seeder, dan catatan implementasi (bug yang ditemukan dan
  diperbaiki selama pengembangan).
- Dokumen PDF ini sebagai tutorial/laporan.

> 📷 **[SS-10]** Halaman README repository di GitHub.

---

## 8. Pengujian

### a. Postman
Collection `Simple_LMS_API.postman_collection.json` tersedia di repo — berisi folder
Auth (register/login per role, token tersimpan otomatis via test script), CRUD Course,
Lesson, Enrollment, Rate Limiting, dan endpoint Pertemuan 9. Untuk menguji throttle:
Collection Runner dengan Iterations=53 → request setelah ke-50 mendapat 429.

> 📷 **[SS-11]** Postman: hasil run request login (200, token terlihat) — atau hasil Collection Runner.

### b. Aplikasi kecil (frontend React "Josua University")
Seluruh fitur API diuji lewat aplikasi nyata dengan tiga skenario peran:

1. **Mahasiswa** — registrasi/login, jelajah katalog (search/filter/sort/pagination),
   enroll course, melihat "Pembelajaran Saya", menandai lesson selesai, download materi.
2. **Dosen** — Studio Dosen (buat course), Kelola Course (edit via PATCH, upload gambar
   yang langsung tersimpan), tambah lesson, upload materi.
3. **Admin** — hapus course dari katalog/halaman detail.

> 📷 **[SS-12]** Katalog Josua University setelah login mahasiswa (kartu course + cover gambar).
> 📷 **[SS-13]** Halaman detail course: sidebar "Daftar Sekarang" / banner "Anda terdaftar", kurikulum lesson.
> 📷 **[SS-14]** Login sebagai dosen: panel Studio Dosen / Kelola Course (upload gambar & tambah lesson).
> 📷 **[SS-15]** Login sebagai admin: tombol hapus 🗑 pada kartu course.

---

## 9. Hosting

Seluruhnya memakai layanan **gratis**:

| Komponen | Layanan | URL |
|---|---|---|
| Frontend React | Netlify | https://josua-university.netlify.app |
| Backend Django + DB + media | PythonAnywhere | https://josuatobing.pythonanywhere.com |
| Kode sumber | GitHub | https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing |

Cara kerja: Netlify menyajikan hasil build React dan **mem-proxy** path `/api/*` dan
`/media/*` ke PythonAnywhere (aturan di `netlify.toml`), sehingga frontend dan backend
tampak satu origin — bebas masalah CORS. Netlify tersambung ke GitHub: setiap `git push`
otomatis membangun ulang frontend. Backend di PythonAnywhere memakai SQLite (disk
persisten) dan diperbarui dengan `git pull` + tombol Reload.

Penyesuaian produksi di kode: konfigurasi via environment variable (`SECRET_KEY`,
`DEBUG`, `ALLOWED_HOSTS`, `DB_ENGINE`), dukungan SQLite, WhiteNoise untuk static files,
dan `start.sh` (migrate + generate key JWT + seeder + collectstatic) untuk platform
berbasis container.

> 📷 **[SS-16]** Dashboard PythonAnywhere tab Web (status hijau, alamat josuatobing.pythonanywhere.com).
> 📷 **[SS-17]** Dashboard Netlify: deploy "Published" dari commit GitHub.
> 📷 **[SS-18]** Aplikasi dibuka di https://josua-university.netlify.app (address bar terlihat).

---

## 10. Cara Menjalankan di Lokal (dari clone)

Prasyarat: Docker Desktop dan Node.js 18+.

```bash
# 1. Clone
git clone https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing.git
cd Pertemuan-11-Implementasi-Automated-Testing
cp .env.example .env

# 2. Backend (Django + PostgreSQL via Docker)
docker compose up --build -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py make_jwt_key
docker compose exec web python manage.py seed

# 3. Frontend (terminal terpisah)
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000` · Swagger: `http://localhost:8000/api/v1/docs`
Seeder membuat 5 akun uji, 4 kategori, 12 course (+cover), 12 lesson, 3 enrollment.

---

## 11. Penutup

Proyek ini memenuhi seluruh ruang lingkup UAS: desain database & schema (6 model
berelasi), REST API lengkap dengan versioning dan upload/download file, autentikasi
JWT dengan otorisasi tiga peran, throttling/pagination/filtering, 9 unit test yang
lulus, dokumentasi README + Swagger + PDF ini, pengujian melalui Postman dan aplikasi
frontend React, serta hosting gratis yang dapat diakses publik.
