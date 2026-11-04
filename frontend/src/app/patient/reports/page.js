
import ReportsPanel from "../../../../components/reports/ReportsPanel";

export default async function PatientReportsPage({ searchParams }) {
    const params = await searchParams;
    const cita = Number(params?.cita);

    return (
        <ReportsPanel
            rol="paciente"
            citaInicial={
                Number.isSafeInteger(cita) && cita > 0
                    ? cita
                    : null
            }
        />
    );
}
