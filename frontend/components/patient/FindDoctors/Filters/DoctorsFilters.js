import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./DoctorsFilters.module.css";

export default function DoctorsFilters() {
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
                        />
                    </span>
                </label>

                <label className={styles.field}>
                    <span>Especialidad</span>
                    <select name="specialty" defaultValue="" aria-label="Seleccionar especialidad">
                        <option value="">Todas las especialidades</option>
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Departamento</span>
                    <select name="department" defaultValue="" aria-label="Seleccionar departamento">
                        <option value="">Todos los departamentos</option>
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Ciudad</span>
                    <select name="city" defaultValue="" aria-label="Seleccionar ciudad">
                        <option value="">Todas las ciudades</option>
                    </select>
                </label>

                <Button className={styles.reset} variant="secundary" type="reset">
                    <RotateCcw size={17} aria-hidden="true" /> Limpiar filtros
                </Button>
            </form>
        </section>
    );
}
