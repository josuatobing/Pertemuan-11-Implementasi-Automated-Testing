FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=100 -r requirements.txt
COPY . .

EXPOSE 8000

# Default = mode produksi (Koyeb dsb.). Dev lokal tidak terpengaruh karena
# docker-compose.yml meng-override command ke runserver.
RUN chmod +x start.sh
CMD ["./start.sh"]