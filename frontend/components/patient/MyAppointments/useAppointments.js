"use client";
import { useEffect, useState } from "react";
import { getEspecialidadesService } from "@/app/services/doctorServices";
import { listarCitasPacienteService, cancelarCitaService } from "@/app/services/appointmentsServices";
import { getDepartamentosService, getCiudadesPorDepartamentoService } from "@/app/services/catalogs";
import Swal from "sweetalert2";
export default function useAppointments() {

    const [citas, setCitas] = useState([]);
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
        doctor: "",
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
    }, [estado, filtros, paginaActual]);

    const cambiarPagina = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    const cancelarCita = async (id_cita) => {

        const resultado = await Swal.fire({
            title: "¿Cancelar cita?",
            text: "Esta acción cancelará tu cita médica.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, cancelar",
            cancelButtonText: "No, volver",
        });

        if (!resultado.isConfirmed) {
            return;
        }

        try {

            await cancelarCitaService(id_cita);

            await cargarCitas();

            Swal.fire({
                title: "Cita cancelada",
                text: "La cita fue cancelada correctamente.",
                icon: "success",
            });

        } catch (error) {

            console.error(error);

            Swal.fire({
                title: "Error",
                text: "No se pudo cancelar la cita.",
                icon: "error",
            });
        }
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

        try {

            setLoading(true);

            setError(null);

            const params = {};

            params.page = paginaActual;
            params.page_size = 6;

            if (estado !== "todas") {
                params.estado = estado;
            }

            if (filtros.doctor.trim()) {
                params.doctor = filtros.doctor;
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

            setCitas(data.data);
            setPaginaActual(data.paginacion.current_page);
            setTotalPaginas(data.paginacion.total_pages);
            setTotalRegistros(data.paginacion.count);

        } catch (error) {

            console.error(error);

            setError(error);

        } finally {

            setLoading(false);

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
        especialidades,
        cancelarCita,
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