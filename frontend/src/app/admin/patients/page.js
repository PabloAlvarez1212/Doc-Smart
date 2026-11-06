"use client"

import DataTable from "../../../../components/ui/DataTable/DataTable"
import Pagination from "../../../../components/ui/Pagination/Pagination"
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader"
import pageStyles from "../adminPages.module.css"
import { useCrud } from "../../../../components/hooks/useCrud";
import useAdminRealtimeRefresh from "../../../../components/admin/useAdminRealtimeRefresh";
import { getPacientesService } from "@/app/services/adminServices";
import useAccountAccess from "../../../../components/admin/AccountAccess/useAccountAccess";
import AccountAccessButton from "../../../../components/admin/AccountAccess/AccountAccessButton";
import FilterBar from "../../../../components/ui/FilterBar/FilterBar";

const estadosCuenta = [
    { value: "activo", label: "Activos" },
    { value: "bloqueado", label: "Bloqueados" },
];

export default function Patients() {
    const crud = useCrud({
        getService: getPacientesService,
        paginado: true,
    })
    const { cambiarAcceso, cuentaEnProceso } = useAccountAccess("paciente", crud.recargarSilencioso)
    useAdminRealtimeRefresh("pacientes", crud.recargarSilencioso, {
        pausado: cuentaEnProceso !== null,
    })
    const columnas = [
        {
            key: "id",
            label: "Id",
        },
        {
            key: "nombre",
            label: "Nombre",
        },
        {
            key: "apellido",
            label: "Apellido"
        },
        {
            key: "cedula",
            label: "Cedula"
        },
        {
            key: "telefono",
            label: "Telefono"
        },
        {
            key: "correo",
            label: "Correo"
        },
    ];
    return (
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Personas" title="Pacientes" description="Consulta las cuentas de pacientes y administra su acceso al sistema." />
            <section className={pageStyles.tableSection} aria-label="Listado de pacientes">
                <FilterBar
                    searchValue={crud.busqueda}
                    onSearch={crud.setBusqueda}
                    searchLabel="Buscar paciente por nombre, apellido o cédula"
                    placeholder="Nombre, apellido o cédula"
                    filters={[{
                        key: "estado", label: "Acceso", value: crud.filtros.estado ?? "",
                        options: estadosCuenta, allLabel: "Todos", onChange: (valor) => crud.setFiltro("estado", valor),
                    }]}
                    onClear={crud.limpiarFiltros}
                />
                <DataTable
                    titulo="Pacientes"
                    columnas={columnas}
                    mostrarBotonNuevo={false}
                    cargando={crud.cargando}
                    datos={crud.datos}
                    mostrarEditar={false}
                    centrarAcciones={true}
                    renderAcciones={(item) => <AccountAccessButton cuenta={item} onCambiar={cambiarAcceso} disabled={cuentaEnProceso !== null} />}
                    mostrarBusqueda={false}
                    emptyTitle={crud.busqueda || crud.filtros.estado ? "Sin pacientes para estos filtros" : "Aún no hay pacientes"}
                    emptyDescription="Prueba otro nombre, apellido, cédula o estado de acceso."
                    indiceInicial={(crud.pagina - 1) * crud.paginacion.page_size}
                    textoConteo={`${crud.paginacion.count} pacientes encontrados`}
                    mostrarEncabezado={false}
                />

                <Pagination
                    paginaActual={crud.pagina}
                    totalPaginas={crud.paginacion.total_pages}
                    totalRegistros={crud.paginacion.count}
                    onCambiarPagina={crud.setPagina}
                    cargando={crud.cargando}
                    variant="admin"
                />
            </section>
        </div>
    )
}
