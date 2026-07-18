# LAPORAN UAS — PEMROGRAMAN SISI SERVER

---

## Cover

<div align="center">

**BACK END APLIKASI LMS "JOSUA UNIVERSITY"**
**REST API DENGAN DJANGO NINJA**

Oleh

**\<NAMA\>**
**\<NIM\>**

Tugas diajukan sebagai salah satu syarat
Untuk menyelesaikan Mata Kuliah Pemrograman Sisi Server

\<LOGO UDINUS\>

**PROGRAM STUDI TEKNIK INFORMATIKA**
**FAKULTAS ILMU KOMPUTER**
**UNIVERSITAS DIAN NUSWANTORO SEMARANG**
**2026**

</div>

---

## Daftar Isi

1. Latar Belakang
2. Analisa dan Rancangan Aplikasi, Pemodelan UML
   1. Analisa Kebutuhan
   2. Analisa Kebutuhan Hardware dan Software
   3. Skema Diagram Relasi Tabel
   4. Model
   5. Query
   6. Import CSV
   7. API
   8. AUTH
   9. Throttling, Pagination, Filtering, Sorting
   10. DOCS
   11. Unit Testing
3. Implementasi Sistem
4. Penutup
5. Lampiran Code Program

---

## 1. Latar Belakang

Perkembangan pembelajaran daring menuntut adanya sistem yang mampu mengelola
materi belajar, pendaftaran peserta, dan pemantauan kemajuan belajar secara
terpusat. **Learning Management System (LMS)** menjadi solusi umum untuk kebutuhan
tersebut, sebagaimana dipakai platform seperti Coursera dan Udemy.

Proyek ini membangun **Josua University**, sebuah LMS full-stack dengan back end
REST API berbasis **Django 5 + Django Ninja**. Back end menerapkan materi-materi
mata kuliah Pemrograman Sisi Server secara menyeluruh: perancangan model dan
relasi database, query ORM, REST API dengan dokumentasi otomatis, autentikasi JWT
dengan otorisasi berbasis peran, throttling, pagination, filtering, sorting,
unit testing, hingga hosting. Sebagai media pengujian nyata, dibangun pula
front end React yang mengonsumsi seluruh endpoint API dari sudut pandang tiga
peran pengguna: mahasiswa, dosen, dan admin.

**Tautan proyek:**
- Repository: https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing
- Aplikasi (live): https://josua-university.netlify.app
- API + Swagger (live): https://josuatobing.pythonanywhere.com/api/v1/docs

---

## 2. Analisa dan Rancangan Aplikasi, Pemodelan UML

### 2.1 Analisa Kebutuhan

**Kebutuhan fungsional:**

| No | Aktor | Kebutuhan |
|---|---|---|
| F1 | Semua | Registrasi akun dengan pilihan peran, login, dan refresh token JWT |
| F2 | Semua | Melihat katalog course dengan pencarian, filter harga, sorting, dan pagination |
| F3 | Mahasiswa | Mendaftar (enroll) ke course; tidak boleh ganda |
| F4 | Mahasiswa | Melihat daftar course yang diikuti beserta status progress |
| F5 | Mahasiswa | Menandai lesson selesai dan mengunduh materi (khusus yang terdaftar) |
| F6 | Dosen | Membuat course, mengubah course miliknya (partial update), meng-upload gambar |
| F7 | Dosen | Menambah lesson, mengubah lesson, meng-upload file materi |
| F8 | Admin | Menghapus course |
| F9 | Sistem | Membatasi laju request (rate limiting) dengan respons 429 |
| F10 | Sistem | Menyediakan dokumentasi API otomatis (Swagger) dan versi API v1/v2 |

**Kebutuhan non-fungsional:** keamanan (password ter-hash, token JWT bertenggat,
otorisasi per peran, validasi ukuran/tipe file upload), kinerja (query
`select_related`/`prefetch_related` untuk menghindari N+1), keterujian
(unit test otomatis), dan ketersediaan (hosting publik gratis).

**Pemodelan UML** — Use Case Diagram tiga aktor (Mahasiswa, Dosen, Admin) terlampir
pada file `uml_josua_university.drawio` halaman *Use Case Diagram* (dibuka dengan
https://app.diagrams.net).

> 📷 **[SS-1]** Use Case Diagram (export gambar dari draw.io).

### 2.2 Analisa Kebutuhan Hardware dan Software

**Hardware (pengembangan):**

| Komponen | Spesifikasi minimum |
|---|---|
| Prosesor | Dual-core 64-bit (disarankan quad-core) |
| RAM | 8 GB (Docker Desktop + dev server) |
| Penyimpanan | 10 GB ruang kosong |
| Jaringan | Koneksi internet (instalasi paket & hosting) |

**Software:**

| Kategori | Perangkat lunak |
|---|---|
| Sistem operasi | Windows 11 (pengembangan), Linux (server hosting) |
| Bahasa & framework | Python 3.11, Django 5, Django Ninja; JavaScript, React 18 + Vite |
| Database | PostgreSQL 15 (dev, via Docker) / SQLite (produksi PythonAnywhere) |
| Kontainerisasi | Docker Desktop + Docker Compose |
| Library utama | PyJWT, django-ninja-simple-jwt, Pillow, django-cors-headers, django-silk, gunicorn, whitenoise |
| Alat bantu | VS Code, Git/GitHub, Postman, draw.io |
| Hosting | PythonAnywhere (back end), Netlify (front end) |

### 2.3 Skema Diagram Relasi Tabel

Skema terdiri dari 7 tabel (termasuk tabel `User` bawaan Django). Diagram relasi
lengkap ada di `uml_josua_university.drawio` halaman *Skema Relasi Tabel*.

> 📷 **[SS-2]** Skema Diagram Relasi Tabel (export gambar dari draw.io).

Ringkasan relasi:

| Relasi | Jenis | Keterangan |
|---|---|---|
| User — UserProfile | 1 : 1 | menyimpan peran (admin/instructor/student) |
| User — Course | 1 : N | dosen (instructor) memiliki banyak course |
| Category — Course | 1 : N | course dikelompokkan per kategori |
| Category — Category | self FK | mendukung subkategori |
| Course — Lesson | 1 : N | materi course tersusun berurutan (`order`) |
| User — Enrollment — Course | N : M | pendaftaran mahasiswa; `UNIQUE(user, course)` mencegah enroll ganda |
| User — Progress — Lesson | N : M | status penyelesaian lesson per mahasiswa |

### 2.4 Model

Model didefinisikan di `courses/models.py`. Contoh inti:

```python
class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='course_images/', null=True, blank=True)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = CourseQuerySet.as_manager()

class Enrollment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'course'], name='unique_enrollment')
        ]
```

Skema request/response API memakai **Django Ninja Schema** (`courses/schemas.py`):
`CourseOut` (dengan resolver `instructor`, `category`, `image`), `CourseFilter`
(FilterSchema gte/lte + search), `CourseUpdate`/`LessonUpdate` (partial update),
serta `CourseOutV2` + `TeacherOut` untuk API v2.

### 2.5 Query

Query memakai Django ORM. Contoh yang dipakai aplikasi:

```python
# Filter + sorting + menghindari N+1 (list course)
Course.objects.select_related('instructor', 'category') \
      .filter(price__gte=100000, name__icontains='django') \
      .order_by('-created_at')

# Pencarian multi-kolom lewat FilterSchema (Q object)
Q(name__icontains=search) | Q(description__icontains=search)

# Agregasi (API v2: jumlah member per course)
Course.objects.annotate(member_count=Count('enrollment')).get(id=course_id)

# Relasi reverse + prefetch (dashboard mahasiswa)
Enrollment.objects.filter(user=user).select_related('course') \
          .prefetch_related('course__lesson_set')

# Progress mahasiswa pada sebuah course
Progress.objects.filter(user=user, completed=True,
                        lesson__course_id=course_id) \
        .values_list('lesson_id', flat=True)
```

Contoh eksplorasi query lain tersedia di `query_demo.py`.

### 2.6 Import CSV

Data course dapat diimpor massal dari file CSV melalui management command
`import_csv` (`courses/management/commands/import_csv.py`). Format kolom:
`name,description,price,instructor,category`. Command bersifat idempotent
(course yang sudah ada dilewati), otomatis membuat user instructor dan kategori
bila belum ada.

```bash
docker compose exec web python manage.py import_csv sample_data/courses_import.csv
```

```
  + "Machine Learning Dasar"
  + "Cloud Computing Pengantar"
  + "Fotografi Produk untuk UMKM"
Import selesai: 3 course baru, 0 dilewati.
```

Selain CSV, tersedia juga seeder `manage.py seed` yang membuat data contoh
lengkap (5 akun per peran, 4 kategori, 12 course dengan cover, lesson,
enrollment, progress).

> 📷 **[SS-3]** Output terminal `manage.py import_csv` dan/atau `manage.py seed`.

### 2.7 API

REST API dibangun dengan Django Ninja, di-mount pada `/api/v1/` dan `/api/v2/`.

**Auth (`/api/v1/auth/`)**

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | - | daftar user + role |
| POST | `/auth/login` | - | access & refresh token |
| POST | `/auth/refresh` | - | perbarui access token |
| GET / PUT | `/auth/me` | Bearer | lihat / ubah profil |

**Courses (`/api/v1/courses/`)**

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/courses/` | - | list + filter + sort + pagination |
| GET | `/courses/{id}` | - | detail + daftar lesson |
| POST | `/courses/` | instructor | buat course |
| PATCH | `/courses/{id}` | pemilik | partial update |
| DELETE | `/courses/{id}` | admin | hapus |
| POST | `/courses/{id}/upload-image/` | pemilik | upload gambar (max 2MB; jpeg/png/webp) |

**Lessons (`/api/v1/lessons/`)**

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/lessons/` | pemilik course | buat lesson |
| PATCH | `/lessons/{id}/` | pemilik course | ubah judul/urutan |
| POST | `/lessons/{id}/upload-attachment/` | pemilik course | upload materi (max 10MB) |
| GET | `/lessons/{id}/download/` | member/pemilik | unduh materi |

**Enrollments (`/api/v1/enrollments/`)**

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/enrollments/` | student | enroll course |
| GET | `/enrollments/my-courses` | student | course yang diikuti |
| GET | `/enrollments/progress?course_id=` | student | lesson yang sudah selesai |
| POST | `/enrollments/{id}/progress` | student | tandai lesson selesai |

**API Versioning:** `GET /api/v2/courses/{id}/` mencontohkan *breaking change*
yang aman — `teacher` menjadi objek `{id, username, full_name}` plus field
`member_count`, sementara kontrak v1 tidak berubah.

> 📷 **[SS-4]** Swagger `/api/v1/docs` (daftar endpoint).
> 📷 **[SS-5]** Response `GET /api/v2/courses/1/` (Swagger v2).

### 2.8 AUTH

Autentikasi memakai **JWT (JSON Web Token)**:

1. **JWT custom (PyJWT, HS256)** — `POST /auth/login` menghasilkan *access token*
   (masa berlaku 30 menit) dan *refresh token* (1 hari). Kelas `JWTAuth`
   (HTTP Bearer) memvalidasi token pada setiap endpoint terproteksi dan memuat
   objek `User` dari database.
2. **django-ninja-simple-jwt (RS256, key pair)** — endpoint tambahan
   `auth/mobile/sign-in` dan `auth/web/sign-in` (refresh token pada HttpOnly
   cookie) sebagai implementasi materi Pertemuan 9.

**Otorisasi berbasis peran** (`courses/permissions.py`): fungsi `is_student`,
`is_instructor`, `is_admin` memeriksa `UserProfile.role` dan melempar
`403 Forbidden` bila peran tidak sesuai; endpoint pemilik (mis. edit course)
juga memeriksa kepemilikan objek. Tanpa token yang valid, respons `401`.

> 📷 **[SS-6]** Halaman login front end dengan pilihan peran.
> 📷 **[SS-7]** Response login berisi access & refresh token.
> 📷 **[SS-8]** Contoh respons 403 saat peran tidak berhak (mis. student mencoba membuat course via Swagger).

### 2.9 Throttling, Pagination, Filtering, Sorting

- **Throttling** (`config/api.py`): `AnonRateThrottle("50/m")` dan
  `AuthRateThrottle("200/m")` pada level `NinjaAPI`, dengan exception handler
  custom yang mengembalikan `429 {"detail": "Too many request"}`.
- **Pagination**: `PageNumberPagination(page_size=5)` — respons
  `{items: [...], count: N}`, navigasi via `?page=`.
- **Filtering** (`CourseFilter`, konvensi gte/lte): `?search=` (icontains pada
  nama/deskripsi), `?price_gte=`, `?price_lte=`, `?created_gte=`, `?created_lte=`.
- **Sorting**: `?ordering=name|-name|price|-price|created_at|-created_at`
  (divalidasi whitelist).

Contoh: `GET /api/v1/courses/?search=django&price_gte=100000&ordering=-price&page=1`

> 📷 **[SS-9]** Katalog front end dengan filter + pagination aktif.
> 📷 **[SS-10]** Log uji rate limit di tab Lab API (respons 429 merah).

### 2.10 DOCS

- **Swagger/OpenAPI otomatis** dari Django Ninja: `/api/v1/docs` dan
  `/api/v2/docs` — dapat mencoba endpoint langsung dari browser termasuk
  otorisasi Bearer.
- **README.md** di GitHub: panduan setup dari clone sampai jalan, tabel referensi
  endpoint, akun uji, dan catatan implementasi.
- **Profiling**: dashboard django-silk pada `/silk/` untuk memeriksa query SQL
  tiap request.

> 📷 **[SS-11]** Halaman README di GitHub.

### 2.11 Unit Testing

`courses/tests.py` berisi **9 unit test** berbasis Django `TestCase`
(database uji dibuat dan dihancurkan otomatis):

| Kelompok | Yang diuji |
|---|---|
| Model | pembuatan Course/Lesson/Enrollment, field, `__str__` |
| Query | pengambilan course per instructor, filter berdasarkan harga |
| Validasi | harga negatif dan nama kosong ditolak (`ValidationError`) |
| Integritas | enrollment ganda ditolak (`IntegrityError` dari unique constraint) |

```bash
docker compose exec web python manage.py test courses
# Ran 9 tests in 0.1s — OK
```

> 📷 **[SS-12]** Output terminal unit test: `Ran 9 tests ... OK`.

---

## 3. Implementasi Sistem

### 3.1 Arsitektur

```
Pengguna ──> Netlify (front end React, static build)
                │  proxy /api/* dan /media/*
                ▼
      PythonAnywhere (Django + SQLite + media, always-on)
```

Pengembangan lokal memakai **Docker Compose** (Django + PostgreSQL 15);
produksi memakai layanan gratis: **Netlify** (front end, auto-deploy dari
GitHub) dan **PythonAnywhere** (back end + database + file media). Netlify
mem-proxy path `/api` dan `/media` ke back end sehingga keduanya satu origin
(bebas CORS).

### 3.2 Cara Menjalankan (lokal)

```bash
git clone https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing.git
cd Pertemuan-11-Implementasi-Automated-Testing
cp .env.example .env

docker compose up --build -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py make_jwt_key
docker compose exec web python manage.py seed

cd frontend && npm install && npm run dev   # http://localhost:3000
```

Akun uji: `mahasiswa/mahasiswa123`, `dosen/dosen123`, `admin/admin123`.

### 3.3 Tampilan Aplikasi

Front end "Josua University" (React + Vite) menguji seluruh endpoint dari tiga
sudut pandang peran:

> 📷 **[SS-13]** Halaman katalog setelah login mahasiswa (hero, kartu course + cover, filter).
> 📷 **[SS-14]** Halaman detail course: sidebar harga/CTA, kurikulum dengan badge "✅ Selesai".
> 📷 **[SS-15]** Panel dosen: Studio Dosen (buat course) dan Kelola Course (upload gambar, tambah lesson).
> 📷 **[SS-16]** Tampilan admin: tombol hapus course.
> 📷 **[SS-17]** Aplikasi live di https://josua-university.netlify.app (address bar terlihat).
> 📷 **[SS-18]** Dashboard hosting: PythonAnywhere (Web tab) dan Netlify (deploy Published).

---

## 4. Penutup

**Kesimpulan.** Aplikasi LMS Josua University berhasil dibangun memenuhi seluruh
ruang lingkup: perancangan database 7 tabel berelasi beserta model dan schema,
REST API lengkap (CRUD, upload/download file, API versioning), autentikasi JWT
dengan otorisasi tiga peran, throttling/pagination/filtering/sorting, import
data CSV, 9 unit test yang seluruhnya lulus, dokumentasi otomatis Swagger, serta
implementasi sistem yang di-hosting gratis dan dapat diakses publik.

**Saran pengembangan.** Penambahan fitur kuis dan sertifikat, notifikasi email,
pembayaran course berbayar, refresh token otomatis di front end, serta migrasi
produksi ke PostgreSQL terkelola bila skala pengguna bertambah.

---

## 5. Lampiran Code Program

Kode program lengkap tersedia di repository:
**https://github.com/josuatobing/Pertemuan-11-Implementasi-Automated-Testing**

Berkas-berkas inti untuk dilampirkan (salin isi file berikut ke lampiran):

| Berkas | Isi |
|---|---|
| `courses/models.py` | definisi 6 model + custom QuerySet |
| `courses/schemas.py` | schema request/response + FilterSchema |
| `courses/api.py` | endpoint course & lesson (CRUD, filter/sort/paginate, upload/download) |
| `courses/auth_api.py` | register/login/refresh/me (JWT custom) |
| `courses/enrollment_api.py` | enroll, my-courses, progress |
| `courses/permissions.py` | otorisasi berbasis peran |
| `config/auth.py` | kelas `JWTAuth` (HTTP Bearer) |
| `config/api.py` | konfigurasi NinjaAPI v1 + throttling |
| `config/api_v2.py` | API versioning v2 |
| `courses/tests.py` | 9 unit test |
| `courses/management/commands/seed.py` | seeder data contoh |
| `courses/management/commands/import_csv.py` | import CSV |
| `config/settings.py` | konfigurasi Django (env, DB, CORS, JWT) |
| `frontend/src/` | kode front end React |
