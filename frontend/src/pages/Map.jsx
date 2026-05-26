import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Compass,
  Filter,
  Flame,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Radio,
  Search,
  Share2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import apiClient from "../api/client.js";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const MALABO_CENTER = [3.7523, 8.7741];
const radiusOptions = [2, 5, 10, 25];

const filters = [
  { value: "", label: "Todos", icon: Sparkles },
  { value: "live", label: "Lives", icon: Radio },
  { value: "evento", label: "Eventos", icon: CalendarDays },
  { value: "fiesta", label: "Fiestas", icon: Flame },
  { value: "bar", label: "Bares", icon: MapPin },
  { value: "ambiente", label: "Ambiente", icon: Zap },
  { value: "cumpleaños", label: "Cumpleaños", icon: Sparkles },
];

const markerThemes = {
  normal: { color: "#00D9FF", emoji: "•", label: "Normal" },
  video: { color: "#FF4FD8", emoji: "▶", label: "Vídeo" },
  fiesta: { color: "#7C3AED", emoji: "✦", label: "Fiesta" },
  cumpleaños: { color: "#FFD84D", emoji: "★", label: "Cumpleaños" },
  evento: { color: "#FFD84D", emoji: "◆", label: "Evento" },
  live: { color: "#FF3040", emoji: "●", label: "Live" },
  bar: { color: "#00D9FF", emoji: "◆", label: "Bar" },
  ambiente: { color: "#7C3AED", emoji: "✦", label: "Ambiente" },
  concierto: { color: "#FF4FD8", emoji: "♪", label: "Concierto" },
  meetup: { color: "#00D9FF", emoji: "◆", label: "Meetup" },
  deporte: { color: "#17F56B", emoji: "•", label: "Deporte" },
  otro: { color: "#FFFFFF", emoji: "•", label: "Otro" },
};

function getMarkerType(item) {
  if (item.source_type === "live") return "live";
  if (item.source_type === "event") return item.category || "evento";
  return item.type || "normal";
}

function getMarkerTheme(item) {
  const type = getMarkerType(item);
  return markerThemes[type] || markerThemes.normal;
}

function createMarkerIcon(item) {
  const theme = getMarkerTheme(item);
  const isLive = getMarkerType(item) === "live";
  const size = isLive ? 46 : 38;
  const badge = isLive
    ? `<span style="position:absolute;right:-9px;top:-8px;border-radius:999px;background:#FF3040;color:white;font-size:8px;font-weight:900;padding:3px 5px;box-shadow:0 0 18px rgba(255,48,64,.8);">LIVE</span>`
    : "";
  const count = isLive
    ? item.viewers_count || 0
    : item.source_type === "event"
      ? item.attendees_count || 0
      : null;
  const countBadge =
    count !== null
      ? `<span style="position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);border-radius:999px;background:rgba(7,11,20,.88);border:1px solid rgba(255,255,255,.14);color:white;font-size:9px;font-weight:900;padding:2px 6px;backdrop-filter:blur(10px);">${count}</span>`
      : "";

  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:radial-gradient(circle at 35% 25%, rgba(255,255,255,.8), ${theme.color} 38%, rgba(7,11,20,.92) 74%);border:2px solid rgba(255,255,255,.84);box-shadow:0 0 0 7px ${theme.color}30,0 0 34px ${theme.color};display:flex;align-items:center;justify-content:center;color:white;font-size:${isLive ? 14 : 13}px;font-weight:900;${isLive ? "animation:live-pulse 1.4s ease-in-out infinite;" : ""}">${theme.emoji}${badge}${countBadge}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="position:relative;width:28px;height:28px;border-radius:999px;background:#00D9FF;border:4px solid #070B14;box-shadow:0 0 0 8px rgba(0,217,255,.18),0 0 28px rgba(0,217,255,.9);"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function getItemPath(item) {
  if (!item) return "/map";
  if (item.source_type === "event") return `/events/${item.id}`;
  if (item.source_type === "live") return `/lives/${item.id}`;
  return `/posts/${item.id}`;
}

function getItemCta(item) {
  if (item?.source_type === "event") return "Ir al evento";
  if (item?.source_type === "live") return "Entrar al live";
  return "Ver publicación";
}

function getCoverUrl(item) {
  return (
    item?.media?.url ||
    item?.cover_media?.url ||
    item?.thumbnail_url ||
    item?.live_data?.thumbnail_url ||
    ""
  );
}

function getStatText(item) {
  if (!item) return "";
  if (item.source_type === "event") return `${item.attendees_count || 0} apuntados`;
  if (item.source_type === "live") return `${item.viewers_count || 0} viendo`;
  return `${item.stats?.likes_count || 0} likes`;
}

function FitMarkers({ posts }) {
  const map = useMap();

  useEffect(() => {
    if (!posts.length) return;

    const bounds = L.latLngBounds(
      posts.map((post) => [post.location.lat, post.location.lng])
    );
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 14 });
  }, [map, posts]);

  return null;
}

function CenterOnUser({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;
    map.setView([userLocation.lat, userLocation.lng], 14);
  }, [map, userLocation]);

  return null;
}

function MarkerSkeleton() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[450]">
      <div className="absolute left-[18%] top-[28%] h-12 w-12 animate-pulse rounded-full bg-neonPink/25 shadow-neon" />
      <div className="absolute right-[20%] top-[42%] h-10 w-10 animate-pulse rounded-full bg-neonCyan/25 shadow-cyan" />
      <div className="absolute bottom-[26%] left-[42%] h-14 w-14 animate-pulse rounded-full bg-neonYellow/25" />
    </div>
  );
}

function HeatLegend({ markers }) {
  const livesCount = markers.filter((item) => getMarkerType(item) === "live").length;
  const eventsCount = markers.filter(
    (item) => item.source_type === "event" || getMarkerType(item) === "evento"
  ).length;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[460] rounded-[1.2rem] border border-white/10 bg-night/72 px-3 py-2 text-xs font-black text-white shadow-cyan backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-liveRed shadow-live" />
        {livesCount} lives
      </div>
      <div className="mt-1 flex items-center gap-2 text-white/68">
        <span className="h-2 w-2 rounded-full bg-neonYellow" />
        {eventsCount} eventos
      </div>
    </div>
  );
}

function BottomSheet({ item, onClose, onShare }) {
  if (!item) return null;

  const theme = getMarkerTheme(item);
  const location = [item.location?.city, item.location?.area].filter(Boolean).join(" · ");
  const coverUrl = getCoverUrl(item);
  const author = item.author_snapshot || item.creator_snapshot || {};

  return (
    <motion.aside
      className="fixed inset-x-3 bottom-24 z-[900] overflow-hidden rounded-[2rem] border border-white/10 bg-night/78 shadow-[0_24px_90px_rgba(0,0,0,.62)] backdrop-blur-2xl sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
      initial={{ opacity: 0, y: 80, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div
        className="absolute inset-x-0 top-0 h-32 blur-3xl"
        style={{
          background: `linear-gradient(90deg, ${theme.color}44, rgba(255,79,216,.22))`,
        }}
      />
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div className="h-24 w-24 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/7">
            {coverUrl ? (
              <img
                alt="Vista previa"
                className="h-full w-full object-cover"
                loading="lazy"
                src={coverUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neonCyan/24 via-fiestaPurple/22 to-neonPink/24">
                <MapPin className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-black uppercase"
                style={{
                  borderColor: `${theme.color}66`,
                  color: theme.color,
                  background: `${theme.color}18`,
                }}
              >
                {theme.label}
              </span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white"
                type="button"
                onClick={onClose}
                aria-label="Cerrar detalle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 truncate text-lg font-black text-white">
              {item.event_data?.title || item.title || author.display_name || "Ambiente"}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-neonCyan">
              @{author.username || "bucandey"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-white/58">
              {location ? <span>{location}</span> : null}
              <span>{formatRelativeDate(item.created_at)}</span>
              {item.distance_km !== null && item.distance_km !== undefined ? (
                <span>a {item.distance_km} km</span>
              ) : null}
            </div>
          </div>
        </div>

        {item.text || item.description ? (
          <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-white/78">
            {item.text || item.description}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[1.1rem] border border-white/10 bg-white/7 p-3 text-center">
            <p className="text-base font-black text-white">
              {getStatText(item).split(" ")[0]}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase text-white/42">
              movimiento
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/7 p-3 text-center">
            <p className="text-base font-black text-white">
              {item.stats?.comments_count || item.comments_count || 0}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase text-white/42">
              comentarios
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/7 p-3 text-center">
            <p className="text-base font-black text-white">
              {item.stats?.likes_count || item.likes_count || 0}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase text-white/42">likes</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <Link
            className="flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-sm font-black text-white shadow-cyan"
            to={getItemPath(item)}
          >
            {getItemCta(item)}
          </Link>
          <Link
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
            to={author.username ? `/users/${author.username}` : "/chat"}
            aria-label="Abrir chat o perfil"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
            type="button"
            onClick={() => onShare(item)}
            aria-label="Compartir"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function Map() {
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeType, setActiveType] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [shareNotice, setShareNotice] = useState("");

  const markers = useMemo(
    () =>
      posts.filter(
        (post) =>
          typeof post.location?.lat === "number" &&
          typeof post.location?.lng === "number"
      ),
    [posts]
  );

  const visibleMarkers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return markers;

    return markers.filter((item) => {
      const author = item.author_snapshot || item.creator_snapshot || {};
      return [
        item.text,
        item.title,
        item.description,
        item.location?.city,
        item.location?.area,
        author.username,
        author.display_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [markers, query]);

  const heatZones = useMemo(() => {
    const groups = new globalThis.Map();

    visibleMarkers.forEach((item) => {
      const key = `${item.location?.city || ""}-${item.location?.area || ""}`;
      const existing = groups.get(key) || {
        key,
        city: item.location?.city,
        area: item.location?.area,
        lat: 0,
        lng: 0,
        count: 0,
        liveCount: 0,
      };
      existing.lat += item.location.lat;
      existing.lng += item.location.lng;
      existing.count += 1;
      if (getMarkerType(item) === "live") existing.liveCount += 1;
      groups.set(key, existing);
    });

    return Array.from(groups.values())
      .filter((group) => group.count >= 2)
      .map((group) => ({
        ...group,
        center: [group.lat / group.count, group.lng / group.count],
        radius: Math.min(1200 + group.count * 260, 3600),
      }));
  }, [visibleMarkers]);

  useEffect(() => {
    async function loadMap() {
      try {
        setIsLoading(true);
        setError("");
        const params = { limit: 100 };
        if (activeType) params.type = activeType;
        if (nearbyMode && userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
          params.radius_km = radiusKm;
        }

        const [postsResponse, ambientResponse] = await Promise.all([
          apiClient.get("/map/posts", { params }),
          apiClient.get("/map/ambient"),
        ]);
        setPosts(postsResponse.data.items);
        setZones(ambientResponse.data.zones);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadMap();
  }, [activeType, nearbyMode, radiusKm, userLocation]);

  function handleNearMe() {
    setError("");

    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setNearbyMode(true);
        setIsLocating(false);
      },
      () => {
        setError(
          "No se pudo obtener tu ubicación. El mapa seguirá mostrando el ambiente general."
        );
        setNearbyMode(false);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function handleShare(item) {
    const url = `${window.location.origin}${getItemPath(item)}`;
    const title = item.title || item.event_data?.title || item.text || "BUCAN DEY";

    try {
      if (navigator.share) {
        await navigator.share({ title: "BUCAN DEY", text: title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNotice("Enlace copiado.");
      }
    } catch {
      setShareNotice("No se pudo compartir ahora.");
    }

    window.setTimeout(() => setShareNotice(""), 2500);
  }

  const activeFilter = filters.find((filter) => filter.value === activeType) || filters[0];

  return (
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden pb-6">
      <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-neonPink/16 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-40 h-56 w-56 rounded-full bg-neonCyan/14 blur-3xl" />

      <motion.header
        className="glass-panel relative z-20 rounded-[1.9rem] p-4 shadow-cyan"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonCyan">
              <Compass className="h-4 w-4" />
              Mapa de ambiente
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Mapa vivo</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              Mira qué está pasando cerca.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-right">
            <p className="text-lg font-black text-white">{visibleMarkers.length}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/42">
              puntos
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-3">
          <Search className="h-5 w-5 text-white/40" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/34"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar zona, usuario o ambiente"
          />
          <Filter className="h-5 w-5 text-neonPink" />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <motion.button
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink px-4 text-sm font-black text-white shadow-cyan disabled:opacity-60"
            type="button"
            onClick={handleNearMe}
            disabled={isLocating}
            whileTap={{ scale: 0.98 }}
          >
            {isLocating ? (
              <span className="h-2.5 w-2.5 rounded-full bg-white [animation:live-pulse_1.1s_ease-in-out_infinite]" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {isLocating ? "Localizando..." : "Cerca de mí"}
          </motion.button>
          {nearbyMode ? (
            <button
              className="min-h-12 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-black text-white"
              type="button"
              onClick={() => {
                setNearbyMode(false);
                setUserLocation(null);
              }}
            >
              Ver todo
            </button>
          ) : null}
        </div>
      </motion.header>

      <div className="scrollbar-none relative z-20 mt-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeType === filter.value;
          return (
            <motion.button
              key={filter.value}
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                isActive
                  ? "border-neonCyan/50 bg-neonCyan/14 text-white shadow-cyan"
                  : "border-white/10 bg-white/7 text-white/58"
              }`}
              type="button"
              onClick={() => setActiveType(filter.value)}
              whileTap={{ scale: 0.96 }}
            >
              {isActive ? (
                <span className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-gradient-to-r from-neonCyan to-neonPink" />
              ) : null}
              <Icon className="h-4 w-4" />
              {filter.label}
            </motion.button>
          );
        })}
      </div>

      <div className="relative z-20 mt-3 rounded-[1.4rem] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/44">
              Radio
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {nearbyMode ? `${radiusKm} km cerca de ti` : `Filtro: ${activeFilter.label}`}
            </p>
          </div>
          <Navigation className="h-5 w-5 text-neonCyan" />
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {radiusOptions.map((radius) => (
            <button
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                radiusKm === radius
                  ? "border-neonPink/50 bg-neonPink/14 text-neonPink shadow-neon"
                  : "border-white/10 bg-black/18 text-white/58"
              }`}
              key={radius}
              type="button"
              onClick={() => setRadiusKm(radius)}
            >
              {radius} km
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="relative z-20 mt-3 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}
      {shareNotice ? (
        <div className="relative z-20 mt-3 rounded-[1.2rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
          {shareNotice}
        </div>
      ) : null}

      <div className="glass-panel relative z-10 mt-4 overflow-hidden rounded-[2rem] p-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[430] h-20 bg-gradient-to-b from-night/72 to-transparent" />
        <div className="h-[31rem] w-full overflow-hidden rounded-[1.55rem] bg-night">
          <MapContainer
            center={MALABO_CENTER}
            className="bucan-map h-full w-full"
            scrollWheelZoom={false}
            zoom={12}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMarkers posts={visibleMarkers} />
            <CenterOnUser userLocation={userLocation} />

            {heatZones.map((zone) => (
              <Circle
                center={zone.center}
                key={zone.key}
                pathOptions={{
                  color: zone.liveCount ? "#FF3040" : "#7C3AED",
                  fillColor: zone.liveCount ? "#FF3040" : "#7C3AED",
                  fillOpacity: 0.16,
                  opacity: 0.32,
                  weight: 1,
                }}
                radius={zone.radius}
              />
            ))}

            {userLocation ? (
              <Marker icon={createUserIcon()} position={[userLocation.lat, userLocation.lng]} />
            ) : null}

            {visibleMarkers.map((post) => (
              <Marker
                key={`${post.source_type || "post"}-${post.id}`}
                icon={createMarkerIcon(post)}
                position={[post.location.lat, post.location.lng]}
                eventHandlers={{ click: () => setSelectedItem(post) }}
              />
            ))}
          </MapContainer>
        </div>
        {isLoading ? <MarkerSkeleton /> : null}
        <HeatLegend markers={visibleMarkers} />
      </div>

      {isLoading ? <ListSkeleton count={2} /> : null}

      {!isLoading && visibleMarkers.length === 0 ? (
        <div className="glass-panel mt-5 rounded-[1.75rem] p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan/25 to-neonPink/25 text-neonCyan">
            <MapPin className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-black text-white">
            Todavía no hay puntos de ambiente.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/54">
            Publica con ubicación para encender el mapa.
          </p>
        </div>
      ) : null}

      {zones.length ? (
        <div className="relative z-20 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
              Zonas calientes
            </p>
            <span className="rounded-full border border-neonYellow/30 bg-neonYellow/10 px-3 py-1 text-xs font-black text-neonYellow">
              live heat
            </span>
          </div>
          <div className="scrollbar-none mt-3 flex gap-3 overflow-x-auto pb-1">
            {zones.slice(0, 6).map((zone) => (
              <motion.div
                className="glass-panel min-w-[15rem] rounded-[1.6rem] p-4"
                key={`${zone.city}-${zone.area}`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">
                      {zone.area || zone.city}
                    </p>
                    <p className="text-sm font-semibold text-white/48">{zone.city}</p>
                  </div>
                  <span className="rounded-full border border-neonPink/30 bg-neonPink/12 px-3 py-1 text-xs font-black text-neonPink">
                    {zone.heat_level}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-[1rem] bg-white/7 p-2">
                    <p className="font-black text-white">{zone.posts_count}</p>
                    <p className="text-[10px] font-black uppercase text-white/38">posts</p>
                  </div>
                  <div className="rounded-[1rem] bg-liveRed/12 p-2">
                    <p className="font-black text-liveRed">{zone.live_count}</p>
                    <p className="text-[10px] font-black uppercase text-white/38">lives</p>
                  </div>
                  <div className="rounded-[1rem] bg-neonYellow/12 p-2">
                    <p className="font-black text-neonYellow">{zone.event_count}</p>
                    <p className="text-[10px] font-black uppercase text-white/38">
                      eventos
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      <BottomSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onShare={handleShare}
      />
    </section>
  );
}

export default Map;
