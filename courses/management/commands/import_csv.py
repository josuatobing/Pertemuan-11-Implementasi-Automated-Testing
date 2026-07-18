"""
Import data course dari file CSV (materi: Import CSV).

Format CSV (baris pertama header):
    name,description,price,instructor,category

Contoh file: sample_data/courses_import.csv

Jalankan:
    docker compose exec web python manage.py import_csv sample_data/courses_import.csv
"""

import csv

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from courses.models import Category, Course, UserProfile


class Command(BaseCommand):
    help = "Import course dari file CSV (kolom: name,description,price,instructor,category)"

    def add_arguments(self, parser):
        parser.add_argument('csv_path', help='Path ke file CSV')

    def handle(self, *args, **options):
        path = options['csv_path']
        try:
            f = open(path, newline='', encoding='utf-8')
        except OSError as e:
            raise CommandError(f'Tidak bisa membuka "{path}": {e}')

        created = skipped = 0
        with f:
            reader = csv.DictReader(f)
            required = {'name', 'description', 'price', 'instructor', 'category'}
            if not required.issubset(reader.fieldnames or []):
                raise CommandError(f'Header CSV harus memuat kolom: {", ".join(sorted(required))}')

            for row in reader:
                instructor, is_new_user = User.objects.get_or_create(username=row['instructor'].strip())
                if is_new_user:
                    instructor.set_password(f"{instructor.username}123")
                    instructor.save()
                UserProfile.objects.get_or_create(user=instructor, defaults={'role': 'instructor'})

                category = None
                if row['category'].strip():
                    category, _ = Category.objects.get_or_create(name=row['category'].strip())

                _, is_new = Course.objects.get_or_create(
                    name=row['name'].strip(),
                    defaults={
                        'description': row['description'].strip(),
                        'price': int(row['price'] or 0),
                        'instructor': instructor,
                        'category': category,
                    },
                )
                if is_new:
                    created += 1
                    self.stdout.write(f'  + "{row["name"].strip()}"')
                else:
                    skipped += 1
                    self.stdout.write(f'  = "{row["name"].strip()}" sudah ada, dilewati')

        self.stdout.write(self.style.SUCCESS(
            f'Import selesai: {created} course baru, {skipped} dilewati.'
        ))
