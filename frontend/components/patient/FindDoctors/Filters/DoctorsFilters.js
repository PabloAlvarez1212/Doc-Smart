"use client";

import {
    RotateCcw,
    Search,
    SlidersHorizontal
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import SelectSearch from "../../../ui/SelectSearch/SelectSearch";
import styles from "./DoctorsFilters.module.css";


const toSelectOptions = (items) =>
    items.map((item) => ({
        value: String(
            item.id ?? item.id_ciudad
        ),
        label:
            item.nombre ??
            item.nombre_ciudad
    }));


export default function DoctorsFilters({

    especialidades = [],
    departamentos = [],
    ciudades = [],

    filtros,

    departamentoSeleccionado,

    cambiarEspecialidad,
    cambiarDepartamento,
    cambiarCiudad,

    limpiarFiltros,
    cambiarBusqueda,

}) {

    const specialtyOptions =
        toSelectOptions(especialidades);

    const departmentOptions =
        toSelectOptions(departamentos);

    const cityOptions =
        toSelectOptions(ciudades);


    return (
        <section
            className={styles.panel}
            aria-labelledby="doctor-filters-title"
        >

            <div className={styles.panelHeading}>

                <div className={styles.titleGroup}>

                    <span
                        className={styles.headingIcon}
                        aria-hidden="true"
                    >
                        <SlidersHorizontal size={19} />
                    </span>

                    <div>
                        <p>
                            Directorio médico
                        </p>

                        <h2 id="doctor-filters-title">
                            Encontrar especialistas
                        </h2>
                    </div>

                </div>

                <p className={styles.supportingText}>
                    Busca por profesional y prepara tu selección
                    por especialidad o ubicación.
                </p>

            </div>


            <form
                className={styles.filters}
                role="search"
                aria-label="Filtros del directorio médico"
                onSubmit={(event) =>
                    event.preventDefault()
                }
            >

                <label className={styles.searchField}>

                    <span>
                        Buscar médico
                    </span>

                    <span className={styles.searchControl}>

                        <Search
                            size={19}
                            aria-hidden="true"
                        />

                        <input
                            type="search"
                            name="doctor-search"
                            placeholder="Nombre del profesional"
                            autoComplete="off"
                            value={filtros.search}
                            onChange={(event) =>
                                cambiarBusqueda(event.target.value)
                            }
                        /> 
                    </span>

                </label>

                <div className={styles.field}>

                    <label htmlFor="doctor-specialty-filter">
                        Especialidad
                    </label>

                    <SelectSearch
                        inputId="doctor-specialty-filter"
                        ariaLabel="Seleccionar especialidad"
                        opciones={specialtyOptions}
                        value={filtros.especialidad}
                        onChange={cambiarEspecialidad}
                        placeholder="Todas las especialidades"
                    />

                </div>

                <div className={styles.field}>

                    <label htmlFor="doctor-department-filter">
                        Departamento
                    </label>

                    <SelectSearch
                        inputId="doctor-department-filter"
                        ariaLabel="Seleccionar departamento"
                        opciones={departmentOptions}
                        value={filtros.departamento}
                        onChange={cambiarDepartamento}
                        placeholder="Todos los departamentos"
                    />

                </div>


                <div className={styles.field}>

                    <label htmlFor="doctor-city-filter">
                        Ciudad
                    </label>

                    <SelectSearch
                        inputId="doctor-city-filter"
                        ariaLabel="Seleccionar ciudad"
                        opciones={cityOptions}
                        value={filtros.ciudad}
                        onChange={cambiarCiudad}
                        placeholder={
                            departamentoSeleccionado
                                ? "Todas las ciudades"
                                : "Seleccione departamento"
                        }
                        disabled={
                            !departamentoSeleccionado
                        }
                    />

                </div>

                <Button
                    className={styles.reset}
                    variant="secundary"
                    type="button"
                    onClick={limpiarFiltros}
                >
                    <RotateCcw
                        size={17}
                        aria-hidden="true"
                    />

                    Limpiar filtros
                </Button>

            </form>

        </section>
    );
}