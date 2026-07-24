import Header from "../../../components/patient/layout/Header/Header"
import styles from "./layout.module.css"
export default function PacienteLayout({ children }) {
  return (
    <div>
      <Header />
      <div className={styles.main}>
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}