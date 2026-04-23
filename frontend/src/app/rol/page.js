"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function RolPage() {
  const router = useRouter();

  return (
    <div className={styles.main}>

      <button className={styles.backBtn} onClick={() => router.push("/")}>
        ← Volver
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Selecciona tu Rol</h1>
        <p className={styles.subtitle}>Elige tu rol para crear tu cuenta</p>
      </div>

      <div className={styles.cards}>

        <div className={`${styles.card} ${styles.cardPaciente}`}>
          <div className={`${styles.iconWrapper} ${styles.iconPaciente}`}>
            <span className={styles.icon}>👤</span>
          </div>
          <h2 className={styles.cardTitle}>Paciente</h2>
          <p className={styles.cardDesc}>
            Gestiona tus citas, consulta con el asistente virtual y accede a tus recetas médicas
          </p>
          <ul className={styles.features}>
            <li><span className={styles.dotPaciente}>●</span> Agendar y gestionar citas médicas</li>
            <li><span className={styles.dotPaciente}>●</span> Chatbot asistente 24/7</li>
            <li><span className={styles.dotPaciente}>●</span> Fórmulas de medicamentos</li>
          </ul>
          <button
            className={`${styles.btn} ${styles.btnPaciente}`}
            onClick={() => router.push("/register?role=paciente")}
          >
            Registrarse como Paciente
          </button>
        </div>

        <div className={`${styles.card} ${styles.cardMedico}`}>
          <div className={`${styles.iconWrapper} ${styles.iconMedico}`}>
            <span className={styles.icon}>🩺</span>
          </div>
          <h2 className={styles.cardTitle}>Médico</h2>
          <p className={styles.cardDesc}>
            Gestiona tus pacientes, crea diagnósticos y prescribe recetas médicas
          </p>
          <ul className={styles.features}>
            <li><span className={styles.dotMedico}>●</span> Gestión de pacientes</li>
            <li><span className={styles.dotMedico}>●</span> Chatbot asistente médico</li>
            <li><span className={styles.dotMedico}>●</span> Recetas y diagnósticos</li>
          </ul>
          <button
            className={`${styles.btn} ${styles.btnMedico}`}
            onClick={() => router.push("/register?role=medico")}
          >
            Registrarse como Médico
          </button>
        </div>

      </div>
    </div>
  );
}