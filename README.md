# Simple LMS - REST API with Django Ninja

REST API Learning Management System dengan JWT Authentication, Role-Based Authorization, dan Advanced API Features (filtering, sorting, pagination, rate limiting, API versioning, file upload/download, partial update).

Dibangun dengan **Django 5 + Django Ninja**, dijalankan lewat **Docker Compose** (Django + PostgreSQL).

---

## Tech Stack

| Komponen | Library |
|---|---|
| Framework | Django, Django Ninja |
| Database | PostgreSQL (`psycopg2-binary`) |
| Auth (custom) | PyJWT (`config/auth.py`, `courses/auth_api.py`) |
| Auth (library) | `django-ninja-simple-jwt` (RS256, Pertemuan 9) |
| File upload | Pillow (ImageField) |
| Profiling | `django-silk` |
| CORS | `django-cors-headers` |

---

## Fitur

**Pertemuan 7/8 - CRUD, Auth, Advanced API Features**
- Register/Login/Refresh/Me dengan JWT custom + role (`admin`, `instructor`, `student`)
- CRUD Course & Lesson dengan role-based authorization
- API Versioning (`/api/v1/` vs `/api/v2/` — v2 punya `teacher` sebagai object + `member_count`)
- Upload gambar course & attachment lesson, download attachment (dengan cek kepemilikan/enrollment)
- Partial update (`PATCH`) untuk Course dan Lesson

**Pertemuan 9 - Otentikasi & Kontrol Akses**
- Library `django-ninja-simple-jwt` (RS256, key pair `jwt-signing.pem`/`.pub`)
- Endpoint mobile (`sign-in`, `token-refresh`) & web (`sign-in`, `token-refresh` via HttpOnly cookie, `sign-out`)
- Endpoint demo terproteksi `HttpJwtAuth` (`courses/api_jwt_demo.py`)

**Pertemuan 10 - Throttling, Pagination, Filtering**
- Rate limiting: `AnonRateThrottle('10/m')` (anon) & `AuthRateThrottle('100/m')` (authenticated) di level `NinjaAPI`, pesan custom `"Too many request"` saat limit terlampaui (`config/api.py`)
- Pagination: `PageNumberPagination(page_size=5)` — 5 data/halaman (`courses/api.py`)
- Filtering dengan konvensi `gte`/`lte`: `price_gte`, `price_lte`, `created_gte`, `created_lte`, plus `search` (`courses/schemas.py` — `CourseFilter`)
- Sorting: `ordering=name|-name|price|-price|created_at|-created_at`
- Halaman **HTML** `courses-page/` (server-rendered, bukan JSON) dengan form Search + Sorting + Pagination (`courses/views.py`, `courses/templates/courses/course_list.html`)

---

## Struktur Project (bagian yang relevan)

```
config/
  settings.py         # INSTALLED_APPS, MIDDLEWARE, MEDIA, NINJA_SIMPLE_JWT
  urls.py              # mount /api/v1/, /api/v2/, /silk/, media static
  api.py                # apiv1 = NinjaAPI(...) + throttle + semua router
  api_v2.py             # apiv2 = NinjaAPI(...) untuk demo API versioning
  auth.py               # JWTAuth (custom, dipakai di seluruh app)
courses/
  models.py             # Course (+price, image, created_at), Lesson (+file_attachment)
  schemas.py            # CourseOut, CourseFilter (gte/lte), CourseUpdate, LessonOut, LessonUpdate, CourseOutV2
  api.py                 # courses_router + lessons_router (CRUD, filter/sort/paginate, upload/download, PATCH)
  api_jwt_demo.py        # endpoint demo Pertemuan 9 (HttpJwtAuth)
  auth_api.py             # register/login/refresh/me (JWT custom)
  enrollment_api.py       # enroll, my-courses, mark progress
  permissions.py          # is_instructor / is_admin / is_student
  views.py                # course_list_page - halaman HTML Pertemuan 10 (search/sort/pagination)
  templates/courses/course_list.html
jwt-signing.pem / .pub    # RSA key pair untuk django-ninja-simple-jwt (auto-generate)
Simple_LMS_API.postman_collection.json
```

---

## Setup & Menjalankan

1. Copy `.env.example` menjadi `.env` dan sesuaikan bila perlu.
2. Build & jalankan container:
   ```bash
   docker compose up --build -d
   ```
3. Jalankan migrasi:
   ```bash
   docker compose exec web python manage.py makemigrations courses
   docker compose exec web python manage.py migrate
   ```
4. **Generate JWT signing key** (wajib untuk `django-ninja-simple-jwt`, hanya sekali):
   ```bash
   docker compose exec web python manage.py make_jwt_key
   ```
   Menghasilkan `jwt-signing.pem` (privat) dan `jwt-signing.pub` (publik) di root project.
5. (Opsional tapi disarankan) Isi database dengan data contoh:
   ```bash
   docker compose exec web python manage.py seed
   ```
   Idempotent (aman dijalankan berulang). Membuat 5 akun — `admin/admin123`, `dosen/dosen123`, `dosen2/dosen2123`, `mahasiswa/mahasiswa123`, `mahasiswa2/mahasiswa2123` — plus 4 kategori, 12 course (3 halaman pagination), 12 lesson, dan 3 enrollment.
6. (Opsional) Buat superuser untuk akses Django admin & Silk:
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

Server berjalan di `http://localhost:8000`.

---

## Dokumentasi API (Swagger)

- v1: `http://localhost:8000/api/v1/docs`
- v2: `http://localhost:8000/api/v2/docs`
- Silk profiling dashboard: `http://localhost:8000/silk/` (butuh login admin)
- Halaman Course (HTML, Pertemuan 10): `http://localhost:8000/courses-page/`

---

## Referensi Endpoint

### Auth (custom JWT — `/api/v1/auth/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/register?username=&password=&role=` | - | role: admin/instructor/student |
| POST | `/auth/login?username=&password=` | - | return `access` & `refresh` |
| POST | `/auth/refresh?refresh=` | - | dapat access token baru |
| GET | `/auth/me` | Bearer | profil user login |
| PUT | `/auth/me?username=&password=` | Bearer | update profil |

> Catatan: parameter sederhana (`str`/`int` tanpa Schema) dibaca Django Ninja sebagai **query params**, bukan form body — semua contoh di atas dikirim lewat query string.

### Courses (`/api/v1/courses/`)
| Method | Endpoint | Auth | Fitur |
|---|---|---|---|
| GET | `/courses/?search=&price_gte=&price_lte=&created_gte=&created_lte=&ordering=&page=` | - | filter (gte/lte) + sort + pagination (5/halaman) |
| GET | `/courses/{id}` | - | detail + list lesson |
| POST | `/courses/?name=&description=&price=&category_id=` | Bearer (instructor) | create |
| PATCH | `/courses/{id}` | Bearer (owner) | partial update (JSON body) |
| DELETE | `/courses/{id}` | Bearer (admin) | delete |
| POST | `/courses/{id}/upload-image/` | Bearer (owner) | form-data `file`, max 2MB, jpeg/png/webp |

### Lessons (`/api/v1/lessons/`)
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/lessons/{id}/upload-attachment/` | Bearer (owner course) | form-data `file`, max 10MB |
| GET | `/lessons/{id}/download/` | Bearer (owner atau member enrolled) | download file |
| PATCH | `/lessons/{id}/` | Bearer (owner course) | partial update (JSON body) |

### Enrollments (`/api/v1/enrollments/`)
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/enrollments/?course_id=` | Bearer (student) |
| GET | `/enrollments/my-courses` | Bearer (student) |
| POST | `/enrollments/{id}/progress?lesson_id=` | Bearer (student) |

### API Versioning (`/api/v2/`)
| Method | Endpoint | Beda dari v1 |
|---|---|---|
| GET | `/courses/{id}/` | `teacher` jadi object `{id, username, full_name}`, tambah `member_count` |

### Pertemuan 9 — JWT via `django-ninja-simple-jwt` (`/api/v1/auth/mobile|web/`, `/api/v1/jwt-demo/`)
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/auth/mobile/sign-in` | body JSON `{username, password}` → `{access, refresh}` |
| POST | `/auth/mobile/token-refresh` | body JSON `{refresh}` → `{access}` |
| POST | `/auth/web/sign-in` | access di body, refresh di HttpOnly cookie |
| POST | `/auth/web/token-refresh` | cookie-based, tanpa body |
| POST | `/auth/web/sign-out` | hapus cookie refresh, 204 |
| GET | `/jwt-demo/hello` | contoh endpoint dilindungi `HttpJwtAuth` |
| GET | `/jwt-demo/me` | info user dari token |

### Pertemuan 10 — Halaman HTML (`/courses-page/`)
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/courses-page/?search=&price_gte=&price_lte=&ordering=&page=` | Halaman HTML (bukan JSON), publik, 5 course/halaman |

---

## Frontend React (Uji Coba API — folder `frontend/`)

Aplikasi React kecil (Vite) untuk menguji API dari sisi **mahasiswa**, **dosen**, dan **admin**.

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3000` (backend harus jalan di `localhost:8000`; request `/api` di-proxy oleh Vite sehingga bebas CORS).

Fitur per peran:
- **Semua**: register/login (pilih peran), katalog course dengan search, filter harga `gte/lte`, sorting, pagination 5/halaman, tab "Uji Rate Limit" (kirim 13 request anonim → request ke-11 harus `429 "Too many request"`).
- **Mahasiswa (student)**: enroll course, daftar "Course Saya", tandai lesson selesai (progress), download attachment.
- **Dosen (instructor)**: buat course, edit course (PATCH), upload gambar course, tambah lesson, edit judul lesson (PATCH), upload attachment.
- **Admin**: hapus course.

> Catatan: untuk mendukung frontend ini, backend ditambah 2 hal kecil (additive, kontrak lama tidak berubah): endpoint `POST /api/v1/lessons/?course_id=&title=&order=` (create lesson, hanya pemilik course) dan field `enrollment_id` pada response `GET /enrollments/my-courses` (dibutuhkan untuk endpoint progress).

---

## Testing dengan Postman

1. Import `Simple_LMS_API.postman_collection.json` ke Postman.
2. Aktifkan **cookie jar** untuk `localhost` (Settings → General → "Automatically follow redirects" & cookie handling aktif) supaya folder *8. Pertemuan 9 - JWT* (web sign-in/refresh/sign-out) bisa jalan.
3. Urutan run yang disarankan:
   1. Folder **1. Auth** → jalankan Register (instructor/student/admin) lalu Login (masing-masing role). Token otomatis tersimpan ke collection variables lewat test script.
   2. Folder **3. Courses - Protected** → Create Course (pakai `instructor_access_token`) untuk membuat data uji.
   3. Folder **2, 4, 5, 6** bisa dites bebas sesudah ada data.
   4. Folder **7. Rate Limiting** → jalankan request yang sama >10x lewat Collection Runner (Iterations=13, Delay=0) untuk lihat response `429`.
   5. Folder **8. Pertemuan 9** → Mobile/Web Sign In dulu (isi token `jwt_demo_access_token`), baru endpoint Protected Demo.
   6. Halaman HTML Pertemuan 10 dites langsung di browser: `http://localhost:8000/courses-page/`.

---

## Catatan Implementasi (bug yang ditemukan & diperbaiki saat testing)

1. **Rate limiting tidak jalan di awal** — kalau rate diset lewat *class attribute* `rate = "..."` di subclass `AnonRateThrottle`, itu **diabaikan**; `SimpleRateThrottle.__init__` cuma membaca rate dari constructor arg (`AnonRateThrottle("10/m")`) atau dari default `THROTTLE_RATES` ninja. Sudah diperbaiki dengan instansiasi langsung `AnonRateThrottle("10/m")` (pola yang sama seperti di materi resmi), dan diverifikasi (`429` muncul tepat di request ke-11 untuk limit 10/menit).
2. **Refresh cookie web auth tidak pernah terkirim balik** — `WEB_REFRESH_COOKIE_PATH` default dari `django-ninja-simple-jwt` (`/api/auth/web`) tidak cocok dengan mount path project ini (`/api/v1/auth/web/`), sehingga browser tidak mengirim cookie ke `token-refresh`/`sign-out`. Diperbaiki via `NINJA_SIMPLE_JWT["WEB_REFRESH_COOKIE_PATH"]` di `settings.py`.
3. **Trailing slash** — endpoint `POST /courses/` wajib pakai trailing slash (`APPEND_SLASH`), sedangkan `GET/PATCH/DELETE /courses/{id}` tidak pakai slash.
