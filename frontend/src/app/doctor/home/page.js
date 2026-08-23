"use client"

import Hero from "../../../../components/doctor/Home/Hero/Hero"
import AppointmentsList from "../../../../components/doctor/Home/AppointmentsList/AppointmentsList"
import Notifications from "../../../../components/doctor/Home/Notifications/Notifications"
import StaticCards from "../../../../components/doctor/Home/StaticCards/StaticCards"
import { useDashboardMedico } from "../../../../components/doctor/Home/useDashboardMedico"

export default function Home() {
    const { dashboard, loading } = useDashboardMedico();
    console.log("FOTO PERFIL DASHBOARD:", dashboard?.foto_perfil);
    if (loading) return <p>Cargando...</p>;

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