import {
    getAppointmentCode,
    getAppointmentReason,
} from "../AppointmentCard/appointmentDetails.js";

function optionalText(value) {
    return typeof value === "string" && value.trim() ? value : "";
}

export function getAppointmentDetailsData(appointment = {}, counterpart = "medico") {
    const showPatient = counterpart === "paciente";

    return {
        id: appointment?.id ?? null,
        scheduledAt: appointment?.fecha_programada || null,
        status: optionalText(appointment?.estado),
        code: getAppointmentCode(appointment?.codigo_cita),
        reason: getAppointmentReason(appointment?.motivo_consulta),
        person: {
            label: showPatient ? "Paciente" : "Profesional",
            name: optionalText(showPatient ? appointment?.paciente : appointment?.medico) ||
                (showPatient ? "Paciente de DocSmart" : "Profesional de DocSmart"),
            image: optionalText(showPatient ? appointment?.foto_paciente : appointment?.foto_medico),
            specialty: showPatient ? "" : optionalText(appointment?.especialidad),
        },
        location: {
            city: optionalText(appointment?.ciudad),
            department: optionalText(appointment?.departamento),
            address: optionalText(appointment?.direccion),
        },
    };
}
