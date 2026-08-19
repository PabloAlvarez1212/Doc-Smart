"use client";

import { useRef } from "react";
import Button from "../../../ui/Button/Button";
import styles from "./ProfileSidebar.module.css";
import Image from "next/image";
import {
    User,
    MailIcon,
    PhoneCall,
    UploadCloudIcon,
    Trash2Icon
} from "lucide-react";

export default function ProfileSidebar({
    perfil,
    actualizarFotoPerfil,
    guardando,
    eliminarFotoPerfil
}) {
    const inputFotoRef = useRef(null);

    const handleSeleccionarFoto = (e) => {
        const archivo = e.target.files[0];

        if (!archivo) {
            return;
        }

        actualizarFotoPerfil(archivo);

        // Permite volver a seleccionar el mismo archivo
        e.target.value = "";
    };

    return (
        <div className={styles.containerSidebar}>

            <div className={styles.fotoPerfil}>

                <div className={styles.containerImage}>

                    <Image
                        width={120}
                        height={120}
                        alt="Foto de perfil"
                        src={
                            perfil?.foto_perfil
                                ? `http://localhost:8000${perfil.foto_perfil}`
                                : "/images/foto_default.png"
                        }
                    />

                    <Trash2Icon
                        onClick={() => eliminarFotoPerfil()}
                        className={styles.icon}
                        size={42}
                    />

                </div>

                <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handleSeleccionarFoto}
                />

                <p className={styles.nombre}>
                    {`${perfil?.nombre ?? "Médico"} ${perfil?.apellido ?? ""}`}
                </p>

                <p className={styles.rol}>
                    {perfil?.rol ?? "Médico"}
                </p>

                <Button
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={guardando}
                    type="button"
                    variant="white"
                >
                    {guardando ? (
                        "Actualizando..."
                    ) : (
                        <>
                            <UploadCloudIcon />
                            &nbsp;&nbsp;&nbsp;Cambiar foto
                        </>
                    )}
                </Button>

            </div>

            <div className={styles.infoProfile}>

                <div className={styles.itemList}>
                    <MailIcon />
                    <p>{perfil?.correo ?? "Sin correo"}</p>
                </div>

                <div className={styles.itemList}>
                    <PhoneCall />
                    <p>{perfil?.telefono ?? "Sin teléfono"}</p>
                </div>

                <div className={styles.itemList}>
                    <User />
                    <p>
                        {perfil?.edad
                            ? `${perfil.edad} años`
                            : "Edad no disponible"}
                    </p>
                </div>

            </div>

        </div>
    );
}