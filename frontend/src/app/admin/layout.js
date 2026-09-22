"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "../../../components/admin/Header/Header";
import Nav from "../../../components/admin/Nav/Nav";
import ResponsiveNav from "../../../components/ui/ResponsiveNav/ResponsiveNav";
import BymaxDiagnostics from "../../../components/bymax/BymaxDiagnostics";
import useProfile from "../../../components/admin/Profile/useProfile";
import useInactivityLogout from "../../../components/hooks/useInactivityLogout";

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
    <div className={Styles.containerMain}>
      <BymaxDiagnostics />

      <header className={Styles.header}>
        <Header />
      </header>

      <div className={Styles.workspace}>
        <aside className={Styles.nav}>
          <ResponsiveNav
            id="admin-navigation"
            label="Menú de administración"
          >
            <Nav />
          </ResponsiveNav>
        </aside>

        <main className={Styles.main}>
          <div className={Styles.content}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}