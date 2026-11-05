
import ReportsPanel from "../../../../components/reports/ReportsPanel";

export default async function PatientReportsPage({ searchParams }) {
    const params = await searchParams;
    const cita = Number(params?.cita);

    const citaInicial =
        Number.isSafeInteger(cita) && cita > 0
            ? cita
            : null;

    const seccionInicial =
        citaInicial || params?.seccion === "crear"
            ? "crear"
            : "reportes";

    return (
        <ReportsPanel
            rol="paciente"
            citaInicial={citaInicial}
            seccionInicial={seccionInicial}
        />
    );
}
