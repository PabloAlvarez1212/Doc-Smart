"use client";

import { useEffect, useState } from "react";
import { Activity, House, LifeBuoy, Route, Sparkles, Users } from "lucide-react";
import DocSmartNav from "../../../../components/ui/DocSmartNav/DocSmartNav";
import { getPublicSession } from "../../services/publicServices";

const links = [
    {
        href: "/",
        label: "Inicio",
        icon: House,
    },
    {
        href: "/#funcionalidades",
        label: "Funcionalidades",
        icon: Sparkles,
        group: "Producto",
    },
    {
        href: "/#como-funciona",
        label: "Cómo funciona",
        icon: Route,
        group: "Producto",
    },
    {
        href: "/#comunidad",
        label: "DocSmart en cifras",
        short: "Cifras",
        icon: Activity,
        group: "Producto",
    },
    {
        href: "/#quienes-somos",
        label: "Quiénes somos",
        icon: Users,
        group: "Nosotros",
    },
    {
        href: "/#ayuda",
        label: "Ayuda",
        icon: LifeBuoy,
        group: "Nosotros",
    },
];

export default function Header() {
    const [home, setHome] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        getPublicSession(controller.signal)
            .then((session) => {
                if (!controller.signal.aborted) {
                    setHome(session);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        const logout = () => setHome(null);

        window.addEventListener("docsmart:session-ending", logout);

        return () => {
            controller.abort();
            window.removeEventListener("docsmart:session-ending", logout);
        };
    }, []);

    return (
        <DocSmartNav
            sessionHome={home}
            sessionLoading={loading}
            links={links}
        />
    );
}