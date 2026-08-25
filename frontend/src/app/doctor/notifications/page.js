"use client";

import { useState } from "react";

import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import { filtrarNotificacionesPorFecha } from "@/app/utils/notificacionesUtils";
import Styles from "./Notifications.module.css";
import Pagination from "../../../../components/ui/Pagination/Pagination";

export default function Notifications() {

    const {
        marcarLeida,
        marcarTodasLeidas,
        noLeidas,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
        notificaciones,
        loading: loadingNotificaciones,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
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
                cantidadNotificaciones={totalRegistros}
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

                <div>
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

                    <Pagination
                        paginaActual={paginaActual}
                        totalPaginas={totalPaginas}
                        totalRegistros={totalRegistros}
                        onCambiarPagina={cambiarPagina}
                        cargando={loadingNotificaciones}
                    />
                </div>

            ) : (

                <p className={Styles.textNingunaNotificacion}>
                    No tienes notificaciones
                </p>

            )}

        </div>
    );
}