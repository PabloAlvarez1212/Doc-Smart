"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import Swal from "sweetalert2";

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

    // ==========================================
    // DATOS
    // ==========================================

    const [citas, setCitas] = useState([]);

    const [resumen, setResumen] =
        useState(null);


    // ==========================================
    // FILTROS
    // ==========================================

    const [estado, setEstado] =
        useState("todas");

    const [paciente, setPaciente] =
        useState("");

    const [
        pacienteDebounce,
        setPacienteDebounce
    ] = useState("");

    const [fecha, setFecha] =
        useState("");


    // ==========================================
    // PAGINACIÓN
    // ==========================================

    const [
        paginaActual,
        setPaginaActual
    ] = useState(1);

    const [
        totalPaginas,
        setTotalPaginas
    ] = useState(1);

    const [
        totalRegistros,
        setTotalRegistros
    ] = useState(0);


    // ==========================================
    // ESTADOS DE CARGA
    // ==========================================

    const [loading, setLoading] =
        useState(true);

    const [
        loadingResumen,
        setLoadingResumen
    ] = useState(true);

    const [error, setError] =
        useState(null);


    // ==========================================
    // CARGAR CITAS
    // ==========================================

    const cargarCitas = useCallback(
        async () => {

            try {

                setLoading(true);
                setError(null);


                const params = {
                    page: paginaActual,
                    page_size: PAGE_SIZE,
                };


                // Estado
                if (estado !== "todas") {
                    params.estado = estado;
                }


                // Paciente
                if (pacienteDebounce) {
                    params.paciente =
                        pacienteDebounce;
                }


                // Fecha
                if (fecha) {
                    params.fecha_programada =
                        fecha;
                }


                const data =
                    await listarCitasMedicoService(
                        params
                    );


                setCitas(
                    Array.isArray(data?.data)
                        ? data.data
                        : []
                );


                setPaginaActual(
                    data?.paginacion
                        ?.current_page ?? 1
                );

                setTotalPaginas(
                    data?.paginacion
                        ?.total_pages ?? 1
                );

                setTotalRegistros(
                    data?.paginacion
                        ?.count ?? 0
                );

            } catch (error) {

                console.error(
                    "Error cargando citas:",
                    error
                );


                const mensajeBackend =
                    obtenerPrimerError(
                        error.response
                            ?.data
                            ?.errores
                    );


                setError(
                    mensajeBackend ||
                    "No se pudieron cargar las citas."
                );


                setCitas([]);

            } finally {

                setLoading(false);

            }

        },
        [
            estado,
            pacienteDebounce,
            fecha,
            paginaActual
        ]
    );


    // ==========================================
    // CARGAR RESUMEN
    // ==========================================

    const cargarResumen = useCallback(
        async () => {

            try {

                setLoadingResumen(true);


                const data =
                    await resumenCitasMedicoService();


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

    const cancelarCita = async (
        id_cita
    ) => {

        const confirmacion =
            await Swal.fire({

                title:
                    "¿Cancelar cita?",

                text:
                    "La cita será cancelada.",

                icon:
                    "warning",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, cancelar",

                cancelButtonText:
                    "Volver",

            });


        if (!confirmacion.isConfirmed) {
            return;
        }


        try {

            await cancelarCitaService(
                id_cita
            );


            await actualizarDatos();


            await Swal.fire({

                title:
                    "Cita cancelada",

                text:
                    "La cita fue cancelada correctamente.",

                icon:
                    "success",

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

    const completarCita = async (
        id_cita
    ) => {

        const confirmacion =
            await Swal.fire({

                title:
                    "¿Completar cita?",

                text:
                    "La cita se marcará como completada.",

                icon:
                    "question",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, completar",

                cancelButtonText:
                    "Cancelar",

            });


        if (!confirmacion.isConfirmed) {
            return;
        }


        try {

            await completarCitaService(
                id_cita
            );


            await actualizarDatos();


            await Swal.fire({

                title:
                    "Cita completada",

                text:
                    "La cita fue marcada como completada.",

                icon:
                    "success",

            });

        } catch (error) {

            console.error(
                "Error al completar cita:",
                error
            );


            Swal.fire({

                title:
                    "Error",

                text:
                    "No se pudo completar la cita.",

                icon:
                    "error",

            });

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

            console.error(
                "Error al reprogramar cita:",
                error
            );


            Swal.fire({

                title:
                    "Error",

                text:
                    error.response
                        ?.data
                        ?.mensaje ||
                    "No se pudo reprogramar la cita.",

                icon:
                    "error",

            });

        }

    };


    // ==========================================
    // RETURN
    // ==========================================

    return {

        // Datos
        citas,
        resumen,

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