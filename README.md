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
- Filtering (`search`, `price`, `created_at`) via `FilterSchema`
- Sorting (`ordering=name|-name|price|-price|created_at|-created_at`)
- Pagination (`PageNumberPagination`, 10 item/halaman)
- Rate limiting (anon 20 req/menit, authenticated 100 req/menit)
- API Versioning (`/api/v1/` vs `/api/v2/` — v2 punya `teacher` sebagai object + `member_count`)
- Upload gambar course & attachment lesson, download attachment (dengan cek kepemilikan/enrollment)
- Partial update (`PATCH`) untuk Course dan Lesson

**Pertemuan 9 - Otentikasi & Kontrol Akses**
- Library `django-ninja-simple-jwt` (RS256, key pair `jwt-signing.pem`/`.pub`)
- Endpoint mobile (`sign-in`, `token-refresh`) & web (`sign-in`, `token-refresh` via HttpOnly cookie, `sign-out`)
- Endpoint demo terproteksi `HttpJwtAuth` (`courses/api_jwt_demo.py`)

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
  schemas.py            # CourseOut, CourseFilter, CourseUpdate, LessonOut, LessonUpdate, CourseOutV2
  api.py                 # courses_router + lessons_router (CRUD, filter/sort/paginate, upload/download, PATCH)
  api_jwt_demo.py        # endpoint demo Pertemuan 9 (HttpJwtAuth)
  auth_api.py             # register/login/refresh/me (JWT custom)
  enrollment_api.py       # enroll, my-courses, mark progress
  permissions.py          # is_instructor / is_admin / is_student
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
5. (Opsional) Buat superuser untuk akses Django admin & Silk:
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

Server berjalan di `http://localhost:8000`.

---

## Dokumentasi API (Swagger)

- v1: `http://localhost:8000/api/v1/docs`
- v2: `http://localhost:8000/api/v2/docs`
- Silk profiling dashboard: `http://localhost:8000/silk/` (butuh login admin)

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
| GET | `/courses/?search=&price=&ordering=&page=` | - | filter + sort + pagination |
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

---

## Testing dengan Postman

1. Import `Simple_LMS_API.postman_collection.json` ke Postman.
2. Aktifkan **cookie jar** untuk `localhost` (Settings → General → "Automatically follow redirects" & cookie handling aktif) supaya folder *8. Pertemuan 9 - JWT* (web sign-in/refresh/sign-out) bisa jalan.
3. Urutan run yang disarankan:
   1. Folder **1. Auth** → jalankan Register (instructor/student/admin) lalu Login (masing-masing role). Token otomatis tersimpan ke collection variables lewat test script.
   2. Folder **3. Courses - Protected** → Create Course (pakai `instructor_access_token`) untuk membuat data uji.
   3. Folder **2, 4, 5, 6** bisa dites bebas sesudah ada data.
   4. Folder **7. Rate Limiting** → jalankan request yang sama >20x lewat Collection Runner untuk lihat response `429`.
   5. Folder **8. Pertemuan 9** → Mobile/Web Sign In dulu (isi token `jwt_demo_access_token`), baru endpoint Protected Demo.

---

## Catatan Implementasi (bug yang ditemukan & diperbaiki saat testing)

1. **Rate limiting tidak jalan di awal** — `AnonRateThrottle`/`AuthRateThrottle` dari Django Ninja **mengabaikan class attribute `rate`**; rate custom harus dipaksa lewat `super().__init__(rate=...)` di `config/api.py`. Sudah diperbaiki dan diverifikasi (`429` muncul tepat di request ke-21 untuk limit 20/menit).
2. **Refresh cookie web auth tidak pernah terkirim balik** — `WEB_REFRESH_COOKIE_PATH` default dari `django-ninja-simple-jwt` (`/api/auth/web`) tidak cocok dengan mount path project ini (`/api/v1/auth/web/`), sehingga browser tidak mengirim cookie ke `token-refresh`/`sign-out`. Diperbaiki via `NINJA_SIMPLE_JWT["WEB_REFRESH_COOKIE_PATH"]` di `settings.py`.
3. **Trailing slash** — endpoint `POST /courses/` wajib pakai trailing slash (`APPEND_SLASH`), sedangkan `GET/PATCH/DELETE /courses/{id}` tidak pakai slash.
