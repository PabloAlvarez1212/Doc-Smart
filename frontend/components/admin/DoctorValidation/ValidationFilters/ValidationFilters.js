"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import SelectSearch from "../../../ui/SelectSearch/SelectSearch";
import styles from "./ValidationFilters.module.css";

export default function ValidationFilters({
    especialidades,
    estados,
    departamentos,
    ciudades,
    estadoSeleccionado,setEstadoSeleccionado,
    especialidadSelecionada,setEspecialidadSeleccionada,
    departamentoSeleccionado,setDepartamentoSeleccionado,
    ciudadSeleccionada,setCiudadSeleccionada
}) {
    
    return (
        <section className={styles.panel} aria-labelledby="validation-filters-title">
            <div className={styles.heading}>
                <span className={styles.headingIcon}><SlidersHorizontal size={17} /></span>
                <div>
                    <h2 id="validation-filters-title">Filtrar solicitudes</h2>
                    <p>Controles preparados para la futura integración.</p>
                </div>
            </div>

            <div className={styles.controls} role="search">
                <label className={`${styles.field} ${styles.searchField}`}>
                    <span>Buscar médico</span>
                    <span className={styles.searchControl}>
                        <Search size={17} aria-hidden="true" />
                        <input type="search" placeholder="Nombre o cédula" readOnly aria-label="Buscar médico por nombre o cédula" />
                    </span>
                </label>

                <div className={styles.field}>
                    <label htmlFor="request-specialty">Especialidad</label>
                    <SelectSearch className={styles.selectControl} inputId="request-specialty" ariaLabel="Filtrar por especialidad" placeholder="Todas" opciones={especialidades} onChange={setEspecialidadSeleccionada} value={especialidadSelecionada} />
                </div>

                <div className={styles.field}>
                    <label htmlFor="request-status">Estado</label>
                    <SelectSearch className={styles.selectControl} inputId="request-status" ariaLabel="Filtrar por estado" placeholder="Todos" opciones={estados} onChange={setEstadoSeleccionado} value={estadoSeleccionado} />
                </div>

                <div className={styles.field}>
                    <label htmlFor="request-department">Departamento</label>
                    <SelectSearch className={styles.selectControl} inputId="request-department" ariaLabel="Filtrar por departamento" placeholder="Todos los departamentos" opciones={departamentos} onChange={setDepartamentoSeleccionado} value={departamentoSeleccionado} />
                </div>

                <div className={styles.field}>
                    <label htmlFor="request-city">Ciudad</label>
                    <SelectSearch
                        className={styles.selectControl}
                        inputId="request-city"
                        ariaLabel="Filtrar por ciudad"
                        placeholder={departamentoSeleccionado ? "Todas las ciudades" : "Seleccione departamento"}
                        value={ciudadSeleccionada}
                        opciones={ciudades}
                        onChange={setCiudadSeleccionada}
                        disabled={!departamentoSeleccionado}
                    />
                </div>

                <button type="button" className={styles.clearButton} disabled>
                    <RotateCcw size={15} aria-hidden="true" />
                    Limpiar
                </button>
            </div>
        </section>
    );
}
