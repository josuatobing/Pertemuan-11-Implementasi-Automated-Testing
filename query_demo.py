import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection, reset_queries
from courses.models import Course

print("=== TANPA OPTIMASI (N+1) ===")
reset_queries()

courses = Course.objects.all()
for course in courses:
    print(course.name, course.instructor.username)

print("Jumlah Query:", len(connection.queries))


print("\n=== DENGAN OPTIMASI ===")
reset_queries()

courses = Course.objects.select_related('instructor')
for course in courses:
    print(course.name, course.instructor.username)

print("Jumlah Query:", len(connection.queries))