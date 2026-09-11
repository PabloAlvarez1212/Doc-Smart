"use client";

import { Pencil, Trash2, Search, Inbox, RotateCcw } from "lucide-react";
import styles from "./DataTable.module.css";
import Button from "../Button/Button";
import { useState } from "react";

const getIdentifierClass = (key) => {
  const normalizedKey = String(key ?? "").toLowerCase();

  if (
    normalizedKey === "id" ||
    normalizedKey.startsWith("id_") ||
    normalizedKey.endsWith("_id")
  ) {
    return styles.idColumn;
  }

  if (["cedula", "documento", "numero_documento"].includes(normalizedKey)) {
    return styles.documentColumn;
  }

  return "";
};

/**
 * DataTable - Tabla genérica y reutilizable para el admin
 *
 * Props:
 * - titulo: string
 * - columnas: Array<{ key, label }>
 * - datos: Array<Object>
 * - onEditar: (item) => void
 * - onEliminar: (item) => void
 * - onNuevo: () => void
 * - cargando: boolean
 * - campoBusqueda: string
 * - placeholderBusqueda: string
 * - mostrarBotonNuevo: boolean
 * - mostrarAcciones: boolean
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
  placeholderBusqueda = `Buscar por ${campoBusqueda}...`,
  mostrarBotonNuevo = true,
  mostrarAcciones = true,
  mostrarEditar = true,
  centrarAcciones = false,
  mostrarEncabezado = true,
  mostrarBusqueda = true,
  descripcion,
  error,
  onReintentar,
}) {
  const [busqueda, setBusqueda] = useState("");

  const normalizarTexto = (texto) =>
    (texto ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const datosFiltrados = datos.filter((item) => {
    const valor = item[campoBusqueda];

    if (!valor) return true;

    return normalizarTexto(valor).includes(
      normalizarTexto(busqueda)
    );
  });

  const totalColumnas = columnas.length + (mostrarAcciones ? 2 : 1);

  return (
    <div className={styles.wrapper}>
      {mostrarEncabezado && (
      <div className={styles.header}>
        <div>
          <h2 className={styles.titulo}>{titulo}</h2>
          {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
        </div>

        {mostrarBotonNuevo && (
          <Button onClick={onNuevo} size="sm">
            + Nuevo
          </Button>
        )}
      </div>
      )}

      {mostrarBusqueda && (
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} />

        <input
          type="text"
          placeholder={placeholderBusqueda}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.searchInput}
          aria-label={placeholderBusqueda}
        />
      </div>
      )}

      {/* Tabla */}
      <div className={styles.tableWrapper} role="region" aria-label={`${titulo}: tabla desplazable`} tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.indexColumn}`}>#</th>

              {columnas.map((col) => (
                <th key={col.key} className={`${styles.th} ${getIdentifierClass(col.key)}`}>
                  {col.label}
                </th>
              ))}

              {mostrarAcciones && (
                <th className={styles.th}>Acciones</th>
              )}
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td colSpan={totalColumnas}>
                    <div className={styles.skeleton} />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={totalColumnas} className={styles.empty}>
                  <div className={styles.emptyContent} role="alert">
                    <span className={`${styles.emptyIcon} ${styles.errorIcon}`}><RotateCcw size={22} /></span>
                    <strong>No pudimos cargar la información</strong>
                    <span>{error}</span>
                    {onReintentar && <button type="button" className={styles.retryButton} onClick={onReintentar}>Reintentar</button>}
                  </div>
                </td>
              </tr>
            ) : datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className={styles.empty}>
                  <div className={styles.emptyContent} role="status">
                    <span className={styles.emptyIcon}><Inbox size={22} /></span>
                    <strong>{busqueda ? "Sin coincidencias" : "Aún no hay registros"}</strong>
                    <span>{busqueda ? "Prueba con otro término de búsqueda." : "Los registros aparecerán aquí cuando estén disponibles."}</span>
                  </div>
                </td>
              </tr>
            ) : (
              datosFiltrados.map((item, index) => (
                <tr key={item.id ?? index} className={styles.row}>
                  <td className={`${styles.td} ${styles.indexCell}`} data-label="#">{index + 1}</td>

                  {columnas.map((col) => (
                    <td key={col.key} className={`${styles.td} ${getIdentifierClass(col.key)}`} data-label={col.label}>
                      {col.render ? col.render(item[col.key], item) : (item[col.key] ?? "-")}
                    </td>
                  ))}
                  {mostrarAcciones && (
                    <td className={styles.td} data-label="Acciones">
                      <div className={`${styles.acciones} ${centrarAcciones ? styles.centrarAcciones : ''}`}>
                        {mostrarEditar && (
                          <button
                            className={`${styles.accionBtn} ${styles.editar}`}
                            onClick={() => onEditar?.(item)}
                            title="Editar"
                            aria-label={`Editar ${item.nombre ?? "registro"}`}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        <button
                          className={`${styles.accionBtn} ${styles.eliminar}`}
                          onClick={() => onEliminar?.(item)}
                          title="Eliminar"
                          aria-label={`Eliminar ${item.nombre ?? "registro"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!cargando && !error && (
        <p className={styles.conteo}>
          {datosFiltrados.length} registro
          {datosFiltrados.length !== 1 ? "s" : ""}
          {busqueda && ` encontrados para "${busqueda}"`}
        </p>
      )}
    </div>
  );
}
