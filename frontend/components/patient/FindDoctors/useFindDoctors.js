"use client";

import { useEffect, useState } from "react";

import {
    listarMedicosDisponiblesServices,
    getEspecialidadesService,
} from "@/app/services/doctorServices";

import {
    getDepartamentosService,
    getCiudadesPorDepartamentoService,
} from "@/app/services/catalogs";

export default function useFindDoctors() {
    const [doctores, setDoctores] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("")

    const [filtros, setFiltros] = useState({
        search: "",
        especialidad: "",
        departamento: "",
        ciudad: "",
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearchDebounced(filtros.search)
        }, 400)

        return () => {
            clearTimeout(timeout)
        }

    }, [filtros.search])


    useEffect(() => {

        let active = true

        const cargarDoctoresDisponibles = async () => {
            try {
                setLoading(true)
                setError(null)

                const params = {}

                if (searchDebounced) {
                    params.search = searchDebounced
                }

                if (filtros.especialidad) {
                    params.especialidad = filtros.especialidad
                }

                if (filtros.departamento) {
                    params.departamento = filtros.departamento
                }

                if (filtros.ciudad) {
                    params.ciudad = filtros.ciudad
                }

                const response =
                    await listarMedicosDisponiblesServices(
                        params
                    )

                const doctors = response?.data

                if (!Array.isArray(doctors)) {
                    throw new Error(
                        "Formato de respuesta inesperado"
                    )
                }

                if (active) {
                    setDoctores(doctors)
                }

            } catch (error) {

                console.error(
                    "Error al cargar médicos",
                    error
                )

                if (active) {
                    setDoctores([])

                    setError(
                        "No se pudieron cargar los médicos."
                    )
                }

            } finally {

                if (active) {
                    setLoading(false)
                }
            }
        }


        const cargarEspecialidades = async () => {
            try {
                const response =
                    await getEspecialidadesService()

                if (!Array.isArray(response?.data)) {
                    throw new Error(
                        "Formato inválido"
                    )
                }

                if (active) {
                    setEspecialidades(
                        response.data
                    )
                }

            } catch (error) {

                console.error(
                    "Error al cargar especialidades",
                    error
                )

                if (active) {
                    setEspecialidades([])
                }
            }
        }


        const cargarDepartamentos = async () => {
            try {
                const response =
                    await getDepartamentosService()

                if (!Array.isArray(response?.data)) {
                    throw new Error(
                        "Formato inválido"
                    )
                }

                if (active) {
                    setDepartamentos(
                        response.data
                    )
                }

            } catch (error) {

                console.error(
                    "Error al cargar departamentos",
                    error
                )

                if (active) {
                    setDepartamentos([])
                }
            }
        }


        cargarDoctoresDisponibles()
        cargarEspecialidades()
        cargarDepartamentos()


        return () => {
            active = false
        }

    }, [
        requestVersion,
        filtros.especialidad,
        filtros.departamento,
        filtros.ciudad,
        searchDebounced,
    ])

    useEffect(() => {

        let active = true;

        const cargarCiudades = async () => {

            if (!departamentoSeleccionado) {

                setCiudades([]);
                setCiudadSeleccionada("");

                return;
            }

            try {

                const response =
                    await getCiudadesPorDepartamentoService(
                        departamentoSeleccionado
                    );

                if (!Array.isArray(response)) {
                    throw new Error(
                        "Formato inválido"
                    );
                }
                if (active) {
                    setCiudades(response);
                }
            } catch (error) {

                console.error(
                    "Error al cargar ciudades",
                    error
                );

                if (active) {
                    setCiudades([]);
                }
            }
        };

        cargarCiudades();

        return () => {
            active = false;
        };

    }, [departamentoSeleccionado]);

    const cambiarEspecialidad = (idEspecialidad) => {

        setFiltros((prev) => ({
            ...prev,
            especialidad: idEspecialidad,
        }));
    };

    const cambiarDepartamento = (idDepartamento) => {

        setDepartamentoSeleccionado(
            idDepartamento
        );

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

        setFiltros((prev) => ({
            ...prev,
            ciudad: idCiudad,
        }));
    };

    const limpiarFiltros = () => {

        setFiltros({
            search: "",
            especialidad: "",
            departamento: "",
            ciudad: "",
        });

        setDepartamentoSeleccionado("");

        setCiudadSeleccionada("");

        setCiudades([]);
    };

    const retry = () =>
        setRequestVersion(
            (current) => current + 1
        );

    const cambiarBusqueda = (valor) => {
        setFiltros((prev) => ({
            ...prev,
            search: valor
        }))
    }

    return {
        doctores,

        especialidades,
        departamentos,
        ciudades,

        filtros,

        departamentoSeleccionado,
        ciudadSeleccionada,

        cambiarEspecialidad,
        cambiarDepartamento,
        cambiarCiudad,
        cambiarBusqueda,

        limpiarFiltros,

        loading,
        error,
        retry,
    };
}