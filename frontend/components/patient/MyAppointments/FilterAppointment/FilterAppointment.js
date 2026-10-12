"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import styles from "./FilterAppointment.module.css";

export default function FilterAppointment({
    dataEspecialidades,
    dataDepartamentos,
    dataCiudades,
    filtros,
    cambiarFiltro,
}) {
    return (
        <div className={styles.filterPanel}>
            <div className={styles.heading}>
                <span aria-hidden="true"><SlidersHorizontal size={17} /></span>
                <div>
                    <h2>Buscar en tu agenda</h2>
                    <p>Combina los filtros para encontrar una cita específica.</p>
                </div>
            </div>

            <div className={styles.controls} role="search">
                <label className={`${styles.field} ${styles.searchField}`}>
                    <span>Profesional o código de cita</span>
                    <span className={styles.searchControl}>
                        <Search size={17} aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Buscar por nombre o código de cita"
                            value={filtros.busqueda}
                            onChange={(event) => cambiarFiltro("busqueda", event.target.value)}
                        />
                    </span>
                </label>

                <label className={styles.field}>
                    <span>Especialidad</span>
                    <select
                        value={filtros.especialidad}
                        onChange={(event) => cambiarFiltro("especialidad", event.target.value)}
                    >
                        <option value="">Todas</option>
                        {dataEspecialidades.map((item) => (
                            <option key={item.id} value={item.nombre}>{item.nombre}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Departamento</span>
                    <select
                        value={filtros.departamento}
                        onChange={(event) => {
                            cambiarFiltro("departamento", event.target.value);
                            cambiarFiltro("ciudad", "");
                        }}
                    >
                        <option value="">Todos</option>
                        {dataDepartamentos.map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Ciudad</span>
                    <select
                        value={filtros.ciudad}
                        disabled={!filtros.departamento}
                        onChange={(event) => cambiarFiltro("ciudad", event.target.value)}
                    >
                        <option value="">
                            {filtros.departamento ? "Todas" : "Selecciona departamento"}
                        </option>
                        {dataCiudades.map((item) => (
                            <option key={item.id_ciudad} value={item.id_ciudad}>{item.nombre_ciudad}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>Fecha programada</span>
                    <input
                        type="date"
                        value={filtros.fecha_programada}
                        onChange={(event) => cambiarFiltro("fecha_programada", event.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}
