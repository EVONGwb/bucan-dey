import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  Eye,
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
      setActiveMode("live");
      setForm((current) => ({ ...current, type: "live" }));
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

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden bg-night px-3 pb-28 text-white sm:mx-0 sm:rounded-[2rem] sm:px-4 sm:pb-36">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden sm:h-72">
        <div className="creator-aurora absolute inset-0 opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/5 via-night/62 to-night" />
      </div>
      <div className="pointer-events-none absolute -left-24 top-80 h-72 w-72 rounded-full bg-neonCyan/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-72 w-72 rounded-full bg-neonPink/12 blur-3xl" />

      <form className="relative z-10 mx-auto max-w-6xl" onSubmit={handleSubmit}>
        <header className="flex items-start gap-3 border-b border-white/10 py-4 sm:gap-4 sm:py-7">
          <motion.button
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-cyan backdrop-blur-xl sm:h-12 sm:w-12"
            type="button"
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.94 }}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>

          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-3xl font-black uppercase leading-none tracking-tight text-neonPink sm:text-5xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Publicar
            </motion.h1>
            <p className="mt-2 text-sm font-semibold text-white/82 sm:mt-3 sm:text-lg">
              Comparte lo que está pasando ahora
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold sm:mt-5 sm:gap-3 sm:text-sm">
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

          <div className="hidden shrink-0 sm:block">
            {user?.avatar_url ? (
              <img
                alt={user.display_name || user.username}
                className="h-16 w-16 rounded-full border-2 border-neonPink object-cover shadow-neon"
                src={user.avatar_url}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-neonPink bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan text-2xl font-black shadow-neon">
                {initials(user)}
              </div>
            )}
          </div>
        </header>

        <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-6 lg:grid-cols-[1fr_24rem]">
          <main className="min-w-0 space-y-4 sm:space-y-6">
            <section className="rounded-[1.15rem] border border-neonPink/20 bg-white/[0.055] p-4 shadow-neon backdrop-blur-2xl sm:rounded-[1.45rem] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonCyan">
                    <Eye className="h-4 w-4" />
                    Vista previa siempre arriba
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {isLiveMode ? "Directo" : isEventMode ? "Publicación de evento" : "Tu publicación"}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-black text-white/68">
                  {privacyLabel(form.visibility)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 sm:mt-5 sm:gap-4">
                {user?.avatar_url ? (
                  <img
                    alt={user.display_name || user.username}
                    className="h-12 w-12 rounded-full border-2 border-neonPink object-cover shadow-neon sm:h-16 sm:w-16"
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neonPink bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan text-lg font-black shadow-neon sm:h-16 sm:w-16 sm:text-xl">
                    {initials(user)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white sm:text-lg">
                    {user?.display_name || user?.username || "BUCAN DEY"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-[0.75rem] border border-white/10 bg-white/7 px-2.5 py-1.5 text-xs font-bold text-white/70 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
                    <Globe2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {privacyLabel(form.visibility)}
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                </div>
              </div>

              {isLiveMode ? (
                <div className="mt-4 rounded-[1.05rem] border border-liveRed/25 bg-liveRed/10 p-4 sm:mt-6 sm:rounded-[1.2rem] sm:p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-liveRed">Live</p>
                  <p className="mt-2 text-xl font-black text-white sm:mt-3 sm:text-2xl">Entra en directo ahora</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
                    El directo real se inicia desde la pantalla LiveKit preparada para BUCAN DEY.
                  </p>
                  <Link
                    className="mt-4 inline-flex h-11 items-center gap-2 rounded-[0.9rem] bg-liveRed px-4 text-sm font-black text-white shadow-live sm:mt-5 sm:h-12 sm:px-5"
                    to="/lives/start"
                  >
                    Empezar directo
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-night/42 sm:mt-5 sm:rounded-[1.1rem]">
                    <textarea
                      className="min-h-28 w-full resize-none bg-transparent px-4 py-4 text-base font-semibold leading-7 text-white outline-none placeholder:text-white/34 sm:min-h-44 sm:px-5 sm:py-5 sm:text-xl sm:leading-8"
                      name="text"
                      value={form.text}
                      onChange={updateField}
                      placeholder="¿Qué está pasando ahora?"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                      <div className="flex items-center gap-2 text-white/66 sm:gap-3">
                        <Smile className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                        <span className="text-lg font-black sm:text-xl">#</span>
                      </div>
                      <span className="text-xs font-semibold text-white/52 sm:text-sm">{form.text.length}/2000</span>
                    </div>
                  </div>

                  {isUploading ? (
                    <div className="mt-3 overflow-hidden rounded-[1.05rem] border border-neonCyan/25 bg-neonCyan/10 p-4 shadow-cyan sm:mt-4 sm:rounded-[1.15rem]">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-neonCyan shadow-cyan" />
                        <div>
                          <p className="text-sm font-black text-white">Subiendo archivo...</p>
                          <p className="mt-1 text-xs font-semibold text-white/56">
                            La vista previa se actualizará aquí en cuanto termine la carga.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink" />
                      </div>
                    </div>
                  ) : null}

                  {mediaItems.length ? (
                    <div className="mt-3 overflow-hidden rounded-[1.05rem] border border-white/10 bg-night sm:mt-4 sm:rounded-[1.15rem]">
                      {mediaItems.map((item) =>
                        item.type === "image" ? (
                          <img
                            alt="Vista previa"
                            className="max-h-80 w-full object-cover sm:max-h-[32rem]"
                            src={item.url}
                            key={item.public_id || item.url}
                          />
                        ) : (
                          <video
                            className="max-h-80 w-full bg-black sm:max-h-[32rem]"
                            controls
                            preload="metadata"
                            src={item.url}
                            key={item.public_id || item.url}
                          />
                        )
                      )}
                      <button
                        className="h-10 w-full border-t border-white/10 text-sm font-black text-neonPink sm:h-12"
                        type="button"
                        onClick={() => setMediaItems([])}
                      >
                        Quitar archivo
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              <MiniPublishSelector
                activeMode={activeMode}
                isUploading={isUploading}
                isLocationActive={showLocationPicker || Boolean(position)}
                selectMode={selectMode}
                setShowLocationPicker={setShowLocationPicker}
              />

              {uploadError ? (
                <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white sm:mt-4">
                  {uploadError}
                </div>
              ) : null}

              {isEventMode ? (
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
              ) : null}

              <LocationPanel
                form={form}
                updateField={updateField}
                position={position}
                showLocationPicker={showLocationPicker}
                setShowLocationPicker={setShowLocationPicker}
                handleUseCurrentLocation={handleUseCurrentLocation}
                isLocating={isLocating}
                locationError={locationError}
                setSelectedLocation={setSelectedLocation}
              />
            </section>

            <MobileUtilityPanels
              form={form}
              updateField={updateField}
              position={position}
            />

            <section className="grid gap-4 sm:gap-5">
              <FeatureRouteCard
                icon={CalendarDays}
                title="Evento"
                subtitle="Publica un evento rápido"
                body="Comparte los detalles de tu evento con la comunidad."
                button="Crear evento completo"
                to="/events/create"
                tone="purple"
              />
              <FeatureRouteCard
                icon={Radio}
                title="Live"
                subtitle="Entra en directo ahora"
                body="Conectate en vivo con tu audiencia."
                button="Empezar directo"
                to="/lives/start"
                tone="red"
              />
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

          <aside className="hidden min-w-0 space-y-5 lg:sticky lg:top-5 lg:block lg:self-start">
            <LocationSummary form={form} position={position} />
            <PrivacyPanel form={form} updateField={updateField} />
          </aside>
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
            {isLiveMode ? <Radio className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            {isLiveMode ? "Empezar directo" : isSubmitting ? "Publicando..." : "Publicar ahora"}
          </motion.button>
        </div>
      </form>
    </section>
  );
}

function MobileUtilityPanels({ form, updateField, position }) {
  const panels = [
    {
      id: "location",
      icon: MapPin,
      label: "Ubicación",
      summary: selectedLocationLabel(form),
      content: <LocationSummary form={form} position={position} compact />,
    },
    {
      id: "privacy",
      icon: Shield,
      label: "Privacidad",
      summary: privacyLabel(form.visibility),
      content: <PrivacyPanel form={form} updateField={updateField} compact />,
    },
  ];

  return (
    <section className="space-y-2 lg:hidden">
      {panels.map((panel) => {
        const Icon = panel.icon;
        return (
          <details
            className="group overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.045] shadow-cyan backdrop-blur-2xl"
            key={panel.id}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-neonCyan" />
                <span className="text-sm font-black uppercase text-white">{panel.label}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-white/54">
                <span className="truncate">{panel.summary}</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-white/10 p-2.5">{panel.content}</div>
          </details>
        );
      })}
    </section>
  );
}

function MiniPublishSelector({
  activeMode,
  isUploading,
  isLocationActive,
  selectMode,
  setShowLocationPicker,
}) {
  const tools = [
    ...publishModes,
    { id: "location", label: "Lugar", icon: MapPin, tone: "cyan" },
  ];

  function handleToolClick(tool) {
    if (tool.id === "location") {
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

function LocationPanel({
  form,
  updateField,
  position,
  showLocationPicker,
  setShowLocationPicker,
  handleUseCurrentLocation,
  isLocating,
  locationError,
  setSelectedLocation,
}) {
  return (
    <div className="mt-4 rounded-[1.05rem] border border-white/10 bg-night/38 p-3 sm:mt-5 sm:rounded-[1.15rem] sm:p-4">
      <p className="text-sm font-black text-white sm:text-base">Ubicación (opcional)</p>
      <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3">
        <input
          className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan sm:h-12 sm:rounded-[0.9rem] sm:px-4"
          name="city"
          value={form.city}
          onChange={updateField}
          placeholder="Ciudad"
        />
        <input
          className="h-11 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan sm:h-12 sm:rounded-[0.9rem] sm:px-4"
          name="area"
          value={form.area}
          onChange={updateField}
          placeholder="Zona"
        />
      </div>

      <button
        className="mt-3 flex w-full items-center justify-between rounded-[0.9rem] border border-white/10 bg-white/6 px-3 py-3 text-left sm:mt-4 sm:rounded-[0.95rem] sm:px-4 sm:py-4"
        type="button"
        onClick={() => setShowLocationPicker((current) => !current)}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fiestaPurple/18 text-fiestaPurple sm:h-10 sm:w-10">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span>
            <span className="block text-sm font-black text-white">Añadir ubicación</span>
            <span className="block text-xs font-semibold text-white/50 sm:text-sm">Ciudad, zona o punto en el mapa</span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/62 sm:h-5 sm:w-5" />
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          className="flex h-11 items-center justify-center gap-1.5 rounded-[0.85rem] border border-white/10 bg-white/6 text-xs font-black text-white disabled:opacity-60 sm:h-12 sm:gap-2 sm:text-sm"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          <LocateFixed className="h-4 w-4" />
          {isLocating ? "Buscando..." : "Usar mi ubicación"}
        </button>
        <button
          className="flex h-11 items-center justify-center gap-1.5 rounded-[0.85rem] border border-white/10 bg-white/6 text-xs font-black text-white sm:h-12 sm:gap-2 sm:text-sm"
          type="button"
          onClick={() => setShowLocationPicker((current) => !current)}
        >
          <MapIcon className="h-4 w-4" />
          Elegir en mapa
        </button>
      </div>

      {position ? (
        <div className="mt-3 rounded-[0.9rem] border border-neonCyan/25 bg-neonCyan/10 px-3 py-2.5 text-xs font-bold text-white sm:rounded-[0.95rem] sm:px-4 sm:py-3 sm:text-sm">
          Ubicación seleccionada: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
        </div>
      ) : null}

      {showLocationPicker ? (
        <div className="mt-3 overflow-hidden rounded-[1rem] border border-neonCyan/20 shadow-cyan sm:mt-4 sm:rounded-[1.1rem]">
          <div className="h-56 w-full sm:h-72">
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
        <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-3 py-2.5 text-sm font-semibold text-white sm:px-4 sm:py-3">
          {locationError}
        </div>
      ) : null}

      <label className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 sm:mt-4 sm:pt-4">
        <span>
          <span className="block text-sm font-black text-white">Mostrar en el mapa</span>
          <span className="mt-1 block text-xs font-semibold text-white/50 sm:text-sm">
            Tu publicación será visible en el mapa
          </span>
        </span>
        <input
          className="h-5 w-5 accent-pink-500 sm:h-6 sm:w-6"
          type="checkbox"
          name="show_on_map"
          checked={form.show_on_map}
          onChange={updateField}
        />
      </label>
    </div>
  );
}

function LocationSummary({ form, position, compact = false }) {
  return (
    <section
      className={[
        "border border-white/10 bg-white/[0.045] shadow-cyan backdrop-blur-2xl",
        compact ? "rounded-[0.9rem] p-3" : "rounded-[1.3rem] p-4",
      ].join(" ")}
    >
      <h2 className={compact ? "flex items-center gap-2 text-sm font-black uppercase text-white" : "flex items-center gap-3 text-lg font-black uppercase text-white"}>
        <MapPin className={compact ? "h-4 w-4 text-fiestaPurple" : "h-5 w-5 text-fiestaPurple"} />
        Ubicación
      </h2>
      <div className={(compact ? "mt-3" : "mt-4") + " overflow-hidden rounded-[1rem] border border-white/10 bg-night"}>
        <div className={(compact ? "h-24" : "h-36") + " relative bg-[linear-gradient(135deg,rgba(0,217,255,.14),rgba(124,58,237,.18)),repeating-linear-gradient(35deg,rgba(255,216,77,.17)_0_1px,transparent_1px_38px),repeating-linear-gradient(120deg,rgba(255,255,255,.06)_0_1px,transparent_1px_34px)]"}>
          <span className={(compact ? "h-8 w-8 shadow-[0_0_0_13px_rgba(59,130,246,.18),0_0_24px_rgba(59,130,246,.7)]" : "h-10 w-10 shadow-[0_0_0_18px_rgba(59,130,246,.18),0_0_30px_rgba(59,130,246,.7)]") + " absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500"} />
        </div>
      </div>
      <p className={(compact ? "mt-3 text-sm" : "mt-4") + " font-black text-white"}>{selectedLocationLabel(form)}, Guinea Ecuatorial</p>
      <p className={(compact ? "text-xs" : "text-sm") + " mt-1 font-semibold text-white/54"}>
        {position ? "Punto seleccionado" : "Centro de Malabo"}
      </p>
    </section>
  );
}

function PrivacyPanel({ form, updateField, compact = false }) {
  return (
    <section
      className={[
        "border border-white/10 bg-white/[0.045] shadow-cyan backdrop-blur-2xl",
        compact ? "rounded-[0.9rem] p-3" : "rounded-[1.3rem] p-4",
      ].join(" ")}
    >
      <h2 className={compact ? "flex items-center gap-2 text-sm font-black uppercase text-white" : "flex items-center gap-3 text-lg font-black uppercase text-white"}>
        <Shield className={compact ? "h-4 w-4 text-white/70" : "h-5 w-5 text-white/70"} />
        Privacidad
      </h2>
      <p className={(compact ? "mt-3 text-xs" : "mt-4 text-sm") + " font-semibold text-white/64"}>¿Quién puede ver tu publicación?</p>
      <div className={(compact ? "mt-3" : "mt-4") + " space-y-2"}>
        {privacyOptions.map((option) => {
          const Icon = option.icon;
          const isActive = form.visibility === option.value;
          return (
            <label
              className={[
                "flex cursor-pointer items-center gap-3 rounded-[0.95rem] border px-3 transition",
                compact ? "py-2.5" : "py-3",
                isActive ? "border-neonPink bg-neonPink/12 shadow-neon" : "border-white/10 bg-white/5",
              ].join(" ")}
              key={option.id}
            >
              <Icon className={isActive ? "h-5 w-5 text-white" : "h-5 w-5 text-white/58"} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">{option.label}</span>
                <span className="block text-xs font-semibold text-white/52">{option.detail}</span>
              </span>
              <input
                className="h-5 w-5 accent-pink-500"
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
    </section>
  );
}

function FeatureRouteCard({ icon: Icon, title, subtitle, body, button, to, tone }) {
  const isRed = tone === "red";
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.05rem] border bg-white/[0.045] p-4 shadow-cyan backdrop-blur-2xl sm:rounded-[1.25rem] sm:p-7",
        isRed ? "border-liveRed/30" : "border-fiestaPurple/30",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute right-10 top-1/2 h-32 w-48 -translate-y-1/2 rounded-full blur-3xl",
          isRed ? "bg-liveRed/22" : "bg-fiestaPurple/24",
        ].join(" ")}
      />
      <div className="relative z-10 grid gap-4 sm:gap-5 md:grid-cols-[1fr_18rem] md:items-center">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-black uppercase text-white sm:gap-3 sm:text-lg">
            <Icon className={isRed ? "h-5 w-5 text-liveRed sm:h-6 sm:w-6" : "h-5 w-5 text-fiestaPurple sm:h-6 sm:w-6"} />
            {title}
          </h2>
          <p className="mt-2 text-base font-black text-white/72 sm:mt-3 sm:text-lg">{subtitle}</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/62 sm:mt-2 sm:text-base sm:leading-7">{body}</p>
          <Link
            className={[
              "mt-4 inline-flex h-11 items-center gap-2 rounded-[0.85rem] px-4 text-sm font-black text-white sm:mt-5 sm:h-12 sm:px-5",
              isRed ? "bg-liveRed shadow-live" : "border border-white/10 bg-white/8",
            ].join(" ")}
            to={to}
          >
            {button}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div
          className={[
            "hidden min-h-36 rounded-[1.2rem] border bg-night/40 md:flex md:items-center md:justify-center",
            isRed ? "border-liveRed/30 text-liveRed shadow-live" : "border-fiestaPurple/30 text-fiestaPurple shadow-neon",
          ].join(" ")}
        >
          <Icon className="h-24 w-24" strokeWidth={1.2} />
        </div>
      </div>
    </section>
  );
}

export default CreatePost;
