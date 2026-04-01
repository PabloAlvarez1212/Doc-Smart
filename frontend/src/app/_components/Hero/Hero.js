import styles from "./Hero.module.css"
import Image from "next/image"
export default function Hero() {
    return (
        <div className={styles.container}>
            <div className={styles.hero}>
                <h1>Doc<span className={styles.span}>Smart</span></h1>
            </div>
            <div className={styles.heroText}>
                <p>La plataforma integral que conecta pacientes y médicos para una 
                    atención médica moderna y eficiente</p>
            </div>
            <button className={styles.heroBtn}>
                Comenzar Ahora
            </button>
            <div className={styles.Logos}>
                <Image
                    src="/images/Logs.jpeg"
                    width="1000"
                    height="500"
                    alt='Logos'
                />
            </div>
        </div>
    )
}