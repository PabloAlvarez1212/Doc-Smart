'use client'
import styles from "./Hero.module.css"
import Button from '../../../../components/ui/Button/Button'
import Image from 'next/image'

export default function Hero({ nombre, proximasCitas, noLeidas }) {
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
                    <Button size='sm' variant='white'>Ver más&nbsp;&nbsp;&nbsp;&gt;</Button>
                </div>

                <div className={styles.img}>
                    <Image src='/images/messias.jpg' alt='foto de perfil' width={150} height={100} />
                </div>
            </div>
        </div>
    )
}