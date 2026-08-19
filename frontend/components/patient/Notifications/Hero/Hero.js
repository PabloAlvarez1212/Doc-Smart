"use client"
import Styles from "./Hero.module.css"
import Button from "../../../ui/Button/Button"
export default function Hero({noLeidas, marcarTodasLeidas}){
    return(
        <div className={Styles.containerHero}>
            <div className={Styles.Header}>
                <h2>Notificaciones</h2>
                <p>Tienes {noLeidas ?? 0} notificaciones sin leer</p>
            </div>
            <div className={Styles.btn}>
                <Button onClick={() => marcarTodasLeidas()}>Marcar todas como leidas</Button>
            </div>
        </div>
    )
}