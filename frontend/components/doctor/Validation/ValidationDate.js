import formatearFecha from "@/app/utils/fechaFormaterUtils";
import styles from "./Validation.module.css";

export default function ValidationDate({ label, value }) {
    const fecha = value && !Number.isNaN(new Date(value).getTime()) ? formatearFecha(value) : null;

    return (
        <div className={styles.date}>
            <dt>{label}</dt>
            <dd>{fecha ? <time dateTime={value}>{fecha.fecha}, {fecha.hora}</time> : "No disponible"}</dd>
        </div>
    );
}
