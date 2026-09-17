"use client"
import Swal from "sweetalert2"
import { obtenerPrimerError } from "@/app/utils/errrorUtils"
import { useCallback, useEffect, useRef, useState } from "react"
import { getEspecialidadesService } from "@/app/services/doctorServices"
import { listarSolicitudesMedicosValidacionService, obtenerMetricasValidacionMedicosService, obtenerHojaVidaSolicitudService, aprobarSolicitudValidacionService, rechazarSolicitudValidacionService } from "@/app/services/adminServices"
import { getDepartamentosService } from "@/app/services/catalogs"
import { getCiudadesByDepartamentoService } from "@/app/services/authService"
const consultaInicial = { page: 1, page_size: 10, busqueda: "", estado: "", especialidad: "", departamento: "", ciudad: "" }

export default function useDoctorValidation() {
    const [consulta, setConsulta] = useState(consultaInicial)
    const consultaActual = useRef(consulta)
    const peticionActual = useRef(null)
    const ultimaConsulta = useRef(null)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalRegistros, setTotalRegistros] = useState(0)
    const [cargando, setCargando] = useState(true)
    const [errorSolicitudes, setErrorSolicitudes] = useState(null)
    const {
        page: paginaActual, page_size: pageSize,
        departamento: departamentoSeleccionado, ciudad: ciudadSeleccionada,
        estado: estadoSeleccionado, especialidad: especialidadSeleccionada,
    } = consulta
    const [especialidades, setEspecialidades] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [ciudades, setCiudades] = useState([])
    const [solicitudesDoctores, setsolicitudesDoctores] = useState([])
    const [busqueda, setBusquedaEntrada] = useState("")
    const [metricas, setMetricas] = useState(null)
    const busquedaPendiente = busqueda.trim() !== consulta.busqueda
    const hayFiltros = Boolean(busqueda.trim() || estadoSeleccionado || especialidadSeleccionada || departamentoSeleccionado || ciudadSeleccionada)
    const setBusqueda = valor => {
        setBusquedaEntrada(valor)
        setConsulta(actual => actual.page === 1 ? actual : { ...actual, page: 1 })
    }
    const cambiarFiltro = (campo, valor) => setConsulta(actual => ({
        ...actual, [campo]: valor, page: 1,
        ...(campo === "departamento" ? { ciudad: "" } : {}),
    }))
    const setDepartamentoSeleccionado = valor => cambiarFiltro("departamento", valor)
    const setCiudadSeleccionada = valor => cambiarFiltro("ciudad", valor)
    const setEstadoSeleccionado = valor => cambiarFiltro("estado", valor)
    const setEspecialidadSeleccionada = valor => cambiarFiltro("especialidad", valor)
    const cambiarPagina = pagina => {
        if (!cargando && !busquedaPendiente && Number.isInteger(pagina) && pagina >= 1 && pagina <= totalPaginas) {
            setConsulta(actual => ({ ...actual, page: pagina }))
        }
    }
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
    const cargarCiudades = async (departamentoId, sigueVigente) => {
        try {
            const data = await getCiudadesByDepartamentoService(departamentoId)

            const opciones = data.data.map((ciudad) => ({
                value: ciudad.id_ciudad,
                label: ciudad.nombre_ciudad
            }))

            if (sigueVigente()) setCiudades(opciones)

        } catch (error) {
            console.log("Error cargando ciudades: ", error)
        }
    }

    const cargarSolicitudDoctores = useCallback(async (parametros) => {
        peticionActual.current?.abort()
        const controller = new AbortController()
        peticionActual.current = controller
        setCargando(true)
        setErrorSolicitudes(null)
        try {
            const { data } = await listarSolicitudesMedicosValidacionService(parametros, controller.signal)
            if (controller.signal.aborted) return

            setsolicitudesDoctores(data.results)
            setTotalPaginas(data.total_pages)
            setTotalRegistros(data.count)
            // El backend ya devuelve los registros de la última página válida.
            ultimaConsulta.current = JSON.stringify({ ...parametros, page: data.current_page })
            setConsulta(actual => actual.page === data.current_page ? actual : { ...actual, page: data.current_page })
        } catch (error) {
            if (controller.signal.aborted) return
            ultimaConsulta.current = null
            setErrorSolicitudes(obtenerPrimerError(error) || "No fue posible cargar las solicitudes.")
            console.error("Error cargando solicitudes de médicos:", error)
        } finally {
            if (!controller.signal.aborted) setCargando(false)
        }
    }, [])

    const refrescarSolicitudes = () => cargarSolicitudDoctores(consultaActual.current)

    const cargarMetricas = async () => {
        try {
            const data = await obtenerMetricasValidacionMedicosService()

            setMetricas(data.data)
        } catch (error) {
            console.error(
                "Error cargando métricas de validación:",
                error
            )
        }
    }

    const verHojaVida = async (solicitudId) => {
        try {
            const data = await obtenerHojaVidaSolicitudService(solicitudId)

            window.open(data.data.url, "_blank")
        } catch (error) {
            console.error("Error obteniendo hoja de vida:", error)
        }
    }

    const aprobarSolicitud = async (solicitudId) => {
        const resultado = await Swal.fire({
            title: "¿Aprobar médico?",
            text: "El médico quedará habilitado después de aprobar su solicitud.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, aprobar",
            cancelButtonText: "Cancelar",
        })

        if (!resultado.isConfirmed) return

        try {
            await aprobarSolicitudValidacionService(solicitudId)

            await Promise.all([
                refrescarSolicitudes(),
                cargarMetricas(),
            ])

            Swal.fire({
                title: "Solicitud aprobada",
                text: "El médico ha sido aprobado correctamente.",
                icon: "success",
            })

        } catch (error) {
            console.error("Error aprobando solicitud:", error)

            Swal.fire({
                title: "Error",
                text: "No fue posible aprobar la solicitud.",
                icon: "error",
            })
        }
    }

    const rechazarSolicitud = async ({ solicitudId, motivo }) => {
        try {
            await rechazarSolicitudValidacionService(
                solicitudId,
                motivo
            )

            await Promise.all([
                refrescarSolicitudes(),
                cargarMetricas(),
            ])

            await Swal.fire({
                title: "Solicitud rechazada",
                text: "La solicitud del médico fue rechazada correctamente.",
                icon: "success",
            })

            return true

        } catch (error) {
            console.error("Error rechazando solicitud:", error)

            const mensaje =
                obtenerPrimerError(error) ||
                "No fue posible rechazar la solicitud."

            await Swal.fire({
                title: "Error",
                text: mensaje,
                icon: "error",
            })

            return false
        }
    }

    const limpiarFiltros = () => {
        setBusqueda("")
        setConsulta(actual => ({ ...consultaInicial, page_size: actual.page_size }))
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            setConsulta(actual => actual.busqueda === busqueda.trim()
                ? actual : { ...actual, busqueda: busqueda.trim(), page: 1 })
        }, 500)

        return () => clearTimeout(timeout)
    }, [busqueda])

    useEffect(() => {
        consultaActual.current = consulta
        if (!busquedaPendiente && ultimaConsulta.current !== JSON.stringify(consulta)) {
            cargarSolicitudDoctores(consulta)
        } else if (!busquedaPendiente) {
            setCargando(false)
        }
        return () => peticionActual.current?.abort()
    }, [consulta, busquedaPendiente, cargarSolicitudDoctores])

    useEffect(() => {
        cargarEspecialidades();
        cargarDepartamentos();
        cargarMetricas();
    }, [])

    useEffect(() => {

        let vigente = true
        setCiudades([])
        if (!departamentoSeleccionado) {
            return
        }

        cargarCiudades(departamentoSeleccionado, () => vigente)
        return () => { vigente = false }

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

        busqueda,
        setBusqueda,

        solicitudesDoctores,
        paginaActual,
        totalPaginas,
        totalRegistros,
        pageSize,
        cambiarPagina,
        cargando: cargando || busquedaPendiente,
        errorSolicitudes,
        refrescarSolicitudes,
        hayFiltros,
        metricas,
        verHojaVida,
        aprobarSolicitud,
        rechazarSolicitud,

        limpiarFiltros,
    }
}
