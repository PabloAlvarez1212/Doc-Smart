"use client"

import Hero from "../../../../components/admin/Paciente/Hero/Hero"
import DataTable from "../../../../components/ui/DataTable/DataTable"
import styles from "./patients.module.css"
import { useCrud } from "../../../../components/hooks/useCrud";
import { getPacientesService,deletePacienteService } from "@/app/services/adminServices";
export default function Patients() {
    const crud = useCrud({
        getService: getPacientesService,
        eliminarService: deletePacienteService
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
            key: "telefono",
            label: "Telefono"
        },
        {
            key: "correo",
            label: "Correo"
        },
    ];
    return (
        <>
            <Hero />
            <div className={styles.containerTable}>
                <DataTable
                    titulo="Pacientes"
                    columnas={columnas}
                    mostrarBotonNuevo={false}
                    cargando={crud.cargando}
                    datos={crud.datos}
                    mostrarEditar={false}
                    centrarAcciones={true}
                    onEliminar={crud.eliminar}
                />
            </div>

        </>
    )
}