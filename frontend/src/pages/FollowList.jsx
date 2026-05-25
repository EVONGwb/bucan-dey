import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function UserRow({ item, currentUsername, onToggleFollow }) {
  const isSelf = currentUsername && currentUsername === item.username;
  const initial = (item.display_name || item.username || "B").charAt(0).toUpperCase();

  return (
    <div className="rounded-lg border border-white/10 bg-surface p-4">
      <div className="flex items-center gap-3">
        <Link to={`/users/${item.username}`} className="shrink-0">
          {item.avatar_url ? (
            <img
              alt={item.display_name}
              className="h-12 w-12 rounded-full object-cover"
              decoding="async"
              loading="lazy"
              src={item.avatar_url}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-lg font-black text-night">
              {initial}
            </div>
          )}
        </Link>

        <Link className="min-w-0 flex-1" to={`/users/${item.username}`}>
          <p className="truncate text-sm font-black text-white">{item.display_name}</p>
          <p className="mt-1 truncate text-xs font-semibold text-neonPink">@{item.username}</p>
          <p className="mt-1 truncate text-xs text-white/46">
            {item.city || "Sin ciudad"} · {item.followers_count || 0} seguidores
          </p>
        </Link>

        {!isSelf ? (
          <button
            className={`rounded-lg px-3 py-2 text-xs font-black transition active:scale-[0.99] ${
              item.is_following
                ? "border border-neonPink/40 bg-neonPink/10 text-white"
                : "bg-neonGreen text-night"
            }`}
            type="button"
            onClick={() => onToggleFollow(item)}
          >
            {item.is_following ? "Dejar" : "Seguir"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FollowList({ mode }) {
  const navigate = useNavigate();
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const title = mode === "following" ? "Seguidos" : "Seguidores";

  async function load(cursor = null) {
    const params = { limit: 30 };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get(`/users/${username}/${mode}`, { params });
    setItems((current) => (cursor ? [...current, ...response.data.items] : response.data.items));
    setNextCursor(response.data.next_cursor);
  }

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        await load();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [username, mode]);

  async function handleToggleFollow(item) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = item.is_following
        ? await apiClient.delete(`/users/${item.id}/follow`)
        : await apiClient.post(`/users/${item.id}/follow`);

      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                is_following: response.data.following,
                followers_count: response.data.followers_count,
              }
            : candidate
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    try {
      setIsLoadingMore(true);
      await load(nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        @{username}
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">{title}</h1>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? <ListSkeleton count={5} /> : null}

      {!isLoading && items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-surface p-5">
          <p className="text-base font-black text-white">Todavía no hay usuarios aquí.</p>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <UserRow
            key={item.id}
            item={item}
            currentUsername={user?.username}
            onToggleFollow={handleToggleFollow}
          />
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

export default FollowList;
