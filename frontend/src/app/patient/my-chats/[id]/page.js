import ChatConversation from '../../../../../components/chat/ChatConversation';
export default async function ConversationPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  return <ChatConversation id={id} citaId={query?.cita} role="paciente" embedded />;
}
