import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  Film,
  Flag,
  Image as ImageIcon,
  LogOut,
  MapPin,
  Pencil,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import PushSettings from "../components/push/PushSettings.jsx";
import { ProfileSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { optimizeCloudinaryImage } from "../utils/media.js";

const tabs = [
  { id: "posts", label: "Posts", icon: Sparkles },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "events", label: "Eventos", icon: CalendarPlus },
  { id: "stories", label: "Stories", icon: Film },
  { id: "lives", label: "Lives", icon: Radio },
];

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "contenido ofensivo", label: "Contenido ofensivo" },
  { value: "acoso", label: "Acoso" },
  { value: "información falsa", label: "Información falsa" },
  { value: "otro", label: "Otro" },
];

function StatCard({ label, value, to }) {
  const content = (
    <motion.div
      className="glass-panel rounded-[1.35rem] p-3"
      whileTap={{ scale: 0.98 }}
    >
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/44">
        {label}
      </p>
    </motion.div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function EmptyState({ title, description }) {
  return (
    <div className="glass-panel mt-4 rounded-[1.75rem] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan/25 to-neonPink/25 text-neonCyan">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-black text-white">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-white/58">{description}</p> : null}
    </div>
  );
}

function MediaGrid({ posts }) {
  const mediaItems = posts.flatMap((post) =>
    (post.media || []).map((item) => ({
      ...item,
      postId: post.id,
      text: post.text,
    }))
  );

  if (mediaItems.length === 0) {
    return <EmptyState title="Aún no hay media" description="Las fotos y vídeos aparecerán aquí." />;
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {mediaItems.map((item, index) => (
        <Link
          className="relative aspect-square overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/7"
          key={`${item.postId}-${item.public_id || item.url}-${index}`}
          to={`/posts/${item.postId}`}
        >
          {item.type === "image" ? (
            <img
              alt={item.text || "Media de perfil"}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              src={optimizeCloudinaryImage(item.url, { width: 320, quality: "auto:eco" })}
            />
          ) : (
            <>
              {item.thumbnail_url ? (
                <img
                  alt={item.text || "Vídeo de perfil"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  src={optimizeCloudinaryImage(item.thumbnail_url, {
                    width: 320,
                    quality: "auto:eco",
                  })}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-fiestaPurple/60 to-neonPink/40" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-7 w-7 fill-white text-white" />
              </span>
            </>
          )}
        </Link>
      ))}
    </div>
  );
}

function ProfileEditModal({ profileUser, onClose, onSaved }) {
  const { completeOnboarding } = useAuth();
  const [form, setForm] = useState({
    display_name: profileUser.display_name || "",
    username: profileUser.username || "",
    city: profileUser.city || "",
    country: profileUser.country || "",
    bio: profileUser.bio || "",
    avatar_url: profileUser.avatar_url || "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const updated = await completeOnboarding({
        ...form,
        username: form.username.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/72 px-4 pb-4 backdrop-blur-sm">
      <motion.form
        className="glass-panel mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-5"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neonCyan">
              Perfil
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Editar perfil</h2>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm font-black text-white"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {[
            ["display_name", "Nombre visible", "Tu nombre"],
            ["username", "Usuario", "bucan_user"],
            ["city", "Ciudad", "Malabo"],
            ["country", "País", "Guinea Ecuatorial"],
            ["avatar_url", "Avatar URL", "https://..."],
          ].map(([name, label, placeholder]) => (
            <label className="block" key={name}>
              <span className="text-sm font-bold text-white/76">{label}</span>
              <input
                className="mt-2 h-14 w-full rounded-[1.1rem] border border-white/10 bg-white/7 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-neonCyan"
                name={name}
                value={form[name]}
                onChange={updateField}
                placeholder={placeholder}
                required={name !== "avatar_url"}
              />
            </label>
          ))}

          <label className="block">
            <span className="text-sm font-bold text-white/76">Bio</span>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-[1.1rem] border border-white/10 bg-white/7 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-neonCyan"
              maxLength={300}
              name="bio"
              value={form.bio}
              onChange={updateField}
              placeholder="Cuéntale algo a tu gente."
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="mt-5 h-14 w-full rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-sm font-black text-white shadow-cyan disabled:opacity-60"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </motion.form>
    </div>
  );
}

function ReportUserModal({ profileUser, onClose, onReported }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsReporting(true);

    try {
      await apiClient.post("/reports", {
        target_type: "user",
        target_id: profileUser.id,
        reason,
        details,
      });
      onReported();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/72 px-4 pb-4 backdrop-blur-sm">
      <motion.form
        className="glass-panel mx-auto w-full max-w-md rounded-[1.75rem] p-5"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Reportar usuario</h2>
            <p className="mt-1 text-sm text-white/56">@{profileUser.username}</p>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm font-black text-white"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-white/50">
          Motivo
        </label>
        <select
          className="mt-2 w-full rounded-[1.1rem] border border-white/10 bg-surface px-4 py-3 text-sm font-bold text-white outline-none focus:border-neonPink"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {REPORT_REASONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <textarea
          className="mt-4 min-h-24 w-full rounded-[1.1rem] border border-white/10 bg-white/7 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-neonPink"
          maxLength={500}
          placeholder="Detalles opcionales"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />

        {error ? (
          <div className="mt-4 rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="mt-4 h-14 w-full rounded-full bg-liveRed text-sm font-black text-white shadow-live disabled:opacity-60"
          disabled={isReporting}
          type="submit"
        >
          {isReporting ? "Enviando..." : "Enviar reporte"}
        </button>
      </motion.form>
    </div>
  );
}

function Profile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
  }, [targetUsername, user?.username]);

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
  const likesReceived = posts.reduce(
    (total, post) => total + Number(post.stats?.likes_count || 0),
    0
  );
  const mediaCount = posts.reduce((total, post) => total + (post.media?.length || 0), 0);

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-7rem)]">
        <ProfileSkeleton />
      </section>
    );
  }

  if (!profileUser && error) {
    return (
      <section className="min-h-[calc(100vh-7rem)]">
        <div className="glass-panel rounded-[1.75rem] p-5">
          <p className="text-lg font-black text-white">No se pudo cargar el perfil.</p>
          <p className="mt-2 text-sm text-white/60">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <motion.header
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-surface p-5 shadow-cyan"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-neonCyan/26 via-fiestaPurple/22 to-neonPink/20 blur-2xl" />
        <div className="absolute right-8 top-5 h-24 w-24 rounded-full bg-neonPink/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan via-fiestaPurple to-neonPink p-[3px] shadow-cyan">
                {profileUser?.avatar_url ? (
                  <img
                    alt={profileUser.display_name}
                    className="h-full w-full rounded-full border-4 border-night object-cover"
                    src={profileUser.avatar_url}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-night bg-black/50 text-4xl font-black text-white">
                    {initial.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {profileUser?.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-neonCyan/30 bg-neonCyan/12 px-3 py-1 text-xs font-black text-neonCyan">
                  <Check className="h-3.5 w-3.5" />
                  Verificado
                </span>
              ) : null}
              {profileUser?.role === "admin" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-neonYellow/30 bg-neonYellow/12 px-3 py-1 text-xs font-black text-neonYellow">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-3xl font-black leading-tight text-white">
              {profileUser?.display_name}
            </h1>
            <p className="mt-1 text-sm font-black text-neonPink">@{profileUser?.username}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-white/64">
              <MapPin className="h-4 w-4 text-neonCyan" />
              {[profileUser?.city, profileUser?.country].filter(Boolean).join(" · ") ||
                "Sin ubicación"}
            </p>
            <p className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/72">
              {profileUser?.bio || "Todavía no hay bio."}
            </p>
          </div>
        </div>
      </motion.header>

      {error ? (
        <div className="mt-4 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mt-4 rounded-[1.2rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
          {notice}
        </div>
      ) : null}

      <motion.div
        className="mt-4 grid grid-cols-2 gap-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {[
          { label: "Posts", value: posts.length },
          {
            label: "Seguidores",
            value: profileUser?.followers_count || 0,
            to: `/users/${profileUser?.username}/followers`,
          },
          {
            label: "Seguidos",
            value: profileUser?.following_count || 0,
            to: `/users/${profileUser?.username}/following`,
          },
          { label: "Likes", value: likesReceived },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-4">
        {isOwnProfile ? (
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              className="h-14 rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-sm font-black text-white shadow-cyan"
              type="button"
              onClick={() => setShowEditModal(true)}
              whileTap={{ scale: 0.96 }}
            >
              <span className="inline-flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </span>
            </motion.button>
            <motion.button
              className="h-14 rounded-full border border-liveRed/40 bg-liveRed/10 text-sm font-black text-white"
              type="button"
              onClick={logout}
              whileTap={{ scale: 0.96 }}
            >
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Salir
              </span>
            </motion.button>
            <Link
              className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white"
              to="/stories/create"
            >
              <Film className="h-4 w-4" />
              Crear story
            </Link>
            <Link
              className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white"
              to="/events/create"
            >
              <CalendarPlus className="h-4 w-4" />
              Crear evento
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              className={`h-14 rounded-full text-sm font-black disabled:opacity-60 ${
                profileUser?.is_following
                  ? "border border-neonPink/40 bg-neonPink/10 text-white"
                  : "bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan"
              }`}
              type="button"
              onClick={handleToggleFollow}
              disabled={isUpdatingFollow}
              whileTap={{ scale: 0.96 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" />
                {isUpdatingFollow
                  ? "..."
                  : profileUser?.is_following
                    ? "Dejar"
                    : "Seguir"}
              </span>
            </motion.button>
            <motion.button
              className="h-14 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white disabled:opacity-60"
              type="button"
              onClick={handleStartChat}
              disabled={isStartingChat}
              whileTap={{ scale: 0.96 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                {isStartingChat ? "..." : "Mensaje"}
              </span>
            </motion.button>
            <motion.button
              className="h-14 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white"
              type="button"
              aria-label="Reportar usuario"
              onClick={() => (isAuthenticated ? setShowReportModal(true) : navigate("/login"))}
              whileTap={{ scale: 0.96 }}
            >
              <Flag className="mx-auto h-4 w-4" />
            </motion.button>
          </div>
        )}
      </div>

      {isOwnProfile ? (
        <div className="mt-4">
          <PushSettings />
        </div>
      ) : null}

      <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              className={`relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                isActive
                  ? "bg-white/12 text-white shadow-cyan"
                  : "border border-white/10 bg-white/7 text-white/54"
              }`}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {isActive ? (
                <motion.span
                  className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-gradient-to-r from-neonCyan to-neonPink"
                  layoutId="profile-tab"
                />
              ) : null}
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div
        className="mt-3"
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {activeTab === "posts" ? (
          posts.length === 0 ? (
            <EmptyState
              title={isOwnProfile ? "Todavía no hay publicaciones" : "Aún no hay publicaciones"}
              description="Cuando haya movimiento, aparecerá aquí."
            />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "media" ? <MediaGrid posts={posts} /> : null}

        {activeTab === "events" ? (
          <EmptyState
            title="Este usuario todavía no ha creado eventos"
            description="Los eventos completos aparecerán aquí cuando estén conectados al perfil."
          />
        ) : null}

        {activeTab === "stories" ? (
          <EmptyState
            title="No hay stories activas"
            description="Las stories duran 24 horas y aparecerán aquí mientras estén vivas."
          />
        ) : null}

        {activeTab === "lives" ? (
          <EmptyState
            title="No hay lives activos"
            description="Cuando este usuario esté en directo, lo verás aquí."
          />
        ) : null}
      </motion.div>

      {showEditModal ? (
        <ProfileEditModal
          profileUser={profileUser}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setProfileUser(updated)}
        />
      ) : null}

      {showReportModal ? (
        <ReportUserModal
          profileUser={profileUser}
          onClose={() => setShowReportModal(false)}
          onReported={() => setNotice("Reporte enviado a moderación.")}
        />
      ) : null}
    </section>
  );
}

export default Profile;
