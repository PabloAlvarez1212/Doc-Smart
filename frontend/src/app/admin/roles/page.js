"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Modal from "../../../../components/ui/Modal/Modal";

import {
    getRolesService,
    crearRolService,
    editarRolService,
    eliminarRolService,
} from "@/app/services/catalogs";

export default function Roles() {

    const crud = useCrud({
        getService: getRolesService,
        crearService: crearRolService,
        editarService: editarRolService,
        eliminarService: eliminarRolService,
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
                titulo="Roles"
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
                titulo={crud.modoEdicion ? "Editar Rol" : "Nuevo Rol"}
            >
                <FormCatalogo
                    formData={crud.formData}
                    handleChange={crud.handleChange}
                    onSubmit={crud.guardar}
                    modoEdicion={crud.modoEdicion}
                />
            </Modal>
        </>
    );
}