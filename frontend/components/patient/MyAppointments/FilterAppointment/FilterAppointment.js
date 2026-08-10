"use client";
import Input from "../../../ui/Input/Input";
import styles from "./FilterAppointment.module.css"

export default function FilterAppointment({ dataEspecialidades, dataDepartamentos, dataCiudades,filtros, cambiarFiltro }) {

    return (
        <div className={styles.containerMain}>
            <div className={styles.filtros}>
                <div className={styles.input}>
                    <Input
                        type="text"
                        placeholder="Buscar por doctor"
                        value={filtros.doctor}
                        onChange={(e) =>
                            cambiarFiltro("doctor", e.target.value)
                        }
                    />
                </div>

                <div className={styles.input}>
                    <select
                        className={styles.select}
                        value={filtros.especialidad}
                        onChange={(e) => cambiarFiltro("especialidad", e.target.value)}
                    >
                        <option value="">Selecciona una especialidad...</option>
                        {dataEspecialidades.map((data) => (
                            <option key={data.id} value={data.nombre}>
                                {data.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.input}>
                    <select
                        className={styles.select}
                        value={filtros.departamento}
                        onChange={(e) => {
                            cambiarFiltro("departamento", e.target.value);
                            cambiarFiltro("ciudad", "");
                        }}
                    >
                        <option value="">Selecciona un departamento...</option>
                        {dataDepartamentos.map((data) => (
                            <option key={data.id} value={data.id}>
                                {data.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.input}>
                    <select
                        className={styles.select}
                        value={filtros.ciudad}
                        onChange={(e) => cambiarFiltro("ciudad",e.target.value)}
                    >
                        <option value="">Selecciona una ciudad...</option>
                        {dataCiudades.map((data) => (
                            <option key={data.id_ciudad} value={data.id_ciudad}>
                                {data.nombre_ciudad}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.input}>
                    <Input
                        type="date"
                        value={filtros.fecha_programada}
                        placeholder="Buscar por fecha"
                        onChange={(e) => cambiarFiltro("fecha_programada", e.target.value)}/>
                </div>

            </div>
        </div>
    );
}