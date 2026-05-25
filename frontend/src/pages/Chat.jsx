import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import apiClient from "../api/client.js";
import { ChatSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function formatRelativeDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function Chat() {
  const { user } = useAuth();
  const { onlineUserIds, sendEvent, subscribe } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [typingByConversation, setTypingByConversation] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  async function loadConversations() {
    try {
      setIsLoadingConversations(true);
      setError("");
      const response = await apiClient.get("/chat/conversations");
      setConversations(response.data.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      setError("");
      const response = await apiClient.get(
        `/chat/conversations/${conversationId}/messages`,
        { params: { limit: 30 } }
      );
      setMessages(response.data.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => window.clearTimeout(typingTimerRef.current);
  }, []);

  useEffect(() => {
    const unsubscribeMessage = subscribe("chat_message", (payload) => {
      const incomingMessage = payload.message;
      if (!incomingMessage) return;

      if (payload.conversation_id === activeConversationId) {
        setMessages((current) => {
          if (current.some((message) => message.id === incomingMessage.id)) {
            return current;
          }
          return [...current, incomingMessage];
        });
      }

      loadConversations();
    });

    const unsubscribeTypingStart = subscribe("typing_start", (payload) => {
      setTypingByConversation((current) => ({
        ...current,
        [payload.conversation_id]: payload.display_name || "Alguien",
      }));
    });

    const unsubscribeTypingStop = subscribe("typing_stop", (payload) => {
      setTypingByConversation((current) => {
        const next = { ...current };
        delete next[payload.conversation_id];
        return next;
      });
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
    };
  }, [activeConversationId, subscribe]);

  async function handleSend(event) {
    event.preventDefault();
    if (!activeConversationId || !text.trim()) return;

    try {
      setIsSending(true);
      setError("");
      const response = await apiClient.post(
        `/chat/conversations/${activeConversationId}/messages`,
        { text }
      );
      setMessages((current) => [...current, response.data]);
      setText("");
      sendEvent("typing_stop", { conversation_id: activeConversationId });
      await loadConversations();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function handleTextChange(event) {
    const nextText = event.target.value;
    setText(nextText);

    if (!activeConversationId) return;

    sendEvent(nextText.trim() ? "typing_start" : "typing_stop", {
      conversation_id: activeConversationId,
    });

    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      sendEvent("typing_stop", { conversation_id: activeConversationId });
    }, 1600);
  }

  async function handleDeleteMessage(messageId) {
    try {
      setError("");
      await apiClient.delete(`/chat/messages/${messageId}`);
      setMessages((current) => current.filter((message) => message.id !== messageId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-7rem)] flex-col">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Mensajes
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Chat</h1>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {!activeConversationId ? (
        <div className="mt-6 flex-1">
          {isLoadingConversations ? (
            <ChatSkeleton />
          ) : null}

          {!isLoadingConversations && conversations.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-surface p-5">
              <p className="text-base font-black text-white">
                Todavía no tienes mensajes.
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            {conversations.map((conversation) => (
              <button
                className="w-full rounded-lg border border-white/10 bg-surface p-4 text-left transition active:scale-[0.99]"
                key={conversation.id}
                type="button"
                onClick={() => setSearchParams({ conversation: conversation.id })}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-base font-black text-white">
                        {conversation.other_user.display_name}
                      </p>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          onlineUserIds.has(conversation.other_user.user_id)
                            ? "bg-neonGreen"
                            : "bg-white/20"
                        }`}
                      />
                    </div>
                    <p className="truncate text-sm font-semibold text-white/48">
                      @{conversation.other_user.username}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-white/38">
                    {formatRelativeDate(conversation.last_message_at)}
                  </span>
                </div>
                <p className="mt-3 truncate text-sm text-white/64">
                  {conversation.last_message?.text || "Sin mensajes todavía."}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <button
            className="mb-4 h-11 self-start rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-white"
            type="button"
            onClick={() => setSearchParams({})}
          >
            Volver
          </button>

          <div className="mb-3 rounded-lg border border-white/10 bg-surface p-4">
            <p className="text-base font-black text-white">
              {activeConversation?.other_user.display_name || "Conversación"}
            </p>
            {activeConversation?.other_user.username ? (
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span className="text-neonPink">
                  @{activeConversation.other_user.username}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    onlineUserIds.has(activeConversation.other_user.user_id)
                      ? "bg-neonGreen"
                      : "bg-white/24"
                  }`}
                />
                <span className="text-white/45">
                  {onlineUserIds.has(activeConversation.other_user.user_id)
                    ? "online"
                    : "offline"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="min-h-[22rem] flex-1 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-surface p-3">
            {isLoadingMessages ? (
              <ChatSkeleton />
            ) : null}

            {!isLoadingMessages && messages.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-white/50">
                Envía el primer mensaje.
              </p>
            ) : null}

            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;

              return (
                <div
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[82%] rounded-lg px-4 py-3 ${
                      isOwn
                        ? "bg-neonPink text-white"
                        : "bg-white/8 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm leading-6">{message.text}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold opacity-70">
                        {formatRelativeDate(message.created_at)}
                      </span>
                      {isOwn ? (
                        <button
                          className="text-[11px] font-black opacity-80"
                          type="button"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          Borrar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {typingByConversation[activeConversationId] ? (
            <p className="mt-2 text-xs font-bold text-neonGreen">
              {typingByConversation[activeConversationId]} está escribiendo...
            </p>
          ) : null}

          <form className="sticky bottom-20 mt-3 flex gap-2 bg-night py-2" onSubmit={handleSend}>
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-surface px-4 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
              value={text}
              onChange={handleTextChange}
              maxLength={1000}
              placeholder="Escribe un mensaje..."
            />
            <button
              className="h-12 rounded-lg bg-neonPink px-5 text-sm font-black text-white disabled:opacity-60"
              type="submit"
              disabled={isSending || !text.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default Chat;
