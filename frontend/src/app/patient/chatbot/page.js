"use client";

import { useEffect, useState } from "react";
import api from "@/app/services/api";

export default function ChatBot() {
    const [chatId, setChatId] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        crearChat();
    }, []);

    async function crearChat() {
        try {
            const response = await api.post("/chatbot/chats/");
            const data = response.data;

            if (!data.data || !data.data.id) {
                throw new Error("El backend no devolvió el ID del chat.");
            }

            setChatId(data.data.id);

            setMensajes([
                {
                    remitente: "bot",
                    texto: "Hola 👋 Soy Bymax. ¿En qué puedo ayudarte hoy?",
                },
            ]);
        } catch (error) {
            console.error("Error creando chat:", error);
            setMensajes([
                {
                    remitente: "bot",
                    texto: "No fue posible iniciar el chat.",
                },
            ]);
        } finally {
            setCargando(false);
        }
    }

    async function enviarMensaje() {
        if (!mensaje.trim()) return;
        if (!chatId) {
            console.error("El chat aún no existe.");
            return;
        }

        const texto = mensaje;

        setMensajes((prev) => [
            ...prev,
            { remitente: "usuario", texto },
        ]);
        setMensaje("");

        try {
            const response = await api.post(
                `/chatbot/chats/${chatId}/responder/`,
                { mensaje: texto }
            );

            const data = response.data;

            setMensajes((prev) => [
                ...prev,
                {
                    remitente: "bot",
                    texto: data.data?.respuesta || "Sin respuesta.",
                },
            ]);
        } catch (error) {
            console.error(error);
            setMensajes((prev) => [
                ...prev,
                {
                    remitente: "bot",
                    texto: "Ocurrió un error procesando tu mensaje.",
                },
            ]);
        }
    }

    if (cargando) {
        return <h2>Cargando...</h2>;
    }

    return (
        <div style={{ maxWidth: 700, margin: "40px auto" }}>
            <h1>Bymax</h1>

            <div
                style={{
                    height: 500,
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    padding: 15,
                    marginBottom: 20,
                }}
            >
                {mensajes.map((m, i) => (
                    <div
                        key={i}
                        style={{
                            textAlign: m.remitente === "usuario" ? "right" : "left",
                            marginBottom: 15,
                        }}
                    >
                        <b>{m.remitente === "usuario" ? "Tú" : "Bymax"}</b>
                        <div>{m.texto}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
                <input
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            enviarMensaje();
                        }
                    }}
                    style={{ flex: 1, padding: 10 }}
                />
                <button onClick={enviarMensaje}>Enviar</button>
            </div>
        </div>
    );
}