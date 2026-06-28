"use client"
import Swal from "sweetalert2";
import Styles from "./Header.module.css";
import Image from "next/image";
import Button from "../../ui/Button/Button";
import { LogOutIcon } from "lucide-react";
export default function Header() {
    const logoutFunction = () => {
        Swal.fire({
            title: "Estas seguro que quieres cerrar sesión?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Si, cerrar sesión",
            cancelButtonText: "Cancelar",
        }).then((result) => {
            if (result.isConfirmed) Swal.fire({
                title: "Éxito!",
                text: "Se a cerrado sesión correctamente.",
                icon: "success"
            });
        });
    }
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo" />
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icons}>
                    <Button onClick={logoutFunction} size="sm"><LogOutIcon size={30} className={Styles.icon} /></Button>

                </div>
            </div>
        </div>
    )
}