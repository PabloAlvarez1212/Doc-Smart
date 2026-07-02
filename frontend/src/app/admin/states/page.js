"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import Modal from "../../../../components/ui/Modal/Modal";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";

import {
    getEstadosService,
    crearEstadosService,
    editarEstadosService,
    eliminarEstadosService,
} from "@/app/services/catalogs";

export default function States() {

    const crud = useCrud({
        getService: getEstadosService,
        crearService: crearEstadosService,
        editarService: editarEstadosService,
        eliminarService: eliminarEstadosService,
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
                titulo="Estados"
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
                titulo={crud.modoEdicion ? "Editar Estado" : "Nuevo Estado"}
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