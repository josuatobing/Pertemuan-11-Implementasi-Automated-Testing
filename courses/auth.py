from ninja.security import HttpBearer
from django.contrib.auth.models import User
from .jwt import decode_token

class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        payload = decode_token(token)

        if not payload:
            return None

        try:
            return User.objects.get(id=payload["user_id"])
        except User.DoesNotExist:
            return None