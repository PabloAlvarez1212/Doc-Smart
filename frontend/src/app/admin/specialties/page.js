"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import Modal from "../../../../components/ui/Modal/Modal";

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
        <>
            <DataTable
                titulo="Especialidades"
                columnas={columnas}
                datos={crud.datos}
                cargando={crud.cargando}
                onNuevo={crud.abrirModalNuevo}
                onEditar={crud.abrirModalEditar}
                onEliminar={crud.eliminar}
            />

            <Pagination
                paginaActual={crud.pagina}
                totalPaginas={crud.paginacion.total_pages}
                totalRegistros={crud.paginacion.count}
                onCambiarPagina={crud.setPagina}
                cargando={crud.cargando}
            />

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
        </>
    );
}