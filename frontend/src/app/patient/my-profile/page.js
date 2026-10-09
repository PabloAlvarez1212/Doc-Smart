"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Swal from "sweetalert2";
import {
    listarInfoSalud,
    listarTiposInfoSalud,
    crearInfoSalud,
    editarInfoSalud,
    eliminarInfoSalud,
} from "../../services/api";
import PersonalInfo from "../../../../components/patient/Profile/PersonalInfo/PersonalInfo";
import FormInfoSalud from "../../../../components/forms/InfoUser/FormInfoSalud";
import ProfileSidebar from "../../../../components/patient/Profile/ProfileSidebar/ProfileSidebar";
import useProfile from "../../../../components/patient/Profile/useProfile";
import Modal from "../../../../components/ui/Modal/Modal";
import styles from "./MyProfile.module.css";

const lista = (datos) =>
    Array.isArray(datos) ? datos : datos?.results || [];

export default function MyProfile() {
    const reduceMotion = useReducedMotion();
    const {
        perfil, actualizarPerfilPaciente, error, guardando, loading,
        actualizarFotoPerfil, eliminarFotoPerfil,
    } = useProfile();

    const [datosSalud, setDatosSalud] = useState([]);
    const [tiposSalud, setTiposSalud] = useState([]);
    const [errorSalud, setErrorSalud] = useState("");
    const [cargandoSalud, setCargandoSalud] = useState(false);
    const [formAbierto, setFormAbierto] = useState(false);
    const [datoEditado, setDatoEditado] = useState(null);
    const [ocupadoSalud, setOcupadoSalud] = useState(false);
    const pacienteId = perfil?.id;

    useEffect(() => {
        if (!pacienteId) return;
        let activo = true;

        setDatosSalud([]);
        setErrorSalud("");
        setFormAbierto(false);
        setCargandoSalud(true);

        listarInfoSalud()
            .then((datos) => {
                if (activo) setDatosSalud(lista(datos));
            })
            .catch(() => {
                if (activo) setErrorSalud("No pudimos cargar tus datos médicos.");
            })
            .finally(() => {
                if (activo) setCargandoSalud(false);
            });

        return () => { activo = false; };
    }, [pacienteId]);

    async function abrirFormulario(dato = null) {
        if (ocupadoSalud || formAbierto) return;
        setOcupadoSalud(true);
        setErrorSalud("");

        try {
            const tipos = lista(await listarTiposInfoSalud());
            if (!tipos.length) {
                setErrorSalud("No hay tipos disponibles.");
                return;
            }
            setTiposSalud(tipos);
            setDatoEditado(dato);
            setFormAbierto(true);
        } catch {
            setErrorSalud("No pudimos cargar los tipos de información.");
        } finally {
            setOcupadoSalud(false);
        }
    }

    function cerrarFormulario() {
        if (!ocupadoSalud) setFormAbierto(false);
    }

    async function guardarDato(datos) {
        setOcupadoSalud(true);
        try {
            const resultado = datoEditado
                ? await editarInfoSalud(datoEditado.id, datos)
                : await crearInfoSalud(datos);

            setDatosSalud((actuales) => datoEditado
                ? actuales.map((dato) =>
                    dato.id === datoEditado.id ? resultado : dato)
                : [...actuales, resultado]
            );

            setFormAbierto(false);
            setErrorSalud("");
        } finally {
            setOcupadoSalud(false);
        }
    }

    async function eliminarDato(dato) {
        if (ocupadoSalud || formAbierto) return;
        setOcupadoSalud(true);

        try {
            const resultado = await Swal.fire({
                title: "¿Eliminar información?",
                text: `Se eliminará el registro: ${dato.nombre}.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Eliminar",
                cancelButtonText: "Cancelar",
                reverseButtons: true,
            });

            if (!resultado.isConfirmed) return;

            await eliminarInfoSalud(dato.id);
            setDatosSalud((actuales) =>
                actuales.filter((registro) => registro.id !== dato.id)
            );
            setErrorSalud("");
        } catch (e) {
            setErrorSalud(
                e.response?.data?.detail || "No se pudo eliminar el registro."
            );
        } finally {
            setOcupadoSalud(false);
        }
    }

    const accionesDisponibles =
        !ocupadoSalud && !cargandoSalud && !formAbierto;

    const entrance = reduceMotion
        ? {
            initial: false,
            animate: { opacity: 1, transform: "translateY(0px)" },
            transition: { duration: 0 },
        }
        : {
            initial: { opacity: 1, transform: "translateY(4px)" },
            animate: { opacity: 1, transform: "translateY(0px)" },
            transition: { duration: .18, ease: [0.23, 1, 0.32, 1] },
        };

    if (loading) return <ProfileSkeleton />;

    if (error || !perfil) {
        return (
            <main className={styles.page}>
                <div className={styles.errorState} role="alert">
                    <span aria-hidden="true"><AlertCircle size={24} /></span>
                    <div>
                        <h1>No pudimos cargar tu perfil</h1>
                        <p>Vuelve a intentarlo en unos momentos.</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1>Mi perfil</h1>
                    <p>Mantén actualizados tus datos personales y de salud.</p>
                </div>
                <span>Perfil del paciente</span>
            </header>

            <div className={styles.profileLayout}>
                <m.div className={styles.sidebarColumn} {...entrance}>
                    <ProfileSidebar
                        perfil={perfil}
                        actualizarFotoPerfil={actualizarFotoPerfil}
                        guardando={guardando}
                        eliminarFotoPerfil={eliminarFotoPerfil}
                    />

                    <Modal
                        abierto={formAbierto}
                        onCerrar={cerrarFormulario}
                        titulo={datoEditado ? "Editar dato médico" : "Agregar dato médico"}
                        text="Registra información importante para tu atención."
                        width="720px"
                    >
                        <FormInfoSalud
                            key={formAbierto
                                ? `abierto-${datoEditado?.id ?? "nuevo"}`
                                : "cerrado"}
                            tipos={tiposSalud}
                            datoInicial={datoEditado}
                            onGuardar={guardarDato}
                            onCancelar={cerrarFormulario}
                        />
                    </Modal>
                </m.div>

                <m.div className={styles.formColumn} {...entrance}>
                    {cargandoSalud && <p role="status">Cargando datos médicos…</p>}
                    {errorSalud && <p role="alert">{errorSalud}</p>}

                    <PersonalInfo
                        perfil={perfil}
                        actualizarPerfilPaciente={actualizarPerfilPaciente}
                        guardando={guardando}
                        datosSalud={datosSalud}
                        onAgregarSalud={accionesDisponibles
                            ? () => abrirFormulario() : undefined}
                        onEditarSalud={accionesDisponibles
                            ? abrirFormulario : undefined}
                        onEliminarSalud={accionesDisponibles
                            ? eliminarDato : undefined}
                    />

                    {formAbierto && (
                        <FormInfoSalud
                            key={datoEditado?.id ?? "nuevo"}
                            tipos={tiposSalud}
                            datoInicial={datoEditado}
                            onGuardar={guardarDato}
                            onCancelar={() => {
                                setFormAbierto(false);
                                setDatoEditado(null);
                            }}
                        />
                    )}
                </m.div>
            </div>
        </main>
    );
}

function ProfileSkeleton() {
    return (
        <main className={styles.page}>
            <div className={styles.skeletonHeader}
                role="status" aria-label="Cargando perfil">
                <span /><span />
            </div>
            <div className={styles.skeletonLayout} aria-hidden="true">
                <span className={styles.skeletonSidebar} />
                <div><span /><span /></div>
            </div>
        </main>
    );
}