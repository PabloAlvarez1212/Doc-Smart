"use client";

import { CalendarDays, Camera, Mail, Phone, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import styles from "./ProfileSidebar.module.css";

export default function ProfileSidebar({ perfil, actualizarFotoPerfil, guardando, eliminarFotoPerfil }) {
    const inputFotoRef = useRef(null);
    const fullName = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || "Usuario de DocSmart";
    const role = String(perfil?.rol || "paciente");
    const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)}`;

    const handleSeleccionarFoto = (event) => {
        const archivo = event.target.files?.[0];
        if (!archivo) return;
        actualizarFotoPerfil(archivo);
        event.target.value = "";
    };

    return (
        <aside className={styles.summary} aria-label="Identidad del paciente" aria-busy={guardando}>
            <div className={styles.identity}>
                <div className={styles.avatarWrap}>
                    <div className={styles.avatarSurface}>
                        <Image
                            width={136}
                            height={136}
                            alt={`Foto de perfil de ${fullName}`}
                            src={perfil?.foto_perfil || "/images/foto_default.png"}
                            className={styles.avatar}
                        />
                        {perfil?.foto_perfil && (
                            <>
                                <span className={styles.avatarOverlay} aria-hidden="true" />
                                <button
                                    type="button"
                                    className={styles.removePhotoButton}
                                    onClick={eliminarFotoPerfil}
                                    disabled={guardando}
                                    aria-label="Eliminar foto de perfil"
                                >
                                    <Trash2 size={20} aria-hidden="true" />
                                </button>
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        className={styles.cameraButton}
                        onClick={() => inputFotoRef.current?.click()}
                        disabled={guardando}
                        aria-label="Cambiar foto de perfil"
                    >
                        <Camera size={18} aria-hidden="true" />
                    </button>
                    <input
                        ref={inputFotoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={handleSeleccionarFoto}
                    />
                </div>

                <div className={styles.identityCopy}>
                    <h2>{fullName}</h2>
                    <span className={styles.role}>{roleLabel}</span>
                    <p>{guardando ? "Actualizando información" : "Perfil personal"}</p>
                </div>
            </div>

            <dl className={styles.details}>
                <div>
                    <span aria-hidden="true"><Mail size={18} /></span>
                    <div>
                        <dt>Correo</dt>
                        <dd className={styles.email}>{perfil?.correo || "No disponible"}</dd>
                    </div>
                </div>
                <div>
                    <span aria-hidden="true"><Phone size={18} /></span>
                    <div>
                        <dt>Teléfono</dt>
                        <dd>{perfil?.telefono || "No disponible"}</dd>
                    </div>
                </div>
                <div>
                    <span aria-hidden="true"><CalendarDays size={18} /></span>
                    <div>
                        <dt>Edad</dt>
                        <dd>{perfil?.edad != null ? `${perfil.edad} años` : "No disponible"}</dd>
                    </div>
                </div>
            </dl>

        </aside>
    );
}
