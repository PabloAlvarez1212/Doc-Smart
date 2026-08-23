"use client"
import Header from "../../../components/patient/layout/Header/Header"
import styles from "./layout.module.css"
import { useNotificaciones } from "../../../components/hooks/useNotificaciones"
import useProfile from "../../../components/doctor/Profile/useProfile"
export default function PacienteLayout({ children }) {
  const {perfil} = useProfile()
  const {noLeidas} = useNotificaciones(perfil.id,"paciente")
  return (
    <div>
      <Header NoLeidas={noLeidas} />
      <div className={styles.main}>
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}