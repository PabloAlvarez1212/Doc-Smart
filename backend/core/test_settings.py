"""SQLite, caché, canales y correo locales; simular APIs externas en las pruebas."""
import os

for name, value in {
    "SECRET_KEY": "local-test-key-not-for-production",
    "DB_NAME": "unused", "DB_USER": "unused", "DB_PASSWORD": "unused", "DB_HOST": "unused",
    "GEMINI_API_KEY": "test-placeholder",
}.items():
    os.environ.setdefault(name, value)

from .settings import *  # noqa: E402,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
