import assert from "node:assert/strict";
import test from "node:test";

import {
    getNextAppointment,
    sortUpcomingAppointments,
    updateUpcomingAppointmentsCount,
} from "./patientHomeData.js";

test("ordena las citas próximas por fecha sin modificar el arreglo recibido", () => {
    const appointments = [
        { id: 3, fecha_programada: "2026-10-20T14:00:00-05:00" },
        { id: 1, fecha_programada: "2026-10-05T09:00:00-05:00" },
        { id: 2, fecha_programada: "2026-10-12T11:30:00-05:00" },
    ];

    const sorted = sortUpcomingAppointments(appointments);

    assert.deepEqual(sorted.map((appointment) => appointment.id), [1, 2, 3]);
    assert.deepEqual(appointments.map((appointment) => appointment.id), [3, 1, 2]);
});

test("selecciona la cita válida más cercana y omite fechas inválidas", () => {
    const nextAppointment = getNextAppointment([
        { id: 9, fecha_programada: "fecha-invalida" },
        { id: 4, fecha_programada: "2026-11-02T10:00:00-05:00" },
        { id: 2, fecha_programada: "2026-10-18T08:00:00-05:00" },
    ]);

    assert.equal(nextAppointment?.id, 2);
});

test("devuelve null cuando no existen citas válidas", () => {
    assert.equal(getNextAppointment([]), null);
    assert.equal(getNextAppointment(null), null);
    assert.equal(
        getNextAppointment([{ id: 1, fecha_programada: null }]),
        null
    );
});

test("actualiza el total de próximas citas solamente con eventos que cambian la agenda confirmada", () => {
    assert.equal(updateUpcomingAppointmentsCount(4, "CITA_CONFIRMADA"), 5);
    assert.equal(updateUpcomingAppointmentsCount(4, "CITA_CANCELADA"), 3);
    assert.equal(updateUpcomingAppointmentsCount(0, "CITA_COMPLETADA"), 0);
    assert.equal(updateUpcomingAppointmentsCount(4, "NUEVA_SOLICITUD"), 4);
});
