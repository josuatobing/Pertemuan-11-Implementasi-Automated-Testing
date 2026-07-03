from ninja.errors import HttpError
from .models import UserProfile

def get_user_role(user):
    try:
        return user.userprofile.role
    except:
        return None

def is_instructor(user):
    if get_user_role(user) != "instructor":
        raise HttpError(403, "Only instructor allowed")

def is_admin(user):
    if get_user_role(user) != "admin":
        raise HttpError(403, "Only admin allowed")

def is_student(user):
    if get_user_role(user) != "student":
        raise HttpError(403, "Only student allowed")