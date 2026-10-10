"use client";

import { useEffect, useState } from "react";
import ThemeSelector from "../Theme/ThemeSelector";
import Style from "./SettingsComponent.module.css";
import { KeyIcon, ChevronRight, LogOutIcon, TrashIcon } from "lucide-react";
export default function SettingsComponent({
  abrirCambiarContrasena,
  eliminarCuenta,
  cerrarSesion
}) {
  const [voice, setVoice] = useState(null);
  useEffect(() => {
    const receive = event => setVoice(event.detail);
    window.addEventListener("bymax:voice-state", receive);
    window.dispatchEvent(new Event("bymax:voice-query"));
    return () => window.removeEventListener("bymax:voice-state", receive);
  }, []);
  const voiceLabel = voice?.error || {
    waiting: "Esperando «Bymax»",
    listening: "Escuchando",
    paused: "Procesando",
    suspended: "Escucha suspendida",
    starting: "Preparando micrófono",
    recovering: "Recuperando escucha"
  }[voice?.mic] || (voice?.enabled ? "Voz habilitada" : "Voz desactivada");
  return <div className={Style.containerMain}>
            <div className={Style.cards}><section className={Style.card} aria-label="Apariencia"><div className={Style.textContainer}><h3>Apariencia</h3><p>Elige un tema o sigue la apariencia de tu dispositivo.</p><ThemeSelector /></div></section>
                {voice && <section className={Style.card} aria-label="Configuración de voz de Bymax">
                    <div className={Style.textContainer}>
                        <h3>Voz de Bymax</h3>
                        <p role="status">{["starting", "speaking"].includes(voice.playback) ? "Respondiendo" : voiceLabel}</p>
                        <p>Di «Bymax» y conversa. Di «terminar conversación» para volver a esperar su nombre.</p>
                        <p>El navegador puede pedir permiso para el micrófono. Si bloquea el audio, pulsa Reproducir en el chat.</p>
                        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("bymax:voice-command", {
            detail: {
              enabled: true
            }
          }))} disabled={voice.enabled && voice.active}>Activar voz</button>
                        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("bymax:voice-command", {
            detail: {
              enabled: false
            }
          }))} disabled={!voice.enabled}>Desactivar voz</button>
                    </div>
                </section>}
                <button type="button" className={Style.card} onClick={abrirCambiarContrasena}>
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

                </button>
                <button type="button" className={Style.card} onClick={cerrarSesion}>
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
                </button>
                {eliminarCuenta && <button type="button" className={Style.card} onClick={eliminarCuenta}>
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
                    </button>}
            </div>
        </div>;
}
