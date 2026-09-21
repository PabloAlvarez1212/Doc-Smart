"use client";

import FormCatalogo from "../../../../components/forms/CatalogoForm/FormCatalogo";
import Modal from "../../../../components/ui/Modal/Modal";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import pageStyles from "../adminPages.module.css";
import Button from "../../../../components/ui/Button/Button";
import { Plus } from "lucide-react";

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
        <div className={pageStyles.page}>
            <AdminPageHeader eyebrow="Catálogos" title="Estados" description="Configura los estados utilizados por los flujos operativos del sistema." action={<Button size="sm" onClick={crud.abrirModalNuevo}><Plus size={17} /> Nuevo estado</Button>} />
            <section className={pageStyles.tableSection} aria-label="Listado de estados">
            <DataTable
                titulo="Estados"
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
        </div>
    );
}
