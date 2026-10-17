"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Swal from "sweetalert2";
import { useNotificationsContext } from '../../contex/NotificationsContext';
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import {
    listarCitasMedicoService,
    resumenCitasMedicoService,
    cancelarCitaService,
    confirmarCitaService,
    completarCitaService,
    reprogramarCitaService,
} from "@/app/services/appointmentsServices";
const PAGE_SIZE = 6;

export default function useAppointments() {
    const { eventoCita } = useNotificationsContext();
    // ==========================================
    // DATOS
    // ==========================================

    const [citas, setCitas] = useState([]);
    const [resumen, setResumen] =
        useState(null);

    // ==========================================
    // AGENDA / HISTORIAL
    // ==========================================

    const [seccion, setSeccion] =useState("agenda")
    const ultimaSolicitudCitas = useRef(0);

    // ==========================================
    // FILTROS
    // ==========================================

    const [estado, setEstado] = useState("todas");
    const [paciente, setPaciente] = useState("");
    const [pacienteDebounce,setPacienteDebounce] = useState("");
    const [fecha, setFecha] = useState("");


    // ==========================================
    // PAGINACIÓN
    // ==========================================

    const [paginaActual,setPaginaActual] = useState(1);
    const [totalPaginas,setTotalPaginas] = useState(1);
    const [totalRegistros,setTotalRegistros] = useState(0);

    // ==========================================
    // ESTADOS DE CARGA
    // ==========================================

    const [loading, setLoading] =useState(true);
    const [loadingResumen,setLoadingResumen] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // CARGAR CITAS
    // ==========================================

    const cargarCitas = useCallback(async () => {
        const solicitudActual = ++ultimaSolicitudCitas.current;
        try {
            setLoading(true);
            setError(null);
            const params = {
                page: paginaActual,
                page_size: PAGE_SIZE,
                seccion,
            };
            // Estado
            if (estado !== "todas") {
                params.estado = estado;
            }
            // Paciente
            if (pacienteDebounce) {
                params.paciente = pacienteDebounce;
            }
            // Fecha
            if (fecha) {
                params.fecha_programada = fecha;
            }

            const data = await listarCitasMedicoService(params);
            // Evitar que una respuesta antigua sobrescriba
            // los datos de otra sección.
            if (solicitudActual !== ultimaSolicitudCitas.current) {
                return;
            }
            setCitas(
                Array.isArray(data?.data)
                    ? data.data
                    : []
            );
            setPaginaActual(data?.paginacion?.current_page ?? 1);
            setTotalPaginas(data?.paginacion?.total_pages ?? 1);
            setTotalRegistros(data?.paginacion?.count ?? 0);
        } catch (error) {
            if (solicitudActual !== ultimaSolicitudCitas.current) {
                return;
            }
            console.error("Error cargando citas:", error);
            const mensajeBackend = obtenerPrimerError(
                error.response?.data?.errores
            );
            setError(
                mensajeBackend ||
                "No se pudieron cargar las citas."
            );
            setCitas([]);
            setTotalRegistros(0);
            setTotalPaginas(1);

        } finally {

            if (solicitudActual === ultimaSolicitudCitas.current) {
                setLoading(false);
            }
        }
    }, [
        seccion,
        estado,
        pacienteDebounce,
        fecha,
        paginaActual
    ]);
    // ==========================================
    // CARGAR RESUMEN
    // ==========================================

    const cargarResumen = useCallback(
        async () => {
            try {
                setLoadingResumen(true);
                const data = await resumenCitasMedicoService();
                setResumen(data);
            } catch (error) {
                console.error(
                    "Error cargando resumen:",
                    error
                );

            } finally {

                setLoadingResumen(false);

            }

        },
        []
    );


    // ==========================================
    // DEBOUNCE BUSCADOR
    // ==========================================

    useEffect(() => {

        const timer = setTimeout(() => {

            setPacienteDebounce(
                paciente.trim()
            );

            setPaginaActual(1);

        }, 400);


        return () => {
            clearTimeout(timer);
        };

    }, [paciente]);

    useEffect(() => {
        if (eventoCita?.tipo_evento === 'ACTUALIZACION_CITA') {
            cargarCitas();
            cargarResumen();
        }
    }, [eventoCita, cargarCitas, cargarResumen]);


    // ==========================================
    // CARGA DE CITAS
    // ==========================================

    useEffect(() => {

        cargarCitas();

    }, [cargarCitas]);


    // ==========================================
    // CARGA DEL RESUMEN
    // ==========================================

    useEffect(() => {

        cargarResumen();

    }, [cargarResumen]);


    // ==========================================
    // ACTUALIZAR TODO
    // ==========================================

    const actualizarDatos = async () => {

        await Promise.all([
            cargarCitas(),
            cargarResumen(),
        ]);

    };

    // ==========================================
// CAMBIAR ENTRE AGENDA E HISTORIAL
// ==========================================

    const cambiarSeccion = (nuevaSeccion) => {

        if (
            !["agenda", "historial"].includes(nuevaSeccion) ||
            nuevaSeccion === seccion
        ) {
            return;
        }

        // Invalidar peticiones anteriores.
        ultimaSolicitudCitas.current += 1;

        // Cambiar sección.
        setSeccion(nuevaSeccion);

        // Reiniciar filtros.
        setEstado("todas");
        setPaciente("");
        setPacienteDebounce("");
        setFecha("");

        // Reiniciar paginación.
        setPaginaActual(1);
        setTotalPaginas(1);
        setTotalRegistros(0);

        // Limpiar resultados anteriores.
        setCitas([]);
        setError(null);
        setLoading(true);
    };

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    const cambiarEstado = (nuevoEstado) => {

        setPaginaActual(1);

        setEstado(nuevoEstado);

    };


    // ==========================================
    // CAMBIAR PACIENTE
    // ==========================================

    const cambiarPaciente = (valor) => {

        setPaciente(valor);

    };


    // ==========================================
    // CAMBIAR FECHA
    // ==========================================

    const cambiarFecha = (valor) => {

        setPaginaActual(1);

        setFecha(valor);

    };


    // ==========================================
    // LIMPIAR FILTROS
    // ==========================================

    const limpiarFiltros = () => {

        setPaciente("");

        setPacienteDebounce("");

        setFecha("");

        setPaginaActual(1);

    };


    // ==========================================
    // CAMBIAR PÁGINA
    // ==========================================

    const cambiarPagina = (
        nuevaPagina
    ) => {

        if (
            nuevaPagina < 1 ||
            nuevaPagina > totalPaginas
        ) {
            return;
        }


        setPaginaActual(
            nuevaPagina
        );

    };


    // ==========================================
    // CANCELAR CITA
    // ==========================================

    const cancelarCita = async (id_cita) => {
        const confirmacion = await Swal.fire({
                title: "¿Cancelar cita?",
                text: "Indica el motivo por el cual deseas cancelar la consulta.",
                icon: "warning",
                input: "textarea",
                inputPlaceholder: "Escribe el motivo de la cancelación.",
                inputAttributes: {
                    max_length: "500",
                    "aria-label": "Motivo de cancelación"
                },
                showCancelButton: true,
                confirmButtonText: "Confirmar Cancelación",
                cancelButtonText: "Volver",
                inputValidator: (value) => {
                    const motivo = value?.trim();
                    if (!motivo) {
                        return "Debes indicar el motivo de cancelación.";
                    }
                    if (motivo.length > 500) {
                        return "El motivo no puede superar los 500 caracteres."
                    }
                }
            });

        if (!confirmacion.isConfirmed) {
            return;
        }
        try {
            await cancelarCitaService(
                id_cita,
                confirmacion.value.trim()
            );
            await actualizarDatos();

            await Swal.fire({
                title:"Cita cancelada",
                text:"La cita fue cancelada correctamente.",
                icon:"success",
            });

        } catch (error) {

            console.error(
                "Error al cancelar cita:",
                error
            );


            Swal.fire({

                title:
                    "Error",

                text:
                    "No se pudo cancelar la cita.",

                icon:
                    "error",

            });

        }

    };


    // ==========================================
    // CONFIRMAR CITA
    // ==========================================

    const confirmarCita = async (
        id_cita
    ) => {

        try {

            await confirmarCitaService(
                id_cita
            );


            await actualizarDatos();


            await Swal.fire({

                title:
                    "Cita confirmada",

                text:
                    "La cita fue confirmada correctamente.",

                icon:
                    "success",

            });

        } catch (error) {

            console.error(
                "Error al confirmar cita:",
                error
            );


            Swal.fire({

                title:
                    "Error",

                text:
                    "No se pudo confirmar la cita.",

                icon:
                    "error",

            });

        }

    };


    // ==========================================
    // COMPLETAR CITA
    // ==========================================

    const completarCita = async (id_cita, datosClinicos) => {
        try {
            const resultado =
                datosClinicos === null ? null : await completarCitaService(
                    id_cita, datosClinicos
                );

            await actualizarDatos();
            await Swal.fire({
                title:
                    datosClinicos === null ? "Documentos guardados" : "Cita completada",
                text:
                    datosClinicos === null ? "La documentación de seguimiento fue actualizada." : "La consulta fue cerrada correctamente.",
                icon:
                    "success",
            });

            return resultado;
        } catch (error) {

            console.error(
                "Error al completar cita:",
                error
            );
            throw error;
        }

    };


    // ==========================================
    // REPROGRAMAR CITA
    // ==========================================

    const reprogramarCita = async (
        id_cita,
        fecha_programada
    ) => {

        try {

            await reprogramarCitaService(
                id_cita,
                fecha_programada
            );


            await actualizarDatos();


            await Swal.fire({

                title:
                    "Cita reprogramada",

                text:
                    "La cita fue reprogramada correctamente.",

                icon:
                    "success",

            });

        } catch (error) {
            throw error;
        }

    };


    // ==========================================
    // RETURN
    // ==========================================

    return {

        // Datos
        citas,
        resumen,

        // Agenda / Historial
        seccion,
        cambiarSeccion,

        // Estados
        estado,
        paciente,
        fecha,

        // Filtros
        cambiarEstado,
        cambiarPaciente,
        cambiarFecha,
        limpiarFiltros,

        // Loading
        loading,
        loadingResumen,
        error,

        // Paginación
        paginaActual,
        totalPaginas,
        totalRegistros,
        cambiarPagina,

        // Acciones
        cancelarCita,
        confirmarCita,
        completarCita,
        reprogramarCita,

        // Recarga manual
        recargarCitas:
            cargarCitas,

    };
}
