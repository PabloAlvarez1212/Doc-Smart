import styles from "./Hero.module.css"

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.content}>
                <div>
                    <h1 className={styles.title}>
                        Panel de Pacientes
                    </h1>

                    <p className={styles.subtitle}>
                        Gestiona pacientes, consulta información y administra DocSmart desde
                        este panel.
                    </p>
                </div>
            </div>
        </section>
    )
}