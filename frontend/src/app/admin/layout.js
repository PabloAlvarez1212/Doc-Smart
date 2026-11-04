"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "../../../components/admin/Header/Header";
import { AdminCrumbs } from "../../../components/admin/Nav/Nav";
import ConnectionStatus from "../../../components/admin/ConnectionStatus/ConnectionStatus";
import BymaxDiagnostics from "../../../components/bymax/BymaxDiagnostics";
import useProfile from "../../../components/admin/Profile/useProfile";
import useInactivityLogout from "../../../components/hooks/useInactivityLogout";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";

import Styles from "./layout.module.css";

export default function AdminLayout({ children }) {
  useInactivityLogout();

  const router = useRouter();
  const { perfil, loading, error } = useProfile();

  useEffect(() => {
    if (loading) return;

    if (
      error === "NO_AUTENTICADO" ||
      error === "ERROR_PERFIL" ||
      error === "NO_AUTORIZADO" ||
      !perfil ||
      perfil.rol !== "admin"
    ) {
      router.replace("/login");
    }
  }, [perfil, loading, error, router]);

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (
    error ||
    !perfil ||
    perfil.rol !== "admin"
  ) {
    return null;
  }

  return (
    <NotificationsProvider cargarBandeja={false}>
      <div className={Styles.containerMain}>
      <BymaxDiagnostics />

      <div className={Styles.workspace}>
        <Header />

        <main className={Styles.main}>
          <div className={Styles.content}>
            <AdminCrumbs />
            <ConnectionStatus />
            {children}
          </div>
        </main>
      </div>
      </div>
    </NotificationsProvider>
  );
}
