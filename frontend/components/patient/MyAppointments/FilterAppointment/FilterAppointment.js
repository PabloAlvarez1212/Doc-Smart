"use client";

import FilterBar from "../../../ui/FilterBar/FilterBar";

export default function FilterAppointment({
    dataEspecialidades,
    dataDepartamentos,
    dataCiudades,
    filtros,
    cambiarFiltro,
}) {
    const limpiar = () => {
        ["especialidad", "departamento", "ciudad", "fecha_programada"].forEach((campo) => cambiarFiltro(campo, ""));
    };

    return (
        <FilterBar
            searchValue={filtros.busqueda}
            onSearch={(value) => cambiarFiltro("busqueda", value)}
            searchLabel="Profesional o código de cita"
            placeholder="Profesional o código de cita"
            onClear={limpiar}
            filters={[
                { key: "especialidad", label: "Especialidad", value: filtros.especialidad, options: dataEspecialidades.map((item) => ({ value: item.nombre, label: item.nombre })), allLabel: "Todas", onChange: (value) => cambiarFiltro("especialidad", value) },
                { key: "departamento", label: "Departamento", value: filtros.departamento, options: dataDepartamentos.map((item) => ({ value: item.id, label: item.nombre })), allLabel: "Todos", onChange: (value) => { cambiarFiltro("departamento", value); cambiarFiltro("ciudad", ""); } },
                { key: "ciudad", label: "Ciudad", value: filtros.ciudad, options: dataCiudades.map((item) => ({ value: item.id_ciudad, label: item.nombre_ciudad })), allLabel: "Todas", disabled: !filtros.departamento, onChange: (value) => cambiarFiltro("ciudad", value) },
                { key: "fecha", type: "date", label: "Fecha", value: filtros.fecha_programada, onChange: (value) => cambiarFiltro("fecha_programada", value) },
            ]}
        />
    );
}
