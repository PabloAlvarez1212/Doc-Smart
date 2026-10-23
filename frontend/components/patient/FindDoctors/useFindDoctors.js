"use client";

import { useEffect, useState } from "react";
import {
    getEspecialidadesService,
    listarMedicosDisponiblesServices,
} from "@/app/services/doctorServices";
import {
    getCiudadesPorDepartamentoService,
    getDepartamentosService,
} from "@/app/services/catalogs";
import { buildFindDoctorsParams, hasFindDoctorsFilters } from "./findDoctorsFilters";

const INITIAL_FILTERS = {
    search: "",
    especialidad: "",
    departamento: "",
    ciudad: "",
    calificacionMinima: "",
};

export default function useFindDoctors() {
    const [doctores, setDoctores] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const [filtros, setFiltros] = useState(INITIAL_FILTERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setSearchDebounced(filtros.search), 400);
        return () => clearTimeout(timeout);
    }, [filtros.search]);

    useEffect(() => {
        let active = true;

        const cargarCatalogos = async () => {
            const [especialidadesResult, departamentosResult] = await Promise.allSettled([
                getEspecialidadesService(),
                getDepartamentosService(),
            ]);

            if (!active) return;

            setEspecialidades(
                especialidadesResult.status === "fulfilled" && Array.isArray(especialidadesResult.value?.data)
                    ? especialidadesResult.value.data
                    : [],
            );
            setDepartamentos(
                departamentosResult.status === "fulfilled" && Array.isArray(departamentosResult.value?.data)
                    ? departamentosResult.value.data
                    : [],
            );
        };

        cargarCatalogos();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        const cargarDoctoresDisponibles = async () => {
            setLoading(true);
            setError(null);

            try {
                const params = buildFindDoctorsParams({
                    ...filtros,
                    search: searchDebounced,
                });
                const response = await listarMedicosDisponiblesServices(params);
                const doctors = response?.data;

                if (!Array.isArray(doctors)) {
                    throw new Error("Formato de respuesta inesperado");
                }

                if (active) setDoctores(doctors);
            } catch {
                if (active) {
                    setDoctores([]);
                    setError("No se pudieron cargar los médicos.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        cargarDoctoresDisponibles();
        return () => {
            active = false;
        };
    }, [
        requestVersion,
        filtros.especialidad,
        filtros.departamento,
        filtros.ciudad,
        filtros.calificacionMinima,
        searchDebounced,
    ]);

    useEffect(() => {
        let active = true;

        const cargarCiudades = async () => {
            if (!departamentoSeleccionado) {
                setCiudades([]);
                setCiudadSeleccionada("");
                return;
            }

            try {
                const response = await getCiudadesPorDepartamentoService(departamentoSeleccionado);
                if (!Array.isArray(response)) throw new Error("Formato inválido");
                if (active) setCiudades(response);
            } catch {
                if (active) setCiudades([]);
            }
        };

        cargarCiudades();
        return () => {
            active = false;
        };
    }, [departamentoSeleccionado]);

    const cambiarFiltro = (nombre, valor) => {
        setFiltros((prev) => ({ ...prev, [nombre]: valor }));
    };

    const cambiarDepartamento = (idDepartamento) => {
        setDepartamentoSeleccionado(idDepartamento);
        setCiudadSeleccionada("");
        setCiudades([]);
        setFiltros((prev) => ({
            ...prev,
            departamento: idDepartamento,
            ciudad: "",
        }));
    };

    const cambiarCiudad = (idCiudad) => {
        setCiudadSeleccionada(idCiudad);
        cambiarFiltro("ciudad", idCiudad);
    };

    const limpiarFiltros = () => {
        setFiltros(INITIAL_FILTERS);
        setDepartamentoSeleccionado("");
        setCiudadSeleccionada("");
        setCiudades([]);
    };

    return {
        doctores,
        especialidades,
        departamentos,
        ciudades,
        filtros,
        hasActiveFilters: hasFindDoctorsFilters(filtros),
        departamentoSeleccionado,
        ciudadSeleccionada,
        cambiarEspecialidad: (value) => cambiarFiltro("especialidad", value),
        cambiarDepartamento,
        cambiarCiudad,
        cambiarCalificacionMinima: (value) => cambiarFiltro("calificacionMinima", value),
        cambiarBusqueda: (value) => cambiarFiltro("search", value),
        limpiarFiltros,
        loading,
        error,
        retry: () => setRequestVersion((current) => current + 1),
    };
}
