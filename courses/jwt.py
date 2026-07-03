import jwt
from datetime import datetime, timedelta
from django.conf import settings

SECRET_KEY = settings.SECRET_KEY


def create_access_token(user):
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def create_refresh_token(user):
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(days=1),
        "type": "refresh"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        return None