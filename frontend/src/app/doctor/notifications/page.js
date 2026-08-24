"use client";

import { useState } from "react";

import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import { filtrarNotificacionesPorFecha } from "@/app/utils/notificacionesUtils";
import Styles from "./Notifications.module.css";

export default function Notifications() {

    const {
        marcarLeida,
        marcarTodasLeidas,
        noLeidas,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
        notificaciones,
        loading: loadingNotificaciones
    } = useNotificationsContext();

    const [filtroFecha, setFiltroFecha] = useState("todas");

    const [fechaDesde, setFechaDesde] = useState("");

    const [fechaHasta, setFechaHasta] = useState("");

    const notificacionesFiltradas =
        filtrarNotificacionesPorFecha(
            notificaciones,
            filtroFecha,
            fechaDesde,
            fechaHasta
        );

    if (loadingNotificaciones) {
        return (
            <p className={Styles.textCargandoNotificaciones}>
                Cargando notificaciones...
            </p>
        );
    }

    return (
        <div>

            <Hero
                noLeidas={noLeidas}
                marcarTodasLeidas={marcarTodasLeidas}
                notificaciones={notificaciones}
                eliminarTodas={eliminarTodasNotificaciones}

                filtroFecha={filtroFecha}
                setFiltroFecha={setFiltroFecha}

                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}

                setFechaDesde={setFechaDesde}
                setFechaHasta={setFechaHasta}
            />


            {filtroFecha === "rango" && (

                <div className={Styles.rangoFechas}>

                    <div className={Styles.campoFecha}>

                        <label htmlFor="fechaDesde">
                            Desde
                        </label>

                        <input
                            id="fechaDesde"
                            type="date"
                            value={fechaDesde}
                            onChange={(e) =>
                                setFechaDesde(e.target.value)
                            }
                        />

                    </div>


                    <div className={Styles.campoFecha}>

                        <label htmlFor="fechaHasta">
                            Hasta
                        </label>

                        <input
                            id="fechaHasta"
                            type="date"
                            value={fechaHasta}
                            onChange={(e) =>
                                setFechaHasta(e.target.value)
                            }
                        />

                    </div>

                </div>

            )}


            {notificacionesFiltradas?.length > 0 ? (

                <NotificationsList
                    data={{
                        notificaciones:
                            notificacionesFiltradas
                    }}
                    marcarLeida={marcarLeida}
                    eliminarNotificacion={
                        eliminarNotificacion
                    }
                />

            ) : (

                <p className={Styles.textNingunaNotificacion}>
                    No tienes notificaciones
                </p>

            )}

        </div>
    );
}