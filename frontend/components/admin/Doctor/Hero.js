import styles from "./Doctor.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div>
          <h1 className={styles.title}>
            Panel de Médicos
          </h1>

          <p className={styles.subtitle}>
            Gestiona médicos, consulta información y administra DocSmart desde
            este panel.
          </p>
        </div>
      </div>
    </section>
  );
}