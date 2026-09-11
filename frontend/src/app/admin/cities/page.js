"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import pageStyles from "../adminPages.module.css";

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
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Catálogos" title="Ciudades" description="Consulta las ciudades disponibles y acota el listado por departamento." />
            <div className={pageStyles.filterPanel}>
                <div className={pageStyles.field}>
                <label htmlFor="department-filter">
                    Departamento
                </label>
                <select
                    id="department-filter"
                    value={departamentoSeleccionado}
                    onChange={cambiarDepartamento}
                >
                    <option value="">Todos los departamentos</option>
                    {departamentos.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                            {dep.nombre}
                        </option>
                    ))}
                </select>
                </div>
            </div>

            <section className={pageStyles.tableSection} aria-label="Listado de ciudades">
            <DataTable
                titulo="Ciudades"
                columnas={columnas}
                datos={ciudades}
                cargando={cargando}
                campoBusqueda="nombre_ciudad"
                placeholderBusqueda="Buscar ciudad..."
                mostrarBotonNuevo={false}
                mostrarAcciones={false}
                mostrarEncabezado={false}
            />

            <Pagination
                paginaActual={pagina}
                totalPaginas={totalPaginas}
                totalRegistros={totalRegistros}
                onCambiarPagina={setPagina}
                cargando={cargando}
                variant="admin"
            />
            </section>
        </div>
    );
}
