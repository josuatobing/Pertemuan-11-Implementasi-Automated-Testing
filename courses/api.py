from typing import List, Optional

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from ninja import File, Query, Router, UploadedFile
from ninja.errors import HttpError
from ninja.pagination import PageNumberPagination, paginate

from .models import Course, Enrollment, Lesson
from .permissions import is_admin, is_instructor
from config.auth import JWTAuth
from .schemas import (
    CourseFilter,
    CourseOut,
    CourseUpdate,
    LessonOut,
    LessonUpdate,
)

router = Router()
lessons_router = Router()

ALLOWED_ORDERING_FIELDS = ['name', 'price', 'created_at', '-name', '-price', '-created_at']

MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10MB


# ---------------------------------------------------------------------------
# Courses - filtering + sorting + pagination (Materi 8)
# ---------------------------------------------------------------------------

@router.get("", response=List[CourseOut], auth=None)
@paginate(PageNumberPagination, page_size=5)  # Pertemuan 10: 5 data per halaman
def list_courses(request, filters: CourseFilter = Query(...), ordering: str = '-created_at'):
    """
    List courses dengan filtering (search, price, created_at), sorting (ordering)
    dan pagination (page).
    """
    if ordering not in ALLOWED_ORDERING_FIELDS:
        ordering = '-created_at'

    queryset = Course.objects.select_related('instructor', 'category').all()
    queryset = filters.filter(queryset)
    queryset = queryset.order_by(ordering)
    return queryset


@router.get("/{course_id}", auth=None)
def get_course_detail(request, course_id: int):
    """Get course detail with lessons"""
    course = get_object_or_404(Course, id=course_id)
    lessons = Lesson.objects.filter(course=course).order_by('order')

    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "price": course.price,
        "instructor": course.instructor.username,
        "category": course.category.name if course.category else None,
        "image": course.image.url if course.image else None,
        "created_at": course.created_at,
        "lessons": [
            {
                "id": l.id,
                "title": l.title,
                "order": l.order,
                "has_attachment": bool(l.file_attachment),
            }
            for l in lessons
        ]
    }


@router.post("", auth=JWTAuth())
def create_course(request, name: str, description: str, price: int = 0, category_id: Optional[int] = None):
    """Create course (Instructor only)"""
    is_instructor(request.auth)

    course = Course.objects.create(
        name=name,
        description=description,
        price=price,
        instructor=request.auth,
        category_id=category_id
    )

    return {
        "id": course.id,
        "name": course.name,
        "message": "Course created successfully"
    }


@router.patch("/{course_id}", auth=JWTAuth())
def update_course(request, course_id: int, data: CourseUpdate):
    """
    Partial update course. Hanya field yang dikirim yang akan diubah.
    Hanya instructor pemilik course yang boleh mengupdate.
    """
    is_instructor(request.auth)

    course = get_object_or_404(Course, id=course_id)

    if course.instructor != request.auth:
        raise HttpError(403, "You can only update your own course")

    for attr, value in data.dict(exclude_unset=True).items():
        setattr(course, attr, value)

    course.save()

    return {
        "id": course.id,
        "message": "Course updated successfully"
    }


@router.delete("/{course_id}", auth=JWTAuth())
def delete_course(request, course_id: int):
    """Delete course (Admin only)"""
    is_admin(request.auth)

    course = get_object_or_404(Course, id=course_id)
    course.delete()

    return {"message": "Course deleted successfully"}


# ---------------------------------------------------------------------------
# File upload / download (Materi 8)
# ---------------------------------------------------------------------------

@router.post("/{course_id}/upload-image/", auth=JWTAuth())
def upload_course_image(request, course_id: int, file: UploadedFile = File(...)):
    """Upload gambar thumbnail untuk course. Hanya instructor pemilik course."""
    course = get_object_or_404(Course, id=course_id)

    if course.instructor != request.auth:
        raise HttpError(403, "Hanya instructor pemilik course yang boleh mengupload gambar.")

    if file.size > MAX_IMAGE_SIZE:
        raise HttpError(400, "Ukuran file maksimal 2MB.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HttpError(400, "Tipe file harus JPEG, PNG, atau WebP.")

    course.image = file
    course.save()

    return {"message": "Image berhasil diupload.", "filename": file.name}


@lessons_router.post("", auth=JWTAuth(), response=LessonOut)
def create_lesson(request, course_id: int, title: str, order: int = 1):
    """Create lesson untuk sebuah course. Hanya instructor pemilik course."""
    is_instructor(request.auth)

    course = get_object_or_404(Course, id=course_id)

    if course.instructor != request.auth:
        raise HttpError(403, "Hanya instructor pemilik course yang boleh menambah lesson.")

    return Lesson.objects.create(course=course, title=title, order=order)


@lessons_router.post("/{lesson_id}/upload-attachment/", auth=JWTAuth())
def upload_lesson_attachment(request, lesson_id: int, file: UploadedFile = File(...)):
    """Upload file materi (attachment) untuk lesson. Hanya instructor pemilik course."""
    lesson = get_object_or_404(Lesson.objects.select_related('course'), id=lesson_id)

    if lesson.course.instructor != request.auth:
        raise HttpError(403, "Hanya instructor pemilik course yang boleh mengupload attachment.")

    if file.size > MAX_ATTACHMENT_SIZE:
        raise HttpError(400, "Ukuran file maksimal 10MB.")

    lesson.file_attachment = file
    lesson.save()

    return {"message": "Attachment berhasil diupload.", "filename": file.name}


@lessons_router.get("/{lesson_id}/download/", auth=JWTAuth())
def download_lesson_attachment(request, lesson_id: int):
    """Download file attachment dari lesson. Hanya member course atau instructor pemilik."""
    lesson = get_object_or_404(Lesson.objects.select_related('course'), id=lesson_id)

    is_owner = lesson.course.instructor == request.auth
    is_member = Enrollment.objects.filter(course=lesson.course, user=request.auth).exists()

    if not (is_owner or is_member):
        raise HttpError(403, "Anda harus terdaftar di course ini untuk mendownload file.")

    if not lesson.file_attachment:
        raise HttpError(404, "Lesson ini tidak memiliki file attachment.")

    return FileResponse(
        lesson.file_attachment.open(),
        as_attachment=True,
        filename=lesson.file_attachment.name.split('/')[-1]
    )


@lessons_router.patch("/{lesson_id}/", auth=JWTAuth(), response=LessonOut)
def update_lesson(request, lesson_id: int, data: LessonUpdate):
    """Partial update lesson (title/order). Hanya instructor pemilik course."""
    lesson = get_object_or_404(Lesson.objects.select_related('course'), id=lesson_id)

    if lesson.course.instructor != request.auth:
        raise HttpError(403, "Hanya instructor pemilik course yang boleh mengupdate lesson.")

    for attr, value in data.dict(exclude_unset=True).items():
        setattr(lesson, attr, value)

    lesson.save()
    return lesson
