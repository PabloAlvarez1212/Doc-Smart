'use client'
import styles from "./Hero.module.css"
import Button from '../../../../components/ui/Button/Button'
import Image from 'next/image'

export default function Hero({ nombre, proximasCitas, noLeidas, foto_perfil}) {
    return (
        <div className={styles.containerMain}>
            <div className={styles.saludo}>
                <div className={styles.containerText}>
                    <p>¡Bienvenido de vuelta!,</p>
                    <h2>{nombre ?? 'Usuario'}</h2>
                    <p>
                        Tienes <strong>{proximasCitas ?? 0}</strong> citas próximas 
                        y <strong>{noLeidas ?? 0}</strong> notificaciones sin leer.
                    </p>
                </div>

                <div className={styles.img}>
                    <Image src={foto_perfil ? foto_perfil : "/images/foto_default.png"} alt='foto de perfil' width={150} height={100} />
                </div>
            </div>
        </div>
    )
}