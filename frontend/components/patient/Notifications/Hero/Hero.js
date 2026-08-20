"use client"
import Styles from "./Hero.module.css"
import Button from "../../../ui/Button/Button"
import { CheckCheck, Trash2, } from "lucide-react"
export default function Hero({ noLeidas, marcarTodasLeidas }) {
    return (
        <div className={Styles.containerHero}>
            <div className={Styles.Header}>
                <h2>Notificaciones</h2>
                <p>Tienes {noLeidas ?? 0} notificaciones sin leer</p>
            </div>
            <div className={Styles.accionesGlobales}>
                <Button className={Styles.btnLeerTodas} onClick={marcarTodasLeidas} disabled={noLeidas === 0}><CheckCheck size={18} />Marcar todas como leídas</Button>
                <Button className={Styles.btnEliminarTodas}><Trash2 size={18} />Eliminar todas</Button>
            </div>
        </div>
    )
}