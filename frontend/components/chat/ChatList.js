
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {MessageSquare,MessagesSquare,Archive,ArchiveRestore,Trash2,} from "lucide-react";
import useChatViewport from "./useChatViewport";
import "./chat-layout.css";
import chatService from "@/app/services/chatServices";
import Button from "../ui/Button/Button";
import { ChatListView } from "./ChatUI";
import { chatError } from "./chatState.mjs";
import styles from "./Chat.module.css";
import { useNotificationsContext } from "../contex/NotificationsContext";

export default function ChatList({
  role,
  embedded = false,
  selectedId,
  selectedConversation,
  conversationUpdates = {},
}) {
  const router = useRouter();
  const viewportRef = useChatViewport();
  const menuRef = useRef(null);
  const { notificaciones } = useNotificationsContext();
  const activity = notificaciones.filter((notification) => notification.conversacion_id)
    .map((notification) => `${notification.id}:${notification.leida}`)
    .join(",");
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState(false);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Menú contextual
  const [menu, setMenu] = useState(null);
  const [menuBusy, setMenuBusy] = useState(false);

  // ==========================================
  // CARGAR CONVERSACIONES
  // ==========================================
  useEffect(() => {let cancelled = false;setLoading(true);setError("");
    chatService
      .listar({
        page,
        page_size: 20,
        archivadas: archived,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setError(chatError(error).message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reload, activity, archived]);

  // ==========================================
  // ACTUALIZAR LISTA
  // ==========================================

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        setReload((value) => value + 1);
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("chat-list-changed", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("chat-list-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // ==========================================
  // ABRIR MENÚ CONTEXTUAL
  // ==========================================

  function openContextMenu(event, conversation, fromButton = false) {
    event.preventDefault();
    event.stopPropagation();
    if (menuBusy) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 228;
    const menuHeight = 120;
    const margin = 8;
    const desiredX = fromButton? rect.right - menuWidth : event.clientX;
    const desiredY = fromButton ? rect.bottom + 5 : event.clientY;const x = Math.max(margin,Math.min(desiredX, window.innerWidth - menuWidth - margin));
    const y = Math.max(margin,Math.min(desiredY, window.innerHeight - menuHeight - margin));
    setMenu({
      conversation,
      x,
      y,
    });
  }

  // ==========================================
  // CERRAR MENÚ CONTEXTUAL
  // ==========================================

  useEffect(() => {
    if (!menu) return;

    menuRef.current?.querySelector("button")?.focus();

    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenu(null);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMenu(null);
      }
    };

    const closeMenu = () => setMenu(null);

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);

      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);

  // Cerrar cuando cambia la vista
  useEffect(() => {
    setMenu(null);
  }, [selectedId, archived, page]);

  // ==========================================
  // ARCHIVAR / DESARCHIVAR / ELIMINAR
  // ==========================================

  async function manageConversation(kind) {
    if (!menu || menuBusy) return;

    const conversation = menu.conversation;

    setMenu(null);
    setMenuBusy(true);

    try {
      // Confirmar únicamente la eliminación.
      if (kind === "eliminar") {
        const confirmation = await Swal.fire({
          title: "¿Eliminar conversación para ti?",
          text:
            "La conversación se ocultará de tu cuenta. " +
            "El otro participante conservará su historial. " +
            "Si hay una nueva cita o mensaje, podrá reaparecer " +
            "sin mostrar los mensajes que eliminaste.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Eliminar para mí",
          cancelButtonText: "Cancelar",
          confirmButtonColor:
            role === "medico" ? "#157347" : "#1733a4",
        });

        if (!confirmation.isConfirmed) return;
      }

      // Reutilizar los servicios existentes.
      if (kind === "archivar") {
        await chatService.archivar(conversation.id);
      } else if (kind === "desarchivar") {
        await chatService.desarchivar(conversation.id);
      } else if (kind === "eliminar") {
        await chatService.eliminar(conversation.id);
      } else {
        return;
      }

      // Si estábamos viendo esta conversación,
      // regresar a la pantalla principal de chats.
      if (Number(selectedId) === Number(conversation.id)) {
        const root = role === "medico" ? "doctor" : "patient";

        router.replace(`/${root}/my-chats`);
      }

      // Actualizar la lista.
      setPage(1);
      setReload((value) => value + 1);

      window.dispatchEvent(new Event("chat-list-changed"));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo completar la acción",
        text: chatError(error).message,
        confirmButtonText: "Entendido",
      });
    } finally {
      setMenuBusy(false);
    }
  }

  // ==========================================
  // CONVERSACIONES ACTUALIZADAS
  // ==========================================

  const conversations = data?.results
    ?.map((item) => ({
      ...item,
      ...conversationUpdates[item.id],
      ...(Number(item.id) === Number(selectedConversation?.id)
        ? selectedConversation
        : {}),

      // Estos estados deben venir de la consulta actualizada
      // del backend, no de la conversación seleccionada.
      archivada: item.archivada,
      oculta: item.oculta,
    }))
    .filter(
      (item) =>
        !item.oculta &&
        Boolean(item.archivada) === archived
    );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      ref={embedded ? undefined : viewportRef}
      data-chat-page={embedded ? undefined : "list"}
      className={`${embedded ? styles.sidebar : styles.page} ${
        role === "medico" ? styles.doctor : ""
      }`}
    >
      <div
        className={
          embedded ? styles.sidebarBody : styles.listWorkspace
        }
      >
        <div className={styles.listColumn}>
          {/* FILTRO ARCHIVADAS */}
          <div className={styles.listToolbar}>
            <Button
              variant="secundary"
              className={styles.archiveToggle}
              aria-pressed={archived}
              onClick={() => {
                setMenu(null);
                setPage(1);
                setArchived((value) => !value);
              }}
            >
              {archived ? (
                <>
                  <MessagesSquare size={16} />
                  <span>Ver conversaciones principales</span>
                </>
              ) : (
                <>
                  <Archive size={16} />
                  <span>Ver archivadas</span>
                </>
              )}
            </Button>
          </div>

          {/* CARGANDO */}
          {loading && (
            <p role="status" className={styles.loading}>
              <span className={styles.spinner} />
              Cargando conversaciones…
            </p>
          )}

          {/* ERROR */}
          {error && (
            <div className={styles.error} role="alert">
              <p>{error}</p>

              <Button
                variant="secundary"
                onClick={() =>
                  setReload((value) => value + 1)
                }
              >
                Reintentar
              </Button>
            </div>
          )}

          {/* SIN CONVERSACIONES */}
          {!loading &&
            !error &&
            conversations?.length === 0 && (
              <p className={styles.empty}>
                {archived
                  ? "No tienes conversaciones archivadas."
                  : "Todavía no tienes conversaciones disponibles. Los chats aparecen cuando tu cita ha sido confirmada."}
              </p>
            )}

          {/* LISTA DE CHATS */}
          {data && (
            <ChatListView
              role={role}
              data={{
                ...data,
                results: conversations,
              }}
              page={page}
              onPage={setPage}
              loading={loading}
              selectedId={selectedId}
              onMenu={openContextMenu}
            />
          )}
        </div>

        {!embedded && <ChatWelcome role={role} />}
      </div>

      {/* ======================================
          MENÚ CONTEXTUAL
          ====================================== */}

      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.chatContextMenu}
            style={{
              left: menu.x,
              top: menu.y,
            }}
            role="menu"
            aria-label="Opciones de conversación"
          >
            {/* ARCHIVAR / DESARCHIVAR */}
            <button
              type="button"
              role="menuitem"
              disabled={menuBusy}
              onClick={() =>
                manageConversation(
                  menu.conversation.archivada
                    ? "desarchivar"
                    : "archivar"
                )
              }
            >
              {menu.conversation.archivada ? (
                <ArchiveRestore size={16} />
              ) : (
                <Archive size={16} />
              )}

              <span>
                {menu.conversation.archivada
                  ? "Desarchivar conversación"
                  : "Archivar conversación"}
              </span>
            </button>

            {/* ELIMINAR PARA MÍ */}
            <button
              type="button"
              role="menuitem"
              disabled={menuBusy}
              className={styles.chatContextDanger}
              onClick={() => manageConversation("eliminar")}
            >
              <Trash2 size={16} />
              <span>Eliminar para mí</span>
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}

// ==========================================
// PANTALLA DE BIENVENIDA
// ==========================================

export function ChatWelcome({ role }) {
  return (
    <div className={styles.welcome}>
      <MessageSquare
        size={36}
        strokeWidth={1.4}
        aria-hidden="true"
      />

      <h2>Un espacio para conversar</h2>

      <p>
        Selecciona una conversación para consultar tu historial
        y continuar el contacto con{" "}
        {role === "medico" ? "tu paciente" : "tu médico"}.
      </p>

      <span>Conversaciones vinculadas a tus citas</span>
    </div>
  );
}
