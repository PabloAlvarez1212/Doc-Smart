"use client";

import styles from "./DashboardTabs.module.css";

export default function DashboardTabs({
    activeTab,
    setActiveTab
}) {

    const tabs = [
        { key: "resumen", label: "Resumen" },
        { key: "citas", label: "Citas" },
        { key: "medicos", label: "Médicos" },
        { key: "pacientes", label: "Pacientes" },
    ];

    return (
        <div className={styles.container}>

            <div className={styles.header}>
                <h2>Estadísticas</h2>

                <p>
                    Consulta la actividad general de DocSmart.
                </p>
            </div>

            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={
                            activeTab === tab.key
                                ? styles.active
                                : styles.tab
                        }
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

        </div>
    );
}