"use client";
import Hero from "../../../../components/admin/Doctor/Hero";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import { getDoctoresService, deleteDoctorService } from "@/app/services/adminServices";
import styles from "./doctors.module.css";

export default function Doctors() {
  const crud = useCrud({
    getService: getDoctoresService,
    eliminarService: deleteDoctorService
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
      key: "especialidad",
      label: "Especialidad"
    },
    {
      key: "ciudad",
      label: "Ciudad"
    },
    {
      key: "departamento",
      label: "Departamento"
    },
    {
      key: "direccion",
      label: "Direccion"
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
          centrarAcciones={true}
          mostrarEditar={false}
          titulo="Doctores"
          onEliminar={crud.eliminar}
          datos={crud.datos}
          cargando={crud.cargando}
          columnas={columnas}
          mostrarBotonNuevo={false}
        />
      </div>
    </>
  );
}
