"use client";
import { useEffect, useState } from "react";
import { useCrud } from "../../../../components/hooks/useCrud";
import useAdminRealtimeRefresh from "../../../../components/admin/useAdminRealtimeRefresh";
import DataTable from "../../../../components/ui/DataTable/DataTable";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import { getDoctoresService } from "@/app/services/adminServices";
import useAccountAccess from "../../../../components/admin/AccountAccess/useAccountAccess";
import AccountAccessButton from "../../../../components/admin/AccountAccess/AccountAccessButton";
import pageStyles from "../adminPages.module.css";
import FilterBar from "../../../../components/ui/FilterBar/FilterBar";
import { getEspecialidadesService } from "@/app/services/doctorServices";

const estadosCuenta = [
  { value: "activo", label: "Activos" },
  { value: "bloqueado", label: "Bloqueados" },
];

export default function Doctors() {
  const [especialidades, setEspecialidades] = useState([]);
  const [errorEspecialidades, setErrorEspecialidades] = useState(false);
  const [recargaEspecialidades, setRecargaEspecialidades] = useState(0);
  const crud = useCrud({
    getService: getDoctoresService,
    paginado: true,
  })
  useEffect(() => {
    let activo = true;
    setErrorEspecialidades(false);
    getEspecialidadesService()
      .then((respuesta) => {
        if (activo && Array.isArray(respuesta?.data)) {
          setEspecialidades(respuesta.data.map(({ id, nombre }) => ({ value: id, label: nombre })));
        }
      })
      .catch(() => { if (activo) setErrorEspecialidades(true); });
    return () => { activo = false; };
  }, [recargaEspecialidades]);
  const { cambiarAcceso, cuentaEnProceso } = useAccountAccess("medico", crud.recargarSilencioso)
  useAdminRealtimeRefresh("medicos", crud.recargarSilencioso, {
    pausado: cuentaEnProceso !== null,
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
      <AdminPageHeader eyebrow="Personas" title="Médicos" description="Consulta y administra los profesionales aprobados en DocSmart." />
      <section className={pageStyles.tableSection} aria-label="Listado de médicos">
        <FilterBar
          stacked
          searchValue={crud.busqueda}
          onSearch={crud.setBusqueda}
          searchLabel="Buscar médico por nombre, apellido o cédula"
          placeholder="Nombre, apellido o cédula"
          filters={[
            { key: "estado", label: "Acceso", value: crud.filtros.estado ?? "", options: estadosCuenta, allLabel: "Todos", onChange: (valor) => crud.setFiltro("estado", valor) },
            { key: "especialidad", label: "Especialidad", value: crud.filtros.especialidad ?? "", options: especialidades, allLabel: "Todas", disabled: especialidades.length === 0, onChange: (valor) => crud.setFiltro("especialidad", valor) },
          ]}
          onClear={crud.limpiarFiltros}
        />
        {errorEspecialidades && (
          <p className={pageStyles.filterNotice} role="status">
            No se pudieron cargar las especialidades.
            <button type="button" onClick={() => setRecargaEspecialidades((actual) => actual + 1)}>Reintentar</button>
          </p>
        )}
        <DataTable
          centrarAcciones={true}
          mostrarEditar={false}
          titulo="Doctores"
          renderAcciones={(item) => <AccountAccessButton cuenta={item} onCambiar={cambiarAcceso} disabled={cuentaEnProceso !== null} />}
          datos={crud.datos}
          cargando={crud.cargando}
          columnas={columnas}
          mostrarBotonNuevo={false}
          mostrarBusqueda={false}
          emptyTitle={crud.busqueda || crud.filtros.estado || crud.filtros.especialidad ? "Sin médicos para estos filtros" : "Aún no hay médicos"}
          emptyDescription="Prueba otro nombre, apellido, cédula, especialidad o estado de acceso."
          indiceInicial={(crud.pagina - 1) * crud.paginacion.page_size}
          textoConteo={`${crud.paginacion.count} médicos encontrados`}
          mostrarEncabezado={false}
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
    </div>
  );
}
