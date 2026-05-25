import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import { ProfileSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function Profile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  const targetUsername = username || user?.username;
  const isOwnProfile = useMemo(
    () => Boolean(user?.username && targetUsername === user.username),
    [targetUsername, user?.username]
  );

  useEffect(() => {
    async function loadProfile() {
      if (!targetUsername) return;

      try {
        setIsLoading(true);
        setError("");
        const [profileResponse, postsResponse] = await Promise.all([
          apiClient.get(`/users/${targetUsername}`),
          apiClient.get(`/users/${targetUsername}/posts`),
        ]);
        setProfileUser(profileResponse.data);
        setPosts(postsResponse.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [targetUsername, user, username]);

  async function handleStartChat() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setIsStartingChat(true);
      const response = await apiClient.post("/chat/conversations", {
        user_id: profileUser.id,
      });
      navigate(`/chat?conversation=${response.data.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsStartingChat(false);
    }
  }

  async function handleToggleFollow() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setIsUpdatingFollow(true);
      setError("");
      const response = profileUser.is_following
        ? await apiClient.delete(`/users/${profileUser.id}/follow`)
        : await apiClient.post(`/users/${profileUser.id}/follow`);

      setProfileUser((current) => ({
        ...current,
        is_following: response.data.following,
        followers_count: response.data.followers_count,
      }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUpdatingFollow(false);
    }
  }

  const initial =
    profileUser?.display_name?.charAt(0) || profileUser?.username?.charAt(0) || "B";

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-7rem)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
          Usuario
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">Perfil</h1>
        <ProfileSkeleton />
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Usuario
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Perfil</h1>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      <div className="mt-8 rounded-lg border border-white/10 bg-surface p-5">
        <div className="flex items-center gap-4">
          {profileUser?.avatar_url ? (
            <img
              alt={profileUser.display_name}
              className="h-20 w-20 rounded-full object-cover"
              src={profileUser.avatar_url}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-3xl font-black text-night">
              {initial.toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black text-white">
              {profileUser?.display_name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-neonPink">
              @{profileUser?.username}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            className="rounded-lg border border-white/10 bg-white/5 p-3 transition active:scale-[0.99]"
            to={`/users/${profileUser?.username}/followers`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
              Seguidores
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {profileUser?.followers_count || 0}
            </p>
          </Link>
          <Link
            className="rounded-lg border border-white/10 bg-white/5 p-3 transition active:scale-[0.99]"
            to={`/users/${profileUser?.username}/following`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
              Seguidos
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {profileUser?.following_count || 0}
            </p>
          </Link>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
              Ciudad
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {profileUser?.city || "Sin ciudad"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
              País
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {profileUser?.country || "Sin país"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
            Bio
          </p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {profileUser?.bio || "Todavía no hay bio."}
          </p>
        </div>

        {isOwnProfile ? (
          <button
            className="mt-6 h-14 w-full rounded-lg border border-neonPink/40 bg-neonPink/10 px-4 text-sm font-black text-white transition active:scale-[0.99]"
            type="button"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              className={`h-14 rounded-lg text-sm font-black transition active:scale-[0.99] disabled:opacity-60 ${
                profileUser?.is_following
                  ? "border border-neonPink/40 bg-neonPink/10 text-white"
                  : "bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-night shadow-neon"
              }`}
              type="button"
              onClick={handleToggleFollow}
              disabled={isUpdatingFollow}
            >
              {isUpdatingFollow
                ? "Guardando..."
                : profileUser?.is_following
                  ? "Dejar"
                  : "Seguir"}
            </button>
            <button
              className="h-14 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-60"
              type="button"
              onClick={handleStartChat}
              disabled={isStartingChat}
            >
              {isStartingChat ? "Abriendo..." : "Mensaje"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          {isOwnProfile ? "Tus publicaciones" : "Publicaciones"}
        </p>

        {posts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-surface p-5">
            <p className="text-base font-black text-white">
              {isOwnProfile ? "Aún no has publicado nada." : "Aún no hay publicaciones."}
            </p>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Profile;
