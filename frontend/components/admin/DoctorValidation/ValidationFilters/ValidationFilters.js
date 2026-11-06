"use client";

import FilterBar from "../../../ui/FilterBar/FilterBar";

export default function ValidationFilters({
    especialidades,
    estados,
    departamentos,
    ciudades,
    estadoSeleccionado, setEstadoSeleccionado,
    especialidadSelecionada, setEspecialidadSeleccionada,
    departamentoSeleccionado, setDepartamentoSeleccionado,
    ciudadSeleccionada, setCiudadSeleccionada,
    limpiarFiltros,
    busqueda,
    setBusqueda,
}) {
    return (
        <FilterBar
            stacked
            searchValue={busqueda}
            onSearch={setBusqueda}
            searchLabel="Buscar médico por nombre o cédula"
            placeholder="Nombre o cédula"
            onClear={limpiarFiltros}
            filters={[
                { key: "estado", label: "Estado", value: estadoSeleccionado, options: estados ?? [], allLabel: "Todos", onChange: setEstadoSeleccionado },
                { key: "especialidad", label: "Especialidad", value: especialidadSelecionada, options: especialidades ?? [], allLabel: "Todas", onChange: setEspecialidadSeleccionada },
                { key: "departamento", label: "Departamento", value: departamentoSeleccionado, options: departamentos ?? [], allLabel: "Todos", onChange: setDepartamentoSeleccionado },
                { key: "ciudad", label: "Ciudad", value: ciudadSeleccionada, options: ciudades ?? [], allLabel: "Todas", disabled: !departamentoSeleccionado, onChange: setCiudadSeleccionada },
            ]}
        />
    );
}
