import { getBogotaDateInputValue } from "../AppointmentCard/appointmentViewState";

const ZONA = "America/Bogota";
const DIA = 86400000;
const formato = (opciones) => new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, ...opciones });
const semanaCorta = formato({ weekday: "short" });
const diaNumero = formato({ day: "numeric" });
const mesCorto = formato({ month: "short" });
const horaCorta = formato({ hour: "numeric", minute: "2-digit", hour12: true });
const diaLargo = formato({ weekday: "long", day: "numeric", month: "long" });

export const ESTADOS = {
    pendiente: { etiqueta: "Pendiente", plural: "Pendientes", tono: "pend" },
    confirmada: { etiqueta: "Confirmada", plural: "Confirmadas", tono: "pos" },
    reprogramada: { etiqueta: "Reprogramada", plural: "Reprogramadas", tono: "rep" },
    completada: { etiqueta: "Completada", plural: "Completadas", tono: "done" },
    cancelada: { etiqueta: "Cancelada", plural: "Canceladas", tono: "neg" },
    vencida: { etiqueta: "Vencida", plural: "Vencidas", tono: "warn" },
    inasistencia_paciente: { etiqueta: "Inasistencia", plural: "Inasistencias", tono: "warn" },
};

export const ESTADOS_SECCION = {
    agenda: ["pendiente", "confirmada", "reprogramada"],
    historial: ["completada", "cancelada", "vencida", "inasistencia_paciente"],
};

export const estadoDe = (cita) => String(cita?.estado || "").trim().toLowerCase();

export const claveDia = (valor) => getBogotaDateInputValue(new Date(valor));

const limpiar = (texto) => texto.replace(/[  ]/g, " ").replace(".", "");

export function partesFecha(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return { semana: "", dia: "–", mes: "", hora: "Sin hora", periodo: "" };
    const [hora, ...periodo] = limpiar(horaCorta.format(fecha)).split(" ");
    return {
        semana: limpiar(semanaCorta.format(fecha)),
        dia: diaNumero.format(fecha),
        mes: limpiar(mesCorto.format(fecha)),
        hora,
        periodo: periodo.join(" "),
    };
}

export const fechaLarga = (clave) => diaLargo.format(new Date(`${clave}T12:00:00-05:00`));

// Días de calendario entre hoy y la fecha, ambos contados en hora de Bogotá.
function diasHasta(valor, ahora) {
    return Math.round((Date.parse(claveDia(valor)) - Date.parse(claveDia(ahora))) / DIA);
}

export function fechaRelativa(valor, ahora = Date.now()) {
    const dias = diasHasta(valor, ahora);
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Mañana";
    if (dias === -1) return "Ayer";
    return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
}

export function cuentaRegresiva(valor, ahora = Date.now()) {
    const minutos = Math.round((Date.parse(valor) - ahora) / 60000);
    if (minutos <= 0) return "Ahora";
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas} h ${minutos % 60} min`;
    const dias = Math.floor(horas / 24);
    return `${dias} ${dias === 1 ? "día" : "días"} ${horas % 24} h`;
}

// Avance de la espera dentro de una ventana de 7 días, para la barra de la cita destacada.
export function avanceEspera(valor, ahora = Date.now()) {
    const restante = Date.parse(valor) - ahora;
    return Math.min(1, Math.max(0.04, 1 - restante / (7 * DIA)));
}
