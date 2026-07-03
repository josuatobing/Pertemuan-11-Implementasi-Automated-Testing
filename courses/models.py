from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('instructor', 'Instructor'),
        ('student', 'Student'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    def __str__(self):
        return self.name

class CourseQuerySet(models.QuerySet):
    def for_listing(self):
        return self.select_related('instructor', 'category')


class EnrollmentQuerySet(models.QuerySet):
    def for_student_dashboard(self):
        return self.select_related('course').prefetch_related('course__lesson_set')
    
class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='course_images/', null=True, blank=True)
    instructor = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    objects = CourseQuerySet.as_manager()

    def __str__(self):
        return self.name

class Lesson(models.Model):
    title = models.CharField(max_length=200)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE
    )
    order = models.IntegerField()
    file_attachment = models.FileField(upload_to='lesson_attachments/', null=True, blank=True)

    def __str__(self):
        return f"{self.title} (Order: {self.order})"

    class Meta:
        ordering = ['order']


class Enrollment(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE
    )
    objects = EnrollmentQuerySet.as_manager()

    def __str__(self):
        return f"{self.user.username} - {self.course.name}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'],
                name='unique_enrollment'
            )
        ]

class Progress(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE
    )
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.completed}"