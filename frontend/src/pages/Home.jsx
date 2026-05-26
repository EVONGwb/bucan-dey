import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, MapPin, Plus, Search, Sparkles, Wifi } from "lucide-react";
import { Link } from "react-router-dom";

import apiClient from "../api/client.js";
import LiveCard from "../components/lives/LiveCard.jsx";
import PostCard from "../components/post/PostCard.jsx";
import StoriesBar from "../components/stories/StoriesBar.jsx";
import { FeedSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { useDataSaverMode } from "../hooks/useDataSaverMode.js";
import { getApiErrorMessage } from "../utils/errors.js";

function EventPreviewCard({ event }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link
        className="relative block min-w-72 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/7 p-3 backdrop-blur-xl"
        to={`/events/${event.id}`}
      >
        <div className="h-28 rounded-[1.1rem] bg-gradient-to-br from-fiestaPurple/70 via-neonPink/45 to-neonCyan/35 p-3">
          <span className="rounded-full bg-black/38 px-3 py-1 text-xs font-black uppercase text-white backdrop-blur">
            {event.category}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-lg font-black leading-tight text-white">{event.title}</p>
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-white/60">
          <span>
            {new Date(event.start_at).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-neonYellow">{event.attendees_count} apuntados</span>
        </div>
      </Link>
    </motion.div>
  );
}

function Home() {
  const { isAuthenticated, user } = useAuth();
  const { subscribe, unreadCount, setUnreadCount } = useRealtime();
  const { isDataSaver } = useDataSaverMode();
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [lives, setLives] = useState([]);
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
        const [, eventsResponse, livesResponse] = await Promise.all([
          loadFeed(),
          apiClient.get("/events", { params: { limit: 3 } }),
          apiClient.get("/lives", { params: { limit: 5 } }),
        ]);
        setEvents(eventsResponse.data.items);
        setLives(livesResponse.data.items);
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

  useEffect(() => {
    return subscribe("live_started", (live) => {
      setLives((current) => {
        if (current.some((item) => item.id === live.id)) return current;
        return [live, ...current].slice(0, 8);
      });
    });
  }, [subscribe]);

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
    <section className="relative min-h-[calc(100vh-7rem)] pb-8">
      <motion.header
        className="glass-panel sticky top-3 z-10 rounded-[1.75rem] p-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonCyan">
              <Wifi className="h-3.5 w-3.5" />
              <span>Online ahora</span>
            </div>
            <h1 className="mt-2 truncate text-3xl font-black leading-none text-white">
              BUCAN DEY
            </h1>
            <p className="mt-2 flex items-center gap-1 text-sm font-bold text-white/62">
              <MapPin className="h-4 w-4 text-neonPink" />
              {user?.city || "Guinea Ecuatorial"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white backdrop-blur-xl"
              to="/trending"
              aria-label="Buscar y tendencias"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-neonCyan/90 to-neonPink/90 text-xl shadow-cyan"
              to="/notifications"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5 text-white" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-liveRed px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-live">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/18 p-4">
          <p className="text-xl font-black text-white">
            Tu mundo. Tu gente. Tu momento.
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/68">
            Mira qué está pasando ahora mismo.
          </p>
        </div>
      </motion.header>

      <StoriesBar />

      <motion.div
        className="mt-7"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="glass-panel rounded-[1.7rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/72">
                <span className="h-2.5 w-2.5 rounded-full bg-liveRed shadow-live [animation:live-pulse_1.4s_ease-in-out_infinite]" />
                En directo ahora
              </p>
              <p className="mt-1 text-sm font-semibold text-white/46">
                Fiestas, bares y ambiente en vivo.
              </p>
            </div>
            <Link
              className="shrink-0 rounded-full bg-liveRed px-4 py-2 text-sm font-black text-white shadow-live"
              to="/lives/start"
            >
              Empezar
            </Link>
          </div>
        </div>
        {lives.length ? (
          <div className="scrollbar-none -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
            {lives.map((live) => (
              <LiveCard compact key={live.id} live={live} />
            ))}
          </div>
        ) : (
          <div className="glass-panel mt-3 rounded-[1.5rem] p-4">
            <p className="text-sm font-bold text-white/58">
              No hay directos activos ahora.
            </p>
          </div>
        )}
      </motion.div>

      {events.length ? (
        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/68">
              <Sparkles className="h-4 w-4 text-neonYellow" />
              Cerca de ti
            </p>
            <Link className="text-sm font-black text-neonYellow" to="/events">
              Ver todos
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
            {events.map((event) => (
              <EventPreviewCard event={event} key={event.id} />
            ))}
          </div>
        </motion.div>
      ) : null}

      <div className="mt-7 flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/68">
          Feed global
        </p>
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
          <Link
            className="rounded-full border border-neonYellow/30 bg-neonYellow/10 px-3 py-2 text-sm font-black text-neonYellow"
            to="/events"
          >
            Eventos
          </Link>
          <Link
            className="rounded-full border border-white/10 bg-white/7 px-3 py-2 text-sm font-black text-white"
            to="/trending"
          >
            Tendencias
          </Link>
          <Link
            className="hidden rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink px-4 py-2 text-sm font-black text-white sm:inline-flex"
            to="/create"
          >
            Publicar
          </Link>
        </div>
      </div>

      {isDataSaver ? (
        <div className="mt-4 rounded-[1.25rem] border border-neonYellow/30 bg-neonYellow/10 px-4 py-3 text-sm font-bold text-white">
          Modo ahorro de datos activado
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.25rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <FeedSkeleton count={2} />
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <div className="glass-panel mt-8 rounded-[1.75rem] p-5">
          <p className="text-lg font-black text-white">
            Todavía no hay movimiento. Sé el primero en publicar.
          </p>
          <Link
            className="mt-5 inline-flex h-12 items-center rounded-full bg-neonPink px-5 text-sm font-black text-white shadow-neon"
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
          className="mt-5 h-12 w-full rounded-full border border-white/10 bg-white/7 text-sm font-black text-white backdrop-blur"
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? "Cargando..." : "Ver más"}
        </button>
      ) : null}

      <motion.div
        className="fixed bottom-28 right-5 z-10 sm:hidden"
        initial={{ opacity: 0, scale: 0.8, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan"
          to="/create"
          aria-label="Crear publicación"
        >
          <Plus className="h-7 w-7" />
        </Link>
      </motion.div>
    </section>
  );
}

export default Home;
