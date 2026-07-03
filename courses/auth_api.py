from ninja import Router
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from ninja.errors import HttpError
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from config.auth import JWTAuth, SECRET

from .models import UserProfile

router = Router()

def create_access_token(user):
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(minutes=30),
        "type": "access"
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def create_refresh_token(user):
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(days=1),
        "type": "refresh"
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except:
        return None


@router.post("/register", auth=None)
def register(request, username: str, password: str, role: str):
    """Register new user"""
    VALID_ROLES = ['admin', 'instructor', 'student']
    
    if role not in VALID_ROLES:
        raise HttpError(400, f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    
    if User.objects.filter(username=username).exists():
        raise HttpError(400, "Username already exists")
    
    if len(password) < 6:
        raise HttpError(400, "Password must be at least 6 characters")
    
    user = User.objects.create_user(username=username, password=password)

    UserProfile.objects.create(
        user=user,
        role=role
    )

    return {
        "id": user.id,
        "username": user.username,
        "role": role,
        "message": "User created successfully"
    }

@router.post("/login", auth=None)
def login(request, username: str, password: str):
    user = authenticate(username=username, password=password)

    if not user:
        raise HttpError(401, "Invalid credentials")

    access = create_access_token(user)
    refresh = create_refresh_token(user)

    return {
        "access": access,
        "refresh": refresh
    }


@router.post("/refresh", auth=None)
def refresh_token(request, refresh: str):
    payload = decode_token(refresh)

    if not payload or payload.get("type") != "refresh":
        raise HttpError(401, "Invalid refresh token")

    user = User.objects.get(id=payload["user_id"])

    access = create_access_token(user)

    return {"access": access}


@router.get("/me", auth=JWTAuth())
def get_me(request):
    user = request.auth

    if not user:
        raise HttpError(401, "Unauthorized")

    profile = UserProfile.objects.get(user=user)

    return {
        "id": user.id,
        "username": user.username,
        "role": profile.role
    }

@router.put("/me", auth=JWTAuth())
def update_me(request, username: str = None, password: str = None):
    user = request.auth

    if not user:
        raise HttpError(401, "Unauthorized")

    if username:
        user.username = username

    if password:
        user.set_password(password)

    user.save()

    return {"message": "Profile updated"}