"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";

import {
    getCiudadesService,
    getCiudadesPorDepartamentoService,
    getDepartamentosService,
} from "@/app/services/catalogs";

export default function Cities() {

    const [ciudades, setCiudades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
    const [cargando, setCargando] = useState(true);

    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    useEffect(() => {
        cargarDepartamentos();
    }, []);

    useEffect(() => {
        cargarCiudades(pagina, departamentoSeleccionado);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina]);

    const cargarDepartamentos = async () => {
        try {
            const res = await getDepartamentosService();
            setDepartamentos(Array.isArray(res) ? res : res.data ?? []);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los departamentos.",
            });
        }
    };

    const cargarCiudades = async (paginaSolicitada = 1, idDepartamento = "") => {
        setCargando(true);

        try {
            const res = idDepartamento
                ? await getCiudadesPorDepartamentoService(idDepartamento, paginaSolicitada)
                : await getCiudadesService(paginaSolicitada);

            console.log("Respuesta ciudades:", res); // <-- TEMPORAL: revisa esto en la consola

            const resultados = res?.data?.resultados ?? [];
            const meta = res?.data?.paginacion ?? {
                total_pages: 1,
                current_page: 1,
                count: resultados.length,
            };

            setCiudades(resultados);
            setTotalPaginas(meta.total_pages);
            setTotalRegistros(meta.count);
            setPagina(meta.current_page);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar las ciudades.",
            });
        } finally {
            setCargando(false);
        }
    };

    const cambiarDepartamento = async (e) => {
        const id = e.target.value;
        setDepartamentoSeleccionado(id);
        await cargarCiudades(1, id);
        setPagina(1);
    };

    const columnas = [
        { key: "nombre_ciudad", label: "Ciudad" },
        { key: "nombre_departamento", label: "Departamento" },
    ];

    return (
        <>
            <div style={{ marginBottom: "20px", maxWidth: "300px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                    Departamento
                </label>
                <select
                    value={departamentoSeleccionado}
                    onChange={cambiarDepartamento}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px" }}
                >
                    <option value="">Todos los departamentos</option>
                    {departamentos.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                            {dep.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <DataTable
                titulo="Ciudades"
                columnas={columnas}
                datos={ciudades}
                cargando={cargando}
                campoBusqueda="nombre_ciudad"
                placeholderBusqueda="Buscar ciudad..."
                mostrarBotonNuevo={false}
                mostrarAcciones={false}
            />

            <Pagination
                paginaActual={pagina}
                totalPaginas={totalPaginas}
                totalRegistros={totalRegistros}
                onCambiarPagina={setPagina}
                cargando={cargando}
            />
        </>
    );
}