"""Cifrado simétrico AES-256 de datos sensibles y huella para comprobar duplicados sin guardar el dato en claro.

- Registro médico: AES-256-GCM (nonce aleatorio).
- Documentos de identidad: AES-256-SIV (determinista, para mantener la unicidad y las búsquedas exactas).
"""
import base64
import hashlib
import hmac
import os

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _material():
    return (os.environ.get("DATA_ENCRYPTION_KEY") or settings.SECRET_KEY).encode()


def _fernet():
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(_material()).digest()))


def normalizar_registro(valor):
    return "".join(str(valor or "").split()).upper()


# Cifrado simétrico AES-256-GCM (con nonce aleatorio y autenticación) para datos que no se buscan por igualdad.
PREFIJO_GCM = "aes256gcm:"


def _clave_gcm():
    return hashlib.sha256(_material() + b"|registro-medico").digest()


def cifrar_texto(valor):
    if not valor:
        return ""
    nonce = os.urandom(12)
    cifrado = AESGCM(_clave_gcm()).encrypt(nonce, valor.encode(), b"registro-medico")
    return PREFIJO_GCM + base64.urlsafe_b64encode(nonce + cifrado).decode()


def descifrar_texto(token):
    if not token:
        return ""
    try:
        if token.startswith(PREFIJO_GCM):
            crudo = base64.urlsafe_b64decode(token[len(PREFIJO_GCM):])
            return AESGCM(_clave_gcm()).decrypt(crudo[:12], crudo[12:], b"registro-medico").decode()
        # Valores guardados antes con Fernet (AES-128): se siguen leyendo hasta que la migración los re-cifre.
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError, Exception):
        return ""


def huella_texto(valor):
    return hmac.new(_material(), normalizar_registro(valor).encode(), hashlib.sha256).hexdigest()


# ── Documentos de identidad ──────────────────────────────────────────────────
# Cifrado determinista (AES-SIV): el mismo número produce siempre el mismo texto cifrado,
# así que la unicidad y las búsquedas exactas siguen funcionando sin guardar el número en claro.
from cryptography.hazmat.primitives.ciphers.aead import AESSIV  # noqa: E402
from django.db import models  # noqa: E402

PREFIJO_DOCUMENTO = "cif1:"
_ASOCIADO = [b"documento-identidad"]


def _siv():
    return AESSIV(hashlib.sha512(_material() + b"|documento").digest())


def cifrar_documento(valor):
    if not valor or str(valor).startswith(PREFIJO_DOCUMENTO):
        return valor
    cifrado = _siv().encrypt(str(valor).encode(), _ASOCIADO)
    return PREFIJO_DOCUMENTO + base64.urlsafe_b64encode(cifrado).decode()


def descifrar_documento(token):
    # Los valores guardados antes del cifrado no llevan prefijo y se devuelven tal cual.
    if not token or not str(token).startswith(PREFIJO_DOCUMENTO):
        return token
    try:
        return _siv().decrypt(base64.urlsafe_b64decode(token[len(PREFIJO_DOCUMENTO):]), _ASOCIADO).decode()
    except Exception:
        return ""


class DocumentoCifradoField(models.CharField):
    """Texto que se guarda cifrado en la base de datos y se lee en claro en el código."""

    def from_db_value(self, value, expression, connection):
        return descifrar_documento(value)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return cifrar_documento(value) if value else value
