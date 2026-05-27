import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronRight,
  Globe2,
  Image as ImageIcon,
  LocateFixed,
  Lock,
  Map as MapIcon,
  MapPin,
  Radio,
  Send,
  Shield,
  Smile,
  User,
  Video,
} from "lucide-react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import apiClient from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { MEDIA_UPLOAD_TIMEOUT_MS, getMediaValidationError } from "../utils/uploads.js";

const MALABO_CENTER = [3.7523, 8.7741];

const initialForm = {
  text: "",
  type: "normal",
  visibility: "global",
  city: "",
  area: "",
  lat: "",
  lng: "",
  show_on_map: false,
  event_title: "",
  venue: "",
  start_at: "",
  price: "",
  is_open: true,
};

const publishModes = [
  { id: "text", label: "Texto", icon: EditIcon, type: "normal", tone: "pink" },
  { id: "photo", label: "Foto", icon: Camera, type: "normal", tone: "cyan" },
  { id: "video", label: "Video", icon: Video, type: "video", tone: "purple" },
  { id: "event", label: "Evento", icon: CalendarDays, type: "evento", tone: "pink" },
  { id: "live", label: "Live", icon: Radio, type: "live", tone: "red" },
];

const privacyOptions = [
  {
    id: "global",
    label: "Todos",
    detail: "Cualquiera en BUCAN DEY",
    value: "global",
    icon: Globe2,
  },
  {
    id: "profile_only",
    label: "Solo perfil",
    detail: "Solo en tu perfil",
    value: "profile_only",
    icon: User,
  },
  {
    id: "private",
    label: "Privado",
    detail: "Solo tu",
    value: "private",
    icon: Lock,
  },
];

const createLayoutOrder = ["live", "privacy", "composer", "tools", "eventDetails", "location"];

function EditIcon(props) {
  return <ImageIcon {...props} />;
}

function createSelectedIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fff,#00D9FF 38%,#7C3AED 76%);border:4px solid #070B14;box-shadow:0 0 0 9px rgba(0,217,255,.18),0 0 32px rgba(0,217,255,.7);"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function initials(user) {
  return ((user?.display_name || user?.username || "B").trim().charAt(0) || "B").toUpperCase();
}

function privacyLabel(value) {
  return privacyOptions.find((option) => option.value === value)?.label || "Todos";
}

function selectedLocationLabel(form) {
  const city = form.city || "Malabo";
  const area = form.area ? `, ${form.area}` : "";
  return `${city}${area}`;
}

function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [form, setForm] = useState(() => ({
    ...initialForm,
    city: user?.city || "Malabo",
  }));
  const [mediaItems, setMediaItems] = useState([]);
  const [activeMode, setActiveMode] = useState("text");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [publishStats, setPublishStats] = useState({
    activeUsers: null,
    eventsToday: null,
  });

  const position = form.lat && form.lng ? [Number(form.lat), Number(form.lng)] : null;
  const isEventMode = activeMode === "event";
  const isLiveMode = activeMode === "live";

  useEffect(() => {
    let isMounted = true;

    async function loadPublishStats() {
      try {
        const [healthResponse, eventsResponse] = await Promise.allSettled([
          apiClient.get("/health"),
          apiClient.get("/events", { params: { upcoming: true, limit: 100 } }),
        ]);

        const activeUsers =
          healthResponse.status === "fulfilled"
            ? healthResponse.value.data.active_users_estimate ?? 0
            : 0;
        const events =
          eventsResponse.status === "fulfilled" ? eventsResponse.value.data.items || [] : [];
        const todayKey = new Date().toISOString().slice(0, 10);
        const eventsToday = events.filter((event) => event.start_at?.slice(0, 10) === todayKey).length;

        if (isMounted) {
          setPublishStats({ activeUsers, eventsToday });
        }
      } catch {
        if (isMounted) {
          setPublishStats({ activeUsers: 0, eventsToday: 0 });
        }
      }
    }

    loadPublishStats();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function setSelectedLocation(lat, lng) {
    setForm((current) => ({
      ...current,
      lat: Number(lat).toFixed(6),
      lng: Number(lng).toFixed(6),
      show_on_map: true,
    }));
    setLocationError("");
  }

  function handleUseCurrentLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener ubicación. Puedes elegir el punto en el mapa.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (positionData) => {
        setSelectedLocation(positionData.coords.latitude, positionData.coords.longitude);
        setShowLocationPicker(true);
        setIsLocating(false);
      },
      () => {
        setLocationError(
          "No se pudo obtener tu ubicación. Puedes elegir el punto manualmente en el mapa."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function uploadMedia(file, nextMode) {
    if (!file) return;

    const validationError = getMediaValidationError(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadError("");
      setIsUploading(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: MEDIA_UPLOAD_TIMEOUT_MS,
      });
      setMediaItems([response.data]);
      setActiveMode(nextMode);
      setForm((current) => ({
        ...current,
        type: nextMode === "video" ? "video" : "normal",
      }));
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function handleMediaSelect(event, nextMode) {
    const file = event.target.files?.[0];
    event.target.value = "";
    uploadMedia(file, nextMode);
  }

  function selectMode(mode) {
    setNotice("");
    setError("");

    if (mode.id === "photo") {
      imageInputRef.current?.click();
      return;
    }

    if (mode.id === "video") {
      videoInputRef.current?.click();
      return;
    }

    if (mode.id === "live") {
      navigate("/lives/start");
      return;
    }

    setActiveMode(mode.id);
    setForm((current) => ({ ...current, type: mode.type }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (isLiveMode) {
      navigate("/lives/start");
      return;
    }

    const postText = form.text.trim();
    if (!postText && mediaItems.length === 0) {
      setError("Añade texto, foto o video antes de publicar.");
      return;
    }

    const payload = {
      type: form.type,
      visibility: form.visibility,
      text: postText,
      media: mediaItems,
      location: {
        city: form.city,
        area: form.area,
        lat: form.show_on_map && form.lat !== "" ? Number(form.lat) : null,
        lng: form.show_on_map && form.lng !== "" ? Number(form.lng) : null,
        show_on_map: form.show_on_map,
      },
    };

    if (isEventMode) {
      payload.event_data = {
        title: form.event_title,
        venue: form.venue,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        price: form.price,
        is_open: form.is_open,
      };
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/posts", payload);
      navigate(form.visibility === "global" ? "/" : "/profile", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCreateBlock(blockId) {
    switch (blockId) {
      case "privacy":
        return <InlinePrivacySelector form={form} updateField={updateField} />;
      case "composer":
        return isUploading || mediaItems.length ? (
          <MediaFirstComposer
            form={form}
            updateField={updateField}
            mediaItems={mediaItems}
            setMediaItems={setMediaItems}
            isUploading={isUploading}
          />
        ) : (
          <TextComposer form={form} updateField={updateField} />
        );
      case "tools":
        return (
          <MiniPublishSelector
            activeMode={activeMode}
            isUploading={isUploading}
            isLocationActive={showLocationPicker || Boolean(position)}
            selectMode={selectMode}
            setShowLocationPicker={setShowLocationPicker}
            setIsLocationExpanded={setIsLocationExpanded}
          />
        );
      case "live":
        return <LiveStartBanner />;
      case "eventDetails":
        return isEventMode ? (
          <div className="mt-4 rounded-[1.05rem] border border-fiestaPurple/24 bg-fiestaPurple/10 p-3 sm:mt-5 sm:rounded-[1.2rem] sm:p-4">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-neonPink">
              Datos del evento
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink sm:h-12 sm:rounded-[0.9rem] sm:px-4"
                name="event_title"
                value={form.event_title}
                onChange={updateField}
                placeholder="Título"
              />
              <input
                className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink sm:h-12 sm:rounded-[0.9rem] sm:px-4"
                name="venue"
                value={form.venue}
                onChange={updateField}
                placeholder="Lugar"
              />
              <input
                className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none focus:border-neonPink sm:h-12 sm:rounded-[0.9rem] sm:px-4"
                name="start_at"
                value={form.start_at}
                onChange={updateField}
                type="datetime-local"
              />
              <input
                className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink sm:h-12 sm:rounded-[0.9rem] sm:px-4"
                name="price"
                value={form.price}
                onChange={updateField}
                placeholder="Precio"
              />
            </div>
            <label className="mt-3 flex items-center justify-between rounded-[0.85rem] border border-white/10 bg-white/6 px-3 py-2.5 sm:rounded-[0.9rem] sm:px-4 sm:py-3">
              <span className="text-sm font-bold text-white">Evento abierto</span>
              <input
                className="h-5 w-5 accent-pink-500"
                type="checkbox"
                name="is_open"
                checked={form.is_open}
                onChange={updateField}
              />
            </label>
          </div>
        ) : null;
      case "location":
        return (
          <LocationPanel
            form={form}
            updateField={updateField}
            position={position}
            showLocationPicker={showLocationPicker}
            setShowLocationPicker={setShowLocationPicker}
            isLocationExpanded={isLocationExpanded}
            setIsLocationExpanded={setIsLocationExpanded}
            handleUseCurrentLocation={handleUseCurrentLocation}
            isLocating={isLocating}
            locationError={locationError}
            setSelectedLocation={setSelectedLocation}
          />
        );
      default:
        return null;
    }
  }

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden bg-night px-3 pb-28 text-white sm:mx-0 sm:rounded-[2rem] sm:px-4 sm:pb-36">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden sm:h-72">
        <div className="creator-aurora absolute inset-0 opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/5 via-night/62 to-night" />
      </div>
      <div className="pointer-events-none absolute -left-24 top-80 h-72 w-72 rounded-full bg-neonCyan/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-72 w-72 rounded-full bg-neonPink/12 blur-3xl" />

      <form className="relative z-10 mx-auto max-w-6xl" onSubmit={handleSubmit}>
        <header className="flex items-start gap-3 border-b border-white/10 py-3 sm:gap-4 sm:py-7">
          <motion.button
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-cyan backdrop-blur-xl sm:h-12 sm:w-12"
            type="button"
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.94 }}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </motion.button>

          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-2xl font-black uppercase leading-none tracking-tight text-neonPink sm:text-5xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Publicar
            </motion.h1>
            <p className="mt-1.5 text-xs font-semibold text-white/82 sm:mt-3 sm:text-lg">
              Comparte lo que está pasando ahora
            </p>

            <div className="mt-4 hidden flex-wrap gap-2 text-xs font-bold sm:mt-5 sm:flex sm:gap-3 sm:text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-[0.7rem] border border-white/10 bg-white/7 px-3 py-1.5 backdrop-blur-xl sm:gap-2 sm:px-4 sm:py-2">
                <MapPin className="h-3.5 w-3.5 text-neonPink sm:h-4 sm:w-4" />
                {form.city || user?.city || "Malabo"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[0.7rem] border border-white/10 bg-white/7 px-3 py-1.5 backdrop-blur-xl sm:gap-2 sm:px-4 sm:py-2">
                <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_18px_rgba(34,197,94,.85)] sm:h-2.5 sm:w-2.5" />
                {publishStats.activeUsers ?? "..."} usuarios activos
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[0.7rem] border border-white/10 bg-white/7 px-3 py-1.5 backdrop-blur-xl sm:gap-2 sm:px-4 sm:py-2">
                <CalendarDays className="h-3.5 w-3.5 text-neonPink sm:h-4 sm:w-4" />
                {publishStats.eventsToday ?? "..."} eventos hoy
              </span>
            </div>
          </div>

          <PublishProfileOrb
            user={user}
            city={form.city || user?.city || "Malabo"}
            activeUsers={publishStats.activeUsers}
            eventsToday={publishStats.eventsToday}
          />
        </header>

        <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-6 lg:grid-cols-[1fr_24rem]">
          <main className="min-w-0 space-y-4 sm:space-y-6">
            <section className="rounded-[1.15rem] border border-neonPink/20 bg-white/[0.055] p-4 shadow-neon backdrop-blur-2xl sm:rounded-[1.45rem] sm:p-5">
              {createLayoutOrder.map((blockId) => (
                <div key={blockId}>{renderCreateBlock(blockId)}</div>
              ))}

              {uploadError ? (
                <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white sm:mt-4">
                  {uploadError}
                </div>
              ) : null}
            </section>

            {notice ? (
              <div className="rounded-[1.1rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
                {error}
              </div>
            ) : null}
          </main>

        </div>

        <input
          ref={imageInputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleMediaSelect(event, "photo")}
          disabled={isUploading}
        />
        <input
          ref={videoInputRef}
          className="sr-only"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(event) => handleMediaSelect(event, "video")}
          disabled={isUploading}
        />

        <div className="relative z-20 mt-4 sm:sticky sm:bottom-[7rem] sm:mt-6">
          <motion.button
            className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-neonPink via-fiestaPurple to-[#4c00ff] text-base font-black text-white shadow-neon disabled:opacity-60 sm:h-16 sm:gap-3 sm:rounded-[1rem] sm:text-lg"
            type="submit"
            disabled={isSubmitting || isUploading}
            whileTap={{ scale: 0.98 }}
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? "Publicando..." : "Publicar ahora"}
          </motion.button>
        </div>
      </form>
    </section>
  );
}

function ComposerFooter({ count }) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 text-white/66 sm:gap-3">
        <Smile className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
        <span className="text-lg font-black sm:text-xl">#</span>
      </div>
      <span className="text-xs font-semibold text-white/52 sm:text-sm">{count}/2000</span>
    </div>
  );
}

function PublishProfileOrb({ user, city, activeUsers, eventsToday }) {
  return (
    <div
      className="relative h-[4.8rem] w-[4.8rem] shrink-0 sm:h-16 sm:w-16"
      aria-label={`${city}. ${activeUsers ?? "..."} usuarios activos. ${eventsToday ?? "..."} eventos hoy.`}
    >
      <div className="absolute inset-1 rounded-full border border-white/10 bg-white/8 shadow-cyan backdrop-blur-xl sm:inset-0 sm:border-0 sm:bg-transparent sm:shadow-none">
        {user?.avatar_url ? (
          <img
            alt={user.display_name || user.username}
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neonPink object-cover shadow-neon sm:h-16 sm:w-16"
            src={user.avatar_url}
          />
        ) : (
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neonPink bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan text-base font-black shadow-neon sm:h-16 sm:w-16 sm:text-2xl">
            {initials(user)}
          </div>
        )}
      </div>

      <span className="absolute -right-1 top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-green-300/25 bg-green-400/20 px-1 text-[10px] font-black text-green-200 shadow-[0_0_18px_rgba(34,197,94,.65)] backdrop-blur-xl sm:hidden">
        {activeUsers ?? "..."}
      </span>
      <span className="absolute -left-1 bottom-1 inline-flex max-w-[4.35rem] items-center gap-1 rounded-full border border-white/10 bg-night/76 px-1.5 py-1 text-[9px] font-black text-white shadow-cyan backdrop-blur-xl sm:hidden">
        <MapPin className="h-3 w-3 shrink-0 text-neonPink" />
        <span className="truncate">{city}</span>
      </span>
      <span className="absolute -right-1 bottom-1 inline-flex items-center gap-1 rounded-full border border-neonPink/20 bg-neonPink/16 px-1.5 py-1 text-[9px] font-black text-white shadow-neon backdrop-blur-xl sm:hidden">
        <CalendarDays className="h-3 w-3 text-neonPink" />
        {eventsToday ?? "..."}
      </span>
    </div>
  );
}

function TextComposer({ form, updateField }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-night/42 sm:mt-5 sm:rounded-[1.1rem]">
      <textarea
        className="min-h-28 w-full resize-none bg-transparent px-4 py-4 text-base font-semibold leading-7 text-white outline-none placeholder:text-white/34 sm:min-h-44 sm:px-5 sm:py-5 sm:text-xl sm:leading-8"
        name="text"
        value={form.text}
        onChange={updateField}
        placeholder="¿Qué está pasando ahora?"
        maxLength={2000}
      />
      <ComposerFooter count={form.text.length} />
    </div>
  );
}

function InlinePrivacySelector({ form, updateField }) {
  return (
    <div className="mt-4 rounded-[1rem] border border-white/10 bg-night/38 p-2.5 sm:mt-5 sm:rounded-[1.1rem] sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/62">
          <Shield className="h-4 w-4 text-neonCyan" />
          Visibilidad
        </span>
        <span className="text-xs font-black text-neonPink">Editar</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {privacyOptions.map((option) => {
          const Icon = option.icon;
          const isActive = form.visibility === option.value;

          return (
            <label
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[0.8rem] border px-2 py-2 text-center transition sm:flex-row sm:gap-2 sm:rounded-[0.9rem] sm:px-3 sm:py-2.5",
                isActive
                  ? "border-neonPink bg-neonPink/14 text-white shadow-neon"
                  : "border-white/10 bg-white/6 text-white/70 hover:border-white/18 hover:bg-white/10",
              ].join(" ")}
              key={option.id}
            >
              <Icon className={isActive ? "h-4 w-4 text-white" : "h-4 w-4 text-white/58"} />
              <span className="text-[10px] font-black leading-none sm:text-xs">{option.label}</span>
              <input
                className="sr-only"
                type="radio"
                name="visibility"
                value={option.value}
                checked={isActive}
                onChange={updateField}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function MediaFirstComposer({ form, updateField, mediaItems, setMediaItems, isUploading }) {
  const mediaType = mediaItems[0]?.type;
  const captionPlaceholder =
    mediaType === "video" ? "Escribe algo sobre este video..." : "Escribe algo sobre esta foto...";

  return (
    <div className="mt-4 overflow-hidden rounded-[1.05rem] border border-white/10 bg-night/48 shadow-cyan sm:mt-5 sm:rounded-[1.2rem]">
      <div className="relative bg-black/40">
        {isUploading ? (
          <div className="flex min-h-[15rem] flex-col justify-center p-5 sm:min-h-[22rem] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-neonCyan shadow-cyan" />
              <div>
                <p className="text-sm font-black text-white sm:text-base">Subiendo archivo...</p>
                <p className="mt-1 text-xs font-semibold text-white/56 sm:text-sm">
                  La publicación se está montando aquí mismo.
                </p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink" />
            </div>
          </div>
        ) : (
          mediaItems.map((item) =>
            item.type === "image" ? (
              <img
                alt="Media de la publicación"
                className="max-h-[23rem] w-full object-contain sm:max-h-[34rem]"
                src={item.url}
                key={item.public_id || item.url}
              />
            ) : (
              <video
                className="max-h-[23rem] w-full bg-black sm:max-h-[34rem]"
                controls
                preload="metadata"
                src={item.url}
                key={item.public_id || item.url}
              />
            )
          )
        )}
      </div>

      <div className="border-t border-white/10 bg-night/76">
        <textarea
          className="min-h-24 w-full resize-none bg-transparent px-4 py-3.5 text-base font-semibold leading-7 text-white outline-none placeholder:text-white/34 sm:min-h-32 sm:px-5 sm:py-4 sm:text-lg sm:leading-8"
          name="text"
          value={form.text}
          onChange={updateField}
          placeholder={captionPlaceholder}
          maxLength={2000}
        />
        <ComposerFooter count={form.text.length} />
      </div>

      {mediaItems.length ? (
        <button
          className="h-10 w-full border-t border-white/10 bg-white/[0.03] text-sm font-black text-neonPink transition hover:bg-neonPink/10 sm:h-12"
          type="button"
          onClick={() => setMediaItems([])}
        >
          Quitar archivo
        </button>
      ) : null}
    </div>
  );
}

function MiniPublishSelector({
  activeMode,
  isUploading,
  isLocationActive,
  selectMode,
  setShowLocationPicker,
  setIsLocationExpanded,
}) {
  const tools = [
    ...publishModes.filter((mode) => mode.id !== "live"),
    { id: "location", label: "Lugar", icon: MapPin, tone: "cyan" },
  ];

  function handleToolClick(tool) {
    if (tool.id === "location") {
      setIsLocationExpanded(true);
      setShowLocationPicker((current) => !current);
      return;
    }

    selectMode(tool);
  }

  return (
    <div className="mt-3 rounded-[1rem] border border-white/10 bg-night/38 p-2.5 sm:mt-4 sm:rounded-[1.1rem] sm:p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/62">Añadir a la publicación</p>
        {isUploading ? <span className="text-xs font-black text-neonCyan">Subiendo...</span> : null}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeMode === tool.id || (tool.id === "location" && isLocationActive);
          const colorClass =
            tool.tone === "cyan"
              ? "text-neonCyan"
              : tool.tone === "purple"
                ? "text-fiestaPurple"
                : tool.tone === "red"
                  ? "text-liveRed"
                  : "text-neonPink";

          return (
            <motion.button
              className={[
                "flex min-w-[4.45rem] flex-col items-center justify-center gap-1.5 rounded-[0.85rem] border px-2 py-2.5 text-center transition sm:min-w-0",
                isActive
                  ? "border-neonPink bg-neonPink/14 text-white shadow-neon"
                  : "border-white/10 bg-white/6 text-white/78 hover:border-white/18 hover:bg-white/10",
                isUploading && (tool.id === "photo" || tool.id === "video") ? "opacity-50" : "",
              ].join(" ")}
              type="button"
              onClick={() => handleToolClick(tool)}
              whileTap={{ scale: 0.94 }}
              disabled={isUploading && (tool.id === "photo" || tool.id === "video")}
              key={tool.id}
            >
              <Icon className={["h-5 w-5", colorClass].join(" ")} />
              <span className="text-[10px] font-black leading-none sm:text-[11px]">{tool.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function LiveStartBanner() {
  return (
    <Link
      className="group mt-3 flex items-center gap-3 overflow-hidden rounded-[1rem] border border-liveRed/25 bg-gradient-to-r from-liveRed/16 via-neonPink/10 to-fiestaPurple/12 p-2.5 shadow-live backdrop-blur-xl transition hover:border-liveRed/40 hover:bg-liveRed/20 sm:mt-4 sm:rounded-[1.1rem] sm:p-3"
      to="/lives/start"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-liveRed/18 text-liveRed shadow-live">
        <span className="absolute inset-0 animate-ping rounded-full bg-liveRed/20" />
        <Radio className="relative h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-black uppercase text-white">
          Live
          <span className="rounded-full bg-liveRed px-2 py-0.5 text-[10px] font-black text-white shadow-live">
            Directo
          </span>
        </span>
        <span className="mt-1 block truncate text-xs font-semibold text-white/58">
          Entra en directo ahora y conecta con tu audiencia.
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white transition group-hover:translate-x-0.5">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function LocationPanel({
  form,
  updateField,
  position,
  showLocationPicker,
  setShowLocationPicker,
  isLocationExpanded,
  setIsLocationExpanded,
  handleUseCurrentLocation,
  isLocating,
  locationError,
  setSelectedLocation,
}) {
  const locationTitle = position ? selectedLocationLabel(form) : "Añadir ubicación";
  const locationSubtitle = position
    ? `${form.show_on_map ? "Visible en mapa" : "Mapa desactivado"} · ${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`
    : `${form.city || "Malabo"} · Mapa desactivado`;

  return (
    <div className="mt-3 overflow-hidden rounded-[1rem] border border-white/10 bg-night/38 shadow-cyan sm:mt-4 sm:rounded-[1.15rem]">
      <button
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[0.035] sm:px-4 sm:py-3.5"
        type="button"
        onClick={() => setIsLocationExpanded((current) => !current)}
        aria-expanded={isLocationExpanded}
      >
        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
            position
              ? "border-neonCyan/30 bg-neonCyan/14 text-neonCyan shadow-cyan"
              : "border-white/10 bg-white/6 text-neonCyan",
          ].join(" ")}
        >
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-black text-white sm:text-base">{locationTitle}</span>
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                position
                  ? "border-neonCyan/25 bg-neonCyan/12 text-neonCyan"
                  : "border-white/10 bg-white/6 text-white/50",
              ].join(" ")}
            >
              {position ? "Añadida" : "Opcional"}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-white/48">
            {locationSubtitle}
          </span>
        </span>
        <span className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-neonPink sm:inline-flex">
          Editar
        </span>
        <ChevronRight
          className={[
            "h-5 w-5 shrink-0 text-white/52 transition",
            isLocationExpanded ? "rotate-90 text-neonCyan" : "",
          ].join(" ")}
        />
      </button>

      {isLocationExpanded ? (
        <div className="border-t border-white/10 p-2.5 sm:p-3">
          <div className="grid gap-2 sm:grid-cols-3">
        <button
          className={[
            "group flex min-h-[3.5rem] items-center gap-3 rounded-[0.9rem] border px-3 text-left transition disabled:opacity-60 sm:min-h-[3.8rem]",
            position
              ? "border-neonCyan/25 bg-neonCyan/10 shadow-cyan"
              : "border-white/10 bg-white/6 hover:border-neonCyan/25 hover:bg-neonCyan/10",
          ].join(" ")}
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neonCyan/24 to-fiestaPurple/24 text-neonCyan shadow-cyan">
            <LocateFixed className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black text-white sm:text-sm">
              {isLocating ? "Buscando ubicación..." : position ? selectedLocationLabel(form) : "Usar mi ubicación"}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/48">
              {position ? "Ubicación detectada" : "Un toque"}
            </span>
          </span>
        </button>

        <button
          className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-xs font-black text-white transition hover:border-neonPink/25 hover:bg-neonPink/10 sm:min-h-[3.8rem]"
          type="button"
          onClick={() => setShowLocationPicker((current) => !current)}
        >
          <MapIcon className="h-4 w-4 text-neonPink" />
          Elegir en mapa
        </button>

        <details className="group overflow-hidden rounded-[0.9rem] border border-white/10 bg-white/5">
          <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 sm:min-h-[3.8rem]">
            <span className="min-w-0 text-xs font-black text-white">
              Editar ciudad/zona
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neonPink">
              Abrir
            </span>
          </summary>
          <div className="grid gap-2 border-t border-white/10 p-2">
            <input
              className="h-10 rounded-[0.75rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
              name="city"
              value={form.city}
              onChange={updateField}
              placeholder="Ciudad"
            />
            <input
              className="h-10 rounded-[0.75rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
              name="area"
              value={form.area}
              onChange={updateField}
              placeholder="Zona"
            />
          </div>
        </details>
          </div>

        <label
          className={[
            "mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2.5 text-xs font-black transition",
            form.show_on_map ? "border-neonPink/35 bg-neonPink/14 text-white shadow-neon" : "border-white/10 bg-white/5 text-white/58",
          ].join(" ")}
        >
          <input
            className="sr-only"
            type="checkbox"
            name="show_on_map"
            checked={form.show_on_map}
            onChange={updateField}
          />
          <span>
            Visible en mapa
            <span className="ml-2 font-semibold text-white/42">
              {form.show_on_map ? "Activado" : "Desactivado"}
            </span>
          </span>
          <span className={["h-3 w-3 rounded-full", form.show_on_map ? "bg-neonPink shadow-neon" : "bg-white/28"].join(" ")} />
        </label>

      {showLocationPicker ? (
        <div className="mt-2 overflow-hidden rounded-[1rem] border border-neonCyan/20 shadow-cyan sm:rounded-[1.1rem]">
          <div className="h-52 w-full sm:h-72">
            <MapContainer
              center={position || MALABO_CENTER}
              className="bucan-map h-full w-full"
              scrollWheelZoom={false}
              zoom={13}
              zoomControl={false}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={setSelectedLocation} />
              {position ? <Marker icon={createSelectedIcon()} position={position} /> : null}
            </MapContainer>
          </div>
          <p className="bg-night px-3 py-2.5 text-xs font-semibold text-white/56 sm:px-4 sm:py-3">
            Toca el mapa para seleccionar el punto de la publicación.
          </p>
        </div>
      ) : null}

      {locationError ? (
        <div className="mt-2 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-3 py-2.5 text-sm font-semibold text-white sm:px-4 sm:py-3">
          {locationError}
        </div>
      ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CreatePost;
