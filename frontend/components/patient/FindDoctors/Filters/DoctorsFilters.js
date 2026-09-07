"use client";

import { useState } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Button from "../../../ui/Button/Button";
import SelectSearch from "../../../ui/SelectSearch/SelectSearch";
import styles from "./DoctorsFilters.module.css";

const INITIAL_FILTERS = {
    search: "",
    specialty: "",
    department: "",
    city: "",
};

const toSelectOptions = (items) => items.map((item) => ({
    value: String(item.id ?? item.id_ciudad),
    label: item.nombre || item.nombre_ciudad,
}));

export default function DoctorsFilters({
    especialidades = [],
    departamentos = [],
    ciudades = [],
    departamentoSeleccionado,
    cambiarDepartamento,
}) {
    const [visualFilters, setVisualFilters] = useState(INITIAL_FILTERS);

    const updateVisualFilter = (field, value) => {
        setVisualFilters((current) => ({ ...current, [field]: value }));
    };

    const resetVisualFilters = () => {
        setVisualFilters(INITIAL_FILTERS);
        cambiarDepartamento("");
    };

    const specialtyOptions = toSelectOptions(especialidades);
    const departmentOptions = toSelectOptions(departamentos);
    const cityOptions = toSelectOptions(ciudades);
    const handleDepartmentChange = (value) => {
        updateVisualFilter("department", value)
        updateVisualFilter("city", "")
        cambiarDepartamento(value)
    }
    return (
        <section className={styles.panel} aria-labelledby="doctor-filters-title">
            <div className={styles.panelHeading}>
                <div className={styles.titleGroup}>
                    <span className={styles.headingIcon} aria-hidden="true">
                        <SlidersHorizontal size={19} />
                    </span>
                    <div>
                        <p>Directorio médico</p>
                        <h2 id="doctor-filters-title">Encontrar especialistas</h2>
                    </div>
                </div>
                <p className={styles.supportingText}>Busca por profesional y prepara tu selección por especialidad o ubicación.</p>
            </div>

            <form
                className={styles.filters}
                role="search"
                aria-label="Filtros del directorio médico"
                onSubmit={(event) => event.preventDefault()}
            >
                <label className={styles.searchField}>
                    <span>Buscar médico</span>
                    <span className={styles.searchControl}>
                        <Search size={19} aria-hidden="true" />
                        <input
                            type="search"
                            name="doctor-search"
                            placeholder="Nombre del profesional"
                            autoComplete="off"
                            value={visualFilters.search}
                            onChange={(event) => updateVisualFilter("search", event.target.value)}
                        />
                    </span>
                </label>

                <div className={styles.field}>
                    <label htmlFor="doctor-specialty-filter">Especialidad</label>
                    <SelectSearch
                        inputId="doctor-specialty-filter"
                        ariaLabel="Seleccionar especialidad"
                        opciones={specialtyOptions}
                        value={visualFilters.specialty}
                        onChange={(value) => updateVisualFilter("specialty", value)}
                        placeholder="Todas las especialidades"
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="doctor-department-filter">Departamento</label>
                    <SelectSearch
                        inputId="doctor-department-filter"
                        ariaLabel="Seleccionar departamento"
                        opciones={departmentOptions}
                        value={visualFilters.department}
                        onChange={handleDepartmentChange}
                        placeholder="Todos los departamentos"
                    />
                </div>

                <SelectSearch
                    inputId="doctor-city-filter"
                    ariaLabel="Seleccionar ciudad"
                    opciones={cityOptions}
                    value={visualFilters.city}
                    onChange={(value) =>
                        updateVisualFilter("city", value)
                    }
                    placeholder={
                        departamentoSeleccionado
                            ? "Todas las ciudades"
                            : "Seleccione departamento"
                    }
                    disabled={!departamentoSeleccionado}
                />

                <Button
                    className={styles.reset}
                    variant="secundary"
                    type="button"
                    onClick={resetVisualFilters}
                >
                    <RotateCcw size={17} aria-hidden="true" /> Limpiar filtros
                </Button>
            </form>
        </section>
    );
}
