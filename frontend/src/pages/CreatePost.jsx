import { useEffect, useMemo, useRef, useState } from "react";
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
  Heart,
  Image as ImageIcon,
  LocateFixed,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
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

  const selectedMode = useMemo(
    () => publishModes.find((mode) => mode.id === activeMode) || publishModes[0],
    [activeMode]
  );
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadError("");
      setIsUploading(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
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
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden bg-night px-4 pb-36 text-white sm:mx-0 sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <div className="creator-aurora absolute inset-0 opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/5 via-night/62 to-night" />
      </div>
      <div className="pointer-events-none absolute -left-24 top-80 h-72 w-72 rounded-full bg-neonCyan/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-72 w-72 rounded-full bg-neonPink/12 blur-3xl" />

      <form className="relative z-10 mx-auto max-w-6xl" onSubmit={handleSubmit}>
        <header className="flex items-start gap-4 border-b border-white/10 py-7">
          <motion.button
            className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-cyan backdrop-blur-xl"
            type="button"
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.94 }}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>

          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-4xl font-black uppercase leading-none tracking-tight text-neonPink sm:text-5xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Publicar
            </motion.h1>
            <p className="mt-3 text-base font-semibold text-white/82 sm:text-lg">
              Comparte lo que está pasando ahora
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-[0.7rem] border border-white/10 bg-white/7 px-4 py-2 backdrop-blur-xl">
                <MapPin className="h-4 w-4 text-neonPink" />
                {form.city || user?.city || "Malabo"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-[0.7rem] border border-white/10 bg-white/7 px-4 py-2 backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_18px_rgba(34,197,94,.85)]" />
                {publishStats.activeUsers ?? "..."} usuarios activos
              </span>
              <span className="inline-flex items-center gap-2 rounded-[0.7rem] border border-white/10 bg-white/7 px-4 py-2 backdrop-blur-xl">
                <CalendarDays className="h-4 w-4 text-neonPink" />
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

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_24rem]">
          <main className="min-w-0 space-y-6">
            <section>
              <h2 className="text-xl font-black text-white">¿Qué quieres publicar?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {publishModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = activeMode === mode.id;
                  return (
                    <motion.button
                      className={[
                        "min-h-28 rounded-[1.05rem] border p-4 text-center transition",
                        isActive
                          ? "border-neonPink bg-neonPink/14 text-white shadow-neon"
                          : "border-white/10 bg-white/6 text-white/82 hover:bg-white/10",
                      ].join(" ")}
                      type="button"
                      onClick={() => selectMode(mode)}
                      whileTap={{ scale: 0.96 }}
                      key={mode.id}
                    >
                      <Icon
                        className={[
                          "mx-auto h-8 w-8",
                          mode.tone === "cyan"
                            ? "text-neonCyan"
                            : mode.tone === "purple"
                              ? "text-fiestaPurple"
                              : mode.tone === "red"
                                ? "text-liveRed"
                                : "text-neonPink",
                        ].join(" ")}
                      />
                      <span className="mt-3 block text-sm font-black">{mode.label}</span>
                    </motion.button>
                  );
                })}
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
            </section>

            <section className="rounded-[1.45rem] border border-white/10 bg-white/[0.045] p-5 shadow-cyan backdrop-blur-2xl">
              <h2 className="text-2xl font-black text-white">
                {isLiveMode ? "Directo" : isEventMode ? "Publica un evento rápido" : "Escribe tu publicación"}
              </h2>

              <div className="mt-5 flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    alt={user.display_name || user.username}
                    className="h-16 w-16 rounded-full border-2 border-neonPink object-cover shadow-neon"
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-neonPink bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan text-xl font-black shadow-neon">
                    {initials(user)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">
                    {user?.display_name || user?.username || "BUCAN DEY"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-2 rounded-[0.8rem] border border-white/10 bg-white/7 px-3 py-2 text-sm font-bold text-white/70">
                    <Globe2 className="h-4 w-4" />
                    {privacyLabel(form.visibility)}
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {isLiveMode ? (
                <div className="mt-6 rounded-[1.2rem] border border-liveRed/25 bg-liveRed/10 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-liveRed">Live</p>
                  <p className="mt-3 text-2xl font-black text-white">Entra en directo ahora</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
                    El directo real se inicia desde la pantalla LiveKit preparada para BUCAN DEY.
                  </p>
                  <Link
                    className="mt-5 inline-flex h-12 items-center gap-2 rounded-[0.9rem] bg-liveRed px-5 text-sm font-black text-white shadow-live"
                    to="/lives/start"
                  >
                    Empezar directo
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mt-5 overflow-hidden rounded-[1.1rem] border border-white/10 bg-night/42">
                    <textarea
                      className="min-h-72 w-full resize-none bg-transparent px-5 py-5 text-xl font-semibold leading-8 text-white outline-none placeholder:text-white/34"
                      name="text"
                      value={form.text}
                      onChange={updateField}
                      placeholder="¿Qué está pasando ahora?"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                      <div className="flex items-center gap-4 text-white/66">
                        <Smile className="h-5 w-5" />
                        <span className="text-xl font-black">#</span>
                        <button
                          className="transition hover:text-neonCyan"
                          type="button"
                          onClick={() => setShowLocationPicker((current) => !current)}
                          aria-label="Añadir ubicación"
                        >
                          <MapPin className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-white/52">{form.text.length}/2000</span>
                    </div>
                  </div>

                  {mediaItems.length ? (
                    <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-white/10 bg-night">
                      {mediaItems.map((item) =>
                        item.type === "image" ? (
                          <img
                            alt="Vista previa"
                            className="max-h-[32rem] w-full object-cover"
                            src={item.url}
                            key={item.public_id || item.url}
                          />
                        ) : (
                          <video
                            className="max-h-[32rem] w-full bg-black"
                            controls
                            preload="metadata"
                            src={item.url}
                            key={item.public_id || item.url}
                          />
                        )
                      )}
                      <button
                        className="h-12 w-full border-t border-white/10 text-sm font-black text-neonPink"
                        type="button"
                        onClick={() => setMediaItems([])}
                      >
                        Quitar archivo
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {uploadError ? (
                <div className="mt-4 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
                  {uploadError}
                </div>
              ) : null}

              {isEventMode ? (
                <div className="mt-5 rounded-[1.2rem] border border-fiestaPurple/24 bg-fiestaPurple/10 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-neonPink">
                    Datos del evento
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink"
                      name="event_title"
                      value={form.event_title}
                      onChange={updateField}
                      placeholder="Título"
                    />
                    <input
                      className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink"
                      name="venue"
                      value={form.venue}
                      onChange={updateField}
                      placeholder="Lugar"
                    />
                    <input
                      className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none focus:border-neonPink"
                      name="start_at"
                      value={form.start_at}
                      onChange={updateField}
                      type="datetime-local"
                    />
                    <input
                      className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink"
                      name="price"
                      value={form.price}
                      onChange={updateField}
                      placeholder="Precio"
                    />
                  </div>
                  <label className="mt-3 flex items-center justify-between rounded-[0.9rem] border border-white/10 bg-white/6 px-4 py-3">
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

            <section className="grid gap-5">
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

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-5 lg:self-start">
            <LocationSummary form={form} position={position} />
            <PrivacyPanel form={form} updateField={updateField} />
            <PreviewCard user={user} form={form} mediaItems={mediaItems} />
          </aside>
        </div>

        <div className="sticky bottom-[6.9rem] z-20 mt-6 sm:bottom-[7rem]">
          <motion.button
            className="flex h-16 w-full items-center justify-center gap-3 rounded-[1rem] bg-gradient-to-r from-neonPink via-fiestaPurple to-[#4c00ff] text-lg font-black text-white shadow-neon disabled:opacity-60"
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
    <div className="mt-5 rounded-[1.15rem] border border-white/10 bg-night/38 p-4">
      <p className="text-base font-black text-white">Ubicación (opcional)</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
          name="city"
          value={form.city}
          onChange={updateField}
          placeholder="Ciudad"
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
          name="area"
          value={form.area}
          onChange={updateField}
          placeholder="Zona"
        />
      </div>

      <button
        className="mt-4 flex w-full items-center justify-between rounded-[0.95rem] border border-white/10 bg-white/6 px-4 py-4 text-left"
        type="button"
        onClick={() => setShowLocationPicker((current) => !current)}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fiestaPurple/18 text-fiestaPurple">
            <MapPin className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black text-white">Añadir ubicación</span>
            <span className="block text-sm font-semibold text-white/50">Ciudad, zona o punto en el mapa</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-white/62" />
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-[0.85rem] border border-white/10 bg-white/6 text-sm font-black text-white disabled:opacity-60"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          <LocateFixed className="h-4 w-4" />
          {isLocating ? "Buscando..." : "Usar mi ubicación"}
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-[0.85rem] border border-white/10 bg-white/6 text-sm font-black text-white"
          type="button"
          onClick={() => setShowLocationPicker((current) => !current)}
        >
          <MapIcon className="h-4 w-4" />
          Elegir en mapa
        </button>
      </div>

      {position ? (
        <div className="mt-3 rounded-[0.95rem] border border-neonCyan/25 bg-neonCyan/10 px-4 py-3 text-sm font-bold text-white">
          Ubicación seleccionada: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
        </div>
      ) : null}

      {showLocationPicker ? (
        <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-neonCyan/20 shadow-cyan">
          <div className="h-72 w-full">
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
          <p className="bg-night px-4 py-3 text-xs font-semibold text-white/56">
            Toca el mapa para seleccionar el punto de la publicación.
          </p>
        </div>
      ) : null}

      {locationError ? (
        <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {locationError}
        </div>
      ) : null}

      <label className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <span>
          <span className="block text-sm font-black text-white">Mostrar en el mapa</span>
          <span className="mt-1 block text-sm font-semibold text-white/50">
            Tu publicación será visible en el mapa
          </span>
        </span>
        <input
          className="h-6 w-6 accent-pink-500"
          type="checkbox"
          name="show_on_map"
          checked={form.show_on_map}
          onChange={updateField}
        />
      </label>
    </div>
  );
}

function LocationSummary({ form, position }) {
  return (
    <section className="rounded-[1.3rem] border border-white/10 bg-white/[0.045] p-4 shadow-cyan backdrop-blur-2xl">
      <h2 className="flex items-center gap-3 text-lg font-black uppercase text-white">
        <MapPin className="h-5 w-5 text-fiestaPurple" />
        Ubicación
      </h2>
      <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-night">
        <div className="relative h-36 bg-[linear-gradient(135deg,rgba(0,217,255,.14),rgba(124,58,237,.18)),repeating-linear-gradient(35deg,rgba(255,216,77,.17)_0_1px,transparent_1px_38px),repeating-linear-gradient(120deg,rgba(255,255,255,.06)_0_1px,transparent_1px_34px)]">
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 shadow-[0_0_0_18px_rgba(59,130,246,.18),0_0_30px_rgba(59,130,246,.7)]" />
        </div>
      </div>
      <p className="mt-4 font-black text-white">{selectedLocationLabel(form)}, Guinea Ecuatorial</p>
      <p className="mt-1 text-sm font-semibold text-white/54">
        {position ? "Punto seleccionado" : "Centro de Malabo"}
      </p>
    </section>
  );
}

function PrivacyPanel({ form, updateField }) {
  return (
    <section className="rounded-[1.3rem] border border-white/10 bg-white/[0.045] p-4 shadow-cyan backdrop-blur-2xl">
      <h2 className="flex items-center gap-3 text-lg font-black uppercase text-white">
        <Shield className="h-5 w-5 text-white/70" />
        Privacidad
      </h2>
      <p className="mt-4 text-sm font-semibold text-white/64">¿Quién puede ver tu publicación?</p>
      <div className="mt-4 space-y-2">
        {privacyOptions.map((option) => {
          const Icon = option.icon;
          const isActive = form.visibility === option.value;
          return (
            <label
              className={[
                "flex cursor-pointer items-center gap-3 rounded-[0.95rem] border px-3 py-3 transition",
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

function PreviewCard({ user, form, mediaItems }) {
  return (
    <section className="rounded-[1.3rem] border border-white/10 bg-white/[0.045] p-4 shadow-cyan backdrop-blur-2xl">
      <h2 className="flex items-center gap-3 text-lg font-black uppercase text-white">
        <Eye className="h-5 w-5 text-white/70" />
        Vista previa
      </h2>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-night/48 p-4">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              alt={user.display_name || user.username}
              className="h-11 w-11 rounded-full border border-neonPink object-cover"
              src={user.avatar_url}
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-neonPink bg-gradient-to-br from-neonPink to-neonCyan text-sm font-black">
              {initials(user)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">
              {user?.display_name || user?.username || "BUCAN DEY"}
            </p>
            <p className="text-xs font-semibold text-white/48">Ahora · {privacyLabel(form.visibility)}</p>
          </div>
          <span className="text-xl font-black text-white/40">...</span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-white">
          {form.text.trim() || "¿Qué está pasando ahora?"}
        </p>

        {mediaItems.length ? (
          <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-white/10">
            {mediaItems[0].type === "image" ? (
              <img alt="Preview" className="max-h-64 w-full object-cover" src={mediaItems[0].url} />
            ) : (
              <video className="max-h-64 w-full bg-black" controls preload="metadata" src={mediaItems[0].url} />
            )}
          </div>
        ) : null}

        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-neonCyan">
          <MapPin className="h-4 w-4" />
          {selectedLocationLabel(form)}, Guinea Ecuatorial
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-white/68">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
          <Navigation className="h-6 w-6" />
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 rounded-[0.75rem] border border-white/10 bg-white/6 px-3 py-2 text-sm font-bold text-white/70">
        <Globe2 className="h-4 w-4" />
        {privacyLabel(form.visibility)}
      </span>
    </section>
  );
}

function FeatureRouteCard({ icon: Icon, title, subtitle, body, button, to, tone }) {
  const isRed = tone === "red";
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.25rem] border bg-white/[0.045] p-5 shadow-cyan backdrop-blur-2xl sm:p-7",
        isRed ? "border-liveRed/30" : "border-fiestaPurple/30",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute right-10 top-1/2 h-32 w-48 -translate-y-1/2 rounded-full blur-3xl",
          isRed ? "bg-liveRed/22" : "bg-fiestaPurple/24",
        ].join(" ")}
      />
      <div className="relative z-10 grid gap-5 sm:grid-cols-[1fr_18rem] sm:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-lg font-black uppercase text-white">
            <Icon className={isRed ? "h-6 w-6 text-liveRed" : "h-6 w-6 text-fiestaPurple"} />
            {title}
          </h2>
          <p className="mt-3 text-lg font-black text-white/72">{subtitle}</p>
          <p className="mt-2 text-base font-semibold leading-7 text-white/62">{body}</p>
          <Link
            className={[
              "mt-5 inline-flex h-12 items-center gap-2 rounded-[0.85rem] px-5 text-sm font-black text-white",
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
            "hidden min-h-36 rounded-[1.2rem] border bg-night/40 sm:flex sm:items-center sm:justify-center",
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
