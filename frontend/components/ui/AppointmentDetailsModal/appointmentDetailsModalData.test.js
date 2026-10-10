import assert from "node:assert/strict";
import test from "node:test";

const details = await import("./appointmentDetailsModalData.js").catch(() => ({}));

const appointment = {
    id: 18,
    codigo_cita: "DOC-A7K92P4X",
    motivo_consulta: "Dolor persistente\ndesde hace tres días.",
    fecha_programada: "2026-10-12T14:30:00-05:00",
    estado: "confirmada",
    medico: "Laura Méndez",
    paciente: "Pablo Montoya",
    foto_medico: "/media/medicos/laura.jpg",
    foto_paciente: "/media/pacientes/pablo.jpg",
    especialidad: "Medicina general",
    ciudad: "Neiva",
    departamento: "Huila",
    direccion: "Calle 10 # 5-20",
};

test("prepara los datos autorizados del profesional para la vista del paciente", () => {
    assert.equal(typeof details.getAppointmentDetailsData, "function");

    const result = details.getAppointmentDetailsData(appointment, "medico");

    assert.deepEqual(result.person, {
        label: "Profesional",
        name: "Laura Méndez",
        image: "/media/medicos/laura.jpg",
        specialty: "Medicina general",
    });
    assert.equal(result.code, "DOC-A7K92P4X");
    assert.equal(result.reason, "Dolor persistente\ndesde hace tres días.");
});

test("prepara únicamente los datos disponibles del paciente para la vista médica", () => {
    const result = details.getAppointmentDetailsData(appointment, "paciente");

    assert.deepEqual(result.person, {
        label: "Paciente",
        name: "Pablo Montoya",
        image: "/media/pacientes/pablo.jpg",
        specialty: "",
    });
    assert.deepEqual(result.location, {
        city: "Neiva",
        department: "Huila",
        address: "Calle 10 # 5-20",
    });
});

test("normaliza citas antiguas sin código, motivo o ubicación", () => {
    const result = details.getAppointmentDetailsData({ estado: "pendiente" }, "medico");

    assert.equal(result.code, "");
    assert.equal(result.reason, "");
    assert.equal(result.person.name, "Profesional de DocSmart");
    assert.deepEqual(result.location, { city: "", department: "", address: "" });
});
