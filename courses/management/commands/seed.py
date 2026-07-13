"""
Seeder data contoh untuk uji coba (frontend React / Postman).

Jalankan:
    docker compose exec web python manage.py seed

Idempotent: memakai get_or_create, aman dijalankan berulang kali.

Akun yang dibuat (password sama dengan pola <username>123):
    admin / admin123          (role: admin)
    dosen / dosen123          (role: instructor)
    dosen2 / dosen2123        (role: instructor)
    mahasiswa / mahasiswa123  (role: student)
    mahasiswa2 / mahasiswa2123 (role: student)
"""

import io

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image

from courses.models import Category, Course, Enrollment, Lesson, Progress, UserProfile

# Warna gradient cover per kategori (sinkron dengan tema frontend)
CATEGORY_COLORS = {
    'Pemrograman': ((79, 70, 229), (168, 85, 247)),
    'Basis Data': ((8, 145, 178), (37, 99, 235)),
    'Jaringan': ((5, 150, 105), (20, 184, 166)),
    'Desain': ((219, 39, 119), (244, 63, 94)),
}
DEFAULT_COLORS = ((99, 102, 241), (14, 165, 233))


def make_cover(colors):
    """Gambar cover PNG 640x360 bergradient diagonal, digenerate dengan Pillow
    (tanpa butuh file gambar eksternal)."""
    c1, c2 = colors
    mid = tuple((a + b) // 2 for a, b in zip(c1, c2))
    img = Image.new('RGB', (2, 2))
    img.putpixel((0, 0), c1)
    img.putpixel((1, 0), mid)
    img.putpixel((0, 1), mid)
    img.putpixel((1, 1), c2)
    img = img.resize((640, 360), Image.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Isi database dengan data contoh (user per role, kategori, course, lesson, enrollment)"

    def handle(self, *args, **options):
        # ---------- Users ----------
        users = {}
        for username, role in [
            ('admin', 'admin'),
            ('dosen', 'instructor'),
            ('dosen2', 'instructor'),
            ('mahasiswa', 'student'),
            ('mahasiswa2', 'student'),
        ]:
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password(f'{username}123')
                user.save()
            UserProfile.objects.get_or_create(user=user, defaults={'role': role})
            users[username] = user
            self.stdout.write(f"  user {username} ({role}){' [baru]' if created else ''}")

        # ---------- Categories ----------
        categories = {}
        for name in ['Pemrograman', 'Basis Data', 'Jaringan', 'Desain']:
            categories[name], _ = Category.objects.get_or_create(name=name)

        # ---------- Courses (12 course -> 3 halaman @ 5/halaman) ----------
        course_data = [
            # (name, description, price, instructor, category)
            ('Pemrograman Python Dasar', 'Belajar Python dari nol: variabel, loop, fungsi.', 0, 'dosen', 'Pemrograman'),
            ('Django untuk Pemula', 'Membangun web app pertama dengan Django 5.', 150000, 'dosen', 'Pemrograman'),
            ('REST API dengan Django Ninja', 'CRUD, auth JWT, throttling, pagination, filtering.', 200000, 'dosen', 'Pemrograman'),
            ('Unit Testing di Django', 'TestCase, fixtures, dan test client.', 100000, 'dosen', 'Pemrograman'),
            ('PostgreSQL Fundamental', 'Query, index, dan relasi di PostgreSQL.', 125000, 'dosen2', 'Basis Data'),
            ('Desain Skema Database', 'Normalisasi, ERD, dan best practice.', 90000, 'dosen2', 'Basis Data'),
            ('Docker & Deployment', 'Containerize aplikasi Django dengan Docker Compose.', 175000, 'dosen2', 'Jaringan'),
            ('Keamanan Web Dasar', 'OWASP Top 10 untuk developer.', 250000, 'dosen2', 'Jaringan'),
            ('React Fundamental', 'Component, state, dan hooks.', 150000, 'dosen', 'Pemrograman'),
            ('Git & GitHub Workflow', 'Branching, merge, pull request.', 0, 'dosen', 'Pemrograman'),
            ('UI/UX Design Dasar', 'Prinsip desain antarmuka untuk developer.', 80000, 'dosen2', 'Desain'),
            ('Struktur Data & Algoritma', 'List, tree, graph, dan kompleksitas.', 300000, 'dosen2', 'Pemrograman'),
        ]

        courses = {}
        for name, desc, price, instructor, category in course_data:
            course, created = Course.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'price': price,
                    'instructor': users[instructor],
                    'category': categories[category],
                },
            )
            if not course.image:
                colors = CATEGORY_COLORS.get(category, DEFAULT_COLORS)
                course.image.save(f'seed_course_{course.id}.png', make_cover(colors), save=True)
            courses[name] = course
            self.stdout.write(f"  course \"{name}\"{' [baru]' if created else ''}")

        # ---------- Lessons (3 per course untuk 4 course pertama) ----------
        lesson_data = {
            'Pemrograman Python Dasar': ['Instalasi & Hello World', 'Variabel dan Tipe Data', 'Perulangan dan Percabangan'],
            'Django untuk Pemula': ['Setup Project Django', 'Model dan Migrasi', 'View dan Template'],
            'REST API dengan Django Ninja': ['Router dan Schema', 'JWT Authentication', 'Throttling & Pagination'],
            'Unit Testing di Django': ['Menulis TestCase Pertama', 'Testing Model', 'Testing API'],
        }
        for course_name, titles in lesson_data.items():
            for order, title in enumerate(titles, start=1):
                Lesson.objects.get_or_create(course=courses[course_name], title=title, defaults={'order': order})

        # ---------- Enrollments & Progress ----------
        enroll_data = [
            ('mahasiswa', 'Pemrograman Python Dasar'),
            ('mahasiswa', 'Django untuk Pemula'),
            ('mahasiswa2', 'REST API dengan Django Ninja'),
        ]
        for username, course_name in enroll_data:
            enrollment, created = Enrollment.objects.get_or_create(user=users[username], course=courses[course_name])
            self.stdout.write(f"  enrollment {username} -> \"{course_name}\"{' [baru]' if created else ''}")

        # mahasiswa sudah menyelesaikan lesson pertama Python Dasar
        first_lesson = Lesson.objects.filter(course=courses['Pemrograman Python Dasar'], order=1).first()
        if first_lesson:
            Progress.objects.get_or_create(user=users['mahasiswa'], lesson=first_lesson, defaults={'completed': True})

        self.stdout.write(self.style.SUCCESS(
            f"\nSeed selesai: {User.objects.count()} user, {Category.objects.count()} kategori, "
            f"{Course.objects.count()} course, {Lesson.objects.count()} lesson, "
            f"{Enrollment.objects.count()} enrollment."
        ))
