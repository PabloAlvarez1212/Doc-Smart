from datetime import timedelta
from django.utils import timezone
from chatbot.tools.base_tool import BaseTool
from chatbot.services.cita_service import CitaService
from chatbot.services.medico_service import MedicoService
from chatbot.ai.motivos_cancelacion import normalizar_motivo_cancelacion
from django.db import transaction
from django.db.models import Q
from chatbot.politicas import ALTERNATIVAS_MAX, HORARIOS_POR_MEDICO, MAX_MOTIVO_CONSULTA, RESULTADOS_MAX


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
        estado = parametros.get("estado")
        if estado == "pendiente_confirmacion":
            citas = citas.filter(Q(id_estado__nombre__iexact="pendiente") | Q(id_estado__nombre__iexact="reprogramada"))
        elif estado == "confirmada":
            citas = citas.filter(id_estado__nombre__iexact="confirmada")

        if not citas.exists():

            return {
                "success": True,
                "message": ("No tienes próximas citas pendientes de confirmación." if estado == "pendiente_confirmacion"
                            else "No tienes próximas citas confirmadas." if estado == "confirmada"
                            else "No encontré citas médicas programadas."),
                "data": {
                    "citas": []
                }
            }

        respuesta = []

        for cita in citas:

            respuesta.append({
                "id": cita.id,
                "codigo_cita": cita.codigo_cita,
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

        titulo = ("Estas citas están pendientes de confirmación:" if estado == "pendiente_confirmacion"
                  else "Estas son tus próximas citas confirmadas:" if estado == "confirmada"
                  else "Estas son tus próximas citas:")
        lineas = [titulo]
        for cita in respuesta:
            fecha = timezone.localtime(cita["fecha"]).strftime('%d/%m/%Y a las %H:%M')
            lineas.append(f"- {fecha}, {cita['especialidad']}, {cita['medico']}. "
                          f"Estado: {cita['estado']}. Código: {cita['codigo_cita']}.")
        return {
            "success": True,
            "message": "\n".join(lineas),
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
    def _firma(medico, fecha):
        """Identifica el horario ya validado: cambiar médico u hora lo invalida."""
        return f"{medico.pk}|{fecha.isoformat()}"

    @staticmethod
    def _conservar(parametros, medico=None):
        """Datos que siguen siendo válidos aunque el horario cambie."""
        datos = {clave: parametros[clave] for clave in ("especialidad", "ciudad", "ciudad_omitida")
                 if parametros.get(clave)}
        if medico is not None:
            datos["id_medico"] = medico.pk
        if parametros.get("motivo_consulta"):
            datos["motivo_consulta"] = parametros["motivo_consulta"]
        return datos

    @staticmethod
    def _formato(fecha):
        return timezone.localtime(fecha).strftime("%d/%m/%Y a las %H:%M")

    @staticmethod
    def _pedir_seleccion(candidatos, fecha, motivo_consulta=None):
        disponibles = [
            medico for medico in candidatos
            if CitaService.horario_disponible(medico, fecha)
        ]
        if not disponibles:
            return None

        opciones = []
        dia = timezone.localtime(fecha).date()
        lineas = ["Encontré varios médicos disponibles para ese horario:"]

        for indice, medico in enumerate(disponibles[:RESULTADOS_MAX], start=1):
            ciudad = medico.ciudad.nombre if medico.ciudad else "Ciudad no registrada"
            nombre = f"{medico.nombre} {medico.apellido}".strip()
            horarios = CitaService.horarios_cercanos(CitaService.horarios_del_dia(medico, dia), fecha, HORARIOS_POR_MEDICO)
            lineas.append(
                f"{indice}. Dr(a). {nombre} — "
                f"{medico.id_especialidad.nombre}, {ciudad} — horarios libres: {', '.join(horarios)}"
            )
            opciones.append({
                "id_medico": medico.id,
                "nombre": nombre,
                "especialidad": medico.id_especialidad.nombre,
                "ciudad": ciudad,
                "horarios": horarios,
            })

        lineas.append("Indícame el nombre o el número del médico que prefieres.")
        return {
            "success": True,
            "requires_selection": True,
            "message": "\n".join(lineas),
            "data": {
                "medicos": opciones,
                "fecha": fecha.isoformat(),
                "motivo_consulta": motivo_consulta,
            },
        }

    def _ofrecer_alternativas(self, candidatos, fecha, parametros, medico=None, razon=""):
        """Horario ocupado: alternativas reales y cercanas, sin cambiar la selección."""
        encontradas = []
        for candidato in candidatos[:RESULTADOS_MAX]:
            for inicio in CitaService.alternativas(candidato, fecha, limite=ALTERNATIVAS_MAX):
                encontradas.append((abs((inicio - fecha).total_seconds()), candidato, inicio))
        encontradas = sorted(encontradas, key=lambda item: item[0])[:ALTERNATIVAS_MAX]
        datos = {"conservar": self._conservar(parametros, medico), "medicos": [], "alternativas": [
            {"id_medico": c.pk, "nombre": f"{c.nombre} {c.apellido}".strip(), "fecha": inicio.isoformat()}
            for _, c, inicio in encontradas]}
        if not encontradas:
            texto = (f"{razon}. No encontré horarios libres en los próximos días con esos datos. "
                     "Puedo buscar con otro médico, fecha o ciudad. No se creó ninguna cita.")
        else:
            lineas = [f"{razon}. Horarios reales más cercanos:"]
            for indice, (_, c, inicio) in enumerate(encontradas, start=1):
                lineas.append(f"{indice}. Dr(a). {c.nombre} {c.apellido} — {self._formato(inicio)}")
            lineas.append(
                "Elige uno (por número u hora) o dime otra fecha. "
                + ("Conservé tu selección y tus datos." if medico else "Conservé los filtros de tu búsqueda.")
            )
            texto = "\n".join(lineas)
        return {"success": True, "requires_alternative": True, "message": texto, "data": datos}

    def execute(self, chat, mensaje, parametros):
        parametros = parametros or {}
        nombre = parametros.get("nombre")
        apellido = parametros.get("apellido")
        especialidad = parametros.get("especialidad")
        ciudad = None if parametros.get("ciudad_omitida") else parametros.get("ciudad")
        id_medico = parametros.get("id_medico")
        confirmado = parametros.get("confirmado", False)
        fecha = parametros.get("fecha") or parametros.get("fecha_programada")
        motivo = str(parametros.get("motivo_consulta") or "").strip()

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

        candidatos = []
        medico = None

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

            if not candidatos:
                return {
                    "success": False,
                    "message": "No encontré médicos con esas características.",
                    "data": {"medicos": []},
                }

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

            if not candidatos:
                medico = MedicoService.obtener_medico(nombre=nombre, apellido=apellido, ciudad=ciudad)
                if medico is None:
                    return {"success": False, "message": "No encontré un médico con esas características.", "data": {}}

        if medico is None and candidatos:
            disponibles = [c for c in candidatos if CitaService.horario_disponible(c, fecha_normalizada)]
            if not disponibles:
                return self._ofrecer_alternativas(
                    candidatos, fecha_normalizada, parametros,
                    razon=f"Ningún médico de tu búsqueda tiene disponible el {self._formato(fecha_normalizada)}",
                )
            if len(disponibles) > 1:
                return self._pedir_seleccion(disponibles, fecha_normalizada, parametros.get("motivo_consulta"))
            medico = disponibles[0]

        if medico is None:
            return {
                "success": False,
                "message": "No encontré un médico con esas características.",
                "data": {},
            }

        # El horario se valida SIEMPRE antes de pedir el motivo o de confirmar.
        if not CitaService.horario_disponible(medico, fecha_normalizada):
            return self._ofrecer_alternativas(
                [medico], fecha_normalizada, parametros, medico=medico,
                razon=(f"El Dr. {medico.nombre} {medico.apellido} "
                       + ("dejó de tener disponible" if confirmado else "no tiene disponible")
                       + f" el {self._formato(fecha_normalizada)}"
                       + (" mientras confirmabas" if confirmado else "")),
            )

        if len(motivo) > MAX_MOTIVO_CONSULTA:
            return {
                "success": False,
                "message": f"El motivo de consulta no puede superar {MAX_MOTIVO_CONSULTA} caracteres.",
                "data": {},
            }

        if not confirmado:
            fecha_local = timezone.localtime(fecha_normalizada)
            if not motivo:
                datos = self._conservar(parametros, medico)
                datos.update({"fecha": fecha_normalizada.isoformat(),
                              "horario_verificado": self._firma(medico, fecha_normalizada)})
                return {
                    "success": True,
                    "requires_input": "motivo_consulta",
                    "message": (
                        "Hay disponibilidad el "
                        f"{fecha_local.strftime('%d/%m/%Y a las %H:%M')}. "
                        "¿Cuál es el motivo de tu consulta?"
                    ),
                    "data": datos,
                }
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"Encontré disponibilidad con el Dr. "
                    f"{medico.nombre} {medico.apellido} para el "
                    f"{fecha_local.strftime('%d/%m/%Y a las %H:%M')}."
                    f" Motivo de la consulta: {motivo}."
                    " ¿Confirmas que deseas agendarla?"
                ),
                "data": {
                    "id_medico": medico.id,
                    "fecha": fecha_normalizada.isoformat(),
                    "motivo_consulta": parametros.get("motivo_consulta"),
                },
            }

        if not self.consumir_confirmacion(chat, {
            'tool_name': self.name,
            'parametros': {
                'id_medico': medico.pk,
                'fecha': fecha_normalizada.isoformat(),
                'motivo_consulta': parametros.get('motivo_consulta'),
            },
        }):
            return {'success': False, 'message': 'Solicita nuevamente la operación y confirma explícitamente.', 'data': {}}

        resultado, status = CitaService.agendar(
            usuario=chat.id_usuario,
            medico=medico,
            fecha=fecha_normalizada,
            motivo_consulta=parametros.get("motivo_consulta"),
        )

        if status != 201:
            # La validación oficial vuelve a comprobar el horario al crear.
            if status == 400 and "horario" in str(resultado).lower():
                return self._ofrecer_alternativas(
                    [medico], fecha_normalizada, parametros, medico=medico,
                    razon="El horario dejó de estar disponible mientras confirmabas",
                )
            return {
                "success": False,
                "message": str(resultado),
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

        codigo_cita = parametros.get("codigo_cita")
        id_cita = parametros.get("id_cita")
        fecha = CitaService.normalizar_fecha(parametros.get("fecha"))

        if (not codigo_cita and not id_cita) or fecha is None:
            return {
                "success": False,
                "message": "Necesito el codigo de la cita y la nueva fecha y hora.",
                "data": {},
            }

        if fecha <= timezone.now():
            return {
                "success": False,
                "message": "La nueva fecha debe estar en el futuro.",
                "data": {},
            }

        if codigo_cita:
            cita = CitaService.obtener_cita_usuario_codigo(
                codigo_cita,
                chat.id_usuario,
            )
        else:
            # Compatibilidad con operaciones internas anteriores.
            cita = CitaService.obtener_cita_usuario(
                id_cita,
                chat.id_usuario,
            )

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

        if not CitaService.horario_disponible(
            cita.id_medico,
            fecha,
            excluir_cita_id=cita.id,
        ):
            return {
                "success": False,
                "message": "Ese horario no está disponible en la agenda del médico. No se reprogramó la cita.",
                "data": {},
            }

        if not parametros.get("confirmado", False):
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"¿Confirmas reprogramar la cita {cita.codigo_cita} para el "
                    f"{timezone.localtime(fecha).strftime('%d/%m/%Y a las %H:%M')}?"
                ),
                "data": {
                    "codigo_cita": cita.codigo_cita,
                    "fecha": fecha.isoformat(),
                },
            }

        if not self.consumir_confirmacion(chat, {
            'tool_name': self.name,
            'parametros': {'codigo_cita': cita.codigo_cita, 'fecha': fecha.isoformat()},
        }):
            return {'success': False, 'message': 'Solicita nuevamente la operación y confirma explícitamente.', 'data': {}}

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
                else f"No se reprogramó la cita. {resultado}"
            ),
            "data": resultado if status == 200 else {},
        }


class CancelarCitaTool(BaseTool):

    name = "cancelar_cita"
    description = "Cancela una cita médica del paciente autenticado."
    category = "citas"
    requires_confirmation = True

    def execute(self, chat, mensaje, parametros):

        codigo_cita = parametros.get("codigo_cita")
        id_cita = parametros.get("id_cita")

        if not codigo_cita and not id_cita:
            return {
                "success": False,
                "message": "Necesito el código de la cita que deseas cancelar.",
                "data": {},
            }

        if codigo_cita:
            cita = CitaService.obtener_cita_usuario_codigo(
                codigo_cita,
                chat.id_usuario,
            )
        else:
            # Compatibilidad con operaciones internas anteriores.
            cita = CitaService.obtener_cita_usuario(
                id_cita,
                chat.id_usuario,
            )

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

        motivo = normalizar_motivo_cancelacion(
            parametros.get("motivo_cancelacion")
        )
        if motivo is None:
            return {
                "success": False,
                "message": (
                    "Necesito un motivo de cancelación válido "
                    "de máximo 500 caracteres."
                ),
                "data": {},
            }

        if not parametros.get("confirmado", False):
            fecha = timezone.localtime(
                cita.fecha_programada
            ).strftime("%d/%m/%Y a las %H:%M")

            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"¿Confirmas que deseas cancelar la cita "
                    f"{cita.codigo_cita} del {fecha}?\n\n"
                    f"Motivo: {motivo}\n\n"
                    "Responde «Sí» para confirmar "
                    "o «No» para mantener la cita."
                ),
                "data": {
                    "codigo_cita": cita.codigo_cita,
                    "motivo_cancelacion": motivo,
                },
            }

        with transaction.atomic():
            autorizada = self.consumir_confirmacion(chat, {
                'codigo_cita': cita.codigo_cita,
                'motivo_cancelacion': motivo,
            }, clave='_cancelacion_autorizada')
            if not autorizada:
                return {
                    "success": False,
                    "message": (
                        "Esta cancelación no tiene una confirmación "
                        "válida. Solicita nuevamente la operación."
                    ),
                    "data": {},
                }
            # Solo se llega aquí si hubo una confirmación válida.
            try:
                with transaction.atomic():
                    resultado, status = CitaService.cancelar(chat.id_usuario, cita, motivo)
                    if status == 200:
                        cita.refresh_from_db()
                        if (cita.id_estado.nombre.strip().lower() != 'cancelada'
                                or cita.motivo_cancelacion != motivo
                                or cita.cancelada_por != 'paciente'
                                or cita.fecha_cancelacion is None):
                            resultado, status = 'No se pudo verificar la cancelación guardada. Solicita nuevamente la operación.', 409
                        else:
                            resultado = f'La cita {cita.codigo_cita} fue cancelada correctamente.'
                    if status != 200:
                        transaction.set_rollback(True)
            except Exception as error:
                import logging
                logging.getLogger(__name__).error('Error cancelando cita desde ByMax tipo=%s', type(error).__name__)
                resultado, status = 'No fue posible cancelar la cita. Solicita nuevamente la operación.', 500

        return {
            "success": status == 200,
            "message": str(resultado) if status == 200 else f"No se canceló la cita. {resultado}",
            "data": {"codigo_cita": cita.codigo_cita} if status == 200 else {},
        }
