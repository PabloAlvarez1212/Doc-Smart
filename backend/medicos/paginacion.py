from rest_framework.exceptions import ValidationError

from core.paginacion import PaginacionEstandar


class PaginacionSolicitudesValidacion(PaginacionEstandar):
    """Valida los parámetros y recupera la última página si el listado se reduce."""

    @staticmethod
    def entero_positivo(request, nombre, predeterminado):
        valor = str(request.query_params.get(nombre, predeterminado))
        try:
            numero = int(valor) if valor.isascii() and valor.isdecimal() else 0
        except ValueError:
            numero = 0
        if numero < 1:
            raise ValidationError({nombre: ["Debe ser un entero mayor o igual a 1."]})
        return numero

    def get_page_size(self, request):
        return min(self.entero_positivo(request, "page_size", self.page_size), self.max_page_size)

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        page = self.entero_positivo(request, "page", 1)
        paginator = self.django_paginator_class(queryset, self.get_page_size(request))
        self.page = paginator.get_page(page)
        return list(self.page)
