import ChatConversation from '../../../../../components/chat/ChatConversation';
export default async function ConversationPage({ params }) {
  const { id } = await params;
  return <ChatConversation id={id} role="paciente" />;
}
