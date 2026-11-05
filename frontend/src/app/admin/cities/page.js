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

    const [busqueda, setBusqueda] = useState("");
    const [consulta, setConsulta] = useState({ pagina: 1, search: "", departamento: "" });
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    useEffect(() => {
        cargarDepartamentos();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setConsulta((actual) => actual.search === busqueda.trim() && actual.pagina === 1
                ? actual
                : { ...actual, pagina: 1, search: busqueda.trim() });
        }, 300);
        return () => clearTimeout(timeout);
    }, [busqueda]);

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

    useEffect(() => {
        let activo = true;
        const cargarCiudades = async () => {
        setCargando(true);

        try {
            const res = consulta.departamento
                ? await getCiudadesPorDepartamentoService(consulta.departamento, consulta.pagina, consulta.search)
                : await getCiudadesService(consulta.pagina, consulta.search);

            const resultados = res?.data?.resultados ?? [];
            const meta = res?.data?.paginacion ?? {
                total_pages: 1,
                current_page: 1,
                count: resultados.length,
            };

            if (activo) {
                setCiudades(resultados);
                setTotalPaginas(meta.total_pages);
                setTotalRegistros(meta.count);
            }
        } catch (error) {
            if (activo) Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar las ciudades.",
            });
        } finally {
            if (activo) setCargando(false);
        }
        };
        cargarCiudades();
        return () => { activo = false; };
    }, [consulta]);

    const cambiarDepartamento = (e) => {
        const id = e.target.value;
        setDepartamentoSeleccionado(id);
        setConsulta((actual) => ({ ...actual, pagina: 1, departamento: id }));
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
                valorBusqueda={busqueda}
                onBuscar={setBusqueda}
                mostrarBotonNuevo={false}
                mostrarAcciones={false}
                mostrarEncabezado={false}
            />

            <Pagination
                paginaActual={consulta.pagina}
                totalPaginas={totalPaginas}
                totalRegistros={totalRegistros}
                onCambiarPagina={(pagina) => setConsulta((actual) => ({ ...actual, pagina }))}
                cargando={cargando}
                variant="admin"
            />
            </section>
        </div>
    );
}
