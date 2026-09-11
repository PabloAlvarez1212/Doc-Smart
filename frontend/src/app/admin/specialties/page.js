"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import Modal from "../../../../components/ui/Modal/Modal";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import Button from "../../../../components/ui/Button/Button";
import { Plus } from "lucide-react";
import pageStyles from "../adminPages.module.css";

import {
    crearEspecialidadService,
    getEspecialidadesService,
    editarEspecialidadService,
    eliminarEspecialidadService,
} from "@/app/services/doctorServices";

export default function Especialidad() {

    const crud = useCrud({
        getService: (page, search) => getEspecialidadesService(page, search),
        crearService: crearEspecialidadService,
        editarService: editarEspecialidadService,
        eliminarService: eliminarEspecialidadService,
        camposIniciales: {
            nombre: "",
        },
        paginado: true,
    });

    const columnas = [
        {
            key: "nombre",
            label: "Nombre",
        },
    ];

    return (
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Catálogos" title="Especialidades" description="Administra las especialidades disponibles para los profesionales de DocSmart." action={<Button size="sm" onClick={crud.abrirModalNuevo}><Plus size={17} /> Nueva especialidad</Button>} />
            <section className={pageStyles.tableSection} aria-label="Listado de especialidades">
            <DataTable
                titulo="Especialidades"
                columnas={columnas}
                datos={crud.datos}
                cargando={crud.cargando}
                onNuevo={crud.abrirModalNuevo}
                onEditar={crud.abrirModalEditar}
                onEliminar={crud.eliminar}
                mostrarEncabezado={false}
                placeholderBusqueda="Buscar especialidad..."
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

            <Modal
                abierto={crud.modalAbierto}
                onCerrar={crud.cerrarModal}
                titulo={
                    crud.modoEdicion
                        ? "Editar Especialidad"
                        : "Nueva Especialidad"
                }
            >
                <FormCatalogo
                    formData={crud.formData}
                    handleChange={crud.handleChange}
                    onSubmit={crud.guardar}
                    modoEdicion={crud.modoEdicion}
                    guardando={crud.guardando}
                />
            </Modal>
        </div>
    );
}
