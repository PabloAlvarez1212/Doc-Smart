import styles from "./Hero.module.css"
import Button from "../../../ui/Button/Button"
export default function Hero(){
    return(
        <div className={styles.containerMain}>
            <div className={styles.saludo}>
                <div className={styles.containerText}>
                    <p>¡Te Damos La bienvenida Nuevamente!,</p>
                    <h3>Miguel Racero</h3>
                    <p>Proximos Pacientes, ya estan a la espera.</p>
                    <Button size='sm' variant="white">Ver mas</Button>
                </div>
            </div>
        </div>
    )
}