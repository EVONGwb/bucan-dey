import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Bookmark,
  Car,
  Check,
  Compass,
  Film,
  Flag,
  Flame,
  Heart,
  Image as ImageIcon,
  Link as LinkIcon,
  LogOut,
  MapPin,
  MessageCircle,
  Music,
  Pencil,
  Play,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import PushSettings from "../components/push/PushSettings.jsx";
import { ProfileSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { optimizeCloudinaryImage } from "../utils/media.js";

const tabs = [
  { id: "posts", label: "Publicaciones", icon: Sparkles },
  { id: "media", label: "Reels", icon: Film },
  { id: "saved", label: "Guardados", icon: Bookmark },
  { id: "map", label: "Mapa", icon: MapPin },
  { id: "likes", label: "Likes", icon: Heart },
  { id: "badges", label: "Logros", icon: Award },
];

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "contenido ofensivo", label: "Contenido ofensivo" },
  { value: "acoso", label: "Acoso" },
  { value: "información falsa", label: "Información falsa" },
  { value: "otro", label: "Otro" },
];

const PREMIUM_PROFILE_AVATAR = "/images/bucan-premium-avatar.png";

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

function formatCompact(value) {
  return new Intl.NumberFormat("es", {
    notation: Number(value || 0) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function ProfileAvatar({ profileUser, initial, size = "large" }) {
  const isHero = size === "large";
  const sizeClass = isHero ? "h-[8.15rem] w-[8.15rem] sm:h-44 sm:w-44" : "h-11 w-11";
  const avatarSrc = isHero ? PREMIUM_PROFILE_AVATAR : profileUser?.avatar_url || PREMIUM_PROFILE_AVATAR;
  const usesPremiumVisual = avatarSrc === PREMIUM_PROFILE_AVATAR;
  const frameShape = {
    clipPath: "polygon(17% 0%, 83% 0%, 100% 18%, 92% 77%, 50% 100%, 8% 77%, 0% 18%)",
  };

  return (
    <div
      className={`relative flex ${sizeClass} items-center justify-center ${
        usesPremiumVisual
          ? "rounded-[1.8rem] bg-transparent shadow-[0_0_38px_rgba(255,79,216,.2)]"
          : "bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan p-[3px] shadow-neon"
      }`}
      style={usesPremiumVisual ? undefined : frameShape}
    >
      <div
        className={`absolute -inset-2 blur-xl ${usesPremiumVisual ? "rounded-[2rem] bg-neonPink/12" : "bg-neonPink/18"}`}
        style={usesPremiumVisual ? undefined : frameShape}
      />
      <img
        alt={profileUser?.display_name || `Avatar ${initial}`}
        className={`relative h-full w-full object-cover ${
          usesPremiumVisual ? "rounded-[1.75rem]" : "border-[3px] border-night sm:border-4"
        }`}
        src={avatarSrc}
        style={usesPremiumVisual ? undefined : frameShape}
      />
      {usesPremiumVisual ? null : (
        <span className="absolute right-2 bottom-3 h-4 w-4 rounded-full border-[3px] border-night bg-green-400 shadow-[0_0_18px_rgba(34,197,94,.85)] sm:h-5 sm:w-5" />
      )}
    </div>
  );
}

function ProfileStatBar({ stats }) {
  return (
    <motion.div
      className="grid grid-cols-4 overflow-hidden rounded-[1.05rem] border border-white/8 bg-black/20 backdrop-blur-xl"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {stats.map((stat, index) => {
        const content = (
          <div className="min-h-[3.35rem] px-1 py-2 text-center sm:min-h-[4.7rem] sm:px-2 sm:py-3">
            <p className="text-[13px] font-black text-white sm:text-xl">{formatCompact(stat.value)}</p>
            <p className="mt-0.5 text-[8px] font-bold leading-tight text-white/58 sm:mt-1 sm:text-xs">
              {stat.label}
            </p>
          </div>
        );

        return stat.to ? (
          <Link
            className={index ? "border-l border-white/8" : ""}
            key={stat.label}
            to={stat.to}
          >
            {content}
          </Link>
        ) : (
          <div className={index ? "border-l border-white/8" : ""} key={stat.label}>
            {content}
          </div>
        );
      })}
    </motion.div>
  );
}

function MoodPill({ icon: Icon, title, detail, color = "pink", to }) {
  const className =
    color === "cyan"
      ? "border-neonCyan/20 bg-neonCyan/8 text-neonCyan"
      : color === "purple"
        ? "border-fiestaPurple/25 bg-fiestaPurple/10 text-neonPink"
        : "border-neonPink/20 bg-neonPink/10 text-neonPink";
  const content = (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-[0.72rem] border px-2.5 py-1.5 sm:gap-2 sm:rounded-[0.85rem] sm:px-3 sm:py-2 ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black text-white sm:text-xs">{title}</span>
        {detail ? <span className="block truncate text-[8px] font-semibold text-white/48 sm:text-[10px]">{detail}</span> : null}
      </span>
    </span>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function AboutCard({ profileUser, isOwnProfile, onEdit }) {
  const aboutLines = [
    profileUser?.bio || "Creando movimiento en BUCAN DEY.",
    profileUser?.role === "admin" ? "Admin de la comunidad." : "Miembro de la comunidad.",
    profileUser?.is_verified ? "Perfil verificado." : "Perfil social local.",
    [profileUser?.city, profileUser?.country].filter(Boolean).join(", ") || "Guinea Ecuatorial",
  ];

  return (
    <section className="h-full rounded-[1rem] border border-white/8 bg-black/20 p-3 backdrop-blur-xl sm:rounded-[1.2rem] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.12em] text-white/72 sm:text-xs">Sobre mí</h2>
        {isOwnProfile ? (
          <button className="text-[10px] font-black text-neonCyan sm:text-xs" type="button" onClick={onEdit}>
            Editar
          </button>
        ) : null}
      </div>
      <div className="mt-2.5 space-y-1 text-[10px] font-semibold leading-4 text-white/78 sm:mt-4 sm:space-y-2 sm:text-sm sm:leading-6">
        {aboutLines.map((line, index) => (
          <p className="line-clamp-1 sm:line-clamp-2" key={`${line}-${index}`}>
            <span className="mr-1.5 sm:mr-2">{["👋", "💼", "✨", "🌍"][index]}</span>
            {line}
          </p>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 sm:mt-5 sm:gap-2">
        {["Emprendedor", "Creador digital", "Visionario"].map((tag, index) => (
          <span
            className={[
              "rounded-[0.55rem] border px-1.5 py-0.5 text-[8px] font-black sm:rounded-[0.75rem] sm:px-3 sm:py-1.5 sm:text-xs",
              index === 0
                ? "border-neonCyan/20 bg-neonCyan/10 text-neonCyan"
                : index === 1
                  ? "border-neonYellow/20 bg-neonYellow/10 text-neonYellow"
                  : "border-neonPink/20 bg-neonPink/10 text-neonPink",
            ].join(" ")}
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function LocationMusicCards({ profileUser }) {
  return (
    <div className="grid h-full gap-1.5 sm:gap-3">
      <section className="overflow-hidden rounded-[0.9rem] border border-white/8 bg-black/20 p-2 backdrop-blur-xl sm:rounded-[1.2rem] sm:p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[9px] font-black uppercase tracking-[0.1em] text-white/72 sm:text-xs">Mi ubicación</h2>
          <Link className="text-[9px] font-black text-neonCyan sm:text-[11px]" to="/map">
            Ver mapa
          </Link>
        </div>
        <div className="mt-1.5 grid gap-1.5 sm:mt-3 sm:grid-cols-[5rem_1fr] sm:gap-3">
          <div className="relative h-12 overflow-hidden rounded-[0.72rem] border border-neonPink/20 bg-[radial-gradient(circle_at_55%_40%,rgba(255,79,216,.55),transparent_18%),linear-gradient(135deg,rgba(0,217,255,.16),rgba(124,58,237,.16)),repeating-linear-gradient(35deg,rgba(255,255,255,.08)_0_1px,transparent_1px_18px)] sm:h-20 sm:rounded-[1rem]">
            <MapPin className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-neonPink drop-shadow-[0_0_16px_rgba(255,79,216,.9)] sm:h-9 sm:w-9" />
          </div>
          <div className="min-w-0 self-center">
            <p className="truncate text-[10px] font-black uppercase text-white sm:text-sm">
              {profileUser?.city || "Malabo"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[8px] font-semibold leading-3 text-white/56 sm:mt-1 sm:text-xs sm:leading-5">
              Último lugar: Arena Blanca
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[0.9rem] border border-white/8 bg-black/20 p-2 backdrop-blur-xl sm:rounded-[1.2rem] sm:p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[9px] font-black uppercase tracking-[0.1em] text-white/72 sm:text-xs">Sonando ahora</h2>
          <span className="text-[9px] font-black text-neonCyan sm:text-[11px]">Ver todo</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 sm:mt-3 sm:gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[0.65rem] bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan sm:h-14 sm:w-14 sm:rounded-[0.9rem]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black text-white sm:text-sm">Me Conozco</p>
            <p className="text-[8px] font-semibold text-white/52 sm:text-xs">Roku</p>
          </div>
          <Music className="h-3.5 w-3.5 shrink-0 text-neonCyan sm:h-5 sm:w-5" />
        </div>
      </section>
    </div>
  );
}

function AchievementsStrip({ posts, profileUser, likesReceived }) {
  const badges = [
    { label: "Explorador", level: Math.max(1, Math.min(5, Math.ceil(posts.length / 3) || 1)), icon: Compass, color: "cyan" },
    { label: "Empresario", level: profileUser?.role === "admin" ? 5 : 2, icon: Car, color: "yellow" },
    { label: "Creador", level: Math.max(1, Math.min(5, Math.ceil(posts.length / 2) || 1)), icon: ImageIcon, color: "pink" },
    { label: "Popular", level: Math.max(1, Math.min(5, Math.ceil(likesReceived / 10) || 1)), icon: Flame, color: "pink" },
    { label: "Verificado", level: profileUser?.is_verified ? 5 : 1, icon: Check, color: "cyan" },
  ];

  return (
    <section className="rounded-[1.1rem] border border-white/10 bg-white/[0.055] p-2 shadow-cyan backdrop-blur-2xl sm:rounded-[1.35rem] sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.12em] text-white/72 sm:text-xs">Logros</h2>
        <button className="text-[9px] font-black text-neonCyan sm:text-[11px]" type="button">Ver todos</button>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 sm:mt-4 sm:gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon;
          const tone =
            badge.color === "yellow"
              ? "from-neonYellow/28 to-neonOrange/18 text-neonYellow"
              : badge.color === "cyan"
                ? "from-neonCyan/24 to-fiestaPurple/18 text-neonCyan"
                : "from-neonPink/26 to-fiestaPurple/18 text-neonPink";

          return (
            <div className="text-center" key={badge.label}>
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-[0.75rem] border border-white/10 bg-gradient-to-br ${tone} shadow-neon sm:h-16 sm:w-16 sm:rounded-[1.1rem]`}>
                <Icon className="h-4 w-4 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-1 truncate text-[8px] font-black text-white sm:mt-2 sm:text-xs">{badge.label}</p>
              <p className="text-[7px] font-semibold text-white/48 sm:text-[9px]">Nivel {badge.level}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProfilePostGrid({ posts }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay publicaciones"
        description="Cuando haya movimiento, aparecerá aquí."
      />
    );
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
      {posts.map((post, index) => {
        const media = post.media?.[0];
        return (
          <Link
            className="relative aspect-square overflow-hidden rounded-[0.55rem] border border-white/8 bg-white/[0.055] sm:rounded-[0.85rem]"
            key={post.id}
            to={`/posts/${post.id}`}
          >
            {media?.type === "image" ? (
              <img
                alt={post.text || "Publicación"}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                src={optimizeCloudinaryImage(media.url, { width: 360, quality: "auto:eco" })}
              />
            ) : media?.type === "video" ? (
              <>
                {media.thumbnail_url ? (
                  <img
                    alt={post.text || "Video"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    src={optimizeCloudinaryImage(media.thumbnail_url, { width: 360, quality: "auto:eco" })}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-fiestaPurple via-neonPink/50 to-neonCyan/40" />
                )}
                <Play className="absolute right-2 top-2 h-5 w-5 fill-white text-white drop-shadow" />
              </>
            ) : (
              <div className="flex h-full w-full items-end bg-gradient-to-br from-neonPink/30 via-fiestaPurple/28 to-neonCyan/20 p-2">
                <p className="line-clamp-4 text-xs font-black leading-4 text-white">
                  {post.text || `BUCAN DEY ${index + 1}`}
                </p>
              </div>
            )}
          </Link>
        );
      })}
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
    <section className="-mx-4 -mt-5 min-h-[calc(100vh-5rem)] bg-night pb-28 text-white sm:mx-0 sm:mt-0 sm:rounded-[2rem]">
      <motion.header
        className="relative overflow-hidden rounded-b-[1.6rem] border-b border-white/10 bg-night shadow-cyan sm:rounded-[2rem] sm:border"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,79,216,.72),transparent_25%),radial-gradient(circle_at_62%_5%,rgba(0,217,255,.44),transparent_28%),linear-gradient(180deg,rgba(124,58,237,.42),rgba(7,11,20,.96)_68%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(115deg,rgba(255,79,216,.26),transparent_26%),linear-gradient(160deg,transparent_0_42%,rgba(0,217,255,.18)_44%,transparent_58%)] blur-[1px] sm:h-44" />
        <div className="absolute bottom-12 left-[31%] right-[16%] flex h-20 items-end justify-around opacity-45 sm:bottom-20 sm:h-28">
          {[34, 56, 42, 74, 50, 88, 38, 68, 48, 76, 55].map((height, index) => (
            <span
              className="w-[5px] rounded-t-sm bg-gradient-to-t from-neonCyan/30 via-fiestaPurple/40 to-white/40 shadow-cyan sm:w-2"
              key={`${height}-${index}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="absolute bottom-[3.7rem] right-3 h-10 w-[6.4rem] rounded-[45%_55%_38%_42%] bg-black/62 shadow-[0_0_30px_rgba(255,48,64,.35)] sm:bottom-24 sm:h-14 sm:w-32" />
        <div className="absolute bottom-[4.45rem] right-6 h-2 w-8 rounded-full bg-liveRed/60 shadow-live sm:bottom-[7.1rem] sm:h-3 sm:w-12" />
        <div className="absolute bottom-11 left-0 right-0 h-16 bg-gradient-to-t from-night via-night/76 to-transparent sm:bottom-20 sm:h-20" />

        <div className="relative px-4 pb-3 pt-12 sm:px-6 sm:pb-5 sm:pt-24">
          <div className="absolute left-4 top-3 sm:left-6 sm:top-5">
            <ProfileAvatar profileUser={profileUser} initial={initial} />
            {isOwnProfile ? (
              <button
                className="absolute -right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-night/82 text-white shadow-cyan backdrop-blur-xl sm:h-9 sm:w-9"
                type="button"
                onClick={() => setShowEditModal(true)}
                aria-label="Editar perfil"
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            ) : null}
          </div>

          <div className="ml-[8.7rem] min-h-[7.6rem] pt-2 sm:ml-48 sm:min-h-32 sm:pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[1.72rem] font-black leading-none text-white drop-shadow sm:text-5xl">
                {profileUser?.display_name}
              </h1>
              {profileUser?.is_verified ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-cyan sm:h-6 sm:w-6">
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={4} />
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:mt-1 sm:gap-2">
              <p className="text-[0.8rem] font-bold text-white/72 sm:text-sm">@{profileUser?.username}</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/12 px-1.5 py-0.5 text-[8px] font-black text-green-300 sm:px-2 sm:text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,.9)]" />
                En línea
              </span>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.68rem] font-bold text-white/68 sm:mt-3 sm:gap-2 sm:text-sm">
              {profileUser?.city || "Malabo"}
              <span className="hidden sm:inline">, Bioko Norte</span>
              {profileUser?.country ? (
                <>
                  <span className="text-white/30">·</span>
                  <span>🇬🇶 {profileUser.country}</span>
                </>
              ) : null}
            </p>
            <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:mt-5 sm:gap-2 sm:pb-1">
              <MoodPill icon={Sparkles} title="Motivado 😎" color="purple" />
              <MoodPill icon={Music} title="Me Conozco" detail="Roku" color="pink" />
              <MoodPill icon={LinkIcon} title={`linktr.ee/${profileUser?.username || "bucan"}`} color="cyan" />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="px-3 sm:px-0">
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

        <section className="-mt-1 rounded-[1.1rem] border border-white/10 bg-white/[0.055] p-1.5 shadow-cyan backdrop-blur-2xl sm:rounded-[1.6rem] sm:p-2">
          <ProfileStatBar
            stats={[
              { label: "Publicaciones", value: posts.length },
              {
                label: "Seguidores",
                value: profileUser?.followers_count || 0,
                to: `/users/${profileUser?.username}/followers`,
              },
              {
                label: "Siguiendo",
                value: profileUser?.following_count || 0,
                to: `/users/${profileUser?.username}/following`,
              },
              { label: "Me gusta", value: likesReceived },
            ]}
          />

        <div className="mt-2">
          {isOwnProfile ? (
            <div className="grid grid-cols-4 gap-2">
              <motion.button
                className="col-span-2 h-9 rounded-[0.78rem] bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-[10px] font-black text-white shadow-cyan sm:h-12 sm:rounded-[1rem] sm:text-xs"
                type="button"
                onClick={() => setShowEditModal(true)}
                whileTap={{ scale: 0.96 }}
              >
                <span className="inline-flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Editar perfil
                </span>
              </motion.button>
              <Link
                className="flex h-9 items-center justify-center rounded-[0.78rem] border border-white/10 bg-white/7 text-white sm:h-12 sm:rounded-[1rem]"
                to="/stories/create"
                aria-label="Crear story"
              >
                <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
              <motion.button
                className="flex h-9 items-center justify-center rounded-[0.78rem] border border-liveRed/35 bg-liveRed/10 text-liveRed sm:h-12 sm:rounded-[1rem]"
                type="button"
                onClick={logout}
                whileTap={{ scale: 0.96 }}
                aria-label="Salir"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_3.25rem] gap-2">
              <motion.button
                className={`h-9 rounded-[0.78rem] text-[10px] font-black disabled:opacity-60 sm:h-12 sm:rounded-[1rem] sm:text-xs ${
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
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {isUpdatingFollow ? "..." : profileUser?.is_following ? "Dejar" : "Seguir"}
                </span>
              </motion.button>
              <motion.button
                className="h-9 rounded-[0.78rem] border border-white/10 bg-white/7 text-[10px] font-black text-white disabled:opacity-60 sm:h-12 sm:rounded-[1rem] sm:text-xs"
                type="button"
                onClick={handleStartChat}
                disabled={isStartingChat}
                whileTap={{ scale: 0.96 }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {isStartingChat ? "..." : "Mensaje"}
                </span>
              </motion.button>
              <motion.button
                className="flex h-9 items-center justify-center rounded-[0.78rem] border border-white/10 bg-white/7 text-white sm:h-12 sm:rounded-[1rem]"
                type="button"
                aria-label="Reportar usuario"
                onClick={() => (isAuthenticated ? setShowReportModal(true) : navigate("/login"))}
                whileTap={{ scale: 0.96 }}
              >
                <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </motion.button>
            </div>
          )}
        </div>
        </section>

        <section className="mt-2 rounded-[1.15rem] border border-white/10 bg-white/[0.055] p-1.5 shadow-cyan backdrop-blur-2xl sm:mt-4 sm:rounded-[1.6rem] sm:p-3">
          <div className="grid grid-cols-[minmax(0,1.08fr)_minmax(7.2rem,.92fr)] gap-1.5 sm:gap-3 lg:grid-cols-[1fr_16rem]">
            <AboutCard
              profileUser={profileUser}
              isOwnProfile={isOwnProfile}
              onEdit={() => setShowEditModal(true)}
            />
            <LocationMusicCards profileUser={profileUser} />
          </div>
        </section>

        <div className="mt-2 sm:mt-3">
          <AchievementsStrip posts={posts} profileUser={profileUser} likesReceived={likesReceived} />
        </div>

        {isOwnProfile ? (
          <div className="mt-3 overflow-hidden rounded-[1.3rem]">
            <PushSettings />
          </div>
        ) : null}

        <div className="sticky top-0 z-10 -mx-3 mt-2 border-y border-white/8 bg-night/82 px-2 py-1 backdrop-blur-2xl sm:mx-0 sm:mt-3 sm:rounded-[1.2rem] sm:border sm:px-4 sm:py-2">
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  className={`relative inline-flex h-8 shrink-0 items-center gap-1 px-2 text-[9px] font-black uppercase transition sm:h-10 sm:gap-1.5 sm:px-3 sm:text-[11px] ${
                    isActive ? "text-white" : "text-white/50"
                  }`}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {isActive ? (
                    <motion.span
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-neonPink shadow-neon"
                      layoutId="profile-tab"
                    />
                  ) : null}
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          className="mt-2 sm:mt-3"
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {activeTab === "posts" ? <ProfilePostGrid posts={posts} /> : null}
          {activeTab === "media" ? <MediaGrid posts={posts} /> : null}
          {activeTab === "saved" ? (
            <EmptyState title="Guardados todavía no está activo" description="Esta sección queda preparada para guardar publicaciones." />
          ) : null}
          {activeTab === "map" ? (
            <EmptyState title="Mapa del perfil" description="Las publicaciones con ubicación aparecerán aquí." />
          ) : null}
          {activeTab === "likes" ? (
            <EmptyState title={`${formatCompact(likesReceived)} me gusta recibidos`} description="Los likes detallados se conectarán cuando exista el endpoint específico." />
          ) : null}
          {activeTab === "badges" ? (
            <AchievementsStrip posts={posts} profileUser={profileUser} likesReceived={likesReceived} />
          ) : null}
        </motion.div>

        <Link
          className="fixed bottom-24 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-neonPink text-2xl font-light text-white shadow-neon sm:hidden"
          to="/create"
          aria-label="Publicar"
        >
          +
        </Link>
      </div>

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
