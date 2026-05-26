import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Link as LinkIcon,
  LocateFixed,
  Mic,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

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
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function getInitial(person) {
  return (person?.display_name || person?.username || "B").charAt(0).toUpperCase();
}

function Avatar({ person, isOnline, size = "md" }) {
  const dimensions = size === "lg" ? "h-14 w-14 text-xl" : "h-12 w-12 text-base";

  return (
    <div className="relative shrink-0">
      <div
        className={`${dimensions} flex items-center justify-center rounded-full bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink p-[2px] shadow-cyan`}
      >
        {person?.avatar_url ? (
          <img
            alt={person.display_name}
            className="h-full w-full rounded-full border-2 border-night object-cover"
            loading="lazy"
            decoding="async"
            src={person.avatar_url}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-night bg-black/48 font-black text-white">
            {getInitial(person)}
          </div>
        )}
      </div>
      <span
        className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-night ${
          isOnline
            ? "bg-neonGreen shadow-[0_0_16px_rgba(23,245,107,0.75)]"
            : "bg-white/24"
        }`}
      />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((item) => (
        <span
          className="h-1.5 w-1.5 rounded-full bg-neonCyan"
          key={item}
          style={{
            animation: "live-pulse 1.2s ease-in-out infinite",
            animationDelay: `${item * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

function detectSharedEntity(text) {
  if (!text) return null;

  const match = text.match(/\/(posts|events|lives)\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const labels = {
    posts: "Publicación compartida",
    events: "Evento compartido",
    lives: "Live compartido",
  };

  return {
    type: match[1],
    id: match[2],
    label: labels[match[1]],
    path: `/${match[1]}/${match[2]}`,
  };
}

function SharedPreview({ message }) {
  const entity = detectSharedEntity(message.text);
  if (!entity) return null;

  return (
    <Link
      className="mt-3 block rounded-[1.1rem] border border-white/10 bg-black/20 p-3"
      to={entity.path}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-neonCyan/35 via-fiestaPurple/35 to-neonPink/35 text-white">
          <LinkIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{entity.label}</p>
          <p className="truncate text-xs font-semibold text-white/54">Abrir en BUCAN DEY</p>
        </div>
      </div>
    </Link>
  );
}

function EmptyChatState() {
  return (
    <div className="glass-panel mt-6 rounded-[1.75rem] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan/25 to-neonPink/25 text-neonCyan">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-black text-white">Todavía no tienes mensajes.</p>
      <p className="mt-2 text-sm leading-6 text-white/58">
        Abre un perfil y empieza una conversación con tu gente.
      </p>
    </div>
  );
}

function ConversationCard({
  conversation,
  isActive,
  isOnline,
  isTyping,
  onClick,
  currentUserId,
}) {
  const hasUnread =
    Number(conversation.unread_count || 0) > 0 ||
    (conversation.last_message?.sender_id &&
      conversation.last_message.sender_id !== currentUserId &&
      conversation.unread === true);

  return (
    <motion.button
      className={`glass-panel w-full rounded-[1.55rem] p-4 text-left transition ${
        isActive ? "border-neonCyan/40 shadow-cyan" : ""
      }`}
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center gap-3">
        <Avatar person={conversation.other_user} isOnline={isOnline} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="truncate text-base font-black text-white">
              {conversation.other_user.display_name}
            </p>
            <span className="shrink-0 text-xs font-black text-white/40">
              {formatRelativeDate(conversation.last_message_at)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs font-semibold text-neonPink">
            @{conversation.other_user.username}
            {conversation.other_user.city ? ` · ${conversation.other_user.city}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white/58">
              {isTyping ? (
                <span className="inline-flex items-center gap-2 text-neonCyan">
                  escribiendo <TypingDots />
                </span>
              ) : (
                conversation.last_message?.text || "Sin mensajes todavía."
              )}
            </p>
            {hasUnread ? (
              <span className="h-3 w-3 shrink-0 rounded-full bg-neonPink shadow-neon [animation:live-pulse_1.4s_ease-in-out_infinite]" />
            ) : null}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function MessageBubble({ message, isOwn, onDelete }) {
  return (
    <motion.div
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <div
        className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 ${
          isOwn
            ? "rounded-br-md bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan"
            : "glass-panel rounded-bl-md text-white"
        }`}
      >
        <p className="whitespace-pre-line break-words text-sm leading-6">{message.text}</p>
        <SharedPreview message={message} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold opacity-70">
            {formatRelativeDate(message.created_at)}
          </span>
          {isOwn ? (
            <button
              className="inline-flex items-center gap-1 text-[11px] font-black opacity-80"
              type="button"
              onClick={() => onDelete(message.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function Chat() {
  const { user } = useAuth();
  const { onlineUserIds, sendEvent, subscribe } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
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
  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;

    return conversations.filter((conversation) => {
      const otherUser = conversation.other_user;
      return [otherUser.display_name, otherUser.username, otherUser.city]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [conversations, query]);
  const activeOtherUser = activeConversation?.other_user;
  const isActiveOnline = Boolean(
    activeOtherUser?.user_id && onlineUserIds.has(activeOtherUser.user_id)
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeConversationId]);

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
      {!activeConversationId ? (
        <>
          <motion.header
            className="glass-panel rounded-[1.75rem] p-4"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neonCyan">
              Mensajes
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-4xl font-black text-white">Chat</h1>
                <p className="mt-2 text-sm font-semibold text-white/58">
                  Conversaciones privadas en tiempo real.
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-neonCyan to-neonPink shadow-cyan">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
            </div>
          </motion.header>

          {error ? (
            <div className="mt-4 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {error}
            </div>
          ) : null}

          <div className="glass-panel mt-4 flex h-14 items-center gap-3 rounded-full px-4">
            <Search className="h-5 w-5 text-white/40" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/34"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar chats"
            />
          </div>

          <div className="mt-5 flex-1">
            {isLoadingConversations ? <ChatSkeleton /> : null}

            {!isLoadingConversations && conversations.length === 0 ? <EmptyChatState /> : null}

            {!isLoadingConversations &&
            conversations.length > 0 &&
            filteredConversations.length === 0 ? (
              <div className="glass-panel rounded-[1.75rem] p-5 text-center">
                <p className="text-base font-black text-white">Sin resultados</p>
                <p className="mt-2 text-sm text-white/56">Prueba con otro nombre.</p>
              </div>
            ) : null}

            <motion.div className="space-y-3" layout>
              {filteredConversations.map((conversation) => (
                <ConversationCard
                  conversation={conversation}
                  currentUserId={user?.id}
                  isActive={conversation.id === activeConversationId}
                  isOnline={onlineUserIds.has(conversation.other_user.user_id)}
                  isTyping={Boolean(typingByConversation[conversation.id])}
                  key={conversation.id}
                  onClick={() => setSearchParams({ conversation: conversation.id })}
                />
              ))}
            </motion.div>
          </div>
        </>
      ) : (
        <div className="flex min-h-[calc(100vh-7rem)] flex-col">
          <motion.header
            className="glass-panel sticky top-3 z-10 rounded-[1.75rem] p-3"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white"
                type="button"
                onClick={() => setSearchParams({})}
                aria-label="Volver a conversaciones"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <Avatar person={activeOtherUser} isOnline={isActiveOnline} size="lg" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">
                  {activeOtherUser?.display_name || "Conversación"}
                </p>
                {activeOtherUser?.username ? (
                  <p className="mt-0.5 truncate text-xs font-semibold text-white/54">
                    @{activeOtherUser.username}
                    {activeOtherUser.city ? ` · ${activeOtherUser.city}` : ""}
                  </p>
                ) : null}
                <p
                  className={`mt-1 inline-flex items-center gap-2 text-xs font-black ${
                    isActiveOnline ? "text-neonGreen" : "text-white/40"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActiveOnline ? "bg-neonGreen shadow-[0_0_14px_rgba(23,245,107,.8)]" : "bg-white/24"
                    }`}
                  />
                  {typingByConversation[activeConversationId] ? (
                    <span className="inline-flex items-center gap-2 text-neonCyan">
                      escribiendo <TypingDots />
                    </span>
                  ) : isActiveOnline ? (
                    "online"
                  ) : (
                    "offline"
                  )}
                </p>
              </div>

              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white/70"
                type="button"
                aria-label="Más opciones"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </motion.header>

          {error ? (
            <div className="mt-4 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {error}
            </div>
          ) : null}

          <div className="mt-4 min-h-[24rem] flex-1 overflow-y-auto rounded-[1.75rem] border border-white/10 bg-black/16 p-3 backdrop-blur-sm">
            {isLoadingMessages ? <ChatSkeleton /> : null}

            {!isLoadingMessages && messages.length === 0 ? (
              <div className="flex min-h-[18rem] items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan/25 to-neonPink/25 text-neonCyan">
                    <Send className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-base font-black text-white">
                    Envía el primer mensaje.
                  </p>
                  <p className="mt-2 text-sm text-white/52">La conversación empieza aquí.</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {messages.map((message) => (
                <MessageBubble
                  isOwn={message.sender_id === user?.id}
                  key={message.id}
                  message={message}
                  onDelete={handleDeleteMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {typingByConversation[activeConversationId] ? (
            <motion.div
              className="mt-2 inline-flex items-center gap-2 self-start rounded-full border border-neonCyan/20 bg-neonCyan/10 px-3 py-2 text-xs font-bold text-neonCyan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {typingByConversation[activeConversationId]} está escribiendo <TypingDots />
            </motion.div>
          ) : null}

          <form
            className="glass-panel sticky bottom-24 mt-3 rounded-[1.75rem] p-2"
            onSubmit={handleSend}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              {[
                { icon: Paperclip, label: "Adjuntar" },
                { icon: ImageIcon, label: "Imagen" },
                { icon: Camera, label: "Cámara" },
                { icon: Mic, label: "Voz" },
                { icon: LocateFixed, label: "Ubicación" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white/54 disabled:opacity-45"
                    disabled
                    key={item.label}
                    type="button"
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/32 focus:border-neonCyan"
                value={text}
                onChange={handleTextChange}
                maxLength={1000}
                placeholder="Escribe un mensaje..."
              />
              <motion.button
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan disabled:opacity-50"
                type="submit"
                disabled={isSending || !text.trim()}
                whileTap={{ scale: 0.9 }}
                aria-label="Enviar mensaje"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default Chat;
