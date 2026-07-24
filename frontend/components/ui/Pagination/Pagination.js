import Button from "../Button/Button";
import styles from "./Pagination.module.css";

/**
 * Pagination - Componente reutilizable de paginación.
 * Úsalo debajo de cualquier tabla que traiga datos paginados del backend
 * (formato { resultados, paginacion: { count, total_pages, current_page } }).
 *
 * Props:
 * - paginaActual: number
 * - totalPaginas: number
 * - totalRegistros: number (opcional, para el texto informativo)
 * - onCambiarPagina: (nuevaPagina: number) => void
 * - cargando: boolean (deshabilita los botones mientras carga)
 */
export default function Pagination({
    paginaActual,
    totalPaginas,
    totalRegistros,
    onCambiarPagina,
    cargando = false,
}) {
    if (totalPaginas <= 1) return null;

    return (
        <div className={styles.wrapper}>
            <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={paginaActual === 1 || cargando}
                onClick={() => onCambiarPagina(paginaActual - 1)}
            >
                ‹ Anterior
            </Button>

            <span className={styles.info}>
                Página {paginaActual} de {totalPaginas}
                {totalRegistros != null && ` (${totalRegistros} registros)`}
            </span>

            <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={paginaActual === totalPaginas || cargando}
                onClick={() => onCambiarPagina(paginaActual + 1)}
            >
                Siguiente ›
            </Button>
        </div>
    );
}
