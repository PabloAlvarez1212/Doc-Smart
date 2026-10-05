function identifier(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new Error('Identificador de chat inválido');
  return Number(value);
}
export function createChatService(api) {
  const base = id => `/chat-citas/conversaciones/${identifier(id)}/`;
  const data = request => request.then(response => response.data.data);
  return {
    listar: (params = {}) => data(api.get('/chat-citas/conversaciones/', { params: { page: 1, page_size: 20, ...params } })),
    detalle: id => data(api.get(base(id))),
    historial: (id, params = {}) => data(api.get(base(id) + 'mensajes/', { params: { limit: 50, ...params } })),
    enviar: (id, payload) => data(api.post(base(id) + 'mensajes/', payload)),
    leer: (id, ultimo_mensaje_id) => data(api.put(base(id) + 'lectura/', { ultimo_mensaje_id })),
    habilitar: id => data(api.post(base(id) + 'habilitar/', {})),
    subir: (id, file) => {
      const form = new FormData(); form.append('archivo', file);
      return data(api.post(base(id) + 'adjuntos/', form));
    },
    urlAdjunto: (id, fileId) => data(api.get(base(id) + `adjuntos/${identifier(fileId)}/url/`)),
  };
}
