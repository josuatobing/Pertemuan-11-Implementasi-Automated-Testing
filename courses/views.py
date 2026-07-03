from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import render

from .models import Course

ALLOWED_ORDERING_FIELDS = ['name', '-name', 'price', '-price', 'created_at', '-created_at']
PAGE_SIZE = 5  # Pertemuan 10: 5 data per halaman


def _parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def course_list_page(request):
    """
    Halaman HTML untuk menampilkan Course dengan Search, Sorting, dan Pagination
    (Pertemuan 10). Konsumsi langsung ke model, bukan lewat API, supaya halaman
    ini bisa dibuka biasa di browser tanpa perlu Bearer token.
    """
    search = request.GET.get('search', '').strip()
    price_gte = _parse_int(request.GET.get('price_gte', '').strip())
    price_lte = _parse_int(request.GET.get('price_lte', '').strip())
    ordering = request.GET.get('ordering', '-created_at')

    if ordering not in ALLOWED_ORDERING_FIELDS:
        ordering = '-created_at'

    courses = Course.objects.select_related('instructor', 'category').all()

    if search:
        courses = courses.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )

    if price_gte is not None:
        courses = courses.filter(price__gte=price_gte)

    if price_lte is not None:
        courses = courses.filter(price__lte=price_lte)

    courses = courses.order_by(ordering)

    paginator = Paginator(courses, PAGE_SIZE)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    querystring = request.GET.copy()
    querystring.pop('page', None)

    context = {
        'page_obj': page_obj,
        'search': search,
        'price_gte': '' if price_gte is None else price_gte,
        'price_lte': '' if price_lte is None else price_lte,
        'ordering': ordering,
        'querystring': querystring.urlencode(),
    }
    return render(request, 'courses/course_list.html', context)
