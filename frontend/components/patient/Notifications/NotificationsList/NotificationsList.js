"use client"
import Styles from "./NotificationsList.module.css"
import { renderIcono } from "@/app/utils/estadoDise/estadoDiseUtils"
import { Check, X } from 'lucide-react';
import { formatearFechaRelativa } from "@/app/utils/fechaFormaterUtils"
export default function NotificationsList({ data, marcarLeida, eliminarNotificacion }) {
    const listNotificaciones = data?.notificaciones || []
    return (
        <div className={Styles.containerMan}>
            <div className={Styles.containerCard}>
                {listNotificaciones.map((notificacion) => (
                    <div key={notificacion.id} className={`${Styles.card} ${Styles[notificacion.tipo]}`}>
                        <div className={Styles.container}>
                            {renderIcono(notificacion.tipo, 33)}
                            <div className={Styles.containerText}>
                                <div className={Styles.containerTitle}>
                                    <h3>{notificacion.titulo}</h3>
                                    {!notificacion.leida && (
                                        <p>Nuevo</p>
                                    )}
                                </div>
                                <p>{notificacion.mensaje}</p>
                            </div>
                        </div>
                        <div className={Styles.containerAcciones}>
                            <div className={Styles.btns}>
                                {!notificacion.leida && (
                                    <div title="Marcar como leida">
                                        <Check className={Styles.btn} onClick={() => marcarLeida(notificacion.id)} color="green" />
                                    </div>
                                )}
                                <div title="Eliminar notificacion">
                                    <X className={Styles.btn} color="red" onClick={() => eliminarNotificacion(notificacion.id)} />
                                </div>
                            </div>
                            <p>{formatearFechaRelativa(notificacion.fecha)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}