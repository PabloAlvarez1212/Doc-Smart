"use client";

import FilterBar from "../../../ui/FilterBar/FilterBar";

const toSelectOptions = (items) =>
    items.map((item) => ({
        value: String(item.id ?? item.id_ciudad),
        label: item.nombre ?? item.nombre_ciudad,
    }));

const ratingOptions = [
    { value: "3", label: "3 estrellas o más" },
    { value: "4", label: "4 estrellas o más" },
    { value: "4.5", label: "4.5 estrellas o más" },
    { value: "5", label: "5 estrellas" },
];

export default function DoctorsFilters({
    especialidades = [],
    departamentos = [],
    ciudades = [],
    filtros,
    departamentoSeleccionado,
    cambiarEspecialidad,
    cambiarDepartamento,
    cambiarCiudad,
    cambiarCalificacionMinima,
    limpiarFiltros,
    cambiarBusqueda,
}) {
    return (
        <FilterBar
            searchValue={filtros.search}
            onSearch={cambiarBusqueda}
            searchLabel="Buscar médico"
            placeholder="Buscar médico"
            onClear={limpiarFiltros}
            filters={[
                { key: "especialidad", label: "Especialidad", value: filtros.especialidad, options: toSelectOptions(especialidades), allLabel: "Todas", onChange: cambiarEspecialidad },
                { key: "departamento", label: "Departamento", value: filtros.departamento, options: toSelectOptions(departamentos), allLabel: "Todos", onChange: cambiarDepartamento },
                { key: "ciudad", label: "Ciudad", value: filtros.ciudad, options: toSelectOptions(ciudades), allLabel: "Todas", disabled: !departamentoSeleccionado, onChange: cambiarCiudad },
                { key: "calificacion", label: "Calificación", value: filtros.calificacionMinima, options: ratingOptions, allLabel: "Cualquiera", onChange: cambiarCalificacionMinima },
            ]}
        />
    );
}
