"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Modal from "../../../../components/ui/Modal/Modal";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import pageStyles from "../adminPages.module.css";
import Button from "../../../../components/ui/Button/Button";
import { Plus } from "lucide-react";

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
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Catálogos" title="Roles" description="Administra los perfiles de acceso definidos para DocSmart." action={<Button size="sm" onClick={crud.abrirModalNuevo}><Plus size={17} /> Nuevo rol</Button>} />
            <section className={pageStyles.tableSection} aria-label="Listado de roles">
            <DataTable
                titulo="Roles"
                columnas={columnas}
                datos={crud.datos}
                cargando={crud.cargando}
                onNuevo={crud.abrirModalNuevo}
                onEditar={crud.abrirModalEditar}
                onEliminar={crud.eliminar}
                mostrarEncabezado={false}
            />
            </section>

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
        </div>
    );
}
