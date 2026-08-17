// Reemplaza src/app/services/bymaxServices.js
import api from "@/app/services/api";

function detalleError(error, respaldo) {
  return error?.response?.data?.errores?.detalle ||
    error?.response?.data?.mensaje || error?.message || respaldo;
}

function datos(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export const bymaxService = {
  async iniciarChat() {
    try { return datos(await api.post("/chatbot/chats/")); }
    catch (error) { throw new Error(detalleError(error, "No fue posible crear la conversación.")); }
  },
  async listarChats() {
    try { const value = datos(await api.get("/chatbot/chats/")); return Array.isArray(value) ? value : []; }
    catch (error) { throw new Error(detalleError(error, "No fue posible cargar tus conversaciones.")); }
  },
  async obtenerMensajes(idChat) {
    try { const value = datos(await api.get(`/chatbot/mensajes/${idChat}/`)); return Array.isArray(value) ? value : []; }
    catch (error) { throw new Error(detalleError(error, "No fue posible cargar los mensajes.")); }
  },
  async eliminarChat(idChat) {
    try { await api.delete(`/chatbot/chats/${idChat}/`); return true; }
    catch (error) { throw new Error(detalleError(error, "No fue posible eliminar la conversación.")); }
  },
  async enviarMensaje(idChat, mensaje, imagen = null) {
    try {
      let payload = { mensaje };
      let config;
      if (imagen) {
        payload = new FormData();
        payload.append("mensaje", mensaje);
        payload.append("imagen", imagen);
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const value = datos(await api.post(`/chatbot/chats/${idChat}/responder/`, payload, config));
      return {
        respuesta: String(value?.respuesta ?? value?.message ?? "No recibí una respuesta válida."),
        resultado: value?.resultado ?? value?.data ?? null,
      };
    } catch (error) {
      throw new Error(detalleError(error, "Ocurrió un error comunicándome con Bymax."));
    }
  },
};
