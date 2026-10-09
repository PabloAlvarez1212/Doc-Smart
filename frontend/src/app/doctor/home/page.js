"use client"

import Hero from "../../../../components/doctor/Home/Hero/Hero"
import AppointmentsList from "../../../../components/doctor/Home/AppointmentsList/AppointmentsList"
import Notifications from "../../../../components/doctor/Home/Notifications/Notifications"
import StaticCards from "../../../../components/doctor/Home/StaticCards/StaticCards"
import { useDashboardMedico } from "../../../../components/doctor/Home/useDashboardMedico"

export default function Home() {
    const { dashboard, loading, error, retry } = useDashboardMedico();
    if (loading) return <p role="status" className="data-state">Cargando tu inicio…</p>;
    if (error) return <div className="data-state" role="status"><p>{error}</p><button type="button" onClick={retry}>Volver a intentar</button></div>;

    return (
        <>
            <Hero
                nombre={dashboard?.usuario}
                especialidad={dashboard?.especialidad}
                foto_perfil={dashboard?.foto_perfil}
            />

           <StaticCards dashboard={dashboard} />

            <AppointmentsList data={dashboard} />

            <Notifications data={dashboard} />
        </>
    );
}
