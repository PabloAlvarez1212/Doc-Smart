"use client";
import { useEffect, useRef, useState } from 'react';
import chatService from '@/app/services/chatServices';
import { marcarInasistenciaPacienteService } from '@/app/services/appointmentsServices';
import { createChatSession } from './chatSession.mjs';
import { createChatRealtime, chatSocketUrl } from './chatRealtime.mjs';

const api = { ...chatService, inasistencia: marcarInasistenciaPacienteService };
export default function useChatConversation(id, role) {
  const session = useRef(null);
  const [state, setState] = useState({ loading: true, messages: [], attachments: [], text: '' });
  useEffect(() => {
    // Crear por setup hace segura la repetición de efectos de StrictMode.
    const current = createChatSession({ api, id, role, isVisible: () => document.visibilityState === 'visible' });
    session.current = current;
    const unsubscribe = current.subscribe(() => setState(current.getSnapshot()));
    let realtime;
    try {
      realtime = createChatRealtime({
        url: chatSocketUrl({ wsUrl: process.env.NEXT_PUBLIC_WS_URL, apiUrl: process.env.NEXT_PUBLIC_API_URL, id, origin: window.location.origin }),
        reconcile: async () => { await current.refresh(); return !current.getSnapshot().denied; }, sendRest: payload => api.enviar(id, payload),
        onEvent: current.receive, onStatus: current.connection, isOwn: message => message.emisor?.tipo === role,
        isOnline: () => navigator.onLine,
      });
      current.attachRealtime(realtime);
    } catch { current.connection('disconnected'); }
    current.refresh().then(allowed => { if (allowed) realtime?.start(); });
    const focus = () => {
      const state = current.getSnapshot();
      if (document.visibilityState === 'visible' && !state.loading && !state.loadingOlder && !state.sending && !state.uploading && !state.acting) current.refresh();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const network = () => realtime?.network();
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
      unsubscribe(); realtime?.dispose(); current.dispose();
      if (session.current === current) session.current = null;
    };
  }, [id, role]);
  return {
    state,
    refresh: async () => { const current = session.current; if (await current?.refresh()) current.retryRealtime(); },
    loadOlder: () => session.current?.loadOlder(),
    send: () => session.current?.send(),
    upload: files => session.current?.upload(files),
    setText: text => session.current?.setText(text),
    removeAttachment: id => session.current?.removeAttachment(id),
    action: kind => session.current?.action(kind),
    attachmentUrl: fileId => session.current?.attachmentUrl(fileId),
  };
}
