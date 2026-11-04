"use client";
import { useEffect, useRef, useState } from "react";
import { getEspecialidadesService } from "@/app/services/doctorServices";
import {
    listarCitasPacienteService,
    cancelarCitaService,
    reprogramarCitaService,
} from "@/app/services/appointmentsServices";
import { getDepartamentosService, getCiudadesPorDepartamentoService } from "@/app/services/catalogs";
import { useNotificationsContext } from "../../contex/NotificationsContext";
export default function useAppointments() {

    const { eventoCita } = useNotificationsContext();
    const [citas, setCitas] = useState([]);
    const [seccion, setSeccion] = useState("agenda");
    // Conteos por estado con los mismos filtros de la lista (sin sección ni estado).
    const [conteos, setConteos] = useState({});
    const ultimaSolicitud = useRef(0);
    const [especialidades, setEspecialidades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [estado, setEstado] = useState("todas");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [filtros, setFiltros] = useState({
        busqueda: "",
        ciudad: "",
        departamento: "",
        especialidad: "",
        fecha_programada: "",
    });

    useEffect(() => {
        cargarEspecialidades();
        cargarDepartamentos();
    }, []);

    useEffect(() => {
        if (!filtros.departamento) {
            setCiudades([]);
            return;
        }

        cargarCiudades(filtros.departamento);

    }, [filtros.departamento]);

    useEffect(() => {
        cargarCitas();
    }, [seccion, estado, filtros, paginaActual]);

    // Cuando el médico confirma o cambia una cita, la lista se actualiza sin recargar la página.
    useEffect(() => {
        if (eventoCita?.tipo_evento === "ACTUALIZACION_CITA") cargarCitas();
    }, [eventoCita]);

    const cambiarPagina = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    const cambiarSeccion = (nuevaSeccion) => {
        if (nuevaSeccion === seccion) return;
        setSeccion(nuevaSeccion);
        setEstado("todas");
        setPaginaActual(1);
        setCitas([]);
        setLoading(true);
    };

    // El motivo llega desde la tarjeta; el error se lanza para que la tarjeta deshaga su animación.
    const cancelarCita = async (id_cita, motivo) => {
        try {
            await cancelarCitaService(id_cita, motivo);
        } catch (error) {
            console.error(error);
            throw error;
        }
        await cargarCitas();
    };

    const reprogramarCita = async (id_cita, fecha_programada) => {
        const response = await reprogramarCitaService(
            id_cita,
            fecha_programada
        );

        await cargarCitas();
        return response;
    };
    const cargarCiudades = async (idDepartamento) => {
        try {
            const data = await getCiudadesPorDepartamentoService(
                idDepartamento
            );

            setCiudades(data.results ?? data);
        } catch (error) {

            console.error(error);
            setCiudades([]);

        }
    };

    const cargarDepartamentos = async () => {
        try {
            const data = await getDepartamentosService();
            setDepartamentos(data.data)
        } catch (error) {
            console.log(error)
        }
    }
    const cargarEspecialidades = async () => {

        try {

            const data = await getEspecialidadesService();

            setEspecialidades(data.data);

        } catch (error) {

            console.error(error);

        }

    };

    const cargarCitas = async () => {
        const solicitud = ++ultimaSolicitud.current;

        try {

            setLoading(true);

            setError(null);

            const params = {};

            params.page = paginaActual;
            params.page_size = 9;
            params.seccion = seccion;

            if (estado !== "todas") {
                params.estado = estado;
            }

            if (filtros.busqueda.trim()) {
                params.busqueda = filtros.busqueda;
            }

            if (filtros.ciudad.trim()) {
                params.ciudad = filtros.ciudad;
            }

            if (filtros.departamento.trim()) {
                params.departamento = filtros.departamento;
            }

            if (filtros.especialidad) {
                params.especialidad = filtros.especialidad;
            }

            if (filtros.fecha_programada) {
                params.fecha_programada = filtros.fecha_programada;
            }

            const data = await listarCitasPacienteService(params);
            // Una respuesta vieja no debe pisar la de otra sección o filtro.
            if (solicitud !== ultimaSolicitud.current) return;

            setCitas(data.data);
            setConteos(data.conteos ?? {});
            setPaginaActual(data.paginacion.current_page);
            setTotalPaginas(data.paginacion.total_pages);
            setTotalRegistros(data.paginacion.count);

        } catch (error) {

            if (solicitud !== ultimaSolicitud.current) return;
            console.error(error);

            setError(error);

        } finally {

            if (solicitud === ultimaSolicitud.current) setLoading(false);

        }

    };

    const cambiarFiltro = (nombre, valor) => {
        setPaginaActual(1);
        setFiltros((prev) => ({
            ...prev,
            [nombre]: valor
        }));
    };

    const cambiarEstado = (nuevoEstado) => {
        setPaginaActual(1);
        setEstado(nuevoEstado);
    };

    return {
        citas,
        conteos,
        seccion,
        cambiarSeccion,
        especialidades,
        cancelarCita,
        reprogramarCita,
        departamentos,
        ciudades,
        cambiarFiltro,
        cambiarEstado,
        filtros,
        estado,
        loading,
        error,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
        recargarCitas: cargarCitas,
    };

}
