
import ReportsPanel from "../../../../components/reports/ReportsPanel";

export default async function DoctorReportsPage({ searchParams }) {
    const params = await searchParams;
    const cita = Number(params?.cita);

    return (
        <ReportsPanel
            rol="medico"
            citaInicial={
                Number.isSafeInteger(cita) && cita > 0
                    ? cita
                    : null
            }
        />
    );
}
