"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CalendarClock, CalendarDays, CircleX, Clock3, Eye, MapPinned, Star, Stethoscope, UserRoundSearch } from "lucide-react";
import useAppointments from "../../../../components/patient/MyAppointments/useAppointments";
import { buildDoctorProfileLink, getPatientAppointmentActionKeys } from "../../../../components/ui/AppointmentCard/appointmentViewState";
import { getCalificacionPresentation } from "../../../../components/patient/Calificaciones/calificacionPresentation";
import ReprogramAppointmentModal from "../../../../components/ui/ReprogramAppointmentModal/ReprogramAppointmentModal";
import CalificarMedicoModal from "../../../../components/patient/Calificaciones/CalificarMedicoModal/CalificarMedicoModal";
import DoctorProfileModal from "../../../../components/patient/FindDoctors/Profile/DoctorProfileModal";
import AppointmentDetailsModal from "../../../../components/ui/AppointmentDetailsModal/AppointmentDetailsModal";
import AppointmentDeepLink from "../../../../components/ui/AppointmentCard/DeepLinkedAppointment";
import ConsultorioLink from "../../../../components/ui/ConsultorioLink/ConsultorioLink";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import MisCitasVista from "../../../../components/ui/MisCitas/MisCitasVista";
import CitaCard from "../../../../components/ui/MisCitas/CitaCard";
import { avisar } from "../../../../components/ui/MisCitas/Avisos";
import { ESTADOS, ESTADOS_SECCION, estadoDe, fechaLarga } from "../../../../components/ui/MisCitas/citaFormato";
import useMapaCitas from "../../../../components/ui/MisCitas/useMapaCitas";
import useAhora from "../../../../components/ui/MisCitas/useAhora";
import useTrasModal from "../../../../components/ui/MisCitas/useTrasModal";
import { listarCitasPacienteService } from "@/app/services/appointmentsServices";
import estilos from "../../../../components/ui/MisCitas/MisCitas.module.css";

// Un solo lote con todas las citas del paciente alcanza para los puntos del calendario.
const cargarMapa = () => listarCitasPacienteService({ page_size: 200 });

export default function MyAppointments() {
    const ahora = useAhora();
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [modalReprogramar, setModalReprogramar] = useState(false);
    const [citaCalificacion, setCitaCalificacion] = useState(null);
    const [modalCalificacion, setModalCalificacion] = useState(false);
    const [perfilMedico, setPerfilMedico] = useState(null);
    const [detalle, setDetalle] = useState({ cita: null, abierto: false });
    const {
        citas,
        conteos,
        seccion,
        cambiarSeccion,
        especialidades,
        departamentos,
        ciudades,
        cancelarCita,
        reprogramarCita,
        cambiarFiltro,
        filtros,
        estado,
        cambiarEstado,
        loading,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
        error,
        recargarCitas,
    } = useAppointments();
    const { citas: visibles, pausar, reanudar, alCerrar } = useTrasModal(citas);
    const mapa = useMapaCitas(cargarMapa, seccion, visibles);

    // Los conteos llegan con la lista y respetan fecha y filtros, así coinciden con lo que se ve.
    const contar = (valor) => conteos[valor] ?? 0;
    const totalSeccion = (valor) => ESTADOS_SECCION[valor].reduce((suma, item) => suma + contar(item), 0);
    const secciones = [
        { valor: "agenda", etiqueta: "Próximas", icono: CalendarDays, conteo: totalSeccion("agenda") },
        { valor: "historial", etiqueta: "Historial", icono: Clock3, conteo: totalSeccion("historial") },
    ];
    const estados = [
        { valor: "todas", etiqueta: "Todas", conteo: totalSeccion(seccion), tono: "todas" },
        ...ESTADOS_SECCION[seccion].map((valor) => ({ valor, etiqueta: ESTADOS[valor].plural, conteo: contar(valor), tono: ESTADOS[valor].tono })),
    ];
    const departamento = departamentos.find((item) => String(item.id) === String(filtros.departamento));
    const ciudad = ciudades.find((item) => String(item.id_ciudad) === String(filtros.ciudad));
    const filtrosActivos = [
        estado !== "todas" && { clave: "estado", etiqueta: ESTADOS[estado]?.plural || estado, quitar: () => cambiarEstado("todas") },
        filtros.fecha_programada && { clave: "fecha", etiqueta: fechaLarga(filtros.fecha_programada), quitar: () => cambiarFiltro("fecha_programada", "") },
        filtros.busqueda.trim() && { clave: "busqueda", etiqueta: `“${filtros.busqueda.trim()}”`, quitar: () => cambiarFiltro("busqueda", "") },
        filtros.especialidad && { clave: "especialidad", etiqueta: filtros.especialidad, quitar: () => cambiarFiltro("especialidad", "") },
        departamento && {
            clave: "departamento",
            etiqueta: departamento.nombre,
            quitar: () => {
                cambiarFiltro("departamento", "");
                cambiarFiltro("ciudad", "");
            },
        },
        ciudad && { clave: "ciudad", etiqueta: ciudad.nombre_ciudad, quitar: () => cambiarFiltro("ciudad", "") },
    ].filter(Boolean);

    const destacada = seccion === "agenda" && paginaActual === 1
        ? visibles.find((cita) => ESTADOS_SECCION.agenda.includes(estadoDe(cita)) && Date.parse(cita.fecha_programada) > ahora)
        : null;
    const ordenadas = destacada ? [destacada, ...visibles.filter((cita) => cita !== destacada)] : visibles;

    const abrirReprogramacion = (cita) => {
        pausar();
        setCitaSeleccionada(cita);
        setModalReprogramar(true);
    };
    const abrirCalificacion = (cita) => {
        pausar();
        setCitaCalificacion(cita);
        setModalCalificacion(true);
    };
    const abrirDetalles = (cita) => setDetalle({ cita, abierto: true });

    const confirmarReprogramacion = async (idCita, fechaProgramada) => {
        const response = await reprogramarCita(idCita, fechaProgramada);
        alCerrar(() => avisar("Nueva fecha enviada. Te avisaremos cuando el médico la confirme."));
        return response;
    };

    const cancelar = async (cita, motivo) => {
        try {
            await cancelarCita(cita.id, motivo);
        } catch (requestError) {
            avisar("No pudimos cancelar la cita. Inténtalo de nuevo.", "error");
            throw requestError;
        }
        avisar("Cita cancelada. Le avisamos al médico.");
    };

    const confirmarCalificacion = (mode) => {
        setModalCalificacion(false);
        alCerrar(() => avisar(mode === "create" ? "Gracias por calificar la atención." : "Tu calificación quedó actualizada."));
    };

    const renderCita = (cita, indice) => {
        const estadoCita = estadoDe(cita);
        const gestionable = getPatientAppointmentActionKeys(estadoCita).length > 0;
        const calificacion = getCalificacionPresentation(cita);
        const esDestacada = cita === destacada;
        const perfil = buildDoctorProfileLink(cita, setPerfilMedico);
        const lugar = [cita.ciudad, cita.departamento].filter(Boolean).join(", ");
        const principal = gestionable
            ? { id: "reprogramar", etiqueta: "Reprogramar", icono: CalendarClock, onClick: () => abrirReprogramacion(cita) }
            : calificacion
                ? { id: "calificar", etiqueta: calificacion.label, icono: Star, tono: calificacion.mode === "create" ? "estrella" : "suave", onClick: () => abrirCalificacion(cita) }
                : { id: "detalles", etiqueta: "Ver detalles", icono: Eye, tono: "suave", onClick: () => abrirDetalles(cita) };
        const iconos = [
            gestionable && { id: "cancelar", etiqueta: "Cancelar cita", icono: CircleX },
            principal.id !== "detalles" && { id: "detalles", etiqueta: "Ver detalles", icono: Eye, onClick: () => abrirDetalles(cita) },
        ].filter(Boolean);

        return (
            <CitaCard
                key={cita.id}
                cita={cita}
                rol="patient"
                indice={indice}
                ahora={ahora}
                destacada={esDestacada}
                nombre={cita.medico || "Profesional de DocSmart"}
                detalle={cita.especialidad || "Especialidad no disponible"}
                foto={cita.foto_medico}
                ubicacion={cita.direccion ? (
                    <ConsultorioLink
                        direccion={cita.direccion}
                        latitud={cita.latitud}
                        longitud={cita.longitud}
                        ciudad={lugar}
                        compact
                    />
                ) : <><b>{lugar || "Consultorio"}</b><small>Dirección no disponible</small></>}
                enlaces={perfil && (
                    <button type="button" className={estilos.enlace} onClick={perfil.onClick}>
                        <UserRoundSearch size={16} aria-hidden="true" />
                        Ver perfil y valoraciones
                    </button>
                )}
                datos={esDestacada ? [
                    { etiqueta: "Especialidad", valor: cita.especialidad || "Sin especialidad" },
                    cita.codigo_cita && { etiqueta: "Código", valor: cita.codigo_cita },
                ].filter(Boolean) : []}
                principal={principal}
                iconos={iconos}
                onCancelar={gestionable ? (motivo) => cancelar(cita, motivo) : undefined}
            />
        );
    };

    const filtrada = filtrosActivos.length > 0;

    return (
        <MisCitasVista
            rol="patient"
            descripcion="Revisa tus próximas citas y reprograma o cancela cuando lo necesites."
            secciones={secciones}
            seccion={seccion}
            onSeccion={cambiarSeccion}
            panel={{
                dias: mapa.dias,
                fecha: filtros.fecha_programada,
                onFecha: (valor) => cambiarFiltro("fecha_programada", valor),
                estados,
                estado,
                onEstado: cambiarEstado,
                busqueda: filtros.busqueda,
                onBusqueda: (valor) => cambiarFiltro("busqueda", valor),
                placeholder: "Profesional o código de cita",
                extras: (
                    <>
                        <label className={estilos.campo}>
                            <Stethoscope size={17} aria-hidden="true" />
                            <select aria-label="Especialidad" value={filtros.especialidad} onChange={(event) => cambiarFiltro("especialidad", event.target.value)}>
                                <option value="">Todas las especialidades</option>
                                {especialidades.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label className={estilos.campo}>
                            <MapPinned size={17} aria-hidden="true" />
                            <select
                                aria-label="Departamento"
                                value={filtros.departamento}
                                onChange={(event) => {
                                    cambiarFiltro("departamento", event.target.value);
                                    cambiarFiltro("ciudad", "");
                                }}
                            >
                                <option value="">Todos los departamentos</option>
                                {departamentos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label className={estilos.campo}>
                            <Building2 size={17} aria-hidden="true" />
                            <select aria-label="Ciudad" value={filtros.ciudad} disabled={!filtros.departamento} onChange={(event) => cambiarFiltro("ciudad", event.target.value)}>
                                <option value="">{filtros.departamento ? "Todas las ciudades" : "Elige un departamento"}</option>
                                {ciudades.map((item) => <option key={item.id_ciudad} value={item.id_ciudad}>{item.nombre_ciudad}</option>)}
                            </select>
                        </label>
                    </>
                ),
            }}
            filtrosActivos={filtrosActivos}
            onLimpiar={() => {
                ["busqueda", "especialidad", "departamento", "ciudad", "fecha_programada"].forEach((clave) => cambiarFiltro(clave, ""));
                cambiarEstado("todas");
            }}
            total={totalRegistros}
            cargando={loading}
            error={error}
            textoError="No pudimos cargar tus citas"
            onReintentar={recargarCitas}
            citas={ordenadas}
            renderCita={renderCita}
            vacio={filtrada
                ? { titulo: "No hay citas con estos filtros", texto: "Prueba otra combinación de estado, profesional, ubicación o fecha." }
                : seccion === "historial"
                    ? { titulo: "Tu historial está vacío", texto: "Aquí verás tus citas completadas, canceladas, vencidas y las inasistencias." }
                    : { titulo: "No tienes citas próximas", texto: "Cuando programes una consulta, podrás revisarla y gestionarla desde aquí.", accion: <Link href="/patient/find-doctors">Encontrar un doctor</Link> }}
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
            <AppointmentDeepLink />

            <ReprogramAppointmentModal
                abierto={modalReprogramar}
                onCerrar={() => setModalReprogramar(false)}
                onExitComplete={() => {
                    setCitaSeleccionada(null);
                    reanudar();
                }}
                cita={citaSeleccionada}
                reprogramarCita={confirmarReprogramacion}
                counterpart="medico"
            />

            <CalificarMedicoModal
                abierto={modalCalificacion}
                onCerrar={() => setModalCalificacion(false)}
                onExitComplete={() => {
                    setCitaCalificacion(null);
                    reanudar();
                }}
                cita={citaCalificacion}
                onRefresh={recargarCitas}
                onSuccess={confirmarCalificacion}
            />

            <AppointmentDetailsModal
                abierto={detalle.abierto}
                onCerrar={() => setDetalle((actual) => ({ ...actual, abierto: false }))}
                onExitComplete={() => setDetalle({ cita: null, abierto: false })}
                cita={detalle.cita}
                counterpart="medico"
            />

            <DoctorProfileModal
                doctor={perfilMedico}
                onClose={() => setPerfilMedico(null)}
            />
        </MisCitasVista>
    );
}
