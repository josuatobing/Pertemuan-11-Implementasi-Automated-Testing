from ninja import Router
from django.shortcuts import get_object_or_404
from .models import Enrollment, Course, Progress, Lesson
from .permissions import is_student
from config.auth import JWTAuth
from ninja.errors import HttpError

router = Router()


@router.post("", auth=JWTAuth())
def enroll_course(request, course_id: int):
    is_student(request.auth)

    course = get_object_or_404(Course, id=course_id)
    
    enrollment, created = Enrollment.objects.get_or_create(
        user=request.auth,
        course=course
    )
    
    if not created:
        raise HttpError(400, "Already enrolled in this course")

    return {
        "id": enrollment.id,
        "message": "Successfully enrolled"
    }


@router.get("/my-courses", auth=JWTAuth())
def get_my_courses(request):
    is_student(request.auth)

    enrollments = Enrollment.objects.filter(user=request.auth).select_related('course')

    return [
        {
            "id": e.course.id,
            "enrollment_id": e.id,
            "name": e.course.name,
            "description": e.course.description,
            "instructor": e.course.instructor.username,
            "image": e.course.image.url if e.course.image else None,
        }
        for e in enrollments
    ]


@router.get("/progress", auth=JWTAuth())
def get_progress(request, course_id: int):
    """Daftar lesson yang sudah diselesaikan user login pada sebuah course."""
    is_student(request.auth)

    lesson_ids = Progress.objects.filter(
        user=request.auth,
        completed=True,
        lesson__course_id=course_id,
    ).values_list('lesson_id', flat=True)

    return {"completed_lesson_ids": list(lesson_ids)}


@router.post("/{enrollment_id}/progress", auth=JWTAuth())
def mark_lesson_complete(request, enrollment_id: int, lesson_id: int):
    is_student(request.auth)

    lesson = get_object_or_404(Lesson, id=lesson_id)
    enrollment = get_object_or_404(Enrollment, id=enrollment_id, user=request.auth)

    progress, created = Progress.objects.get_or_create(
        user=request.auth,
        lesson=lesson
    )

    progress.completed = True
    progress.save()

    return {
        "message": "Lesson marked as complete",
        "lesson_id": lesson.id,
        "lesson_title": lesson.title
    }