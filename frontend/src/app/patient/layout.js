
"use client";

import Header from "../../../components/patient/layout/Header/Header";
import styles from "./layout.module.css";
import useProfile from "../../../components/patient/Profile/useProfile";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";
import BymaxAssistant from "../../../components/bymax/BymaxAssistant";


export default function PacienteLayout({ children }) {

  const { perfil, loading } = useProfile();

  if (loading) {
    return <p>Cargando...</p>;
  }

  return (

    <NotificationsProvider>
      <div>
        <Header />

        <div className={styles.main}>
          <main>
            {children}
          </main>
        </div>
        <BymaxAssistant />
      </div>
    </NotificationsProvider>


  );
}

