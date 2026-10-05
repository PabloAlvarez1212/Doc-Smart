from datetime import timedelta

from django.utils import timezone

from chatbot.tools.base_tool import BaseTool

from chatbot.services.cita_service import CitaService
from chatbot.services.medico_service import MedicoService


class ConsultarDisponibilidadTool(BaseTool):

    name = "consultar_disponibilidad"

    description = "Consulta las próximas citas médicas."

    category = "citas"

    def execute(
        self,
        chat,
        mensaje,
        parametros,
    ):

        citas = CitaService.obtener_proximas(
            chat.id_usuario
        )

        if not citas.exists():

            return {
                "success": True,
                "message": "No encontré citas médicas programadas.",
                "data": {
                    "citas": []
                }
            }

        respuesta = []

        for cita in citas:

            respuesta.append({

                "id": cita.id,

                "fecha": cita.fecha_programada,

                "medico": (
                    f"{cita.id_medico.nombre} "
                    f"{cita.id_medico.apellido}"
                ),

                "especialidad": (
                    cita.id_medico.id_especialidad.nombre
                ),

                "estado": cita.id_estado.nombre,

            })

        return {

            "success": True,

            "message": "Próximas citas encontradas.",

            "data": {

                "citas": respuesta

            }

        }


class AgendarCitaTool(BaseTool):
    name = "agendar_cita"
    description = "Agenda una nueva cita médica."
    category = "citas"
    requires_confirmation = True

    @staticmethod
    def _pedir_seleccion(candidatos, fecha):
        disponibles = [
            medico for medico in candidatos
            if CitaService.horario_disponible(medico, fecha)
        ]
        if not disponibles:
            return None

        opciones = []
        lineas = ["Encontré varios médicos disponibles para ese horario:"]

        for indice, medico in enumerate(disponibles[:10], start=1):
            ciudad = medico.ciudad.nombre if medico.ciudad else "Ciudad no registrada"
            nombre = f"{medico.nombre} {medico.apellido}".strip()
            lineas.append(
                f"{indice}. Dr(a). {nombre} — "
                f"{medico.id_especialidad.nombre}, {ciudad}"
            )
            opciones.append({
                "id_medico": medico.id,
                "nombre": nombre,
                "especialidad": medico.id_especialidad.nombre,
                "ciudad": ciudad,
            })

        lineas.append("Indícame el nombre o el número del médico que prefieres.")
        return {
            "success": True,
            "requires_selection": True,
            "message": "\n".join(lineas),
            "data": {"medicos": opciones, "fecha": fecha.isoformat()},
        }

    def execute(self, chat, mensaje, parametros):
        parametros = parametros or {}
        nombre = parametros.get("nombre")
        apellido = parametros.get("apellido")
        especialidad = parametros.get("especialidad")
        ciudad = parametros.get("ciudad")
        id_medico = parametros.get("id_medico")
        confirmado = parametros.get("confirmado", False)
        fecha = parametros.get("fecha") or parametros.get("fecha_programada")

        if not fecha:
            return {
                "success": False,
                "message": "Necesito la fecha y hora para programar la cita.",
                "data": {},
            }

        fecha_normalizada = CitaService.normalizar_fecha(fecha)
        if fecha_normalizada is None:
            return {
                "success": False,
                "message": (
                    "No reconocí la fecha. Escríbela, por ejemplo, "
                    "como 2026-10-06 14:00."
                ),
                "data": {},
            }

        if fecha_normalizada < timezone.now() + timedelta(hours=1):
            return {
                "success": False,
                "message": "La cita debe programarse con al menos una hora de anticipación.",
                "data": {},
            }

        if id_medico:
            medico = MedicoService.obtener_por_id(id_medico)

        elif not nombre and not apellido:
            candidatos = list(
                MedicoService.buscar_medicos(
                    especialidad=especialidad,
                    ciudad=ciudad,
                )[:20]
            )

            if not candidatos and especialidad:
                candidatos = list(
                    MedicoService.buscar_por_especialidad_aproximada(
                        especialidad=especialidad,
                        ciudad=ciudad,
                        limite=20,
                    )
                )

            disponibles = [
                candidato for candidato in candidatos
                if CitaService.horario_disponible(
                    candidato, fecha_normalizada
                )
            ]

            if not disponibles:
                return {
                    "success": False,
                    "message": (
                        "No encontré médicos disponibles con esas "
                        "características para ese horario."
                    ),
                    "data": {"medicos": []},
                }

            if len(disponibles) > 1:
                return self._pedir_seleccion(disponibles, fecha_normalizada)

            medico = disponibles[0]

        else:
            candidatos = list(
                MedicoService.buscar_medicos(
                    nombre=nombre,
                    apellido=apellido,
                    especialidad=especialidad,
                    ciudad=ciudad,
                )[:11]
            )

            # Una especialidad inferida incorrectamente no debe impedir
            # encontrar al médico indicado por nombre.
            if not candidatos and especialidad:
                candidatos = list(
                    MedicoService.buscar_medicos(
                        nombre=nombre,
                        apellido=apellido,
                        ciudad=ciudad,
                    )[:11]
                )

            if len(candidatos) > 1:
                seleccion = self._pedir_seleccion(
                    candidatos, fecha_normalizada
                )
                if seleccion:
                    return seleccion
                return {
                    "success": False,
                    "message": (
                        "Los médicos encontrados no tienen disponibilidad "
                        "en ese horario."
                    ),
                    "data": {"medicos": []},
                }

            medico = (
                candidatos[0]
                if candidatos
                else MedicoService.obtener_medico(
                    nombre=nombre,
                    apellido=apellido,
                    ciudad=ciudad,
                )
            )

        if medico is None:
            return {
                "success": False,
                "message": "No encontré un médico con esas características.",
                "data": {},
            }

        if not CitaService.horario_disponible(
            medico, fecha_normalizada
        ):
            return {
                "success": False,
                "message": (
                    f"El horario solicitado con el Dr. "
                    f"{medico.nombre} {medico.apellido} "
                    "no está disponible en su agenda. No se creó la cita."
                ),
                "data": {},
            }

        if not confirmado:
            fecha_local = timezone.localtime(fecha_normalizada)
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"Encontré disponibilidad con el Dr. "
                    f"{medico.nombre} {medico.apellido} para el "
                    f"{fecha_local.strftime('%d/%m/%Y a las %H:%M')}. "
                    "¿Confirmas que deseas agendarla?"
                ),
                "data": {
                    "id_medico": medico.id,
                    "fecha": fecha_normalizada.isoformat(),
                },
            }

        resultado, status = CitaService.agendar(
            usuario=chat.id_usuario,
            medico=medico,
            fecha=fecha_normalizada,
        )

        if status != 201:
            # La validación oficial vuelve a comprobar el horario al crear.
            if status == 400 and "horario" in str(resultado).lower():
                mensaje_error = (
                    "El horario dejó de estar disponible. "
                    "No se creó la cita. Indícame otro horario."
                )
            else:
                mensaje_error = str(resultado)

            return {
                "success": False,
                "message": mensaje_error,
                "data": {},
            }

        return {
            "success": True,
            "message": (
                f"Tu cita con el Dr. {medico.nombre} "
                f"{medico.apellido} fue solicitada correctamente. "
                "Queda pendiente de confirmación por el médico."
            ),
            "data": resultado,
        }


class ReprogramarCitaTool(BaseTool):

    name = "reprogramar_cita"
    description = "Reprograma una cita médica del paciente autenticado."
    category = "citas"
    requires_confirmation = True

    def execute(self, chat, mensaje, parametros):

        id_cita = parametros.get("id_cita")
        fecha = CitaService.normalizar_fecha(parametros.get("fecha"))

        if not id_cita or fecha is None:
            return {
                "success": False,
                "message": "Necesito el número de la cita y la nueva fecha y hora.",
                "data": {},
            }

        if fecha <= timezone.now():
            return {
                "success": False,
                "message": "La nueva fecha debe estar en el futuro.",
                "data": {},
            }

        cita = CitaService.obtener_cita_usuario(id_cita, chat.id_usuario)

        if cita is None:
            return {
                "success": False,
                "message": "No encontré esa cita entre tus citas.",
                "data": {},
            }

        if cita.id_estado.nombre.lower() in {"cancelada", "completada"}:
            return {
                "success": False,
                "message": "No se puede reprogramar una cita cancelada o completada.",
                "data": {},
            }

        if CitaService.medico_tiene_cita(
            cita.id_medico_id,
            fecha,
            excluir_cita_id=cita.id,
        ):
            return {
                "success": False,
                "message": "El médico ya tiene una cita en esa fecha y hora.",
                "data": {},
            }

        if not parametros.get("confirmado", False):
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"¿Confirmas reprogramar la cita {cita.id} para el "
                    f"{fecha.strftime('%d/%m/%Y a las %H:%M')}?"
                ),
                "data": {
                    "id_cita": cita.id,
                    "fecha": fecha.isoformat(),
                },
            }

        resultado, status = CitaService.reprogramar(
            chat.id_usuario,
            cita,
            fecha,
        )

        return {
            "success": status == 200,
            "message": (
                "La cita fue reprogramada correctamente."
                if status == 200
                else str(resultado)
            ),
            "data": resultado if status == 200 else {},
        }


class CancelarCitaTool(BaseTool):

    name = "cancelar_cita"
    description = "Cancela una cita médica del paciente autenticado."
    category = "citas"
    requires_confirmation = True

    def execute(self, chat, mensaje, parametros):

        id_cita = parametros.get("id_cita")

        if not id_cita:
            return {
                "success": False,
                "message": "Necesito el número de la cita que deseas cancelar.",
                "data": {},
            }

        cita = CitaService.obtener_cita_usuario(id_cita, chat.id_usuario)

        if cita is None:
            return {
                "success": False,
                "message": "No encontré esa cita entre tus citas.",
                "data": {},
            }

        estado = cita.id_estado.nombre.lower()

        if estado == "cancelada":
            return {
                "success": False,
                "message": "La cita ya está cancelada.",
                "data": {},
            }

        if estado == "completada":
            return {
                "success": False,
                "message": "No se puede cancelar una cita completada.",
                "data": {},
            }

        if not parametros.get("confirmado", False):
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"¿Confirmas que deseas cancelar la cita {cita.id} del "
                    f"{cita.fecha_programada.strftime('%d/%m/%Y a las %H:%M')}?"
                ),
                "data": {"id_cita": cita.id},
            }

        resultado, status = CitaService.cancelar(chat.id_usuario, cita)

        return {
            "success": status == 200,
            "message": str(resultado),
            "data": {"id_cita": cita.id} if status == 200 else {},
        }
