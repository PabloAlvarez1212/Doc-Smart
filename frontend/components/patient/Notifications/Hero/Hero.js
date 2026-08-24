"use client"
import Styles from "./Hero.module.css"
import Button from "../../../ui/Button/Button"
import { CheckCheck, Trash2, } from "lucide-react"
export default function Hero({ noLeidas, marcarTodasLeidas, eliminarTodas, notificaciones, filtroFecha, setFiltroFecha, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta }) {
    const cantidadNotificaciones = notificaciones.length
    return (
        <div className={Styles.containerHero}>
            <div className={Styles.Header}>
                <h2>Notificaciones</h2>
                <p>Tienes {cantidadNotificaciones ?? 0} notificaciones, de las cuales {noLeidas ?? 0} están sin leer</p>
            </div>
            <div className={Styles.accionesGlobales}>
                <div className={Styles.containerFiltro}>
                    <select value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        className={Styles.selectFiltro}
                        aria-label="Filtrar notificaciones por fecha">
                        <option value="todas">Todas</option>
                        <option value="hoy">Hoy</option>
                        <option value="7dias">Últimos 7 días</option>
                        <option value="30dias">Últimos 30 días</option>
                        <option value="rango">Rango personalizado</option>
                    </select>
                </div>
                <Button className={Styles.btnLeerTodas} onClick={() => marcarTodasLeidas()} disabled={noLeidas === 0}><CheckCheck size={18} />Marcar todas como leídas</Button>
                <Button className={Styles.btnEliminarTodas} onClick={() => eliminarTodas()} disabled={!notificaciones?.length} ><Trash2 size={18} />Eliminar todas</Button>
            </div>
        </div>
    )
}