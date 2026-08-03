"use client";
import styles from "./Hero.module.css";

export default function Hero() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.container}>
                <h2>Mis citas</h2>
                <p>En esta sección podrás ver, filtrar y administrar todas tus citas</p>
            </div>

            <div className={styles.filtros}>
                <p>Todas</p>
                <p>Pendientes</p>
                <p>Reprogramadas</p>
                <p>Completadas</p>
                <p>Canceladas</p>
            </div>
        </div>
    );
}