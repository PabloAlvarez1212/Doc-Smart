"use client";
import { Pencil, Trash2, Search } from "lucide-react";
import styles from "./DataTable.module.css";
import Button from "../Button/Button";
import { useState } from "react";

/**
 * DataTable - Tabla genérica y reutilizable para el admin
 *
 * Props:
 * - titulo: string              → Título de la sección (ej: "Roles")
 * - columnas: Array<{ key, label }> → Columnas a mostrar
 * - datos: Array<Object>        → Filas de la tabla
 * - onEditar: (item) => void    → Callback al presionar Editar
 * - onEliminar: (item) => void  → Callback al presionar Eliminar
 * - onNuevo: () => void         → Callback al presionar "Nuevo"
 * - cargando: boolean           → Muestra skeleton si true
 * - campoBusqueda: string       → Key del campo por el que se filtra (ej: "nombre")
 */
export default function DataTable({
  titulo = "Tabla",
  columnas = [],
  datos = [],
  onEditar,
  onEliminar,
  onNuevo,
  cargando = false,
  campoBusqueda = "nombre",
}) {
  const [busqueda, setBusqueda] = useState("");

  const datosFiltrados = datos.filter((item) => {
    const valor = item[campoBusqueda];
    if (!valor) return true;
    return valor.toString().toLowerCase().includes(busqueda.toLowerCase());
  });

  return (
    <div className={styles.wrapper}>
      {/* Encabezado */}
      <div className={styles.header}>
        <h1 className={styles.titulo}>{titulo}</h1>
        <Button onClick={onNuevo} size="sm">
          + Nuevo
        </Button>
      </div>

      {/* Buscador */}
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder={`Buscar por ${campoBusqueda}...`}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Tabla */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>#</th>
              {columnas.map((col) => (
                <th key={col.key} className={styles.th}>
                  {col.label}
                </th>
              ))}
              <th className={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td colSpan={columnas.length + 2}>
                    <div className={styles.skeleton} />
                  </td>
                </tr>
              ))
            ) : datosFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length + 2}
                  className={styles.empty}
                >
                  No hay registros para mostrar.
                </td>
              </tr>
            ) : (
              datosFiltrados.map((item, index) => (
                <tr key={item.id ?? index} className={styles.row}>
                  <td className={styles.td}>{index + 1}</td>
                  {columnas.map((col) => (
                    <td key={col.key} className={styles.td}>
                      {item[col.key] ?? "-"}
                    </td>
                  ))}
                  <td className={styles.td}>
                    <div className={styles.acciones}>
                      <button
                        className={`${styles.accionBtn} ${styles.editar}`}
                        onClick={() => onEditar?.(item)}
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className={`${styles.accionBtn} ${styles.eliminar}`}
                        onClick={() => onEliminar?.(item)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con conteo */}
      {!cargando && (
        <p className={styles.conteo}>
          {datosFiltrados.length} registro{datosFiltrados.length !== 1 ? "s" : ""}
          {busqueda && ` encontrados para "${busqueda}"`}
        </p>
      )}
    </div>
  );
}
