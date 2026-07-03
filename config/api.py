from ninja import NinjaAPI
from ninja.throttling import AnonRateThrottle, AuthRateThrottle
from ninja_simple_jwt.auth.views.api import mobile_auth_router, web_auth_router

from courses.api import router as courses_router, lessons_router
from courses.api_jwt_demo import router as jwt_demo_router
from courses.auth_api import router as auth_router
from courses.enrollment_api import router as enrollment_router


class AnonThrottle(AnonRateThrottle):
    # AnonRateThrottle.__init__ ignores a class-level `rate` attribute (it only
    # honours the constructor arg or falls back to ninja's default THROTTLE_RATES),
    # so the rate has to be forced through super().__init__().
    def __init__(self):
        super().__init__(rate="20/min")


class AuthThrottle(AuthRateThrottle):
    def __init__(self):
        super().__init__(rate="100/min")


apiv1 = NinjaAPI(
    title="Simple LMS API",
    version="1.0",
    urls_namespace="v1",
    throttle=[AnonThrottle(), AuthThrottle()],
)

# Pertemuan 7/8 - custom JWT auth (config.auth.JWTAuth) used across the app
apiv1.add_router("/auth/", auth_router)
apiv1.add_router("/enrollments/", enrollment_router)
apiv1.add_router("/courses/", courses_router)
apiv1.add_router("/lessons/", lessons_router)

# Pertemuan 9 - django-ninja-simple-jwt library auth endpoints + protected demo router
apiv1.add_router("/auth/mobile/", mobile_auth_router)
apiv1.add_router("/auth/web/", web_auth_router)
apiv1.add_router("/jwt-demo/", jwt_demo_router)
