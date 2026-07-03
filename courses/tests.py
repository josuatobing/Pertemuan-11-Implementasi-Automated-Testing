"""
Pertemuan 11 - Automated Testing (Django Unit Testing).

Materi resminya mencontohkan schema Simple_LMS yang beda dari project ini
(model `CourseMember`/`CourseContent`, field `Course.teacher`,
`Enrollment.status`/`Course.max_students`). Test di bawah ini disesuaikan ke
model project kita yang sebenarnya:
    Course(name, description, price, instructor, category, created_at)
    Lesson(title, course, order, file_attachment)
    Enrollment(user, course)  # unique_together user+course, tanpa status
"""

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from .models import Course, Enrollment, Lesson


class CourseModelTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')
        self.course = Course.objects.create(
            name="Pemrograman Django",
            description="Belajar Django",
            price=150000,
            instructor=self.instructor,
        )

    def test_course_creation(self):
        course = Course.objects.get(name="Pemrograman Django")
        self.assertEqual(course.price, 150000)
        self.assertEqual(course.instructor.username, 'teacher1')
        # Course.__str__ project ini cuma mengembalikan nama (bukan "nama : harga")
        self.assertEqual(str(course), course.name)


class EnrollmentModelTest(TestCase):
    """Setara dengan CourseMemberModelTest di materi - "member" course di project
    ini direpresentasikan oleh model Enrollment (bukan CourseMember terpisah)."""

    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')
        self.student = User.objects.create(username='student1')
        self.course = Course.objects.create(name="Pemrograman Django", instructor=self.instructor)

    def test_enrollment_creation(self):
        member = Enrollment.objects.create(course=self.course, user=self.student)
        self.assertEqual(member.user.username, 'student1')
        self.assertEqual(member.course.name, "Pemrograman Django")


class LessonModelTest(TestCase):
    """Setara dengan CourseContentModelTest di materi - konten course di project
    ini adalah model Lesson (title/order), bukan CourseContent (name/description)."""

    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')
        self.course = Course.objects.create(name="Pemrograman Django", instructor=self.instructor)

    def test_lesson_creation(self):
        lesson = Lesson.objects.create(
            title="Pengenalan Django",
            course=self.course,
            order=1,
        )
        self.assertEqual(lesson.course.name, "Pemrograman Django")
        self.assertEqual(lesson.title, "Pengenalan Django")
        self.assertEqual(str(lesson), f"{lesson.title} (Order: {lesson.order})")


class CourseQueryTest(TestCase):
    def setUp(self):
        self.teacher1 = User.objects.create(username='teacher1')
        self.teacher2 = User.objects.create(username='teacher2')
        Course.objects.create(name="Django", instructor=self.teacher1)
        Course.objects.create(name="Flask", instructor=self.teacher2)

    def test_course_retrieval_by_instructor(self):
        courses = Course.objects.filter(instructor=self.teacher1)
        self.assertEqual(courses.count(), 1)
        self.assertEqual(courses.first().name, "Django")


class CourseValidationTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')

    def test_invalid_price(self):
        # Beda dari materi: Course.price pakai PositiveIntegerField, yang sejak
        # Django 4.1 otomatis membuat CHECK constraint di database. Jadi harga
        # negatif TIDAK bisa tersimpan - bukan "berhasil" seperti di contoh materi.
        course = Course(
            name="Pemrograman Django",
            description="Belajar Django",
            price=-10000,
            instructor=self.instructor,
        )
        with self.assertRaises(IntegrityError):
            course.save()

    def test_empty_name(self):
        course = Course(
            name="",
            description="Belajar Django",
            price=100000,
            instructor=self.instructor,
        )
        with self.assertRaises(ValidationError):
            course.full_clean()


class CourseFilteringTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')
        Course.objects.create(name="Kursus 1", price=100000, instructor=self.instructor)
        Course.objects.create(name="Kursus 2", price=200000, instructor=self.instructor)
        Course.objects.create(name="Kursus 3", price=300000, instructor=self.instructor)

    def test_filter_courses_by_price(self):
        affordable_courses = Course.objects.filter(price__lt=200000)
        self.assertEqual(affordable_courses.count(), 1)
        self.assertEqual(affordable_courses.first().name, "Kursus 1")


class EnrollmentTestCase(TestCase):
    def setUp(self):
        self.instructor = User.objects.create(username='teacher1')
        self.student = User.objects.create(username='student1')
        self.course = Course.objects.create(
            name="Pemrograman Python",
            description="Kursus Python tingkat dasar",
            price=50000,
            instructor=self.instructor,
        )

    def test_enrollment_success(self):
        enrollment = Enrollment.objects.create(course=self.course, user=self.student)
        self.assertEqual(enrollment.course.name, "Pemrograman Python")
        self.assertEqual(enrollment.user.username, "student1")

    def test_duplicate_enrollment(self):
        # Student pertama kali daftar - harus berhasil
        Enrollment.objects.create(course=self.course, user=self.student)

        # Daftar lagi ke course yang sama - harus gagal karena
        # UniqueConstraint(fields=['user', 'course']) di model Enrollment
        with self.assertRaises(IntegrityError):
            Enrollment.objects.create(course=self.course, user=self.student)

    # Catatan: materi juga mencontohkan test_course_full (kuota maksimal
    # peserta lewat field Course.max_students). Model Course project ini
    # tidak punya fitur kuota/max_students sama sekali, jadi test itu tidak
    # relevan untuk diadaptasi di sini - beri tahu saya kalau fitur kuota
    # course memang mau ditambahkan, baru testnya bisa dibuat menyusul.
