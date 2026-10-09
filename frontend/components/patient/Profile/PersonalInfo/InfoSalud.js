"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import styles from "./PersonalInfo.module.css";

export default function InfoSalud({
    registros = [],
    onAgregar,
    onEditar,
    onEliminar,
}) {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h3>Antecedentes y datos médicos</h3>
                    <p>Agrega información que tu médico deba conocer.</p>
                </div>
                <button
                    type="button"
                    className={styles.addButton}
                    onClick={onAgregar}
                    disabled={!onAgregar}
                >
                    <Plus size={17} />
                    Agregar dato
                </button>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Información</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registros.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={styles.empty}>
                                    Aún no has agregado información de salud.
                                </td>
                            </tr>
                        ) : registros.map((dato) => (
                            <tr key={dato.id}>
                                <td>{dato.tipo_nombre}</td>
                                <td>
                                    <strong>{dato.nombre}</strong>
                                    {dato.descripcion && (
                                        <span className={styles.detail}>
                                            {dato.descripcion}
                                        </span>
                                    )}
                                    {dato.reaccion && (
                                        <span className={styles.detail}>
                                            Reacción: {dato.reaccion}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className={styles.badge}>
                                        {dato.estado}
                                    </span>
                                    <span className={styles.detail}>
                                        Reportado por ti
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            type="button"
                                            className={styles.editButton}
                                            aria-label={`Editar ${dato.nombre}`}
                                            onClick={() => onEditar?.(dato)}
                                            disabled={!onEditar}
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            className={styles.deleteButton}
                                            aria-label={`Eliminar ${dato.nombre}`}
                                            onClick={() => onEliminar?.(dato)}
                                            disabled={!onEliminar}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}