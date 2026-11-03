import {
    BadgeCheck,
    BadgePlus,
    CircleUserRound,
    LayoutDashboard,
    Map,
    MapPinned,
    Phone,
    ScanFace,
    Settings2,
    Shield,
    Stethoscope,
    UserRoundCheck,
} from "lucide-react";

// Páginas del panel administrativo agrupadas como se muestran en el sidebar, el menú móvil y la búsqueda.
export const adminGroups = [
    {
        label: "Principal",
        links: [
            { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Métricas generales" },
            { href: "/admin/patients", label: "Pacientes", icon: CircleUserRound, hint: "Gestión de pacientes" },
            { href: "/admin/doctors", label: "Médicos", icon: Stethoscope, hint: "Gestión de médicos" },
        ],
    },
    {
        label: "Validación",
        links: [
            { href: "/admin/doctor-requests", label: "Solicitudes médicas", icon: UserRoundCheck, hint: "Aprobar médicos nuevos" },
            { href: "/admin/patient-verification", label: "Verificación de pacientes", icon: ScanFace, hint: "Revisar validación facial" },
        ],
    },
    {
        label: "Catálogos",
        icon: Settings2,
        collapsible: true,
        links: [
            { href: "/admin/specialties", label: "Especialidades", icon: BadgePlus, hint: "Especialidades médicas" },
            { href: "/admin/departments", label: "Departamentos", icon: Map, hint: "Departamentos del país" },
            { href: "/admin/cities", label: "Ciudades", icon: MapPinned, hint: "Ciudades por departamento" },
            { href: "/admin/states", label: "Estados", icon: BadgeCheck, hint: "Estados de citas y cuentas" },
            { href: "/admin/roles", label: "Roles", icon: Shield, hint: "Permisos por tipo de usuario" },
            { href: "/admin/channel", label: "Medios", icon: Phone, hint: "Canales de atención" },
        ],
    },
];

export const isAdminRouteActive = (pathname, href) =>
    pathname === href || pathname.startsWith(`${href}/`);
