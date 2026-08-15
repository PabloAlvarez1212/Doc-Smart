// src/app/services/bymaxServices.js

const API_BASE_URL = "http://localhost:8000/api/chatbot";

export const bymaxService = {
  async iniciarChat(token) {
    const response = await fetch(`${API_BASE_URL}/chats/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al crear el chat con Bymax");
    }

    const data = await response.json();
    return data.data;
  },

  async enviarMensaje(idChat, mensaje, token) {
    const response = await fetch(
      `${API_BASE_URL}/chats/${idChat}/responder/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Error al enviar el mensaje");
    }

    const data = await response.json();
    return data.data;
  },

  async obtenerMensajes(idChat, token) {
    const response = await fetch(
      `${API_BASE_URL}/mensajes/${idChat}/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error al obtener los mensajes");
    }

    const data = await response.json();
    return data.data;
  },
};