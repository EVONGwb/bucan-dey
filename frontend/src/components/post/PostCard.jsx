import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Flag, Heart, MapPin, MessageCircle, Repeat2, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useInViewport } from "../../hooks/useInViewport.js";
import { getApiErrorMessage } from "../../utils/errors.js";
import { buildResponsiveSrcSet, optimizeCloudinaryImage } from "../../utils/media.js";
import CommentsPanel from "./CommentsPanel.jsx";

const TYPE_LABELS = {
  normal: "Normal",
  video: "Vídeo",
  fiesta: "Fiesta",
  cumpleaños: "Cumpleaños",
  evento: "Evento",
  live: "Live",
  bar: "Bar",
  ambiente: "Ambiente",
};

const TYPE_STYLES = {
  normal: "border-white/10 bg-white/8 text-white",
  video: "border-neonPink/30 bg-neonPink/12 text-neonPink",
  fiesta: "border-fiestaPurple/40 bg-fiestaPurple/18 text-white",
  cumpleaños: "border-neonYellow/30 bg-neonYellow/12 text-neonYellow",
  evento: "border-neonCyan/30 bg-neonCyan/12 text-neonCyan",
  live: "border-liveRed/40 bg-liveRed/16 text-liveRed",
  bar: "border-neonYellow/30 bg-neonYellow/12 text-neonYellow",
  ambiente: "border-neonCyan/30 bg-neonCyan/12 text-neonCyan",
};

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "contenido ofensivo", label: "Contenido ofensivo" },
  { value: "violencia", label: "Violencia" },
  { value: "acoso", label: "Acoso" },
  { value: "información falsa", label: "Información falsa" },
  { value: "otro", label: "Otro" },
];

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function LazyVideo({ item }) {
  const [containerRef, isVisible] = useInViewport("420px");

  return (
    <div ref={containerRef} className="min-h-52 bg-black">
      {isVisible ? (
        <video
          className="max-h-[30rem] w-full bg-black"
          controls
          playsInline
          preload="metadata"
          poster={item.thumbnail_url || undefined}
          src={item.url}
        />
      ) : (
        <div className="flex h-52 items-center justify-center text-sm font-bold text-white/48">
          Vídeo listo para cargar
        </div>
      )}
    </div>
  );
}

function PostCard({ post, isDataSaver = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [interactionError, setInteractionError] = useState("");
  const [interactionNotice, setInteractionNotice] = useState("");
  const postStats = localPost.stats || {};
  const typeLabel = TYPE_LABELS[localPost.type] || "Normal";
  const typeStyle = TYPE_STYLES[localPost.type] || TYPE_STYLES.normal;
  const location = [localPost.location?.city, localPost.location?.area]
    .filter(Boolean)
    .join(" · ");
  const postUrl = `${window.location.origin}/posts/${localPost.id}`;

  async function handleLike() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setInteractionError("");
      const response = localPost.liked_by_me
        ? await apiClient.delete(`/posts/${localPost.id}/like`)
        : await apiClient.post(`/posts/${localPost.id}/like`);

      setLocalPost((current) => ({
        ...current,
        liked_by_me: response.data.liked,
        stats: {
          ...current.stats,
          likes_count: response.data.likes_count,
        },
      }));
    } catch {
      setInteractionError("No se pudo actualizar el like.");
    }
  }

  function adjustCommentsCount(delta) {
    setLocalPost((current) => ({
      ...current,
      stats: {
        ...current.stats,
        comments_count: Math.max(0, (current.stats?.comments_count || 0) + delta),
      },
    }));
  }

  async function handleRepost() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setInteractionError("");
      const response = localPost.reposted_by_me
        ? await apiClient.delete(`/posts/${localPost.id}/repost`)
        : await apiClient.post(`/posts/${localPost.id}/repost`);

      setLocalPost((current) => ({
        ...current,
        reposted_by_me: response.data.reposted,
        stats: {
          ...current.stats,
          reposts_count: response.data.reposts_count,
        },
      }));
    } catch {
      setInteractionError("No se pudo actualizar el repost.");
    }
  }

  async function incrementExternalShare() {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.post(`/posts/${localPost.id}/share`, {
        target: "external",
      });
      setLocalPost((current) => ({
        ...current,
        stats: {
          ...current.stats,
          shares_count: response.data.shares_count,
        },
      }));
    } catch {
      // Sharing should still work even if the counter update fails.
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(postUrl);
      await incrementExternalShare();
      setInteractionNotice("Enlace copiado.");
      setShowShareMenu(false);
    } catch {
      setInteractionError("No se pudo copiar el enlace.");
    }
  }

  async function handleExternalShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "BUCAN DEY",
          text: localPost.text || "Mira esta publicación en BUCAN DEY",
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        setInteractionNotice("Enlace copiado.");
      }
      await incrementExternalShare();
      setShowShareMenu(false);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setInteractionError("No se pudo compartir.");
      }
    }
  }

  async function openShareMenu() {
    setInteractionError("");
    setInteractionNotice("");
    setShowShareMenu(true);
    if (!isAuthenticated || conversations.length > 0 || isLoadingConversations) return;

    try {
      setIsLoadingConversations(true);
      const response = await apiClient.get("/chat/conversations");
      setConversations(response.data.items || []);
    } catch {
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function shareToChat(conversationId) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = await apiClient.post(`/posts/${localPost.id}/share`, {
        target: "chat",
        conversation_id: conversationId,
      });
      setLocalPost((current) => ({
        ...current,
        stats: {
          ...current.stats,
          shares_count: response.data.shares_count,
        },
      }));
      setInteractionNotice("Publicación enviada por chat.");
      setShowShareMenu(false);
    } catch (error) {
      setInteractionError(getApiErrorMessage(error));
    }
  }

  function openReportModal() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setInteractionError("");
    setInteractionNotice("");
    setShowReportModal(true);
  }

  async function submitReport(event) {
    event.preventDefault();
    setIsReporting(true);
    setInteractionError("");
    setInteractionNotice("");

    try {
      await apiClient.post("/reports", {
        target_type: "post",
        target_id: localPost.id,
        reason: reportReason,
        details: reportDetails,
      });
      setInteractionNotice("Reporte enviado.");
      setReportReason("spam");
      setReportDetails("");
      setShowReportModal(false);
    } catch (error) {
      setInteractionError(getApiErrorMessage(error));
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <motion.article
      className="glass-panel overflow-hidden rounded-[1.75rem] p-4"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "120px" }}
      transition={{ duration: 0.32 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {localPost.author_snapshot?.avatar_url ? (
            <img
              alt={localPost.author_snapshot.display_name}
              className="h-12 w-12 rounded-full border border-white/10 object-cover shadow-cyan"
              loading="lazy"
              decoding="async"
              src={localPost.author_snapshot.avatar_url}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink text-base font-black text-white shadow-cyan">
              {(localPost.author_snapshot?.display_name || "B").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <Link
              className="block truncate text-sm font-black text-white"
              to={`/users/${localPost.author_snapshot?.username}`}
            >
              {localPost.author_snapshot?.display_name}
            </Link>
            <p className="truncate text-xs font-semibold text-white/48">
              @{localPost.author_snapshot?.username} · {formatRelativeDate(localPost.created_at)}
            </p>
          </div>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black backdrop-blur-xl ${typeStyle}`}>
          {typeLabel}
        </span>
      </div>

      {location ? (
        <p className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-neonCyan">
          <MapPin className="h-3.5 w-3.5" />
          {location}
        </p>
      ) : null}

      <p className="mt-3 whitespace-pre-line text-base leading-7 text-white/86">
        {localPost.text}
      </p>

      {localPost.media?.length ? (
        <div className="mt-4 space-y-3 overflow-hidden rounded-[1.35rem] border border-white/10 bg-night">
          {localPost.media.map((item) =>
            item.type === "image" ? (
              <img
                key={item.public_id || item.url}
                alt="Contenido de la publicación"
                className="max-h-[34rem] w-full object-cover"
                decoding="async"
                loading="lazy"
                sizes="(max-width: 480px) 100vw, 448px"
                src={optimizeCloudinaryImage(item.url, {
                  width: isDataSaver ? 540 : 720,
                  quality: isDataSaver ? "auto:eco" : "auto",
                })}
                srcSet={buildResponsiveSrcSet(item.url)}
              />
            ) : (
              <LazyVideo key={item.public_id || item.url} item={item} />
            )
          )}
        </div>
      ) : null}

      {localPost.event_data?.title || localPost.event_data?.venue ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
          {localPost.event_data?.title ? (
            <p className="text-sm font-black text-white">{localPost.event_data.title}</p>
          ) : null}
          {localPost.event_data?.venue ? (
            <p className="mt-1 text-sm text-white/62">{localPost.event_data.venue}</p>
          ) : null}
          {localPost.event_data?.price ? (
            <p className="mt-1 text-sm font-semibold text-neonYellow">
              {localPost.event_data.price}
            </p>
          ) : null}
        </div>
      ) : null}

      {interactionError ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-3 py-2 text-sm font-semibold text-white">
          {interactionError}
        </div>
      ) : null}

      {interactionNotice ? (
        <div className="mt-4 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-3 py-2 text-sm font-semibold text-white">
          {interactionNotice}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs font-bold text-white/60">
        <motion.button
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 transition ${
            localPost.liked_by_me
              ? "border-neonPink bg-neonPink/16 text-neonPink shadow-neon"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
          type="button"
          onClick={handleLike}
          whileTap={{ scale: 0.88 }}
        >
          <Heart className={`h-4 w-4 ${localPost.liked_by_me ? "fill-current" : ""}`} />
          {postStats.likes_count || 0}
        </motion.button>
        <motion.button
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/70"
          type="button"
          onClick={() => setShowComments((current) => !current)}
          whileTap={{ scale: 0.92 }}
        >
          <MessageCircle className="h-4 w-4" />
          {postStats.comments_count || 0}
        </motion.button>
        <motion.button
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 transition ${
            localPost.reposted_by_me
              ? "border-neonCyan bg-neonCyan/16 text-neonCyan shadow-cyan"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
          type="button"
          onClick={handleRepost}
          whileTap={{ scale: 0.9 }}
        >
          <Repeat2 className="h-4 w-4" />
          {postStats.reposts_count || 0}
        </motion.button>
        <motion.button
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/70"
          type="button"
          onClick={openShareMenu}
          whileTap={{ scale: 0.92 }}
        >
          <Send className="h-4 w-4" />
          {postStats.shares_count || 0}
        </motion.button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/70"
          type="button"
          onClick={openReportModal}
        >
          <Flag className="h-4 w-4" />
        </button>
        <span className="ml-auto inline-flex items-center gap-1 py-2 text-white/42">
          <Eye className="h-4 w-4" />
          {postStats.views_count || 0}
        </span>
      </div>

      <Link
        className="mt-3 inline-flex text-xs font-black text-neonGreen"
        to={`/posts/${localPost.id}`}
      >
        Abrir publicación
      </Link>

      {showComments ? (
        <CommentsPanel
          postId={localPost.id}
          onCommentCreated={() => adjustCommentsCount(1)}
          onCommentDeleted={() => adjustCommentsCount(-1)}
        />
      ) : null}

      {showReportModal ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/72 px-4 pb-4">
          <form
            className="mx-auto w-full max-w-md rounded-lg border border-white/10 bg-night p-4 shadow-neon"
            onSubmit={submitReport}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Reportar publicación</h2>
                <p className="mt-1 text-sm text-white/56">
                  Enviaremos este reporte a moderación.
                </p>
              </div>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/70"
                type="button"
                onClick={() => setShowReportModal(false)}
              >
                Cerrar
              </button>
            </div>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-white/50">
              Motivo
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-bold text-white outline-none focus:border-neonPink"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-white/50">
              Detalles
            </label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-semibold text-white outline-none focus:border-neonPink"
              maxLength={500}
              placeholder="Añade contexto si hace falta"
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
            />

            <button
              className="mt-4 w-full rounded-lg bg-neonPink px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              disabled={isReporting}
              type="submit"
            >
              {isReporting ? "Enviando..." : "Enviar reporte"}
            </button>
          </form>
        </div>
      ) : null}

      {showShareMenu ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/72 px-4 pb-4">
          <div className="mx-auto w-full max-w-md rounded-lg border border-white/10 bg-night p-4 shadow-neon">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Compartir</h2>
                <p className="mt-1 text-sm text-white/56">
                  Envía esta publicación dentro o fuera de BUCAN DEY.
                </p>
              </div>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/70"
                type="button"
                onClick={() => setShowShareMenu(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white"
                type="button"
                onClick={handleCopyLink}
              >
                Copiar enlace
              </button>
              <button
                className="h-12 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night"
                type="button"
                onClick={handleExternalShare}
              >
                Compartir externo
              </button>
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/48">
                Compartir en chat
              </p>
              {!isAuthenticated ? (
                <button
                  className="mt-3 h-12 w-full rounded-lg border border-neonPink/30 bg-neonPink/10 text-sm font-black text-white"
                  type="button"
                  onClick={() => navigate("/login")}
                >
                  Iniciar sesión
                </button>
              ) : isLoadingConversations ? (
                <p className="mt-3 text-sm font-semibold text-white/54">Cargando chats...</p>
              ) : conversations.length === 0 ? (
                <p className="mt-3 text-sm font-semibold text-white/54">
                  Todavía no tienes conversaciones.
                </p>
              ) : (
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {conversations.map((conversation) => (
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-surface p-3 text-left"
                      key={conversation.id}
                      type="button"
                      onClick={() => shareToChat(conversation.id)}
                    >
                      {conversation.other_user?.avatar_url ? (
                        <img
                          alt={conversation.other_user.display_name}
                          className="h-10 w-10 rounded-full object-cover"
                          src={conversation.other_user.avatar_url}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">
                          {(conversation.other_user?.display_name || "B").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {conversation.other_user?.display_name}
                        </p>
                        <p className="truncate text-xs font-semibold text-white/48">
                          @{conversation.other_user?.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}

export default memo(PostCard);
