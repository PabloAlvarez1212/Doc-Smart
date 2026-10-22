"use client";
import { useCallback, useState } from 'react';
import ChatWorkspaceContext from './ChatWorkspaceContext';
import { usePathname } from 'next/navigation';
import ChatList from './ChatList';
import useChatViewport from './useChatViewport';
import './chat-layout.css';
import styles from './Chat.module.css';

export default function ChatWorkspace({ role, children }) {
  const ref = useChatViewport();
  const [snapshots, setSnapshots] = useState({});
  const publish = useCallback(conversation => setSnapshots(previous => ({...previous, [conversation.id]: conversation})), []);
  const pathname = usePathname();
  const selectedId = pathname.match(/\/my-chats\/([^/]+)\/?$/)?.[1];
  return <ChatWorkspaceContext.Provider value={publish}><section ref={ref} data-chat-page="workspace" data-chat-conversation="true" aria-label={role === 'medico' ? 'Chats con pacientes' : 'Chats con médicos'} className={`${styles.page} ${styles.workspacePage} ${role === 'medico' ? styles.doctor : ''}`}>
    <div className={`${styles.listWorkspace} ${selectedId ? styles.hasConversation : ''}`}>
      <aside className={styles.workspaceSidebar} aria-label="Lista de conversaciones"><ChatList role={role} embedded selectedId={selectedId} conversationUpdates={snapshots} /></aside>
      <div className={styles.workspaceConversation}>{children}</div>
    </div>
  </section></ChatWorkspaceContext.Provider>;
}
