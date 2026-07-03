from django.contrib import admin
from .models import (
    UserProfile,
    Category,
    Course,
    Lesson,
    Enrollment,
    Progress
)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'instructor', 'category')
    search_fields = ('name',)
    list_filter = ('category',)
    inlines = [LessonInline]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course')
    search_fields = ('user__username',)
    list_filter = ('course',)


admin.site.register(UserProfile)
admin.site.register(Category)
admin.site.register(Lesson)
admin.site.register(Progress)