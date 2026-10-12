# Registro médico por etapas

El registro público médico reutiliza `ProcesoRegistroUsuario` y los servicios OCR/OTP del paciente. `tipo_registro` separa las dos familias de rutas. Los procesos anteriores conservan el valor `paciente`.

## Secuencia y permisos

1. Identidad: nombre, apellido, tipo/número de documento y nacimiento. El médico debe ser mayor de edad. El número se conserva en la columna `Medico.cedula`, ampliada a 30 caracteres.
2. Documento: frente y, para CC, reverso. Imágenes JPG/PNG/WEBP, hasta 8 MB, formato real comprobado con Pillow. Las dos caras se validan antes de almacenar. El OCR existente compara los cuatro datos declarados; no los sustituye ni acredita autenticidad legal.
3. Datos profesionales: teléfono, dirección, ciudad y especialidad de los catálogos existentes, y PDF profesional de hasta 5 MB. El departamento filtra ciudades; la ciudad determina el departamento persistido. El PDF utiliza el almacenamiento privado existente y `Archivo`.
4. Credenciales: correo normalizado, comprobación de duplicidad entre pacientes/médicos, contraseña bcrypt y envío OTP. Los datos profesionales quedan fijados al configurar las credenciales.
5. OTP y finalización: expiración, intentos, reenvíos, cooldown e invalidación del código anterior compartidos con paciente. La cuenta se crea dentro de una transacción y se vincula a una `SolicitudValidacionMedico` **pendiente**. `IsMedicoAprobado` continúa restringiendo herramientas médicas.

La identidad de los nuevos médicos verificados no puede alterarse arbitrariamente desde el perfil o la edición administrativa. Los médicos anteriores, sin marca de verificación documental, conservan su comportamiento previo.

## Rutas

Todas usan POST bajo `/api/medicos/registro/`:

- Ruta raíz: iniciar el proceso con identidad, no crear una cuenta directamente.
- `subir-documento/`, `documento/verificar/`, `documento/extraer/`.
- `datos-profesionales/`, `credenciales/`.
- `verificar-correo/`, `reenviar-codigo/`, `completar/`.

El contrato antiguo de envío único se retiró porque permitía crear médicos sin OCR ni OTP. Las rutas del paciente conservan su contrato. Sus datos adicionales incluyen género y tipo de sangre.

## Archivos principales modificados

Backend: `users/models.py`, `users/services.py`, `users/tests.py`; `medicos/models.py`, `serializers.py`, `services.py`, `views.py`, `urls.py`, `registro.py`, `test_registro.py`, `test_reintento_validacion.py`.

Migraciones nuevas: `users/0014_procesoregistrousuario_ciudad_profesional_and_more.py` y `medicos/0014_medico_correo_verificado_en_and_more.py`. Son aditivas y se aplicaron a la base configurada. `check` y `makemigrations --check --dry-run` terminaron correctamente.

Frontend: `components/forms/registerForm/RegisterForm.js`, `RegisterForm.module.css`, `UseRegister.js`; `src/app/services/authService.js`, `src/app/validations/registerValidate.js`; `src/app/(auth)/register/page.js`; `src/app/(auth)/rol/page.js` y `page.module.css`. Contexto de diseño: `DESIGN.md`.

## Verificación

- Pruebas específicas: **45 ejecutadas, 44 pasan y 1 omitida** por falta de bloqueo de filas en SQLite. Cubren registro médico/paciente y reintento de validación profesional.
- Next.js: build final correcto, 36 rutas generadas.
- Navegador: ambos registros completos con respuestas controladas, errores y reintentos de OCR/OTP/finalización, reenvío, claro/oscuro/sistema, escritorio/móvil y movimiento reducido. Se midió contraste AA del texto en selección de rol y datos adicionales/profesionales. Sin errores de ejecución o hidratación detectados. Se inspeccionaron capturas y se confirmó la corrección del adjunto PDF.
- OCR, proveedor de correo y almacenamiento externo se simulan en las pruebas automatizadas; la implementación llama a los servicios reales existentes.
- La ejecución general de 492 pruebas detectó seis errores anteriores en `obtenerEstadisticasMedicosService(anio=None)` y dos de concurrencia de historial clínico sobre SQLite. No se modificaron esas funciones. Dos fallos de muestras PDF ficticias se resolvieron actualizando las muestras; las pruebas de reintento pasan en la ejecución específica final.

Para repetir las pruebas backend:

```powershell
.venv/Scripts/python.exe backend/manage.py test medicos.test_registro medicos.test_reintento_validacion users.tests --settings=core.test_settings --noinput
```

Para repetir navegador con el frontend en ejecución y Playwright disponible:

```powershell
node frontend/scripts/verify-registration.cjs
```

El script admite `DOCSMART_BASE_URL`, `DOCSMART_PLAYWRIGHT_PATH` y `DOCSMART_BROWSER_EXECUTABLE`. Intercepta las llamadas API y escribe capturas en `.impeccable/registration`; no opera cuentas reales.
