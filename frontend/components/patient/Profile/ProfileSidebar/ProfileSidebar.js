"use client"
import { useRef } from "react";
import Button from "../../../ui/Button/Button"
import styles from "./ProfileSidebar.module.css"
import Image from "next/image"
import { User, MailIcon, PhoneCall, UploadCloudIcon } from "lucide-react"
export default function ProfileSidebar({ perfil, actualizarFotoPerfil, guardando }) {
    const inputFotoRef = useRef(null);
    const handleSeleccionarFoto = (e) => {
        const archivo = e.target.files[0];

        if (!archivo) {
            return;
        }

        actualizarFotoPerfil(archivo);
    };

    return (
        <div className={styles.containerSidebar}>
            <div className={styles.fotoPerfil}>
                <Image width={100} height={100} alt="foto de perfil" src={perfil?.foto_perfil ? `http://localhost:8000${perfil.foto_perfil}` : "/images/foto_default.png"} />
                <input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleSeleccionarFoto} />
                <p className={styles.nombre}>{`${perfil.nombre ?? "Usuario"} ${perfil.apellido}`}</p>
                <p className={styles.rol}>{perfil.rol}</p>
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
                    <p>{perfil.correo}</p>
                </div>
                <div className={styles.itemList}>
                    <PhoneCall />
                    <p>{perfil.telefono}</p>
                </div>
                <div className={styles.itemList}>
                    <User />
                    <p>{`${perfil.edad} años`}</p>
                </div>
            </div>
        </div>
    )
}