"use client"
import { useState, useEffect } from 'react'
import Hero from '../../../../components/patient/Home/Hero/Hero'
import StaticCards from '../../../../components/patient/Home/StaticCards/StaticCards'
import AppointmentsList from '../../../../components/patient/Home/AppointmentsList/AppointmentsList'
import Notifications from '../../../../components/patient/Home/Notifications/Notifications'
import { useDashboardPaciente } from '../../../../components/patient/Home/useDashboardPaciente'
import { useNotificaciones } from '../../../../components/hooks/useNotificaciones'

export default function Home() {
    const { dashboard, loading } = useDashboardPaciente();
    const userId = dashboard?.id;

    // Estados locales para contadores y lista en tiempo real
    const [citas, setCitas] = useState([]);
    const [pendientes, setPendientes] = useState(0);
    const [realizadas, setRealizadas] = useState(0);

    // Sincronizar datos iniciales desde la REST API
    useEffect(() => {
        if (dashboard) {
            setCitas(dashboard?.proximas_citas || []);
            setPendientes(dashboard?.estadisticas?.consultas_pendientes || 0);
            setRealizadas(dashboard?.estadisticas?.consultas_realizadas_mes || 0);
        }
    }, [dashboard]);

    // WebSocket Hook
    const {
        notificaciones,
        noLeidas,
        marcarLeida
    } = useNotificaciones(userId, {
        initialData: dashboard?.notificaciones || [],
        onEventoCita: ({ tipo_evento, cita }) => {
            console.log('⚡ Evento en vivo recibido en Home:', tipo_evento, cita);

            const estado = cita?.estado?.toUpperCase();

            // 1. Manejo de lista de Próximas Citas (solo confirmadas)
            setCitas((prevCitas) => {
                if (estado !== 'CONFIRMADA') {
                    return prevCitas.filter((c) => c.id !== cita.id);
                }
                const existe = prevCitas.some((c) => c.id === cita.id);
                if (existe) {
                    return prevCitas.map((c) => (c.id === cita.id ? cita : c));
                }
                return [cita, ...prevCitas];
            });

            // 2. Manejo de contadores según eventos en vivo
            if (tipo_evento === 'NUEVA_SOLICITUD' || estado === 'PENDIENTE') {
                setPendientes((prev) => prev + 1);
            }

            if (tipo_evento === 'CITA_CONFIRMADA' || estado === 'CONFIRMADA') {
                // Si estaba pendiente y pasa a confirmada, restamos de pendientes
                setPendientes((prev) => Math.max(0, prev - 1));
            }

            if (tipo_evento === 'CITA_COMPLETADA' || estado === 'COMPLETADA' || estado === 'REALIZADA') {
                setRealizadas((prev) => prev + 1);
            }

            if (tipo_evento === 'CITA_CANCELADA' || estado === 'CANCELADA' || estado === 'RECHAZADA') {
                // Si una solicitud pendiente fue rechazada o cancelada, se reduce pendientes
                setPendientes((prev) => Math.max(0, prev - 1));
            }
        }
    });

    if (loading) return <p>Cargando...</p>;

    return (
        <>
            <Hero
                nombre={dashboard?.usuario}
                proximasCitas={citas.length}
                noLeidas={noLeidas}
                foto_perfil={dashboard?.foto_perfil}
            />
            <StaticCards
                dashboard={dashboard}
                noLeidas={noLeidas}
                cantidadProximasCitas={citas.length}
                consultasPendientes={pendientes}
                consultasRealizadas={realizadas}
            />
            <AppointmentsList
                data={{ ...dashboard, proximas_citas: citas }}
            />

            <Notifications
                data={{ ...dashboard, notificaciones }}
                onMarcarLeida={marcarLeida}
            />

        </>
    );
}