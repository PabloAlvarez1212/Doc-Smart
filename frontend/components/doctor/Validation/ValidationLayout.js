"use client";

import Image from "next/image";
import { LogOut, ShieldCheck } from "lucide-react";
import Button from "../../ui/Button/Button";
import useLogout from "../../hooks/useLogout";
import styles from "./Validation.module.css";

export default function ValidationLayout({ children }) {
    const { logoutUser } = useLogout();

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.brand}>
                    <Image src="/images/logo.png" alt="" width={46} height={40} />
                    <span><strong>Doc</strong>Smart</span>
                </div>
                <Button variant="secundary" size="sm" className={styles.logout} onClick={logoutUser}>
                    <LogOut size={16} aria-hidden="true" /> Cerrar sesión
                </Button>
            </header>
            <main className={styles.main}>
                <p className={styles.eyebrow}>Área médica · Validación profesional</p>
                <article className={styles.card}>{children}</article>
                <p className={styles.footer}><ShieldCheck size={16} aria-hidden="true" /> Tu documentación se revisa de forma privada.</p>
            </main>
        </div>
    );
}
