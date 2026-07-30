"use client"
import Hero from '../../../../components/patient/Home/Hero/Hero'
import StaticCards from '../../../../components/patient/Home/StaticCards/StaticCards'
import AppointmentsList from '../../../../components/patient/Home/AppointmentsList/AppointmentsList'
import Notifications from '../../../../components/patient/Home/Notifications/Notifications'
import { useDashboardPaciente } from '../../../../components/patient/Home/useDashboardPaciente'
import { useNotificaciones } from '../../../../components/hooks/useNotificaciones'

export default function Home() {
    const { dashboard, loading } = useDashboardPaciente();
    const userId = dashboard?.id;
    const { noLeidas } = useNotificaciones(userId);
    if (loading) return <p>Cargando...</p>
    return (
        <>
            <Hero
                nombre={dashboard?.usuario}
                proximasCitas={dashboard?.estadisticas.cantidad_proximas_citas}
                noLeidas={noLeidas}
            />
            <StaticCards
                dashboard={dashboard}
                noLeidas={noLeidas}
                
            />
            <AppointmentsList />
            <Notifications />
        </>
    )
}