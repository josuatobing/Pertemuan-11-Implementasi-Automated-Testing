"""
Materi 8 - API Versioning.

v2 keeps the old v1 contract untouched and demonstrates a breaking change:
`teacher` becomes a nested object (instead of a plain username string) and
adds `member_count`.
"""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from ninja import NinjaAPI, Router

from courses.models import Course
from courses.schemas import CourseOutV2

apiv2 = NinjaAPI(
    title="Simple LMS API",
    version="2.0",
    urls_namespace="v2",
)

courses_v2_router = Router()


@courses_v2_router.get("/{course_id}/", response=CourseOutV2, auth=None)
def get_course_v2(request, course_id: int):
    course = get_object_or_404(
        Course.objects.select_related('instructor').annotate(member_count=Count('enrollment')),
        id=course_id,
    )
    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "price": course.price,
        "teacher": course.instructor,
        "member_count": course.member_count,
        "created_at": course.created_at,
    }


apiv2.add_router("/courses/", courses_v2_router)
