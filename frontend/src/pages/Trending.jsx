import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import { FeedSkeleton, ListSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function TrendingUser({ item, currentUsername, onToggleFollow }) {
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
          <p className="mt-1 text-xs text-white/46">
            {item.followers_count || 0} seguidores · {item.posts_count || 0} posts
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

function Trending() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        const [postsResponse, usersResponse, placesResponse] = await Promise.all([
          apiClient.get("/trending/posts", { params: { limit: 8 } }),
          apiClient.get("/trending/users", { params: { limit: 8 } }),
          apiClient.get("/trending/places", { params: { limit: 8 } }),
        ]);
        setPosts(postsResponse.data.items);
        setUsers(usersResponse.data.items);
        setPlaces(placesResponse.data.places);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  async function handleToggleFollow(item) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = item.is_following
        ? await apiClient.delete(`/users/${item.id}/follow`)
        : await apiClient.post(`/users/${item.id}/follow`);
      setUsers((current) =>
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

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Movimiento
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Tendencias</h1>
      <p className="mt-3 text-base leading-7 text-white/64">
        Lo que más se mueve ahora en BUCAN DEY.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      <div className="mt-7">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Publicaciones tendencia
        </p>
        {isLoading ? <FeedSkeleton count={2} /> : null}
        {!isLoading && posts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-surface p-5">
            <p className="text-base font-black text-white">Aún no hay tendencias.</p>
          </div>
        ) : null}
        <div className="mt-4 space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Usuarios populares
        </p>
        {isLoading ? <ListSkeleton count={3} /> : null}
        <div className="mt-4 space-y-3">
          {users.map((item) => (
            <TrendingUser
              key={item.id}
              item={item}
              currentUsername={user?.username}
              onToggleFollow={handleToggleFollow}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Lugares activos
        </p>
        <div className="mt-4 space-y-3">
          {places.map((place) => (
            <div
              className="rounded-lg border border-white/10 bg-surface p-4"
              key={`${place.city}-${place.area}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">
                    {place.area || place.city}
                  </p>
                  <p className="mt-1 text-sm text-white/54">{place.city}</p>
                </div>
                <span className="rounded-full border border-neonYellow/30 bg-neonYellow/10 px-3 py-1 text-xs font-black text-neonYellow">
                  {place.posts_count} posts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Trending;
