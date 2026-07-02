"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Modal from "../../../../components/ui/Modal/Modal";

import {
    crearEspecialidadService,
    getEspecialidadesService,
    editarEspecialidadService,
    eliminarEspecialidadService,
} from "@/app/services/doctorServices";

export default function Especialidad() {

    const crud = useCrud({
        getService: getEspecialidadesService,
        crearService: crearEspecialidadService,
        editarService: editarEspecialidadService,
        eliminarService: eliminarEspecialidadService,
        camposIniciales: {
            nombre: "",
        },
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