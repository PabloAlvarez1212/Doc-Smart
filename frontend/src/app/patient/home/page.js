import styles from './home.module.css'
import Button from '../../../../components/ui/Button/Button'
import Image from 'next/image'
export default function Home() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.saludo}>
                <div className={styles.containerText}>
                    <p>¡Bienvenido de vuelta!,</p>
                    <h2>Pablo</h2>
                    <p>Tienes 2 citas próximas y 3 notificaciones sin leer.</p>
                    <Button size='sm' variant='white'>Ver más&nbsp;&nbsp;&nbsp;&gt;</Button>
                </div>

                <div className={styles.img}>
                    <Image src='/images/messias.jpg' alt='foto de perfi' width={150} height={100}></Image>
                </div>
            </div>
        </div>
    )
}