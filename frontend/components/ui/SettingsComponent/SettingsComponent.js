import Style from "./SettingsComponent.module.css"
import { KeyIcon, ChevronRight, LogOutIcon, TrashIcon } from "lucide-react"
export default function SettingsComponent({abrirCambiarContrasena,eliminarCuenta, cerrarSesion }) {
    return (
        <div className={Style.containerMain}>
            <div className={Style.cards}>
                <div className={Style.card} onClick={() => abrirCambiarContrasena()}>
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