import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

const postTypes = [
  { value: "normal", label: "Normal" },
  { value: "fiesta", label: "Fiesta" },
  { value: "cumpleaños", label: "Cumpleaños" },
  { value: "evento", label: "Evento" },
  { value: "live", label: "Live" },
  { value: "bar", label: "Bar" },
  { value: "ambiente", label: "Ambiente" },
  { value: "video", label: "Vídeo" },
];

const visibilityOptions = [
  { value: "global", label: "Global", description: "Aparece en Inicio" },
  { value: "profile_only", label: "Solo perfil", description: "Solo aparece en tu perfil" },
  { value: "private", label: "Privado", description: "Solo lo ves tú" },
];

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

const MALABO_CENTER = [3.7523, 8.7741];

function createSelectedIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:26px;height:26px;border-radius:999px;background:#ff1478;border:4px solid #08070d;box-shadow:0 0 22px #ff1478;"></div>',
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

function CreatePost() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [mediaItems, setMediaItems] = useState([]);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasEventFields = useMemo(
    () => ["evento", "fiesta", "cumpleaños"].includes(form.type),
    [form.type]
  );

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
      (position) => {
        setSelectedLocation(position.coords.latitude, position.coords.longitude);
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

  async function handleMediaSelect(event) {
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
      setMediaItems([response.data]);
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

    const payload = {
      type: form.type,
      visibility: form.visibility,
      text: form.text,
      media: mediaItems,
      location: {
        city: form.city,
        area: form.area,
        lat: form.show_on_map && form.lat !== "" ? Number(form.lat) : null,
        lng: form.show_on_map && form.lng !== "" ? Number(form.lng) : null,
        show_on_map: form.show_on_map,
      },
    };

    if (hasEventFields) {
      payload.event_data = {
        title: form.event_title,
        venue: form.venue,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        price: form.price,
        is_open: form.is_open,
      };
    }

    try {
      await apiClient.post("/posts", payload);
      navigate(form.visibility === "global" ? "/" : "/profile", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Publicar
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Crear</h1>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-white/78">Texto</span>
          <textarea
            className="mt-2 min-h-36 w-full resize-none rounded-lg border border-white/10 bg-surface px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="text"
            value={form.text}
            onChange={updateField}
            placeholder="¿Qué está pasando ahora?"
            maxLength={1000}
            required
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-white/78">Tipo</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {postTypes.map((type) => (
              <label
                className={`rounded-lg border px-3 py-3 text-sm font-black transition ${
                  form.type === type.value
                    ? "border-neonPink bg-neonPink/16 text-white"
                    : "border-white/10 bg-surface text-white/68"
                }`}
                key={type.value}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={form.type === type.value}
                  onChange={updateField}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <p className="text-sm font-black text-white">Foto o vídeo</p>
          <p className="mt-1 text-xs font-semibold text-white/48">
            Imágenes hasta 10 MB. Vídeos hasta 100 MB.
          </p>

          {mediaItems.length === 0 ? (
            <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/18 bg-white/5 px-4 text-center">
              <span className="text-sm font-black text-white">
                {isUploading ? "Subiendo..." : "Seleccionar imagen/vídeo"}
              </span>
              <span className="mt-1 text-xs font-semibold text-white/42">
                JPEG, PNG, WEBP, MP4, MOV o WEBM
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={handleMediaSelect}
                disabled={isUploading}
              />
            </label>
          ) : null}

          {mediaItems.map((item) => (
            <div key={item.public_id || item.url} className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-night">
              {item.type === "image" ? (
                <img
                  alt="Preview"
                  className="max-h-96 w-full object-cover"
                  src={item.url}
                />
              ) : (
                <video
                  className="max-h-96 w-full bg-black"
                  controls
                  preload="metadata"
                  src={item.url}
                />
              )}
              <button
                className="h-11 w-full border-t border-white/10 text-sm font-black text-neonPink"
                type="button"
                onClick={() => setMediaItems([])}
              >
                Quitar archivo
              </button>
            </div>
          ))}

          {uploadError ? (
            <div className="mt-3 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {uploadError}
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold text-white/78">Visibilidad</p>
          <div className="mt-2 space-y-2">
            {visibilityOptions.map((option) => (
              <label
                className={`block rounded-lg border px-4 py-3 transition ${
                  form.visibility === option.value
                    ? "border-neonGreen bg-neonGreen/12"
                    : "border-white/10 bg-surface"
                }`}
                key={option.value}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={form.visibility === option.value}
                  onChange={updateField}
                />
                <span className="block text-sm font-black text-white">{option.label}</span>
                <span className="mt-1 block text-xs font-semibold text-white/50">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <p className="text-sm font-black text-white">Ubicación opcional</p>
          <p className="mt-1 text-xs font-semibold text-white/48">
            BUCAN DEY usará tu ubicación solo para colocar esta publicación en el mapa si tú lo permites.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <input
              className="h-12 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
              name="city"
              value={form.city}
              onChange={updateField}
              placeholder="Ciudad"
            />
            <input
              className="h-12 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
              name="area"
              value={form.area}
              onChange={updateField}
              placeholder="Zona/Barrio"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="min-h-12 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-3 text-sm font-black text-white transition active:scale-[0.99]"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? "Buscando..." : "Usar mi ubicación actual"}
            </button>
            <button
              className="min-h-12 rounded-lg border border-neonPink/30 bg-neonPink/10 px-3 text-sm font-black text-white transition active:scale-[0.99]"
              type="button"
              onClick={() => setShowLocationPicker((current) => !current)}
            >
              Elegir en el mapa
            </button>
          </div>

          {form.lat && form.lng ? (
            <div className="mt-4 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-4 py-3 text-sm font-bold text-white">
              Ubicación seleccionada: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
            </div>
          ) : null}

          {showLocationPicker ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
              <div className="h-80 w-full">
                <MapContainer
                  center={form.lat && form.lng ? [Number(form.lat), Number(form.lng)] : MALABO_CENTER}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                  zoom={13}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler
                    onSelect={(latlng) => setSelectedLocation(latlng.lat, latlng.lng)}
                  />
                  {form.lat && form.lng ? (
                    <Marker
                      icon={createSelectedIcon()}
                      position={[Number(form.lat), Number(form.lng)]}
                    />
                  ) : null}
                </MapContainer>
              </div>
              <p className="bg-night px-4 py-3 text-xs font-semibold text-white/56">
                Toca el mapa para seleccionar el punto de la publicación.
              </p>
            </div>
          ) : null}

          {locationError ? (
            <div className="mt-3 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {locationError}
            </div>
          ) : null}

          <label className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm font-semibold text-white">Mostrar en mapa</span>
            <input
              className="h-5 w-5 accent-pink-500"
              type="checkbox"
              name="show_on_map"
              checked={form.show_on_map}
              onChange={updateField}
            />
          </label>
        </div>

        {hasEventFields ? (
          <div className="rounded-lg border border-white/10 bg-surface p-4">
            <p className="text-sm font-black text-white">Datos del evento</p>
            <div className="mt-4 space-y-3">
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
                name="event_title"
                value={form.event_title}
                onChange={updateField}
                placeholder="Título del evento"
              />
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
                name="venue"
                value={form.venue}
                onChange={updateField}
                placeholder="Lugar"
              />
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-neonPink"
                name="start_at"
                type="datetime-local"
                value={form.start_at}
                onChange={updateField}
              />
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-neonPink"
                name="price"
                value={form.price}
                onChange={updateField}
                placeholder="Precio"
              />
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm font-semibold text-white">Evento abierto</span>
                <input
                  className="h-5 w-5 accent-pink-500"
                  type="checkbox"
                  name="is_open"
                  checked={form.is_open}
                  onChange={updateField}
                />
              </label>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-base font-black text-night shadow-neon transition active:scale-[0.99] disabled:opacity-60"
          type="submit"
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? "Publicando..." : "Publicar"}
        </button>
      </form>
    </section>
  );
}

export default CreatePost;
