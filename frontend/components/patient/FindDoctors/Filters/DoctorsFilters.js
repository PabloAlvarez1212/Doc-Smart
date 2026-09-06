import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./DoctorsFilters.module.css";

export default function DoctorsFilters({
    filters,
    specialties,
    departments,
    cities,
    hasFilters,
    onChange,
    onReset,
}) {
    return (
        <section className={styles.panel} aria-labelledby="doctor-filters-title">
            <div className={styles.panelHeading}>
                <div>
                    <SlidersHorizontal size={18} aria-hidden="true" />
                    <h2 id="doctor-filters-title">Refina tu búsqueda</h2>
                </div>
                <p>Encuentra una opción que se ajuste a tu ubicación y disponibilidad.</p>
            </div>

            <div className={styles.filters}>
                <label className={styles.search}>
                    <span className={styles.visuallyHidden}>Buscar por nombre del médico</span>
                    <Search size={20} aria-hidden="true" />
                    <input
                        type="search"
                        value={filters.search}
                        placeholder="Buscar por nombre"
                        onChange={(event) => onChange("search", event.target.value)}
                    />
                </label>

                <label className={styles.field}>
                    <span>Especialidad</span>
                    <select value={filters.specialty} onChange={(event) => onChange("specialty", event.target.value)}>
                        <option value="all">Todas</option>
                        {specialties.map((specialty) => (
                            <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Departamento</span>
                    <select value={filters.department} onChange={(event) => onChange("department", event.target.value)}>
                        <option value="all">Todos</option>
                        {departments.map((department) => (
                            <option key={department} value={department}>{department}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Ciudad</span>
                    <select value={filters.city} onChange={(event) => onChange("city", event.target.value)}>
                        <option value="all">Todas</option>
                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Disponibilidad</span>
                    <select value={filters.availability} onChange={(event) => onChange("availability", event.target.value)}>
                        <option value="all">Cualquier fecha</option>
                        <option value="today">Disponible hoy</option>
                        <option value="week">Próximos 7 días</option>
                        <option value="scheduled">Con agenda disponible</option>
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Ordenar por</span>
                    <select value={filters.ordering} onChange={(event) => onChange("ordering", event.target.value)}>
                        <option value="availability">Próxima disponibilidad</option>
                        <option value="name">Nombre</option>
                        <option value="specialty">Especialidad</option>
                    </select>
                </label>

                <Button className={styles.reset} variant="secundary" onClick={onReset} disabled={!hasFilters}>
                    <RotateCcw size={17} aria-hidden="true" /> Limpiar
                </Button>
            </div>
        </section>
    );
}
