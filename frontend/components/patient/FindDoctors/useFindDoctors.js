"use client";

import { useEffect, useState } from "react";
import { listarMedicosDisponiblesServices, getEspecialidadesService, } from "@/app/services/doctorServices";
import { getDepartamentosService, getCiudadesPorDepartamentoService } from "@/app/services/catalogs";

export default function useFindDoctors() {
    const [doctores, setDoctores] = useState([]);
    const [especialidades, setEspecialidades] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("")
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState("")
    const [ciudades, setCiudades] = useState([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let active = true;

        const cargarDoctoresDisponibles = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await listarMedicosDisponiblesServices();
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

        const cargarEspecialidades = async () => {
            try {
                const response = await getEspecialidadesService();
                if (!Array.isArray(response?.data)) {
                    throw new Error("Formato inválido");
                }
                if (active) {
                    setEspecialidades(response.data);
                }
            } catch (error) {
                console.error("Error en el servidor");
                if (active) {
                    setEspecialidades([]);
                }
            }
        };

        const cargarDepartamentos = async () => {
            try {
                const response = await getDepartamentosService()
                if (!Array.isArray(response.data)) {
                    throw new Error("Formato invalido")
                }
                if (active) {
                    setDepartamentos(response.data)
                }
            } catch (error) {
                console.error("Error en el servidor")
                setDepartamentos([])
            }
        }

        cargarDoctoresDisponibles();
        cargarEspecialidades();
        cargarDepartamentos();
        return () => {
            active = false;
        };
    }, [requestVersion]);

    useEffect(() => {
        let active = true

        const cargarCiudades = async () => {
            // Si no hay departamento, no hacemos petición
            if (!departamentoSeleccionado) {
                setCiudades([])
                setCiudadSeleccionada("")
                return
            }

            try {
                const response = await getCiudadesPorDepartamentoService(departamentoSeleccionado)
                console.log("RESPUESTA CIUDADES:", response)
                if (!Array.isArray(response)) {
                    throw new Error("Formato inválido")
                }
                if (active) {
                    setCiudades(response)
                }
            } catch (error) {
                console.error("Error al cargar ciudades", error)
                if (active) {
                    setCiudades([])
                }
            }
        }

        cargarCiudades()

        return () => {
            active = false
        }

    }, [departamentoSeleccionado])

    const cambiarDepartamento = (idDepartamento) => {
        setDepartamentoSeleccionado(idDepartamento)
        setCiudadSeleccionada("")
        setCiudades([])
    }

    const retry = () => setRequestVersion((current) => current + 1);

    return {
        doctores,
        especialidades,
        departamentos,
        ciudades,

        departamentoSeleccionado,
        setDepartamentoSeleccionado,
        cambiarDepartamento,
        ciudadSeleccionada,
        setCiudadSeleccionada,

        loading,
        error,
        retry
    }
}
