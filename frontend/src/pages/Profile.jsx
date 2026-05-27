import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AtSign,
  Bookmark,
  Camera,
  Car,
  Check,
  Compass,
  Film,
  Flag,
  Flame,
  Heart,
  Image as ImageIcon,
  LogOut,
  MapPin,
  MessageCircle,
  Music,
  Pencil,
  Play,
  PlusCircle,
  Save,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import PushSettings from "../components/push/PushSettings.jsx";
import { ProfileSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { optimizeCloudinaryImage } from "../utils/media.js";
import { MEDIA_UPLOAD_TIMEOUT_MS } from "../utils/uploads.js";

const tabs = [
  { id: "posts", label: "Publicaciones", icon: Sparkles },
  { id: "media", label: "Reels", icon: Film },
  { id: "saved", label: "Guardados", icon: Bookmark },
  { id: "map", label: "Mapa", icon: MapPin },
  { id: "likes", label: "Likes", icon: Heart },
];

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "contenido ofensivo", label: "Contenido ofensivo" },
  { value: "acoso", label: "Acoso" },
  { value: "información falsa", label: "Información falsa" },
  { value: "otro", label: "Otro" },
];

const PROFILE_THEME_OPTIONS = [
  {
    id: "neon",
    label: "Neón",
    preview: "from-neonPink via-fiestaPurple to-neonCyan",
    hero:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(255,79,216,.72),transparent_25%),radial-gradient(circle_at_62%_5%,rgba(0,217,255,.44),transparent_28%),linear-gradient(180deg,rgba(124,58,237,.42),rgba(7,11,20,.96)_68%)]",
  },
  {
    id: "cyan",
    label: "Cyan",
    preview: "from-neonCyan via-blue-500 to-fiestaPurple",
    hero:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(0,217,255,.72),transparent_25%),radial-gradient(circle_at_72%_8%,rgba(59,130,246,.46),transparent_30%),linear-gradient(180deg,rgba(14,165,233,.34),rgba(7,11,20,.96)_68%)]",
  },
  {
    id: "pink",
    label: "Rosa",
    preview: "from-neonPink via-fuchsia-500 to-liveRed",
    hero:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(255,79,216,.78),transparent_25%),radial-gradient(circle_at_72%_8%,rgba(255,48,64,.45),transparent_30%),linear-gradient(180deg,rgba(190,24,93,.42),rgba(7,11,20,.96)_68%)]",
  },
  {
    id: "gold",
    label: "Oro",
    preview: "from-neonYellow via-neonOrange to-neonPink",
    hero:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(255,216,77,.72),transparent_25%),radial-gradient(circle_at_72%_8%,rgba(249,115,22,.42),transparent_30%),linear-gradient(180deg,rgba(180,83,9,.35),rgba(7,11,20,.96)_68%)]",
  },
  {
    id: "dark",
    label: "Oscuro",
    preview: "from-slate-900 via-slate-700 to-black",
    hero:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(148,163,184,.28),transparent_25%),radial-gradient(circle_at_72%_8%,rgba(15,23,42,.62),transparent_30%),linear-gradient(180deg,rgba(15,23,42,.78),rgba(7,11,20,.96)_68%)]",
  },
];

const DEFAULT_PROFILE_PREFERENCES = {
  allow_messages: true,
  cover_filter: "normal",
  cover_overlay: 62,
  cover_position: "center",
  cover_url: "",
  cover_zoom: 100,
  profile_visibility: "public",
  show_online_status: true,
  theme: "neon",
};

const COVER_POSITION_OPTIONS = [
  { id: "center", label: "Centro", className: "object-center" },
  { id: "top", label: "Arriba", className: "object-top" },
  { id: "bottom", label: "Abajo", className: "object-bottom" },
];

const COVER_FILTER_OPTIONS = [
  { id: "normal", label: "Natural", className: "" },
  { id: "neon", label: "Neón", className: "saturate-150 contrast-110" },
  { id: "night", label: "Noche", className: "brightness-75 contrast-125 saturate-125" },
  { id: "warm", label: "Cálido", className: "sepia-[.22] saturate-125 contrast-105" },
  { id: "soft", label: "Suave", className: "brightness-110 saturate-90" },
];

function getCoverPositionClass(position) {
  return COVER_POSITION_OPTIONS.find((item) => item.id === position)?.className || "object-center";
}

function getCoverFilterClass(filter) {
  return COVER_FILTER_OPTIONS.find((item) => item.id === filter)?.className || "";
}

function getProfilePreferenceKey(username) {
  return `bucan-profile-preferences:${username || "me"}`;
}

function loadProfilePreferences(username) {
  if (typeof window === "undefined") return DEFAULT_PROFILE_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(getProfilePreferenceKey(username));
    return raw ? { ...DEFAULT_PROFILE_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PROFILE_PREFERENCES;
  } catch {
    return DEFAULT_PROFILE_PREFERENCES;
  }
}

function saveProfilePreferences(username, preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getProfilePreferenceKey(username),
    JSON.stringify({ ...DEFAULT_PROFILE_PREFERENCES, ...preferences })
  );
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

function formatCompact(value) {
  return new Intl.NumberFormat("es", {
    notation: Number(value || 0) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function ProfileAvatar({ profileUser, initial, size = "large", canCreateStory = false, onCreateStory }) {
  const holdTimerRef = useRef(null);
  const didLongPressRef = useRef(false);
  const isHero = size === "large";
  const sizeClass = isHero ? "h-[8.15rem] w-[8.15rem] sm:h-44 sm:w-44" : "h-11 w-11";
  const AvatarShell = canCreateStory ? "button" : "div";

  function clearCreateStoryHold() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function startCreateStoryHold() {
    if (!canCreateStory || !onCreateStory) return;
    clearCreateStoryHold();
    didLongPressRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      onCreateStory();
    }, 620);
  }

  function handleAvatarClick(event) {
    if (didLongPressRef.current) {
      event.preventDefault();
      didLongPressRef.current = false;
    }
  }

  function handleAvatarKeyDown(event) {
    if (!canCreateStory || !onCreateStory) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCreateStory();
    }
  }

  return (
    <AvatarShell
      aria-label={canCreateStory ? "Mantener pulsado para crear estado" : undefined}
      className={`relative flex ${sizeClass} items-center justify-center rounded-full bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan p-[3px] shadow-[0_0_24px_rgba(255,79,216,.5),0_0_34px_rgba(0,217,255,.26)] transition active:scale-[0.98] sm:p-1 ${
        canCreateStory ? "cursor-pointer select-none" : ""
      }`}
      type={canCreateStory ? "button" : undefined}
      onClick={canCreateStory ? handleAvatarClick : undefined}
      onContextMenu={canCreateStory ? (event) => event.preventDefault() : undefined}
      onKeyDown={canCreateStory ? handleAvatarKeyDown : undefined}
      onPointerCancel={canCreateStory ? clearCreateStoryHold : undefined}
      onPointerDown={canCreateStory ? startCreateStoryHold : undefined}
      onPointerLeave={canCreateStory ? clearCreateStoryHold : undefined}
      onPointerUp={canCreateStory ? clearCreateStoryHold : undefined}
    >
      <div className="absolute -inset-2 rounded-full bg-neonPink/18 blur-xl" />
      {profileUser?.avatar_url ? (
        <img
          alt={profileUser.display_name}
          className="relative h-full w-full rounded-full border-[3px] border-night object-cover sm:border-4"
          src={profileUser.avatar_url}
        />
      ) : (
        <div
          className={`relative flex h-full w-full items-center justify-center rounded-full border-[3px] border-night bg-gradient-to-br from-fiestaPurple via-neonPink to-neonCyan font-black text-white sm:border-4 ${
            isHero ? "text-4xl sm:text-5xl" : "text-base"
          }`}
        >
          {initial.toUpperCase()}
        </div>
      )}
      {canCreateStory ? (
        <span className="absolute -left-0.5 bottom-2 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-night bg-neonPink text-white shadow-[0_0_18px_rgba(255,79,216,.82)] sm:h-8 sm:w-8">
          <PlusCircle className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
        </span>
      ) : null}
      <span className="absolute right-2 bottom-3 h-4 w-4 rounded-full border-[3px] border-night bg-green-400 shadow-[0_0_18px_rgba(34,197,94,.85)] sm:h-5 sm:w-5" />
    </AvatarShell>
  );
}

function CompactProfileStats({ stats }) {
  return (
    <motion.div
      className="mt-1 grid w-[8.15rem] grid-cols-2 gap-1 sm:w-44"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {stats.map((stat) => {
        const content = (
          <div className="rounded-[0.7rem] border border-white/10 bg-night/74 px-1.5 py-1 text-center shadow-[0_0_14px_rgba(0,217,255,.12)] backdrop-blur-xl sm:rounded-[0.85rem] sm:px-2 sm:py-1.5">
            <p className="text-[10px] font-black leading-none text-white sm:text-sm">{formatCompact(stat.value)}</p>
            <p className="mt-0.5 truncate text-[6.5px] font-black uppercase tracking-[0.04em] text-white/48 sm:text-[9px]">
              {stat.label}
            </p>
          </div>
        );

        return stat.to ? (
          <Link key={stat.label} to={stat.to}>
            {content}
          </Link>
        ) : (
          <div key={stat.label}>{content}</div>
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
            <span className="mr-1.5 sm:mr-2">{["💼", "✨", "🌍"][index]}</span>
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

function LocationCard({ profileUser }) {
  return (
    <section className="h-full overflow-hidden rounded-[1rem] border border-white/8 bg-black/20 p-2 backdrop-blur-xl sm:rounded-[1.2rem] sm:p-3">
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
  );
}

function MusicCard() {
  return (
    <section className="rounded-[1rem] border border-white/8 bg-black/20 p-2 backdrop-blur-xl sm:rounded-[1.2rem] sm:p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[9px] font-black uppercase tracking-[0.1em] text-white/72 sm:text-xs">Sonando ahora</h2>
        <span className="text-[9px] font-black text-neonCyan sm:text-[11px]">Ver todo</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 sm:mt-3 sm:gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[0.75rem] bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan sm:h-14 sm:w-14 sm:rounded-[0.9rem]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black text-white sm:text-sm">Me Conozco</p>
          <p className="text-[8px] font-semibold text-white/52 sm:text-xs">Roku</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-neonCyan/15 bg-neonCyan/8 px-2 py-1 text-neonCyan sm:gap-2 sm:px-3 sm:py-1.5">
          <Music className="h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.12em] sm:text-[10px]">Play</span>
        </div>
      </div>
    </section>
  );
}

function getProfileBadges(posts, profileUser, likesReceived) {
  return [
    { label: "Explorador", level: Math.max(1, Math.min(5, Math.ceil(posts.length / 3) || 1)), icon: Compass, color: "cyan" },
    { label: "Empresario", level: profileUser?.role === "admin" ? 5 : 2, icon: Car, color: "yellow" },
    { label: "Creador", level: Math.max(1, Math.min(5, Math.ceil(posts.length / 2) || 1)), icon: ImageIcon, color: "pink" },
    { label: "Popular", level: Math.max(1, Math.min(5, Math.ceil(likesReceived / 10) || 1)), icon: Flame, color: "pink" },
    { label: "Verificado", level: profileUser?.is_verified ? 5 : 1, icon: Check, color: "cyan" },
  ];
}

function badgeTone(color) {
  if (color === "yellow") {
    return "from-neonYellow/28 to-neonOrange/18 text-neonYellow";
  }
  if (color === "cyan") {
    return "from-neonCyan/24 to-fiestaPurple/18 text-neonCyan";
  }
  return "from-neonPink/26 to-fiestaPurple/18 text-neonPink";
}

function CompactAchievementsButton({ badges, onClick }) {
  const topLevel = Math.max(...badges.map((badge) => badge.level));
  return (
    <motion.button
      className="mt-1.5 grid w-full grid-cols-[1fr_auto] items-center gap-1 rounded-full border border-white/10 bg-night/72 px-2 py-1 text-left shadow-cyan backdrop-blur-xl active:scale-[0.98]"
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <span className="min-w-0">
        <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-neonCyan">Logros</span>
        <span className="block truncate text-[9px] font-black text-white">Nivel {topLevel}</span>
      </span>
      <span className="flex -space-x-1">
        {badges.slice(0, 3).map((badge) => {
          const Icon = badge.icon;
          return (
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br ${badgeTone(badge.color)} shadow-neon`}
              key={badge.label}
            >
              <Icon className="h-3 w-3" />
            </span>
          );
        })}
      </span>
    </motion.button>
  );
}

function AchievementsModal({ badges, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 px-4 pb-4 backdrop-blur-xl sm:items-center sm:pb-0">
      <motion.section
        className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-night/96 p-4 text-white shadow-neon"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neonCyan">Progreso</p>
            <h2 className="mt-1 text-2xl font-black">Tus logros</h2>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/7 text-xl font-light"
            type="button"
            onClick={onClose}
            aria-label="Cerrar logros"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {badges.map((badge) => {
            const Icon = badge.icon;
            const percent = Math.min(100, Math.max(20, badge.level * 20));
            return (
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.045] p-3" key={badge.label}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[0.9rem] border border-white/10 bg-gradient-to-br ${badgeTone(badge.color)} shadow-neon`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black">{badge.label}</p>
                      <p className="text-xs font-black text-white/64">Nivel {badge.level}/5</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink shadow-neon"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>
    </div>
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

function ProfileEditModal({ profileUser, onClose, onPreferencesSaved, onSaved, preferences }) {
  const { completeOnboarding } = useAuth();
  const [activeEditTab, setActiveEditTab] = useState("basic");
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [styleForm, setStyleForm] = useState({
    ...DEFAULT_PROFILE_PREFERENCES,
    ...preferences,
  });
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarPreview = form.avatar_url.trim();
  const fieldClass =
    "h-10 w-full rounded-[0.85rem] border border-white/10 bg-white/7 pl-9 pr-3 text-[12px] font-bold text-white outline-none transition placeholder:text-white/30 focus:border-neonCyan focus:bg-neonCyan/8 sm:h-11 sm:text-sm";
  const tabs = [
    { id: "basic", label: "Básico", icon: UserRound },
    { id: "style", label: "Estilo", icon: Sparkles },
    { id: "privacy", label: "Privacidad", icon: ShieldCheck },
  ];

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function updatePreference(name, value) {
    setStyleForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function getProfilePayload(nextForm = form) {
    return {
      ...nextForm,
      username: nextForm.username.trim().toLowerCase(),
      display_name: nextForm.display_name.trim(),
      city: nextForm.city.trim(),
      country: nextForm.country.trim(),
      bio: nextForm.bio.trim(),
      avatar_url: nextForm.avatar_url.trim() || null,
    };
  }

  async function saveProfile(nextForm = form) {
    const updated = await completeOnboarding(getProfilePayload(nextForm));
    onSaved(updated);
    return updated;
  }

  async function handleAvatarFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo puedes usar imágenes JPG, PNG o WEBP como foto de perfil.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("La foto de perfil debe pesar 10 MB o menos.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setError("");
      setIsUploadingAvatar(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: MEDIA_UPLOAD_TIMEOUT_MS,
      });
      const nextForm = { ...form, avatar_url: response.data.url };
      setForm(nextForm);
      await saveProfile(nextForm);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleCoverFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo puedes usar imágenes JPG, PNG o WEBP como portada.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("La portada debe pesar 10 MB o menos.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setError("");
      setCoverUploadProgress(0);
      setIsUploadingCover(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: MEDIA_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setCoverUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });
      setStyleForm((current) => ({
        ...current,
        cover_url: response.data.url,
      }));
      setCoverUploadProgress(100);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await saveProfile();
      onPreferencesSaved(styleForm);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-night text-white">
      <motion.form
        className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden border-x border-white/8 bg-night text-white shadow-[0_0_42px_rgba(0,217,255,.18),0_0_70px_rgba(255,79,216,.16)]"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={handleSubmit}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,79,216,.24),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(0,217,255,.22),transparent_28%)]" />
        <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-white/8 bg-night/72 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)] backdrop-blur-2xl sm:px-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neonCyan">
                Perfil
              </p>
              <h2 className="mt-1 text-2xl font-black leading-none text-white">Editar perfil</h2>
              <p className="mt-1 text-xs font-semibold text-white/52">
                Actualiza cómo te ve la comunidad
              </p>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white"
              type="button"
              onClick={onClose}
              aria-label="Cerrar editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-3 sm:px-5">

          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-3 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan p-[3px] shadow-neon">
                {avatarPreview ? (
                  <img
                    alt="Avatar"
                    className="h-full w-full rounded-full border-[3px] border-night object-cover"
                    src={avatarPreview}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-night bg-gradient-to-br from-fiestaPurple via-neonPink to-neonCyan text-2xl font-black">
                    {(form.display_name || form.username || "B").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -right-1 bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-night bg-neonPink text-white shadow-neon">
                  <Pencil className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">{form.display_name || "Tu perfil"}</p>
                <p className="truncate text-sm font-bold text-white/56">@{form.username || "usuario"}</p>
                <button
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-neonCyan/25 bg-neonCyan/10 px-3 py-1.5 text-[11px] font-black text-neonCyan"
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {isUploadingAvatar ? "Subiendo..." : "Cambiar foto"}
                </button>
                <input
                  ref={avatarInputRef}
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFileSelected}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/20 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeEditTab === tab.id;
              return (
                <button
                  className={`flex h-9 items-center justify-center gap-1 rounded-full text-[10px] font-black transition ${
                    isActive
                      ? "bg-gradient-to-r from-neonPink via-fiestaPurple to-neonCyan text-white shadow-neon"
                      : "text-white/54"
                  }`}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditTab(tab.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeEditTab === "basic" ? (
            <div className="mt-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["display_name", "Nombre visible", "Tu nombre", UserRound],
                  ["username", "Usuario", "bucan_user", AtSign],
                  ["city", "Ciudad", "Malabo", MapPin],
                  ["country", "País", "Guinea Ecuatorial", Flag],
                ].map(([name, label, placeholder, Icon]) => (
                <label className="min-w-0" key={name}>
                  <span className="mb-1 block truncate text-[10px] font-black text-white/72">{label}</span>
                  <span className="relative block">
                    <Icon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neonCyan" />
                    <input
                      className={fieldClass}
                      name={name}
                      value={form[name]}
                      onChange={updateField}
                      placeholder={placeholder}
                      required
                    />
                    {name === "username" && form.username.trim().length >= 3 ? (
                      <Check className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-green-400" />
                    ) : null}
                  </span>
                </label>
                ))}
              </div>

              <label className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/72">Biografía</span>
                  <span className="text-[10px] font-black text-white/38">{form.bio.length}/300</span>
                </div>
                <textarea
                  className="min-h-16 w-full resize-none rounded-[0.95rem] border border-white/10 bg-white/7 px-3 py-2.5 text-[12px] font-bold text-white outline-none transition placeholder:text-white/30 focus:border-neonCyan focus:bg-neonCyan/8 sm:text-sm"
                  maxLength={300}
                  name="bio"
                  value={form.bio}
                  onChange={updateField}
                  placeholder="Cuéntale algo a tu gente."
                />
              </label>

            </div>
          ) : null}

          {activeEditTab === "style" ? (
            <div className="mt-4 space-y-3">
              <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.045]">
                <div className="relative h-24">
                  {styleForm.cover_url ? (
                    <img
                      alt="Portada"
                      className={`absolute inset-0 h-full w-full object-cover ${getCoverPositionClass(
                        styleForm.cover_position
                      )} ${getCoverFilterClass(styleForm.cover_filter)}`}
                      src={styleForm.cover_url}
                      style={{ transform: `scale(${Number(styleForm.cover_zoom || 100) / 100})` }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 ${
                      PROFILE_THEME_OPTIONS.find((theme) => theme.id === styleForm.theme)?.hero ||
                      PROFILE_THEME_OPTIONS[0].hero
                    }`}
                    style={{ opacity: styleForm.cover_url ? Math.max(0.18, Number(styleForm.cover_overlay) / 100) : 1 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-night/86 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/62">
                      Portada
                    </p>
                    <p className="text-sm font-black text-white">Vista previa del perfil</p>
                  </div>
                </div>
                <div className="p-3">
                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-neonCyan/25 bg-neonCyan/10 text-xs font-black text-neonCyan disabled:opacity-60"
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {isUploadingCover ? "Subiendo portada..." : styleForm.cover_url ? "Cambiar portada" : "Subir portada"}
                  </button>
                  <input
                    ref={coverInputRef}
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverFileSelected}
                  />
                  {isUploadingCover || coverUploadProgress > 0 ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-black text-white/52">
                        <span>Carga de imagen</span>
                        <span>{coverUploadProgress}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink shadow-neon transition-all"
                          style={{ width: `${coverUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {styleForm.cover_url ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.045] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-white/72">Editar portada</p>
                    <button
                      className="text-[10px] font-black text-neonPink"
                      type="button"
                      onClick={() =>
                        setStyleForm((current) => ({
                          ...current,
                          cover_filter: "normal",
                          cover_overlay: 62,
                          cover_position: "center",
                          cover_zoom: 100,
                        }))
                      }
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/44">Encuadre</p>
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                      {COVER_POSITION_OPTIONS.map((option) => (
                        <button
                          className={`h-8 rounded-full text-[10px] font-black transition ${
                            styleForm.cover_position === option.id
                              ? "bg-neonCyan text-night shadow-cyan"
                              : "text-white/52"
                          }`}
                          key={option.id}
                          type="button"
                          onClick={() => updatePreference("cover_position", option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/44">Filtro</p>
                    <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto">
                      {COVER_FILTER_OPTIONS.map((option) => (
                        <button
                          className={`min-w-[4.6rem] rounded-[0.9rem] border p-1.5 transition ${
                            styleForm.cover_filter === option.id
                              ? "border-neonPink bg-neonPink/10 shadow-neon"
                              : "border-white/8 bg-black/20"
                          }`}
                          key={option.id}
                          type="button"
                          onClick={() => updatePreference("cover_filter", option.id)}
                        >
                          <span
                            className={`block h-8 rounded-[0.6rem] bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan ${option.className}`}
                          />
                          <span className="mt-1 block text-[9px] font-black text-white/72">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="mt-3 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/44">
                        Zoom
                      </span>
                      <span className="text-[10px] font-black text-neonCyan">{styleForm.cover_zoom}%</span>
                    </div>
                    <input
                      className="mt-2 w-full accent-neonCyan"
                      type="range"
                      min="100"
                      max="135"
                      value={styleForm.cover_zoom}
                      onChange={(event) => updatePreference("cover_zoom", Number(event.target.value))}
                    />
                  </label>

                  <label className="mt-3 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/44">
                        Fusión con tema
                      </span>
                      <span className="text-[10px] font-black text-neonCyan">{styleForm.cover_overlay}%</span>
                    </div>
                    <input
                      className="mt-2 w-full accent-neonPink"
                      type="range"
                      min="15"
                      max="90"
                      value={styleForm.cover_overlay}
                      onChange={(event) => updatePreference("cover_overlay", Number(event.target.value))}
                    />
                  </label>
                </div>
              ) : null}

              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.045] p-3">
                <p className="text-xs font-black text-white/72">Tema del perfil</p>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {PROFILE_THEME_OPTIONS.map((theme) => {
                    const isSelected = styleForm.theme === theme.id;
                    return (
                      <button
                        className={`rounded-[0.9rem] border p-1.5 transition ${
                          isSelected ? "border-neonPink bg-neonPink/10 shadow-neon" : "border-white/8 bg-black/20"
                        }`}
                        key={theme.id}
                        type="button"
                        onClick={() => updatePreference("theme", theme.id)}
                      >
                        <span className={`block h-8 rounded-[0.65rem] bg-gradient-to-br ${theme.preview}`} />
                        <span className="mt-1 block truncate text-[9px] font-black text-white/72">
                          {theme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {activeEditTab === "privacy" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.045] p-3">
                <p className="text-xs font-black text-white/72">Visibilidad del perfil</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                  {[
                    ["public", "Público"],
                    ["followers", "Seguidores"],
                    ["private", "Privado"],
                  ].map(([value, label]) => (
                    <button
                      className={`h-8 rounded-full text-[10px] font-black transition ${
                        styleForm.profile_visibility === value
                          ? "bg-neonCyan text-night shadow-cyan"
                          : "text-white/52"
                      }`}
                      key={value}
                      type="button"
                      onClick={() => updatePreference("profile_visibility", value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.045] p-3">
                {[
                  ["show_online_status", "Mostrar estado en línea", "Permite que otros vean si estás activo."],
                  ["allow_messages", "Permitir mensajes", "Otros usuarios podrán abrir chat contigo."],
                ].map(([name, title, description]) => (
                  <button
                    className="flex w-full items-center justify-between gap-3 border-b border-white/8 py-2.5 text-left last:border-b-0"
                    key={name}
                    type="button"
                    onClick={() => updatePreference(name, !styleForm[name])}
                  >
                    <span>
                      <span className="block text-xs font-black text-white">{title}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold leading-4 text-white/46">
                        {description}
                      </span>
                    </span>
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                        styleForm[name] ? "border-neonCyan/40 bg-neonCyan/30" : "border-white/10 bg-white/8"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                          styleForm[name] ? "left-6" : "left-1"
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.045]">
                <div className="flex items-center gap-3 px-3 pt-3">
                  <ShieldCheck className="h-5 w-5 text-neonCyan" />
                  <div>
                    <p className="text-sm font-black">Notificaciones push</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-white/46">
                      Activa o prueba avisos desde el perfil.
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <PushSettings />
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-center text-[11px] font-bold text-white/42">
            Los cambios se verán al instante
          </p>

          {error ? (
            <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white">
              {error}
            </div>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-night/86 px-4 py-3 backdrop-blur-2xl">
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
            <button
              className="h-12 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neonPink via-fiestaPurple to-neonCyan text-sm font-black text-white shadow-neon disabled:opacity-60"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
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
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState(DEFAULT_PROFILE_PREFERENCES);

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

  useEffect(() => {
    if (!targetUsername) return;
    setProfilePreferences(loadProfilePreferences(targetUsername));
  }, [targetUsername]);

  useEffect(() => {
    if (!showEditModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showEditModal]);

  function handlePreferencesSaved(nextPreferences) {
    const merged = { ...DEFAULT_PROFILE_PREFERENCES, ...nextPreferences };
    saveProfilePreferences(targetUsername, merged);
    setProfilePreferences(merged);
  }

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
  const badges = getProfileBadges(posts, profileUser, likesReceived);
  const profileStats = [
    { label: "Publicaciones", value: posts.length },
    {
      label: "Seguidores",
      value: profileUser?.followers_count || 0,
      to: `/users/${profileUser?.username}/followers`,
    },
  ];
  const activeTheme =
    PROFILE_THEME_OPTIONS.find((theme) => theme.id === profilePreferences.theme) ||
    PROFILE_THEME_OPTIONS[0];

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
        {profilePreferences.cover_url ? (
          <img
            alt="Portada del perfil"
            className={`absolute inset-0 h-full w-full object-cover ${getCoverPositionClass(
              profilePreferences.cover_position
            )} ${getCoverFilterClass(profilePreferences.cover_filter)}`}
            src={profilePreferences.cover_url}
            style={{ transform: `scale(${Number(profilePreferences.cover_zoom || 100) / 100})` }}
          />
        ) : null}
        <div
          className={`absolute inset-0 ${activeTheme.hero}`}
          style={{
            opacity: profilePreferences.cover_url
              ? Math.max(0.18, Number(profilePreferences.cover_overlay || 62) / 100)
              : 1,
          }}
        />
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
            <ProfileAvatar
              profileUser={profileUser}
              initial={initial}
              canCreateStory={isOwnProfile}
              onCreateStory={() => navigate("/stories/create")}
            />
            <CompactAchievementsButton
              badges={badges}
              onClick={() => setShowAchievementsModal(true)}
            />
            <CompactProfileStats stats={profileStats} />
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

          <div className="ml-[8.7rem] min-h-[10rem] pt-2 sm:ml-48 sm:min-h-[15rem] sm:pt-1">
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
                {profilePreferences.show_online_status ? "En línea" : "Oculto"}
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
            {profileUser?.bio ? (
              <p className="mt-1.5 line-clamp-2 max-w-[15rem] text-[0.68rem] font-semibold leading-snug text-white/78 sm:mt-2 sm:max-w-[28rem] sm:text-sm">
                {profileUser.bio}
              </p>
            ) : null}
            <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:mt-5 sm:gap-2 sm:pb-1">
              <MoodPill icon={Sparkles} title="Motivado 😎" color="purple" />
              <MoodPill icon={Music} title="Me Conozco" detail="Roku" color="pink" />
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
        <div>
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
          <div className="grid gap-1.5 sm:gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.4rem,0.82fr)] items-stretch gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.82fr)] sm:gap-3">
              <AboutCard
                profileUser={profileUser}
                isOwnProfile={isOwnProfile}
                onEdit={() => setShowEditModal(true)}
              />
              <LocationCard profileUser={profileUser} />
            </div>
            <MusicCard />
          </div>
        </section>

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
          preferences={profilePreferences}
          onClose={() => setShowEditModal(false)}
          onPreferencesSaved={handlePreferencesSaved}
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

      {showAchievementsModal ? (
        <AchievementsModal badges={badges} onClose={() => setShowAchievementsModal(false)} />
      ) : null}
    </section>
  );
}

export default Profile;
