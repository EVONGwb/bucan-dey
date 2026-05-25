import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client.js";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function destinationFor(notification) {
  if (notification.entity_type === "user" && notification.actor_snapshot?.username) {
    return `/users/${notification.actor_snapshot.username}`;
  }

  if (notification.entity_type === "conversation" || notification.entity_type === "message") {
    return "/chat";
  }

  return "/";
}

function Notifications() {
  const navigate = useNavigate();
  const { setUnreadCount, subscribe } = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications(cursor = null) {
    const params = { limit: 30 };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get("/notifications", { params });
    setNotifications((current) =>
      cursor ? [...current, ...response.data.items] : response.data.items
    );
    setNextCursor(response.data.next_cursor);
  }

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        await loadNotifications();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    return subscribe("notification", (notification) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current];
      });
    });
  }, [subscribe]);

  async function handleReadAll() {
    try {
      await apiClient.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleOpen(notification) {
    try {
      if (!notification.is_read) {
        await apiClient.patch(`/notifications/${notification.id}/read`);
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      navigate(destinationFor(notification));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;

    try {
      setIsLoadingMore(true);
      await loadNotifications(nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
            Actividad
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">Notificaciones</h1>
        </div>
        <button
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white"
          type="button"
          onClick={handleReadAll}
        >
          Marcar todo
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : null}

      {!isLoading && notifications.length === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-surface p-5">
          <p className="text-base font-black text-white">
            Todavía no tienes notificaciones.
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {notifications.map((notification) => (
          <button
            className={`w-full rounded-lg border p-4 text-left transition active:scale-[0.99] ${
              notification.is_read
                ? "border-white/10 bg-surface"
                : "border-neonPink/40 bg-neonPink/12"
            }`}
            key={notification.id}
            type="button"
            onClick={() => handleOpen(notification)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-white/70">{notification.body}</p>
                <p className="mt-2 text-xs font-semibold text-white/42">
                  @{notification.actor_snapshot.username} · {formatRelativeDate(notification.created_at)}
                </p>
              </div>
              {!notification.is_read ? (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-neonPink" />
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {nextCursor ? (
        <button
          className="mt-5 h-12 w-full rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white"
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? "Cargando..." : "Ver más"}
        </button>
      ) : null}
    </section>
  );
}

export default Notifications;
