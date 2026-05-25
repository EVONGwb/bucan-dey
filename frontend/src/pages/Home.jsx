import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import { FeedSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { useDataSaverMode } from "../hooks/useDataSaverMode.js";
import { getApiErrorMessage } from "../utils/errors.js";

function Home() {
  const { isAuthenticated } = useAuth();
  const { unreadCount, setUnreadCount } = useRealtime();
  const { isDataSaver } = useDataSaverMode();
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function loadFeed(cursor = null) {
    const params = { limit: isDataSaver ? 8 : 12 };
    if (cursor) params.cursor = cursor;

    const response = await apiClient.get("/feed/global", { params });
    setPosts((current) => (cursor ? [...current, ...response.data.items] : response.data.items));
    setNextCursor(response.data.next_cursor);
  }

  useEffect(() => {
    async function initFeed() {
      try {
        setIsLoading(true);
        setError("");
        await loadFeed();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    initFeed();
  }, [isDataSaver]);

  useEffect(() => {
    async function loadUnreadCount() {
      if (!isAuthenticated) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await apiClient.get("/notifications/unread-count");
        setUnreadCount(response.data.unread_count);
      } catch {
        setUnreadCount(0);
      }
    }

    loadUnreadCount();
  }, [isAuthenticated]);

  async function handleLoadMore() {
    if (!nextCursor) return;

    try {
      setIsLoadingMore(true);
      await loadFeed(nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
              En vivo local
            </p>
            <h1 className="mt-3 text-5xl font-black leading-none text-white">
              BUCAN DEY
            </h1>
          </div>
          <Link
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-xl shadow-neon"
            to="/notifications"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-night" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-neonPink px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </div>

        <p className="text-xl font-bold text-white">
          Tu mundo. Tu gente. Tu momento.
        </p>
        <p className="mt-3 max-w-xs text-base leading-7 text-white/72">
          Mira qué está pasando ahora mismo.
        </p>
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Feed global
        </p>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg border border-neonYellow/30 bg-neonYellow/10 px-3 py-2 text-sm font-black text-neonYellow"
            to="/trending"
          >
            Tendencias
          </Link>
          <Link
            className="rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink px-4 py-2 text-sm font-black text-night"
            to="/create"
          >
            Publicar
          </Link>
        </div>
      </div>

      {isDataSaver ? (
        <div className="mt-4 rounded-lg border border-neonYellow/30 bg-neonYellow/10 px-4 py-3 text-sm font-bold text-white">
          Modo ahorro de datos activado
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <FeedSkeleton count={2} />
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-surface p-5">
          <p className="text-lg font-black text-white">
            Todavía no hay movimiento. Sé el primero en publicar.
          </p>
          <Link
            className="mt-5 inline-flex h-12 items-center rounded-lg bg-neonPink px-5 text-sm font-black text-white"
            to="/create"
          >
            Publicar
          </Link>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} isDataSaver={isDataSaver} />
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

      <div className="mt-6 space-y-3">
        <div className="h-1 rounded-full bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink" />
      </div>
    </section>
  );
}

export default Home;
