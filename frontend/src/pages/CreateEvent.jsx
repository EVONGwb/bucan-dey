import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    html: '<div style="width:26px;height:26px;border-radius:999px;background:#17f56b;border:4px solid #08070d;box-shadow:0 0 22px #17f56b;"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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

function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [coverMedia, setCoverMedia] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
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

  const selectedPosition =
    form.lat !== "" && form.lng !== "" ? [Number(form.lat), Number(form.lng)] : null;

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Nuevo evento
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Crear evento</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Convierte una fiesta, bar o cumpleaños en un punto social real.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-white/78">Título</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base font-semibold text-white outline-none focus:border-neonPink"
            name="title"
            value={form.title}
            onChange={updateField}
            required
            maxLength={120}
            placeholder="Nombre del evento"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Descripción</span>
          <textarea
            className="mt-2 min-h-32 w-full resize-none rounded-lg border border-white/10 bg-surface px-4 py-4 text-base leading-7 text-white outline-none focus:border-neonPink"
            name="description"
            value={form.description}
            onChange={updateField}
            maxLength={1200}
            placeholder="Qué va a pasar, ambiente, música, dress code..."
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-white/78">Categoría</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {categories.map(([value, label]) => (
              <label
                className={`rounded-lg border px-3 py-3 text-sm font-black ${
                  form.category === value
                    ? "border-neonPink bg-neonPink/16 text-white"
                    : "border-white/10 bg-surface text-white/68"
                }`}
                key={value}
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
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <p className="text-sm font-black text-white">Portada</p>
          {coverMedia ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-night">
              {coverMedia.type === "image" ? (
                <img alt="Portada" className="max-h-96 w-full object-cover" src={coverMedia.url} />
              ) : (
                <video className="max-h-96 w-full bg-black" controls preload="metadata" src={coverMedia.url} />
              )}
              <button
                className="h-11 w-full border-t border-white/10 text-sm font-black text-neonPink"
                type="button"
                onClick={() => setCoverMedia(null)}
              >
                Quitar portada
              </button>
            </div>
          ) : (
            <label className="mt-4 flex min-h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/18 bg-white/5 text-sm font-black text-white">
              {isUploading ? "Subiendo..." : "Seleccionar imagen/vídeo"}
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
            <div className="mt-3 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {uploadError}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-white/78">Ciudad</span>
            <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="city" value={form.city} onChange={updateField} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white/78">Zona</span>
            <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="area" value={form.area} onChange={updateField} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Lugar</span>
          <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="venue_name" value={form.venue_name} onChange={updateField} placeholder="Bar, sala, casa, playa..." />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Dirección</span>
          <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="address" value={form.address} onChange={updateField} />
        </label>

        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <p className="text-sm font-black text-white">Ubicación en mapa</p>
          <p className="mt-1 text-xs font-semibold text-white/48">
            BUCAN DEY solo guardará esta ubicación para mostrar el evento si tú la eliges.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="h-12 rounded-lg border border-neonGreen/30 bg-neonGreen/10 text-sm font-black text-neonGreen" type="button" onClick={useCurrentLocation} disabled={isLocating}>
              {isLocating ? "Buscando..." : "Usar mi ubicación"}
            </button>
            <button className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white" type="button" onClick={() => setShowMap((current) => !current)}>
              Elegir en mapa
            </button>
          </div>

          {selectedPosition ? (
            <p className="mt-3 text-xs font-bold text-neonGreen">
              Ubicación seleccionada: {form.lat}, {form.lng}
            </p>
          ) : null}

          {showMap ? (
            <div className="mt-4 h-72 overflow-hidden rounded-lg border border-white/10">
              <MapContainer center={selectedPosition || MALABO_CENTER} className="h-full w-full" scrollWheelZoom={false} zoom={13}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onSelect={(latlng) => setSelectedLocation(latlng.lat, latlng.lng)} />
                {selectedPosition ? <Marker icon={createSelectedIcon()} position={selectedPosition} /> : null}
              </MapContainer>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-white/78">Inicio</span>
            <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="start_at" type="datetime-local" value={form.start_at} onChange={updateField} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white/78">Fin</span>
            <input className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-white outline-none" name="end_at" type="datetime-local" value={form.end_at} onChange={updateField} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ["public", "Público"],
            ["followers", "Seguidores"],
          ].map(([value, label]) => (
            <label className={`rounded-lg border px-4 py-3 text-sm font-black ${form.visibility === value ? "border-neonGreen bg-neonGreen/12 text-white" : "border-white/10 bg-surface text-white/68"}`} key={value}>
              <input className="sr-only" type="radio" name="visibility" value={value} checked={form.visibility === value} onChange={updateField} />
              {label}
            </label>
          ))}
        </div>

        {error ? (
          <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-base font-black text-night shadow-neon disabled:opacity-60"
          type="submit"
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? "Creando..." : "Crear evento"}
        </button>
      </form>
    </section>
  );
}

export default CreateEvent;
