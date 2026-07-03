from datetime import datetime
from typing import Optional

from django.db.models import Q
from ninja import FilterSchema, Field, ModelSchema, Schema

from .models import Course, Lesson


class CourseOut(Schema):
    id: int
    name: str
    description: str
    price: int
    instructor: str
    category: Optional[str] = None
    created_at: datetime

    @staticmethod
    def resolve_instructor(obj):
        return obj.instructor.username

    @staticmethod
    def resolve_category(obj):
        return obj.category.name if obj.category else None


class CourseFilter(FilterSchema):
    price: Optional[int] = None
    created_at: Optional[datetime] = None
    search: Optional[str] = Field(
        None,
        q=['name__icontains', 'description__icontains'],
    )

    def filter_price(self, value: Optional[int]) -> Q:
        if value is None:
            return Q()
        return Q(price__gt=value)

    def filter_created_at(self, value: Optional[datetime]) -> Q:
        if value is None:
            return Q()
        return Q(created_at__gt=value)


class CourseUpdate(Schema):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    category_id: Optional[int] = None


class LessonOut(Schema):
    id: int
    title: str
    order: int
    has_attachment: bool

    @staticmethod
    def resolve_has_attachment(obj):
        return bool(obj.file_attachment)


class LessonUpdate(Schema):
    title: Optional[str] = None
    order: Optional[int] = None


# --- API v2 schemas ---

class TeacherOut(Schema):
    id: int
    username: str
    full_name: str

    @staticmethod
    def resolve_full_name(obj):
        return obj.get_full_name() or obj.username


class CourseOutV2(Schema):
    id: int
    name: str
    description: str
    price: int
    teacher: TeacherOut
    member_count: int
    created_at: datetime
