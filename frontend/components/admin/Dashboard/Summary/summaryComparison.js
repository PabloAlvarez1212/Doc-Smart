import { formatDashboardDayShort } from "../dashboardMonthFormatters";
import { formatDecimal } from "./summaryRateMetrics";

// Por debajo de este cambio la variación se considera "igual"; la calificación se mueve en escalas más pequeñas.
const NEUTRAL_THRESHOLDS = { porcentaje: 0.5, puntos: 0.5, absoluta: 0.1 };

const UNITS = {
    porcentaje: { symbol: " %", spoken: "por ciento" },
    puntos: { symbol: " pts", spoken: "puntos porcentuales" },
    absoluta: { symbol: "", spoken: "puntos de calificación" },
};

// "2026-10-01" → "1–2 oct"; un solo día → "1 oct".
export function formatTramo(tramo) {
    const desde = formatDashboardDayShort(tramo?.desde);
    const hasta = formatDashboardDayShort(tramo?.hasta);
    if (desde === "Día no disponible" || hasta === "Día no disponible") return "";

    const [diaDesde] = desde.split(" ");
    const [diaHasta, mes] = hasta.split(" ");
    const mesCorto = mes.toLocaleLowerCase("es-CO");

    return diaDesde === diaHasta ? `${diaHasta} ${mesCorto}` : `${diaDesde}–${diaHasta} ${mesCorto}`;
}

/**
 * Convierte un elemento de `comparacion` en lo que muestra DeltaBadge.
 * estado: "mejora" | "empeora" | "igual" | "sin_comparacion".
 *
 * @param {{ variacion: number|null, tipo: string, sentido: string, tramo: { anterior: { desde: string, hasta: string } } }|undefined} metrica
 * @param {string} [detalle] aclaración para lectores de pantalla, p. ej. "citas válidas"
 */
export function buildDelta(metrica, detalle = "") {
    const variacion = metrica?.variacion;
    const unidad = UNITS[metrica?.tipo] ?? UNITS.absoluta;
    const tramo = formatTramo(metrica?.tramo?.anterior);
    const referencia = `respecto al mismo tramo del mes anterior${tramo ? ` (${tramo})` : ""}`;
    const sufijoDetalle = detalle ? `, ${detalle}` : "";

    if (typeof variacion !== "number" || !Number.isFinite(variacion)) {
        return {
            estado: "sin_comparacion",
            texto: "sin comparación",
            etiquetaAccesible: `Sin comparación disponible ${referencia}${sufijoDetalle}`,
        };
    }

    if (Math.abs(variacion) < (NEUTRAL_THRESHOLDS[metrica?.tipo] ?? NEUTRAL_THRESHOLDS.porcentaje)) {
        return {
            estado: "igual",
            flecha: "sin cambio",
            texto: tramo ? `vs ${tramo}` : "",
            aclaracion: detalle,
            etiquetaAccesible: `Sin cambio significativo ${referencia}${sufijoDetalle}`,
        };
    }

    const sube = variacion > 0;
    const esBueno = sube === (metrica.sentido === "subir_bueno");
    const magnitud = formatDecimal(Math.abs(variacion));

    return {
        estado: esBueno ? "mejora" : "empeora",
        flecha: sube ? "↑" : "↓",
        valor: `${sube ? "+" : "−"}${magnitud}${unidad.symbol}`,
        texto: tramo ? `vs ${tramo}` : "",
        aclaracion: detalle,
        etiquetaAccesible: `${sube ? "Aumentó" : "Disminuyó"} ${magnitud} ${unidad.spoken} ${referencia}${sufijoDetalle}`,
    };
}
