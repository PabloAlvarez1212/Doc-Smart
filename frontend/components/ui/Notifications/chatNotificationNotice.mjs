export const isChatNotification = notification => notification?.tipo === 'mensaje_nuevo';

export function chatNotificationNotice(error) {
    if ([403,404,410].includes(error?.response?.status)) return {
        title:'Conversación no disponible',
        text:'Este chat ya no está disponible para tu cuenta. Puedes revisar tus otras conversaciones en Mis chats.',
    };
    return {title:'No pudimos abrir el chat',text:'Inténtalo nuevamente en unos momentos o entra desde Mis chats.'};
}
