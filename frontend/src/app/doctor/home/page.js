"use client"

import Hero from "../../../../components/doctor/Home/Hero/Hero"
import AppointmentsList from "../../../../components/doctor/Home/AppointmentsList/appointmentsList"
import Notifications from "../../../../components/doctor/Home/Notifications/Notifications"
import StaticCards from "../../../../components/doctor/Home/StaticCards/StaticCards"
import { useDashboardMedico } from "../../../../components/doctor/Home/useDashboardMedico"

export default function Home() {
    const { dashboard, loading } = useDashboardMedico();

    if (loading) return <p>Cargando...</p>;

    return (
        <>
            <Hero
                nombre={dashboard?.usuario}
                especialidad={dashboard?.especialidad}
            />

           <StaticCards dashboard={dashboard} />

            <AppointmentsList data={dashboard} />

            <Notifications data={dashboard} /> 
        </>
    );
}