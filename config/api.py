from ninja import NinjaAPI
from ninja.errors import Throttled
from ninja.throttling import AnonRateThrottle, AuthRateThrottle

from ninja_simple_jwt.auth.views.api import mobile_auth_router, web_auth_router

from courses.api import router as courses_router, lessons_router
from courses.api_jwt_demo import router as jwt_demo_router
from courses.auth_api import router as auth_router
from courses.enrollment_api import router as enrollment_router


apiv1 = NinjaAPI(
    title="Simple LMS API",
    version="1.0",
    urls_namespace="v1",
    # Pertemuan 10: rate limiting. Awalnya 10/m sesuai materi, dinaikkan ke 50/m
    # supaya browsing normal di frontend tidak gampang kena 429.
    # (rate diteruskan sebagai constructor arg, bukan class attribute -
    # AnonRateThrottle/AuthRateThrottle hanya membaca rate lewat sini)
    throttle=[AnonRateThrottle("50/m"), AuthRateThrottle("200/m")],
)


@apiv1.exception_handler(Throttled)
def on_throttled(request, exc: Throttled):
    # Pertemuan 10 spec: pesan "Too many request" saat limit terlampaui.
    return apiv1.create_response(request, {"detail": "Too many request"}, status=429)

# Pertemuan 7/8 - custom JWT auth (config.auth.JWTAuth) used across the app
apiv1.add_router("/auth/", auth_router)
apiv1.add_router("/enrollments/", enrollment_router)
apiv1.add_router("/courses/", courses_router)
apiv1.add_router("/lessons/", lessons_router)

# Pertemuan 9 - django-ninja-simple-jwt library auth endpoints + protected demo router
apiv1.add_router("/auth/mobile/", mobile_auth_router)
apiv1.add_router("/auth/web/", web_auth_router)
apiv1.add_router("/jwt-demo/", jwt_demo_router)
