"use client"
import { useEffect, useState } from "react"
import { getEspecialidadesService } from "@/app/services/doctorServices"
import { getDepartamentosService } from "@/app/services/catalogs"
import { getCiudadesByDepartamentoService } from "@/app/services/authService"
export default function useDoctorValidation() {
    const [especialidades, setEspecialidades] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [ciudades, setCiudades] = useState([])
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("")
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState("")
    const [estadoSeleccionado, setEstadoSeleccionado] = useState("")
    const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("")
    const estados = [
        { value: "pendiente", label: "Pendiente" },
        { value: "rechazado", label: "Rechazado" },
    ]
    const cargarEspecialidades = async () => {
        try {
            const data = await getEspecialidadesService();
            const opciones = data.data.map((especialidad) => ({
                value: especialidad.id,
                label: especialidad.nombre
            }))
            setEspecialidades(opciones)
        } catch (error) {
            console.log("Error en el servidor: ", error);
        }
    }
    const cargarDepartamentos = async () => {
        try {
            const data = await getDepartamentosService();
            const opciones = data.data.map((departamento) => ({
                value: departamento.id,
                label: departamento.nombre
            }))
            setDepartamentos(opciones)
        } catch (error) {
            console.log("Error en el servidor: ", error);
        }
    }
    const cargarCiudades = async (departamentoId) => {
        try {
            const data = await getCiudadesByDepartamentoService(departamentoId)

            const opciones = data.data.map((ciudad) => ({
                value: ciudad.id_ciudad,
                label: ciudad.nombre_ciudad
            }))

            setCiudades(opciones)

        } catch (error) {
            console.log("Error cargando ciudades: ", error)
        }
    }

    useEffect(() => {
        cargarEspecialidades();
        cargarDepartamentos();
    }, [])

    useEffect(() => {

        // si no hay departamento seleccionado
        if (!departamentoSeleccionado) {
            setCiudades([])
            setCiudadSeleccionada("")
            return
        }

        cargarCiudades(departamentoSeleccionado)

        // al cambiar de departamento limpiamos la ciudad anterior
        setCiudadSeleccionada("")

    }, [departamentoSeleccionado])

    return {
        especialidades,
        estados,

        departamentos,
        ciudades,

        departamentoSeleccionado,
        setDepartamentoSeleccionado,

        ciudadSeleccionada,
        setCiudadSeleccionada,

        estadoSeleccionado,
        setEstadoSeleccionado,

        especialidadSeleccionada,
        setEspecialidadSeleccionada,
    }
}