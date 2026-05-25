import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return `Hace ${Math.floor(diffHours / 24)} d`;
}

function StoryViewer() {
  const navigate = useNavigate();
  const { storyId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [stories, setStories] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [error, setError] = useState("");
  const touchStartY = useRef(null);

  const activeStory = stories[activeIndex];
  const isOwner = activeStory?.author_id === user?.id;

  const activeDuration = useMemo(() => {
    if (!activeStory) return 6000;
    return activeStory.media?.type === "video" ? 12000 : 6000;
  }, [activeStory]);

  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current + 1 >= stories.length) {
        navigate(-1);
        return current;
      }
      return current + 1;
    });
    setProgressKey((current) => current + 1);
  }, [navigate, stories.length]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
    setProgressKey((current) => current + 1);
  }, []);

  useEffect(() => {
    async function loadStories() {
      try {
        setError("");
        const response = await apiClient.get("/stories/feed", { params: { limit: 120 } });
        const flattened = response.data.flatMap((group) => group.stories);
        const foundIndex = flattened.findIndex((story) => story.id === storyId);
        if (foundIndex >= 0) {
          setStories(flattened);
          setActiveIndex(foundIndex);
          return;
        }

        const storyResponse = await apiClient.get(`/stories/${storyId}`);
        setStories([storyResponse.data]);
        setActiveIndex(0);
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
    }

    loadStories();
  }, [storyId]);

  useEffect(() => {
    if (!activeStory || !isAuthenticated) return;

    apiClient.post(`/stories/${activeStory.id}/view`).catch(() => {});
  }, [activeStory?.id, isAuthenticated]);

  useEffect(() => {
    if (!activeStory || activeStory.media?.type === "video") return;
    const timeout = window.setTimeout(goNext, activeDuration);
    return () => window.clearTimeout(timeout);
  }, [activeStory, activeDuration, goNext, progressKey]);

  async function loadViewers() {
    if (!activeStory) return;
    try {
      const response = await apiClient.get(`/stories/${activeStory.id}/viewers`);
      setViewers(response.data.items);
      setShowViewers(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!activeStory) return;
    try {
      await apiClient.delete(`/stories/${activeStory.id}`);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function handleTap(event) {
    const width = event.currentTarget.clientWidth;
    if (event.clientX < width * 0.35) {
      goPrevious();
    } else {
      goNext();
    }
  }

  function handleTouchStart(event) {
    touchStartY.current = event.touches[0]?.clientY || null;
  }

  function handleTouchEnd(event) {
    if (touchStartY.current === null) return;
    const endY = event.changedTouches[0]?.clientY || touchStartY.current;
    if (endY - touchStartY.current > 80) {
      navigate(-1);
    }
    touchStartY.current = null;
  }

  if (error) {
    return (
      <section className="-mx-4 -mt-5 flex min-h-screen items-center justify-center bg-night px-4">
        <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 p-5 text-center">
          <p className="text-sm font-semibold text-white">{error}</p>
          <button
            className="mt-4 rounded-lg bg-neonPink px-4 py-2 text-sm font-black text-white"
            type="button"
            onClick={() => navigate("/")}
          >
            Volver
          </button>
        </div>
      </section>
    );
  }

  if (!activeStory) {
    return (
      <section className="-mx-4 -mt-5 flex min-h-screen items-center justify-center bg-night">
        <p className="text-sm font-black text-white/58">Cargando story...</p>
      </section>
    );
  }

  return (
    <section
      className="-mx-4 -mt-5 min-h-screen bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="fixed inset-0 bg-black">
        {activeStory.media.type === "image" ? (
          <img
            alt="Story"
            className="h-full w-full object-contain"
            src={activeStory.media.url}
          />
        ) : (
          <video
            key={activeStory.id}
            className="h-full w-full object-contain"
            src={activeStory.media.url}
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={goNext}
          />
        )}
      </div>

      <button
        aria-label="Avanzar story"
        className="fixed inset-0 z-10 cursor-pointer"
        type="button"
        onClick={handleTap}
      />

      <div className="fixed left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {stories.map((story, index) => (
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/28" key={story.id}>
              <div
                className={`h-full rounded-full bg-white ${
                  index === activeIndex ? "animate-none" : ""
                }`}
                style={{
                  width: index < activeIndex ? "100%" : index > activeIndex ? "0%" : undefined,
                  animation:
                    index === activeIndex
                      ? `story-progress ${activeDuration}ms linear forwards`
                      : undefined,
                }}
                key={`${story.id}-${progressKey}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {activeStory.author_snapshot.avatar_url ? (
              <img
                alt={activeStory.author_snapshot.display_name}
                className="h-10 w-10 rounded-full object-cover"
                src={activeStory.author_snapshot.avatar_url}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night">
                {(activeStory.author_snapshot.display_name || "B").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                {activeStory.author_snapshot.display_name}
              </p>
              <p className="text-xs font-semibold text-white/58">
                @{activeStory.author_snapshot.username} · {formatRelativeDate(activeStory.created_at)}
              </p>
            </div>
          </div>
          <button
            className="rounded-lg bg-black/40 px-3 py-2 text-sm font-black text-white"
            type="button"
            onClick={() => navigate("/")}
          >
            Cerrar
          </button>
        </div>
      </div>

      {activeStory.text ? (
        <div className="fixed bottom-24 left-4 right-4 z-20 rounded-lg bg-black/46 p-4 backdrop-blur">
          <p className="whitespace-pre-line text-lg font-black leading-7 text-white">
            {activeStory.text}
          </p>
        </div>
      ) : null}

      {isOwner ? (
        <div className="fixed bottom-4 left-4 right-4 z-30 grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
          <button
            className="h-12 rounded-lg border border-white/20 bg-black/60 text-sm font-black text-white backdrop-blur"
            type="button"
            onClick={loadViewers}
          >
            Vistas · {activeStory.views_count || 0}
          </button>
          <button
            className="h-12 rounded-lg border border-neonPink/40 bg-neonPink/20 text-sm font-black text-white backdrop-blur"
            type="button"
            onClick={handleDelete}
          >
            Borrar
          </button>
        </div>
      ) : null}

      {showViewers ? (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[60vh] rounded-t-2xl border border-white/10 bg-night p-4 shadow-neon">
          <div className="flex items-center justify-between">
            <p className="text-lg font-black text-white">Vieron tu story</p>
            <button
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/70"
              type="button"
              onClick={() => setShowViewers(false)}
            >
              Cerrar
            </button>
          </div>
          {viewers.length === 0 ? (
            <p className="mt-5 text-sm font-semibold text-white/54">Todavía no hay vistas.</p>
          ) : null}
          <div className="mt-4 space-y-3 overflow-y-auto">
            {viewers.map((viewer) => (
              <div className="flex items-center gap-3" key={`${viewer.user_id}-${viewer.viewed_at}`}>
                {viewer.avatar_url ? (
                  <img
                    alt={viewer.display_name}
                    className="h-11 w-11 rounded-full object-cover"
                    src={viewer.avatar_url}
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-black text-white">
                    {(viewer.display_name || "B").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{viewer.display_name}</p>
                  <p className="text-xs font-semibold text-white/48">
                    @{viewer.username} · {formatRelativeDate(viewer.viewed_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StoryViewer;
