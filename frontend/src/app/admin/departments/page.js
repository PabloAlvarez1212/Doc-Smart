"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import { getDepartamentosService } from "@/app/services/catalogs";

export default function Departaments() {
    const [departamentos, setDepartamentos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    useEffect(() => {
        cargarDepartamentos(pagina);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina]);

    const cargarDepartamentos = async (paginaSolicitada = 1) => {
        setCargando(true);

        try {
            const res = await getDepartamentosService(paginaSolicitada);
            // res = { ok, mensaje, data: { resultados, paginacion } }
            const resultados = res?.data?.resultados ?? [];
            const meta = res?.data?.paginacion ?? {
                total_pages: 1,
                current_page: 1,
                count: resultados.length,
            };

            setDepartamentos(resultados);
            setTotalPaginas(meta.total_pages);
            setTotalRegistros(meta.count);
            setPagina(meta.current_page);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los departamentos.",
            });
        } finally {
            setCargando(false);
        }
    };

    const columnas = [
        {
            key: "nombre",
            label: "Departamento",
        },
    ];

    return (
        <>
            <DataTable
                titulo="Departamentos"
                columnas={columnas}
                datos={departamentos}
                cargando={cargando}
                campoBusqueda="nombre"
                placeholderBusqueda="Buscar departamento..."
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