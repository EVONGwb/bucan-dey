import { useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { getApiErrorMessage } from "../../utils/errors.js";
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
  fiesta: "border-neonOrange/30 bg-neonOrange/12 text-neonOrange",
  cumpleaños: "border-neonYellow/30 bg-neonYellow/12 text-neonYellow",
  evento: "border-neonGreen/30 bg-neonGreen/12 text-neonGreen",
  live: "border-neonPink/40 bg-neonPink/16 text-neonPink",
  bar: "border-neonYellow/30 bg-neonYellow/12 text-neonYellow",
  ambiente: "border-neonGreen/30 bg-neonGreen/12 text-neonGreen",
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

function PostCard({ post }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
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
    <article className="rounded-lg border border-white/10 bg-surface p-4 shadow-neon">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {post.author_snapshot?.avatar_url ? (
            <img
              alt={localPost.author_snapshot.display_name}
              className="h-11 w-11 rounded-full object-cover"
              src={localPost.author_snapshot.avatar_url}
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-base font-black text-night">
              {(localPost.author_snapshot?.display_name || "B").charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">
              {localPost.author_snapshot?.display_name}
            </p>
            <p className="truncate text-xs font-semibold text-white/48">
              @{localPost.author_snapshot?.username} · {formatRelativeDate(localPost.created_at)}
            </p>
          </div>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${typeStyle}`}>
          {typeLabel}
        </span>
      </div>

      {location ? (
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-neonGreen">
          {location}
        </p>
      ) : null}

      <p className="mt-3 whitespace-pre-line text-base leading-7 text-white/86">
        {localPost.text}
      </p>

      {localPost.media?.length ? (
        <div className="mt-4 space-y-3 overflow-hidden rounded-lg border border-white/10 bg-night">
          {localPost.media.map((item) =>
            item.type === "image" ? (
              <img
                key={item.public_id || item.url}
                alt="Contenido de la publicación"
                className="max-h-[34rem] w-full object-cover"
                loading="lazy"
                src={item.url}
              />
            ) : (
              <video
                key={item.public_id || item.url}
                className="max-h-[34rem] w-full bg-black"
                controls
                preload="metadata"
                poster={item.thumbnail_url || undefined}
                src={item.url}
              />
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

      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs font-bold text-white/60">
        <button
          className={`rounded-lg border px-3 py-2 transition ${
            localPost.liked_by_me
              ? "border-neonPink bg-neonPink/16 text-neonPink"
              : "border-white/10 bg-white/5 text-white/70"
          }`}
          type="button"
          onClick={handleLike}
        >
          ♥ {postStats.likes_count || 0}
        </button>
        <button
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/70"
          type="button"
          onClick={() => setShowComments((current) => !current)}
        >
          💬 {postStats.comments_count || 0}
        </button>
        <button
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/70"
          type="button"
          onClick={openReportModal}
        >
          Reportar
        </button>
        <span className="ml-auto py-2 text-white/42">{postStats.views_count || 0} vistas</span>
      </div>

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
    </article>
  );
}

export default PostCard;
