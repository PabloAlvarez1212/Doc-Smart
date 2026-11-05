
"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useTheme } from "../Theme/ThemeProvider";
import {
    Check,
    ChevronRight,
    KeyRound,
    LogOut,
    Mic,
    MicOff,
    Monitor,
    Moon,
    Palette,
    ShieldCheck,
    ShieldAlert,
    Sun,
    MessageCircle,
    Square,
} from "lucide-react";

import Style from "./SettingsComponent.module.css";

const THEMES = [
    { value: "light", label: "Claro", Icon: Sun },
    { value: "dark", label: "Oscuro", Icon: Moon },
    { value: "system", label: "Sistema", Icon: Monitor },
];

const sendVoiceCommand = (enabled) => {
    window.dispatchEvent(
        new CustomEvent("bymax:voice-command", {
            detail: { enabled },
        })
    );
};

export default function SettingsComponent({
    abrirCambiarContrasena,
    cerrarSesion,
    reportesHref = null,
    onReportesClick,
}) {
    const [voice, setVoice] = useState(null);
    const [tab, setTab] = useState("look");

    const { preference, changeTheme } = useTheme();
    const baseId = useId();

    useEffect(() => {
        const receive = (event) => setVoice(event.detail);

        window.addEventListener("bymax:voice-state", receive);
        window.dispatchEvent(new Event("bymax:voice-query"));

        return () => {
            window.removeEventListener("bymax:voice-state", receive);
        };
    }, []);

    const voiceLabel =
        voice?.error ||
        {
            waiting: "Esperando «Bymax»",
            listening: "Escuchando",
            paused: "Procesando",
            suspended: "Escucha suspendida",
            starting: "Preparando micrófono",
            recovering: "Recuperando escucha",
        }[voice?.mic] ||
        (voice?.enabled ? "Voz habilitada" : "Voz desactivada");

    const voiceStatus = ["starting", "speaking"].includes(
        voice?.playback
    )
        ? "Respondiendo"
        : voiceLabel;

    const tabs = [
        {
            id: "look",
            label: "Apariencia",
            Icon: Palette,
        },
        ...(voice
            ? [
                  {
                      id: "voice",
                      label: "Voz de Bymax",
                      Icon: Mic,
                  },
              ]
            : []),
        {
            id: "account",
            label: "Cuenta",
            Icon: ShieldCheck,
        },
    ];

    const active = tabs.some((item) => item.id === tab)
        ? tab
        : "look";

    return (
        <div className={Style.containerMain}>
            {/* PESTAÑAS */}
            <div
                className={Style.tabs}
                role="tablist"
                aria-label="Secciones de configuración"
            >
                {tabs.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`${baseId}-tab-${id}`}
                        aria-selected={active === id}
                        aria-controls={`${baseId}-panel`}
                        className={`${Style.tab} ${
                            active === id ? Style.tabOn : ""
                        }`}
                        onClick={() => setTab(id)}
                    >
                        <Icon size={17} aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </div>

            <div
                className={Style.panel}
                role="tabpanel"
                id={`${baseId}-panel`}
                aria-labelledby={`${baseId}-tab-${active}`}
                key={active}
            >
                {/* APARIENCIA */}
                {active === "look" && (
                    <section aria-label="Apariencia">
                        <h3>Apariencia</h3>

                        <p className={Style.lead}>
                            Elige un tema o sigue la apariencia de tu
                            dispositivo.
                        </p>

                        <div
                            className={Style.themes}
                            role="radiogroup"
                            aria-label="Tema"
                        >
                            {THEMES.map(({ value, label, Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={preference === value}
                                    className={`${Style.theme} ${
                                        preference === value
                                            ? Style.themeOn
                                            : ""
                                    }`}
                                    onClick={() => changeTheme(value)}
                                >
                                    <span
                                        className={`${Style.preview} ${
                                            Style[`preview_${value}`]
                                        }`}
                                        aria-hidden="true"
                                    >
                                        <i />
                                        <i />
                                    </span>

                                    <span className={Style.themeName}>
                                        <Icon
                                            size={15}
                                            aria-hidden="true"
                                        />
                                        {label}
                                    </span>

                                    <span
                                        className={Style.check}
                                        aria-hidden="true"
                                    >
                                        <Check
                                            size={12}
                                            strokeWidth={3}
                                        />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* VOZ DE BYMAX */}
                {active === "voice" && voice && (
                    <section aria-label="Configuración de voz de Bymax">
                        <h3>Voz de Bymax</h3>

                        <p className={Style.lead}>
                            Habla con el asistente sin tocar la pantalla.
                        </p>

                        <div
                            className={`${Style.voice} ${
                                voice.enabled ? Style.voiceOn : ""
                            }`}
                        >
                            <div className={Style.voiceTop}>
                                <span
                                    className={Style.orb}
                                    aria-hidden="true"
                                >
                                    {voice.enabled ? (
                                        <Mic size={22} />
                                    ) : (
                                        <MicOff size={22} />
                                    )}
                                </span>

                                <div className={Style.voiceText}>
                                    <strong>Voz de Bymax</strong>
                                    <span role="status">
                                        {voiceStatus}
                                    </span>
                                </div>

                                <input
                                    type="checkbox"
                                    className={Style.switch}
                                    role="switch"
                                    checked={Boolean(voice.enabled)}
                                    onChange={(event) =>
                                        sendVoiceCommand(
                                            event.target.checked
                                        )
                                    }
                                    aria-label={
                                        voice.enabled
                                            ? "Desactivar voz"
                                            : "Activar voz"
                                    }
                                />
                            </div>

                            <div
                                className={Style.wave}
                                aria-hidden="true"
                            >
                                {Array.from(
                                    { length: 28 },
                                    (_, index) => (
                                        <i
                                            key={index}
                                            style={{
                                                "--k": index,
                                                "--h": (
                                                    0.3 +
                                                    ((index * 37) % 70) / 100
                                                ).toFixed(2),
                                            }}
                                        />
                                    )
                                )}
                            </div>
                        </div>

                        <ul className={Style.tips}>
                            <li>
                                <MessageCircle
                                    size={16}
                                    aria-hidden="true"
                                />
                                <span>
                                    Di <q>Bymax</q> y conversa con
                                    normalidad.
                                </span>
                            </li>

                            <li>
                                <Square
                                    size={16}
                                    aria-hidden="true"
                                />
                                <span>
                                    Di <q>terminar conversación</q> para
                                    volver a esperar su nombre.
                                </span>
                            </li>

                            <li>
                                <ShieldCheck
                                    size={16}
                                    aria-hidden="true"
                                />
                                <span>
                                    El navegador puede pedir permiso para
                                    el micrófono. Si bloquea el audio,
                                    pulsa Reproducir en el chat.
                                </span>
                            </li>
                        </ul>
                    </section>
                )}

                {/* CUENTA Y SEGURIDAD */}
                {active === "account" && (
                    <section aria-label="Cuenta y seguridad">
                        <h3>Cuenta y seguridad</h3>

                        <p className={Style.lead}>
                            Administra la seguridad y el acceso a tu
                            cuenta.
                        </p>

                        <div className={Style.actions}>
                            {/* CAMBIAR CONTRASEÑA */}
                            <button
                                type="button"
                                className={Style.row}
                                onClick={abrirCambiarContrasena}
                            >
                                <span
                                    className={`${Style.rowIcon} ${Style.toneBlue}`}
                                >
                                    <KeyRound
                                        size={20}
                                        aria-hidden="true"
                                    />
                                </span>

                                <span className={Style.rowText}>
                                    <b>Cambiar contraseña</b>
                                    <small>
                                        Actualiza tu contraseña de acceso
                                    </small>
                                </span>

                                <ChevronRight
                                    size={20}
                                    aria-hidden="true"
                                />
                            </button>

                            {/* REPORTES Y SEGURIDAD */}
                            {reportesHref && (
                                <Link
                                    href={reportesHref}
                                    onClick={onReportesClick}
                                    className={`${Style.row} ${Style.rowLink}`}
                                >
                                    <span
                                        className={`${Style.rowIcon} ${Style.toneBlue}`}
                                    >
                                        <ShieldAlert
                                            size={20}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <span className={Style.rowText}>
                                        <b>Reportes y seguridad</b>
                                        <small>
                                            Consulta tus reportes y el
                                            estado de tu cuenta.
                                        </small>
                                    </span>

                                    <ChevronRight
                                        size={20}
                                        aria-hidden="true"
                                    />
                                </Link>
                            )}

                            {/* CERRAR SESIÓN */}
                            <button
                                type="button"
                                className={Style.row}
                                onClick={cerrarSesion}
                            >
                                <span
                                    className={`${Style.rowIcon} ${Style.toneOrange}`}
                                >
                                    <LogOut
                                        size={20}
                                        aria-hidden="true"
                                    />
                                </span>

                                <span className={Style.rowText}>
                                    <b>Cerrar sesión</b>
                                    <small>
                                        Sales de tu cuenta en este
                                        dispositivo
                                    </small>
                                </span>

                                <ChevronRight
                                    size={20}
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
