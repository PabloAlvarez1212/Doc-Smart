"use client"

import DataTable from "../../../../components/ui/DataTable/DataTable"
import Pagination from "../../../../components/ui/Pagination/Pagination"
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader"
import pageStyles from "../adminPages.module.css"
import { useCrud } from "../../../../components/hooks/useCrud";
import { getPacientesService, deletePacienteService } from "@/app/services/adminServices";

export default function Patients() {
    const crud = useCrud({
        getService: (page, search) => getPacientesService(page, search),
        eliminarService: deletePacienteService,
        paginado: true,
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
            <AdminPageHeader eyebrow="Personas" title="Pacientes" description="Consulta las cuentas de pacientes y gestiona su permanencia en el sistema." />
            <section className={pageStyles.tableSection} aria-label="Listado de pacientes">
                <DataTable
                    titulo="Pacientes"
                    columnas={columnas}
                    mostrarBotonNuevo={false}
                    cargando={crud.cargando}
                    datos={crud.datos}
                    mostrarEditar={false}
                    centrarAcciones={true}
                    onEliminar={crud.eliminar}
                    campoBusqueda="cedula"
                    placeholderBusqueda="Buscar por cédula..."
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
