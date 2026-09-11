"use client";
import { useCrud } from "../../../../components/hooks/useCrud";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import { getDoctoresService, deleteDoctorService } from "@/app/services/adminServices";
import pageStyles from "../adminPages.module.css";

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
      key: "cedula",
      label: "Cedula"
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
    <div className={pageStyles.page}>
      <AdminPageHeader eyebrow="Personas" title="Médicos" description="Consulta y administra los profesionales registrados en DocSmart." />
      <section className={pageStyles.tableSection} aria-label="Listado de médicos">
        <DataTable
          centrarAcciones={true}
          mostrarEditar={false}
          titulo="Doctores"
          onEliminar={crud.eliminar}
          datos={crud.datos}
          cargando={crud.cargando}
          columnas={columnas}
          mostrarBotonNuevo={false}
          campoBusqueda="cedula"
          placeholderBusqueda="Buscar por cédula..."
          mostrarEncabezado={false}
        />
      </section>
    </div>
  );
}
