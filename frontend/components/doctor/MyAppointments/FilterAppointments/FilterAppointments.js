"use client";

import FilterBar from "../../../ui/FilterBar/FilterBar";

export default function FilterAppointments({
    paciente,
    fecha,
    cambiarPaciente,
    cambiarFecha,
    limpiarFiltros,
}) {
    return (
        <FilterBar
            searchValue={paciente}
            onSearch={cambiarPaciente}
            searchLabel="Buscar paciente"
            placeholder="Paciente, cédula o correo"
            onClear={limpiarFiltros}
            filters={[
                { key: "fecha", type: "date", label: "Fecha", value: fecha, onChange: cambiarFecha },
            ]}
        />
    );
}
