"""Cambio de acceso de pacientes y médicos desde el panel administrativo."""

import logging
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from users.account_access_services import (
    CuentaNoEncontrada, EstadoCuentaSinCambio, cambiar_acceso_cuenta,
)
from utils import IsAdmin, respuesta_error, respuesta_ok, respuesta_serializer_invalido

logger = logging.getLogger(__name__)


class CambioAccesoSerializer(serializers.Serializer):
    bloqueado = serializers.BooleanField()
    motivo = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=500)

    def validate(self, attrs):
        if attrs["bloqueado"] and not attrs.get("motivo", "").strip():
            raise serializers.ValidationError({"motivo": "El motivo del bloqueo es obligatorio."})
        return attrs


class CambioAccesoCuentaView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, tipo, cuenta_id):
        if tipo not in ("paciente", "medico"):
            return respuesta_error("Tipo de cuenta no válido", status=404)

        serializer = CambioAccesoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        bloquear = serializer.validated_data["bloqueado"]
        try:
            resultado = cambiar_acceso_cuenta(
                tipo, cuenta_id, bloquear, serializer.validated_data.get("motivo", ""),
            )
        except CuentaNoEncontrada:
            return respuesta_error("Cuenta no encontrada", status=404)
        except EstadoCuentaSinCambio:
            return respuesta_error("La cuenta ya tiene ese estado", status=409)
        except Exception:
            logger.exception("No se pudo cambiar el acceso de %s %s", tipo, cuenta_id)
            return respuesta_error("Error interno del servidor", status=500)

        return respuesta_ok(
            data=resultado,
            mensaje="Cuenta bloqueada" if bloquear else "Cuenta desbloqueada",
        )
