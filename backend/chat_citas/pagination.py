from .exceptions import ChatError


def enteroParametro(value, default, maximum=None):
    if value is None:
        return default
    try:
        if isinstance(value, bool) or str(value) != str(int(value)):
            raise ValueError()
        value = int(value)
        if value < 1 or (maximum is not None and value > maximum):
            raise ValueError()
        return value
    except (ValueError, TypeError):
        raise ChatError(400, 'invalid_pagination', 'Parámetro de paginación inválido')
