#!/bin/sh
# Start script produksi (dipakai Koyeb / container tanpa docker-compose).
# Dev lokal tetap lewat docker compose yang meng-override command ke runserver.
set -e

python manage.py migrate --noinput

# Key JWT (django-ninja-simple-jwt) — filesystem ephemeral, generate tiap boot
if [ ! -f jwt-signing.pem ]; then
  python manage.py make_jwt_key
fi

# Seeder idempotent: data contoh + regenerate cover course
python manage.py seed

python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2
