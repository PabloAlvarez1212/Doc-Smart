"use client";

import { useState } from "react";
import { CalendarClock, CalendarDays, CircleCheck, CircleX, ClipboardCheck, Clock3, Eye, FileHeart, FileUp } from "lucide-react";
import useAppointments from "../../../../components/doctor/MyAppointments/useAppointments";
import { InfoMedicaCard } from "../../../../components/doctor/MyAppointments/AppointmentList/DoctorAppointmentList";
import { getDoctorAppointmentActionKeys } from "../../../../components/doctor/MyAppointments/appointmentActions";
import ReprogramAppointmentModal from "../../../../components/ui/ReprogramAppointmentModal/ReprogramAppointmentModal";
import CompleteAppointmentModal from "../../../../components/ui/CompleteAppointmentModal/CompleteAppointmentModal";
import AppointmentDetailsModal from "../../../../components/ui/AppointmentDetailsModal/AppointmentDetailsModal";
import AppointmentDeepLink from "../../../../components/ui/AppointmentCard/DeepLinkedAppointment";
import Modal from "../../../../components/ui/Modal/Modal";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import MisCitasVista from "../../../../components/ui/MisCitas/MisCitasVista";
import CitaCard from "../../../../components/ui/MisCitas/CitaCard";
import { avisar } from "../../../../components/ui/MisCitas/Avisos";
import { lanzarEfecto, olvidarSalida, registrarSalida } from "../../../../components/ui/MisCitas/citaEfectos";
import { ESTADOS, ESTADOS_SECCION, estadoDe, fechaLarga } from "../../../../components/ui/MisCitas/citaFormato";
import useMapaCitas from "../../../../components/ui/MisCitas/useMapaCitas";
import useAhora from "../../../../components/ui/MisCitas/useAhora";
import useTrasModal from "../../../../components/ui/MisCitas/useTrasModal";
import { listarCitasMedicoService } from "@/app/services/appointmentsServices";
import estilos from "../../../../components/ui/MisCitas/MisCitas.module.css";

const cargarMapa = (seccion) => listarCitasMedicoService({ seccion, page_size: 50 });

// Marca como nuevas las citas que aparecen después de un aviso en tiempo real.
function useCitasNuevas(citas, evento) {
    const [registro, setRegistro] = useState({ citas, evento, esperando: false, nuevas: new Set() });
    if (registro.evento !== evento) {
        setRegistro({ ...registro, evento, esperando: true });
    } else if (registro.citas !== citas) {
        const antes = new Set(registro.citas.map((cita) => cita.id));
        const nuevas = registro.esperando && antes.size ? new Set(citas.filter((cita) => !antes.has(cita.id)).map((cita) => cita.id)) : new Set();
        setRegistro({ citas, evento, esperando: false, nuevas });
    }
    return registro.nuevas;
}

export default function MyAppointments() {
    const ahora = useAhora();
    const { eventoCita } = useNotificationsContext();
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [modalReprogramar, setModalReprogramar] = useState(false);
    const [modalCompletar, setModalCompletar] = useState(false);
    const [detalle, setDetalle] = useState({ cita: null, abierto: false });
    const [citaInfo, setCitaInfo] = useState(null);
    const {
        citas,
        conteos,
        estado,
        seccion,
        cambiarSeccion,
        paciente,
        fecha,
        cambiarEstado,
        cambiarPaciente,
        cambiarFecha,
        limpiarFiltros,
        loading,
        error,
        paginaActual,
        totalPaginas,
        totalRegistros,
        cambiarPagina,
        cancelarCita,
        confirmarCita,
        completarCita,
        marcarInasistencia,
        reprogramarCita,
        recargarCitas,
    } = useAppointments();
    const { citas: visibles, pausar, reanudar, alCerrar } = useTrasModal(citas);
    const mapa = useMapaCitas(cargarMapa, seccion, visibles);
    const nuevas = useCitasNuevas(visibles, eventoCita);

    // Los conteos llegan con la lista y respetan fecha y búsqueda, así coinciden con lo que se ve.
    const contar = (valor) => conteos[valor] ?? 0;
    const totalSeccion = (valor) => ESTADOS_SECCION[valor].reduce((suma, item) => suma + contar(item), 0);
    const secciones = [
        { valor: "agenda", etiqueta: "Agenda", icono: CalendarDays, conteo: totalSeccion("agenda") },
        { valor: "historial", etiqueta: "Historial", icono: Clock3, conteo: totalSeccion("historial") },
    ];
    const estados = [
        { valor: "todas", etiqueta: "Todas", conteo: totalSeccion(seccion), tono: "todas" },
        ...ESTADOS_SECCION[seccion].map((valor) => ({ valor, etiqueta: ESTADOS[valor].plural, conteo: contar(valor), tono: ESTADOS[valor].tono })),
    ];
    const filtrosActivos = [
        estado !== "todas" && { clave: "estado", etiqueta: ESTADOS[estado]?.plural || estado, quitar: () => cambiarEstado("todas") },
        fecha && { clave: "fecha", etiqueta: fechaLarga(fecha), quitar: () => cambiarFecha("") },
        paciente.trim() && { clave: "paciente", etiqueta: `“${paciente.trim()}”`, quitar: () => cambiarPaciente("") },
    ].filter(Boolean);

    // La próxima cita por venir se destaca al inicio de la agenda.
    const destacada = seccion === "agenda" && paginaActual === 1
        ? visibles.find((cita) => ESTADOS_SECCION.agenda.includes(estadoDe(cita)) && Date.parse(cita.fecha_programada) > ahora)
        : null;
    const ordenadas = destacada ? [destacada, ...visibles.filter((cita) => cita !== destacada)] : visibles;

    const abrirReprogramacion = (cita) => {
        pausar();
        setCitaSeleccionada(cita);
        setModalReprogramar(true);
    };
    const abrirCierre = (cita) => {
        pausar();
        setCitaSeleccionada(cita);
        setModalCompletar(true);
    };
    const alSalirModal = () => {
        setCitaSeleccionada(null);
        reanudar();
    };
    const abrirDetalles = (cita) => setDetalle({ cita, abierto: true });

    const confirmar = async (cita) => {
        try {
            await confirmarCita(cita.id);
        } catch (requestError) {
            avisar("No pudimos confirmar la cita. Inténtalo de nuevo.", "error");
            throw requestError;
        }
        avisar(`Cita confirmada. ${cita.paciente} recibirá el aviso.`);
    };

    const cancelar = async (cita, motivo) => {
        try {
            await cancelarCita(cita.id, motivo);
        } catch (requestError) {
            avisar("No pudimos cancelar la cita. Inténtalo de nuevo.", "error");
            throw requestError;
        }
        avisar(`Cita cancelada. Le avisamos a ${cita.paciente}.`);
    };

    const reprogramar = async (idCita, fechaProgramada) => {
        await reprogramarCita(idCita, fechaProgramada);
        alCerrar(() => avisar("Nueva fecha guardada. Le avisamos al paciente."));
    };

    const completar = async (idCita, datosClinicos) => {
        if (datosClinicos !== null) registrarSalida(idCita, "archivar");
        try {
            await completarCita(idCita, datosClinicos);
        } catch (requestError) {
            olvidarSalida(idCita);
            throw requestError;
        }
        alCerrar(() => {
            if (datosClinicos === null) {
                lanzarEfecto(idCita, "documentos");
                avisar("Documentos guardados en la cita.");
            } else {
                avisar("Consulta cerrada. Quedó en tu historial.");
            }
        });
    };

    const inasistencia = async (idCita) => {
        registrarSalida(idCita, "ausente");
        try {
            await marcarInasistencia(idCita);
        } catch (requestError) {
            olvidarSalida(idCita);
            throw requestError;
        }
        alCerrar(() => avisar("Inasistencia registrada."));
    };

    const renderCita = (cita, indice) => {
        const estadoCita = estadoDe(cita);
        const claves = getDoctorAppointmentActionKeys(estadoCita, cita, ahora);
        const esDestacada = cita === destacada;
        const principal = claves.includes("confirmar")
            ? { id: "confirmar", etiqueta: "Confirmar", icono: CircleCheck, onClick: () => confirmar(cita) }
            : claves.includes("completar")
                ? { id: "completar", etiqueta: "Cerrar cita", icono: ClipboardCheck, onClick: () => abrirCierre(cita) }
                : claves.includes("documentos")
                    ? { id: "documentos", etiqueta: "Agregar documentos", icono: FileUp, onClick: () => abrirCierre(cita) }
                    : { id: "detalles", etiqueta: "Ver detalles", icono: Eye, tono: "suave", onClick: () => abrirDetalles(cita) };
        const iconos = [
            claves.includes("reprogramar") && { id: "reprogramar", etiqueta: "Reprogramar", icono: CalendarClock, onClick: () => abrirReprogramacion(cita) },
            claves.includes("cancelar") && { id: "cancelar", etiqueta: "Cancelar cita", icono: CircleX },
            principal.id !== "detalles" && { id: "detalles", etiqueta: "Ver detalles", icono: Eye, onClick: () => abrirDetalles(cita) },
        ].filter(Boolean);
        const lugar = [cita.ciudad, cita.departamento].filter(Boolean).join(", ");

        return (
            <CitaCard
                key={cita.id}
                cita={cita}
                rol="doctor"
                indice={indice}
                ahora={ahora}
                destacada={esDestacada}
                nueva={nuevas.has(cita.id)}
                nombre={cita.paciente || "Paciente de DocSmart"}
                detalle={cita.codigo_cita ? `Código ${cita.codigo_cita}` : cita.especialidad}
                foto={cita.foto_paciente}
                ubicacion={<><b>{lugar || "Consultorio"}</b><small>{cita.direccion || "Dirección no disponible"}</small></>}
                enlaces={estadoCita === "confirmada" && (
                    <button type="button" className={estilos.enlace} onClick={() => setCitaInfo(cita.id)}>
                        <FileHeart size={16} aria-hidden="true" />
                        Información médica
                    </button>
                )}
                datos={esDestacada ? [
                    { etiqueta: "Especialidad", valor: cita.especialidad || "Sin especialidad" },
                    cita.codigo_cita && { etiqueta: "Código", valor: cita.codigo_cita },
                    cita.motivo_consulta && { etiqueta: "Motivo", valor: cita.motivo_consulta },
                ].filter(Boolean) : []}
                principal={principal}
                iconos={iconos}
                onCancelar={claves.includes("cancelar") ? (motivo) => cancelar(cita, motivo) : undefined}
            />
        );
    };

    const citaInfoVisible = visibles.find((cita) => cita.id === citaInfo && estadoDe(cita) === "confirmada");
    const filtrada = filtrosActivos.length > 0;

    return (
        <MisCitasVista
            rol="doctor"
            descripcion="Confirma solicitudes, cierra consultas y mantén tu agenda al día."
            secciones={secciones}
            seccion={seccion}
            onSeccion={cambiarSeccion}
            panel={{
                dias: mapa.dias,
                fecha,
                onFecha: cambiarFecha,
                estados,
                estado,
                onEstado: cambiarEstado,
                busqueda: paciente,
                onBusqueda: cambiarPaciente,
                placeholder: "Paciente, cédula o correo",
            }}
            filtrosActivos={filtrosActivos}
            onLimpiar={() => {
                limpiarFiltros();
                cambiarEstado("todas");
            }}
            total={totalRegistros}
            cargando={loading}
            error={error}
            textoError={seccion === "agenda" ? "No pudimos cargar tu agenda" : "No pudimos cargar tu historial"}
            onReintentar={recargarCitas}
            citas={ordenadas}
            renderCita={renderCita}
            vacio={filtrada
                ? { titulo: "No hay citas con estos filtros", texto: "Prueba otro estado, paciente o fecha para ampliar los resultados." }
                : seccion === "historial"
                    ? { titulo: "Todavía no tienes citas en el historial", texto: "Aquí aparecerán tus consultas completadas, canceladas, vencidas y las inasistencias registradas." }
                    : { titulo: "No tienes citas programadas", texto: "Las nuevas solicitudes y consultas confirmadas aparecerán en esta agenda." }}
            paginacion={(
                <Pagination
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    totalRegistros={totalRegistros}
                    onCambiarPagina={cambiarPagina}
                    cargando={loading}
                    variant="appointments"
                />
            )}
        >
            <AppointmentDeepLink counterpart="paciente" />

            <ReprogramAppointmentModal
                abierto={modalReprogramar}
                onCerrar={() => setModalReprogramar(false)}
                onExitComplete={alSalirModal}
                cita={citaSeleccionada}
                reprogramarCita={reprogramar}
                counterpart="paciente"
            />

            <CompleteAppointmentModal
                abierto={modalCompletar}
                onCerrar={() => setModalCompletar(false)}
                onExitComplete={alSalirModal}
                cita={citaSeleccionada}
                completarCita={completar}
                marcarInasistencia={inasistencia}
            />

            <AppointmentDetailsModal
                abierto={detalle.abierto}
                onCerrar={() => setDetalle((actual) => ({ ...actual, abierto: false }))}
                onExitComplete={() => setDetalle({ cita: null, abierto: false })}
                cita={detalle.cita}
                counterpart="paciente"
                mostrarHistorialClinico={seccion === "historial"}
            />

            <Modal
                abierto={Boolean(citaInfoVisible)}
                onCerrar={() => setCitaInfo(null)}
                titulo="Información médica del paciente"
                text={citaInfoVisible?.paciente || ""}
                width="800px"
            >
                {citaInfoVisible && (
                    <InfoMedicaCard
                        key={citaInfoVisible.id}
                        citaId={citaInfoVisible.id}
                        panelId={`info-medica-${citaInfoVisible.id}`}
                    />
                )}
            </Modal>
        </MisCitasVista>
    );
}
