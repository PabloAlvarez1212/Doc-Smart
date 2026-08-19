import Style from "./SettingsComponent.module.css"
import { useRouter } from "next/navigation"
import { KeyIcon, ChevronRight, LogOutIcon, TrashIcon } from "lucide-react"
import Swal from "sweetalert2";
export default function SettingsComponent({ data, eliminarCuenta, cerrarSesion }) {
    const router = useRouter();
    const navegation = async () => {
        const result = await Swal.fire({
            title: "¿Cambiar contraseña?",
            text: "Serás redirigido a la página para cambiar tu contraseña.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
            customClass: {
                container: Style.Swal
            }
        });

        if (result.isConfirmed) {
            router.push("/forgot-password");
        }
    };
    return (
        <div className={Style.containerMain}>
            <div className={Style.cards}>
                <div className={Style.card} onClick={() => navegation()}>
                    <div className={Style.titleContainer}>
                        <div className={Style.containerllaveIcon}>
                            <KeyIcon color="#6188DC" className={Style.llaveIcon} />
                        </div>
                        <div className={Style.textContainer}>
                            <h3>Cambiar contraseña</h3>
                            <p>Actualiza tu contraseña de acceso</p>
                        </div>
                    </div>
                    <div>
                        <ChevronRight size={28} />
                    </div>

                </div>
                <div className={Style.card} onClick={() => cerrarSesion()}>
                    <div className={Style.titleContainer}>
                        <div className={Style.containerCerrarSesionIcon}>
                            <LogOutIcon color="#E77837" className={Style.cerrarSesionIcon} />
                        </div>
                        <div className={Style.textContainer}>
                            <h3>Cerrar Sesión</h3>
                            <p>Sales de tu cuenta en este dispositivo</p>
                        </div>
                    </div>
                    <ChevronRight size={28} />
                </div>
                <div className={Style.card} onClick={() => eliminarCuenta()}>
                    <div className={Style.titleContainer}>
                        <div className={Style.containerEliminarIcon}>
                            <TrashIcon color="#E05362" />
                        </div>
                        <div className={Style.textContainer}>
                            <h3 className={Style.textEliminar}>Eliminar cuenta</h3>
                            <p>Elimina permanentemente tu cuenta</p>
                        </div>
                    </div>
                    <ChevronRight size={28} />
                </div>
            </div>
        </div>
    )
}