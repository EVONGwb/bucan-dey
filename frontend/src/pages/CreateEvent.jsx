import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  LocateFixed,
  MapPin,
  Sparkles,
  Upload,
} from "lucide-react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

const MALABO_CENTER = [3.7523, 8.7741];

const categories = [
  ["fiesta", "Fiesta"],
  ["cumpleaños", "Cumpleaños"],
  ["concierto", "Concierto"],
  ["bar", "Bar"],
  ["evento", "Evento"],
  ["meetup", "Meetup"],
  ["deporte", "Deporte"],
  ["otro", "Otro"],
];

const steps = [
  { title: "Base", subtitle: "Nombre y estilo" },
  { title: "Portada", subtitle: "Media y fecha" },
  { title: "Ubicación", subtitle: "Dónde pasa" },
  { title: "Publicar", subtitle: "Resumen final" },
];

const initialForm = {
  title: "",
  description: "",
  category: "evento",
  city: "Malabo",
  area: "",
  venue_name: "",
  address: "",
  lat: "",
  lng: "",
  start_at: "",
  end_at: "",
  visibility: "public",
};

function createSelectedIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fff,#FFD84D 35%,#FF4FD8 78%);border:4px solid #070B14;box-shadow:0 0 0 8px rgba(255,216,77,.18),0 0 28px rgba(255,79,216,.64);"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });

  return null;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-white/72">{label}</span>
      {children}
    </label>
  );
}

function StepBadge({ index, isActive, isDone, step }) {
  return (
    <div className="min-w-[4.5rem] text-center">
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black transition ${
          isActive
            ? "border-neonYellow/50 bg-neonYellow/18 text-neonYellow shadow-neon"
            : isDone
              ? "border-neonCyan/40 bg-neonCyan/14 text-neonCyan"
              : "border-white/10 bg-white/7 text-white/44"
        }`}
      >
        {isDone ? <Check className="h-4 w-4" /> : index + 1}
      </div>
      <p className="mt-2 text-[11px] font-black text-white">{step.title}</p>
      <p className="text-[10px] font-bold text-white/36">{step.subtitle}</p>
    </div>
  );
}

function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [coverMedia, setCoverMedia] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [step, setStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const selectedPosition =
    form.lat !== "" && form.lng !== "" ? [Number(form.lat), Number(form.lng)] : null;

  const eventSummary = useMemo(() => {
    const category = categories.find(([value]) => value === form.category)?.[1] || "Evento";
    const date = form.start_at
      ? new Date(form.start_at).toLocaleString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Fecha pendiente";

    return {
      category,
      date,
      location: [form.city, form.area, form.venue_name].filter(Boolean).join(" · ") || "Sin ubicación",
    };
  }, [form.area, form.category, form.city, form.start_at, form.venue_name]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setSelectedLocation(lat, lng) {
    setForm((current) => ({
      ...current,
      lat: Number(lat).toFixed(6),
      lng: Number(lng).toFixed(6),
    }));
  }

  function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación. Puedes elegir el punto en el mapa.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation(position.coords.latitude, position.coords.longitude);
        setShowMap(true);
        setIsLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación. Puedes elegir el punto manualmente.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function handleCoverSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadError("");
      setIsUploading(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCoverMedia(response.data);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function validateBeforeSubmit() {
    if (!form.title.trim()) {
      setError("Añade un título para el evento.");
      setStep(0);
      return false;
    }
    if (!form.start_at) {
      setError("Añade la fecha y hora de inicio.");
      setStep(1);
      return false;
    }
    if (!form.city.trim()) {
      setError("Añade la ciudad del evento.");
      setStep(2);
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/events", {
        title: form.title,
        description: form.description,
        category: form.category,
        cover_media: coverMedia,
        location: {
          city: form.city,
          area: form.area,
          venue_name: form.venue_name,
          address: form.address,
          lat: form.lat !== "" ? Number(form.lat) : null,
          lng: form.lng !== "" ? Number(form.lng) : null,
        },
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        visibility: form.visibility,
      });
      navigate(`/events/${response.data.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden pb-8 text-white sm:mx-0">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-neonYellow/14 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-48 h-72 w-72 rounded-full bg-fiestaPurple/18 blur-3xl" />

      <div className="relative z-10 px-4">
        <motion.header
          className="glass-panel rounded-[2rem] p-5"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-4">
            <Link
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white"
              to="/events"
              aria-label="Volver a eventos"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="rounded-full border border-neonYellow/30 bg-neonYellow/12 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-neonYellow">
              Nuevo plan
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white">
            Crear evento
          </h1>
          <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/62">
            Convierte una fiesta, bar o cumpleaños en un punto social real.
          </p>
        </motion.header>

        <div className="scrollbar-none mt-4 flex justify-between gap-3 overflow-x-auto rounded-[1.6rem] border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
          {steps.map((item, index) => (
            <StepBadge
              key={item.title}
              index={index}
              step={item}
              isActive={step === index}
              isDone={step > index}
            />
          ))}
        </div>

        <form className="mt-5" onSubmit={handleSubmit}>
          <motion.div
            key={step}
            className="glass-panel rounded-[2rem] p-5"
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 ? (
              <div className="space-y-5">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonYellow">
                    <Sparkles className="h-4 w-4" />
                    Paso 1
                  </p>
                  <h2 className="mt-2 text-2xl font-black">La vibra del evento</h2>
                </div>

                <Field label="Título">
                  <input
                    className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-base font-semibold text-white outline-none focus:border-neonYellow"
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    maxLength={120}
                    placeholder="Nombre del evento"
                  />
                </Field>

                <Field label="Descripción">
                  <textarea
                    className="mt-2 min-h-36 w-full resize-none rounded-[1.15rem] border border-white/10 bg-black/22 px-4 py-4 text-base font-semibold leading-7 text-white outline-none focus:border-neonYellow"
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    maxLength={1200}
                    placeholder="Qué va a pasar, ambiente, música, dress code..."
                  />
                </Field>

                <div>
                  <p className="text-sm font-black text-white/72">Categoría</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {categories.map(([value, label]) => (
                      <motion.label
                        className={`rounded-[1.1rem] border px-3 py-3 text-sm font-black ${
                          form.category === value
                            ? "border-neonYellow/50 bg-neonYellow/14 text-neonYellow shadow-neon"
                            : "border-white/10 bg-white/7 text-white/62"
                        }`}
                        key={value}
                        whileTap={{ scale: 0.96 }}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="category"
                          value={value}
                          checked={form.category === value}
                          onChange={updateField}
                        />
                        {label}
                      </motion.label>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonPink">
                    <ImagePlus className="h-4 w-4" />
                    Paso 2
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Portada y fecha</h2>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                  <p className="text-sm font-black text-white/72">Portada</p>
                  {coverMedia ? (
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-night">
                      {coverMedia.type === "image" ? (
                        <img alt="Portada" className="max-h-96 w-full object-cover" src={coverMedia.url} />
                      ) : (
                        <video className="max-h-96 w-full bg-black" controls preload="metadata" src={coverMedia.url} />
                      )}
                      <button
                        className="h-12 w-full border-t border-white/10 text-sm font-black text-neonPink"
                        type="button"
                        onClick={() => setCoverMedia(null)}
                      >
                        Quitar portada
                      </button>
                    </div>
                  ) : (
                    <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-neonYellow/35 bg-neonYellow/8 text-sm font-black text-white">
                      <Upload className="mb-2 h-6 w-6 text-neonYellow" />
                      {isUploading ? "Subiendo..." : "Seleccionar imagen o vídeo"}
                      <span className="mt-1 text-xs font-semibold text-white/42">
                        Portada visual para destacar en eventos
                      </span>
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                        onChange={handleCoverSelect}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                  {uploadError ? (
                    <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
                      {uploadError}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Fecha/hora inicio">
                    <input
                      className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonYellow"
                      name="start_at"
                      type="datetime-local"
                      value={form.start_at}
                      onChange={updateField}
                    />
                  </Field>
                  <Field label="Fecha/hora fin">
                    <input
                      className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonYellow"
                      name="end_at"
                      type="datetime-local"
                      value={form.end_at}
                      onChange={updateField}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonCyan">
                    <MapPin className="h-4 w-4" />
                    Paso 3
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Dónde está el ambiente</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
                    BUCAN DEY usará esta ubicación solo para colocar este evento en el mapa.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ciudad">
                    <input
                      className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonCyan"
                      name="city"
                      value={form.city}
                      onChange={updateField}
                    />
                  </Field>
                  <Field label="Zona/Barrio">
                    <input
                      className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonCyan"
                      name="area"
                      value={form.area}
                      onChange={updateField}
                    />
                  </Field>
                </div>

                <Field label="Lugar">
                  <input
                    className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonCyan"
                    name="venue_name"
                    value={form.venue_name}
                    onChange={updateField}
                    placeholder="Bar, sala, playa, casa..."
                  />
                </Field>

                <Field label="Dirección">
                  <input
                    className="mt-2 h-14 w-full rounded-[1.15rem] border border-white/10 bg-black/22 px-4 text-white outline-none focus:border-neonCyan"
                    name="address"
                    value={form.address}
                    onChange={updateField}
                    placeholder="Referencia o dirección"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    className="flex h-12 items-center justify-center gap-2 rounded-full border border-neonCyan/32 bg-neonCyan/10 text-sm font-black text-neonCyan disabled:opacity-60"
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={isLocating}
                    whileTap={{ scale: 0.96 }}
                  >
                    <LocateFixed className="h-4 w-4" />
                    {isLocating ? "Buscando..." : "Usar ubicación"}
                  </motion.button>
                  <motion.button
                    className="flex h-12 items-center justify-center gap-2 rounded-full border border-neonPink/32 bg-neonPink/10 text-sm font-black text-neonPink"
                    type="button"
                    onClick={() => setShowMap((current) => !current)}
                    whileTap={{ scale: 0.96 }}
                  >
                    <MapPin className="h-4 w-4" />
                    Elegir en mapa
                  </motion.button>
                </div>

                <div className="rounded-[1.25rem] border border-white/10 bg-white/7 px-4 py-3 text-sm font-bold text-white/64">
                  {selectedPosition
                    ? `Ubicación seleccionada: ${form.lat}, ${form.lng}`
                    : "Toca el mapa o usa tu ubicación para añadir coordenadas."}
                </div>

                {showMap ? (
                  <div className="h-72 overflow-hidden rounded-[1.5rem] border border-white/10">
                    <MapContainer
                      center={selectedPosition || MALABO_CENTER}
                      className="bucan-map h-full w-full"
                      scrollWheelZoom={false}
                      zoom={selectedPosition ? 15 : 12}
                      zoomControl={false}
                    >
                      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapClickHandler
                        onSelect={(latlng) => {
                          setSelectedLocation(latlng.lat, latlng.lng);
                        }}
                      />
                      {selectedPosition ? <Marker icon={createSelectedIcon()} position={selectedPosition} /> : null}
                    </MapContainer>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonYellow">
                    <Eye className="h-4 w-4" />
                    Paso 4
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Publicar evento</h2>
                </div>

                <div>
                  <p className="text-sm font-black text-white/72">Visibilidad</p>
                  <div className="mt-3 grid gap-2">
                    {[
                      ["public", "Público", "Visible en eventos, mapa y feed si aplica."],
                      ["followers", "Seguidores", "Solo para la gente que te sigue."],
                    ].map(([value, label, description]) => (
                      <label
                        className={`rounded-[1.2rem] border p-4 ${
                          form.visibility === value
                            ? "border-neonYellow/45 bg-neonYellow/12"
                            : "border-white/10 bg-white/7"
                        }`}
                        key={value}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="visibility"
                          value={value}
                          checked={form.visibility === value}
                          onChange={updateField}
                        />
                        <span className="text-base font-black text-white">{label}</span>
                        <span className="mt-1 block text-sm font-semibold text-white/48">
                          {description}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-neonYellow/24 bg-neonYellow/10">
                  <div className="h-32 bg-[radial-gradient(circle_at_20%_10%,rgba(255,216,77,.42),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(255,79,216,.32),transparent_34%),linear-gradient(135deg,rgba(124,58,237,.48),rgba(7,11,20,.98))]">
                    {coverMedia?.type === "image" ? (
                      <img alt="" className="h-full w-full object-cover opacity-86" src={coverMedia.url} />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <span className="rounded-full border border-neonYellow/35 bg-neonYellow/14 px-3 py-1 text-xs font-black uppercase text-neonYellow">
                      {eventSummary.category}
                    </span>
                    <h3 className="mt-3 text-2xl font-black text-white">
                      {form.title || "Título del evento"}
                    </h3>
                    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white/62">
                      <CalendarDays className="h-4 w-4 text-neonYellow" />
                      {eventSummary.date}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white/62">
                      <MapPin className="h-4 w-4 text-neonCyan" />
                      {eventSummary.location}
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
                    {error}
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>

          {error && step !== 3 ? (
            <div className="mt-4 rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <motion.button
              className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white disabled:opacity-40"
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || isSubmitting}
              whileTap={{ scale: 0.96 }}
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </motion.button>
            {step < steps.length - 1 ? (
              <motion.button
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-sm font-black text-white shadow-cyan"
                type="button"
                onClick={() => {
                  setError("");
                  setStep((current) => Math.min(steps.length - 1, current + 1));
                }}
                whileTap={{ scale: 0.96 }}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neonYellow via-neonPink to-neonCyan text-sm font-black text-white shadow-neon disabled:opacity-60"
                type="submit"
                disabled={isSubmitting || isUploading}
                whileTap={{ scale: 0.96 }}
              >
                {isSubmitting ? "Creando..." : "Crear evento"}
              </motion.button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export default CreateEvent;
