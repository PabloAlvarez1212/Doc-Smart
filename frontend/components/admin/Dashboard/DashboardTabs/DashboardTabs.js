"use client";

import styles from "./DashboardTabs.module.css";

const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "citas", label: "Citas" },
    { key: "medicos", label: "Médicos" },
    { key: "pacientes", label: "Pacientes" },
];

export default function DashboardTabs({ activeTab, setActiveTab }) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span>Análisis</span>
                <h2 id="analytics-title">Actividad por módulo</h2>
                <p>Consulta las estadísticas detalladas de DocSmart.</p>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Módulos del dashboard">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={activeTab === tab.key ? styles.active : styles.tab}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
