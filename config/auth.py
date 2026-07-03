from ninja.security import HttpBearer
import jwt
from django.contrib.auth.models import User

SECRET = "SECRETKEY123"

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
            
            if payload.get("type") != "access":
                return None

            user = User.objects.get(id=user_id)
            return user

        except Exception:
            return None