import { useEffect, useState } from "react";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { getApiErrorMessage } from "../../utils/errors.js";

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function CommentsPanel({ postId, onCommentCreated, onCommentDeleted }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadComments(cursor = null) {
    const params = { limit: 20 };
    if (cursor) params.cursor = cursor;

    const response = await apiClient.get(`/posts/${postId}/comments`, { params });
    setComments((current) =>
      cursor ? [...current, ...response.data.items] : response.data.items
    );
    setNextCursor(response.data.next_cursor);
  }

  useEffect(() => {
    async function initComments() {
      try {
        setIsLoading(true);
        setError("");
        await loadComments();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    initComments();
  }, [postId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim()) return;

    try {
      setIsSubmitting(true);
      setError("");
      const response = await apiClient.post(`/posts/${postId}/comments`, {
        text,
      });
      setComments((current) => [response.data, ...current]);
      setText("");
      onCommentCreated?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    try {
      setError("");
      await apiClient.delete(`/comments/${commentId}`);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      onCommentDeleted?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
      {isAuthenticated ? (
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
            placeholder="Escribe un comentario"
          />
          <button
            className="rounded-lg bg-neonPink px-4 text-sm font-black text-white disabled:opacity-60"
            type="submit"
            disabled={isSubmitting || !text.trim()}
          >
            Enviar
          </button>
        </form>
      ) : (
        <p className="text-sm font-semibold text-white/58">
          Inicia sesión para comentar.
        </p>
      )}

      {error ? (
        <div className="mt-3 rounded-lg border border-neonPink/30 bg-neonPink/10 px-3 py-2 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 flex justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-neonPink" />
        </div>
      ) : null}

      {!isLoading && comments.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-white/50">
          Sé el primero en comentar.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-night/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {comment.author_snapshot.display_name}
                </p>
                <p className="text-xs font-semibold text-white/42">
                  @{comment.author_snapshot.username} · {formatRelativeDate(comment.created_at)}
                </p>
              </div>
              {user?.id === comment.author_id ? (
                <button
                  className="text-xs font-black text-neonPink"
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                >
                  Borrar
                </button>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/78">
              {comment.text}
            </p>
          </div>
        ))}
      </div>

      {nextCursor ? (
        <button
          className="mt-3 h-10 w-full rounded-lg border border-white/10 text-sm font-black text-white"
          type="button"
          onClick={() => loadComments(nextCursor)}
        >
          Ver más comentarios
        </button>
      ) : null}
    </div>
  );
}

export default CommentsPanel;
