"""
Pertemuan 9 - Otentikasi dan Kontrol Akses REST API.

Demo endpoint untuk menguji library `django-ninja-simple-jwt` (app: ninja_simple_jwt).
Router auth bawaan library (mobile_auth_router / web_auth_router) di-mount di config/api.py
pada path /api/v1/auth/mobile/ dan /api/v1/auth/web/. Router di file ini hanya berisi
endpoint contoh yang dilindungi oleh HttpJwtAuth dari library tersebut, untuk dites lewat Postman.
"""
from ninja import Router
from ninja_simple_jwt.auth.ninja_auth import HttpJwtAuth

router = Router()


@router.get("/hello", auth=HttpJwtAuth())
def hello(request):
    """Endpoint terproteksi sederhana untuk uji coba token dari /auth/mobile/sign-in atau /auth/web/sign-in."""
    return {"message": f"Hello, {request.user.username}!"}


@router.get("/me", auth=HttpJwtAuth())
def me(request):
    """Menampilkan data user yang berhasil diautentikasi lewat django-ninja-simple-jwt."""
    user = request.user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    }
