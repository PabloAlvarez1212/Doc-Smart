"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import { getDepartamentosService } from "@/app/services/catalogs";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import pageStyles from "../adminPages.module.css";

export default function Departaments() {
    const [departamentos, setDepartamentos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [busqueda, setBusqueda] = useState("");
    const [consulta, setConsulta] = useState({ pagina: 1, search: "" });
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setConsulta((actual) => actual.search === busqueda.trim() && actual.pagina === 1
                ? actual
                : { ...actual, pagina: 1, search: busqueda.trim() });
        }, 300);
        return () => clearTimeout(timeout);
    }, [busqueda]);

    useEffect(() => {
        let activo = true;
        const cargarDepartamentos = async () => {
        setCargando(true);

        try {
            const res = await getDepartamentosService(consulta.pagina, consulta.search);
            // res = { ok, mensaje, data: { resultados, paginacion } }
            const resultados = res?.data?.resultados ?? [];
            const meta = res?.data?.paginacion ?? {
                total_pages: 1,
                current_page: 1,
                count: resultados.length,
            };

            if (activo) {
                setDepartamentos(resultados);
                setTotalPaginas(meta.total_pages);
                setTotalRegistros(meta.count);
            }
        } catch (error) {
            if (activo) Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los departamentos.",
            });
        } finally {
            if (activo) setCargando(false);
        }
        };
        cargarDepartamentos();
        return () => { activo = false; };
    }, [consulta]);

    const columnas = [
        {
            key: "nombre",
            label: "Departamento",
        },
    ];

    return (
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Catálogos" title="Departamentos" description="Consulta la cobertura territorial configurada en la plataforma." />
            <section className={pageStyles.tableSection} aria-label="Listado de departamentos">
            <DataTable
                titulo="Departamentos"
                columnas={columnas}
                datos={departamentos}
                cargando={cargando}
                campoBusqueda="nombre"
                placeholderBusqueda="Buscar departamento..."
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
