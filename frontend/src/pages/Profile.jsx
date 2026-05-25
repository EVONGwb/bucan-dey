import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
          username ? apiClient.get(`/users/${targetUsername}`) : Promise.resolve({ data: user }),
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
          <button
            className="mt-6 h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night shadow-neon transition active:scale-[0.99]"
            type="button"
            onClick={handleStartChat}
            disabled={isStartingChat}
          >
            {isStartingChat ? "Abriendo..." : "Enviar mensaje"}
          </button>
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
