import { useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

const initialForm = {
  text: "",
  visibility: "global",
  city: "",
  area: "",
  lat: "",
  lng: "",
  show_on_map: false,
};

function CreateStory() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      setMedia(response.data);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function handleUseCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener ubicación.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: Number(position.coords.latitude).toFixed(6),
          lng: Number(position.coords.longitude).toFixed(6),
          show_on_map: true,
        }));
        setIsLocating(false);
      },
      () => {
        setLocationError("No se pudo obtener tu ubicación.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!media) {
      setError("Sube una imagen o vídeo para tu story.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      const response = await apiClient.post("/stories", {
        media,
        text: form.text,
        visibility: form.visibility,
        location: {
          city: form.city,
          area: form.area,
          lat: form.show_on_map && form.lat !== "" ? Number(form.lat) : null,
          lng: form.show_on_map && form.lng !== "" ? Number(form.lng) : null,
          show_on_map: form.show_on_map,
        },
      });
      navigate(`/stories/${response.data.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="-mx-4 -mt-5 min-h-screen bg-night px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
            Story 24h
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">Crear Story</h1>
        </div>
        <button
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-black text-white/70"
          type="button"
          onClick={() => navigate(-1)}
        >
          Cerrar
        </button>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block overflow-hidden rounded-lg border border-white/10 bg-surface">
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={handleMediaSelect}
          />
          {media ? (
            media.type === "image" ? (
              <img
                alt="Preview story"
                className="h-[28rem] w-full object-cover"
                src={media.url}
              />
            ) : (
              <video
                className="h-[28rem] w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                src={media.url}
              />
            )
          ) : (
            <div className="flex h-[28rem] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-3xl font-black text-night">
                +
              </div>
              <p className="mt-4 text-lg font-black text-white">
                Selecciona imagen o vídeo
              </p>
              <p className="mt-2 text-sm leading-6 text-white/54">
                Estados rápidos para enseñar qué está pasando ahora.
              </p>
            </div>
          )}
        </label>

        {isUploading || uploadError ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold text-white ${
              uploadError
                ? "border-neonPink/30 bg-neonPink/10"
                : "border-neonGreen/30 bg-neonGreen/10"
            }`}
          >
            {uploadError || "Subiendo archivo..."}
          </div>
        ) : null}

        {media ? (
          <button
            className="h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-white"
            type="button"
            onClick={() => setMedia(null)}
          >
            Quitar archivo
          </button>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Texto opcional</span>
          <textarea
            className="mt-2 min-h-24 w-full resize-none rounded-lg border border-white/10 bg-surface px-4 py-4 text-base leading-7 text-white outline-none placeholder:text-white/32 focus:border-neonPink"
            name="text"
            value={form.text}
            onChange={updateField}
            placeholder="¿Qué momento quieres enseñar?"
            maxLength={300}
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-white/78">Visibilidad</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: "global", label: "Global" },
              { value: "followers", label: "Seguidores" },
            ].map((option) => (
              <label
                className={`rounded-lg border px-3 py-3 text-sm font-black ${
                  form.visibility === option.value
                    ? "border-neonPink bg-neonPink/16 text-white"
                    : "border-white/10 bg-surface text-white/68"
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
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Ubicación opcional</p>
              <p className="mt-1 text-xs text-white/48">
                Solo se guarda si decides mostrar esta story en el mapa.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-black text-white/70">
              <input
                type="checkbox"
                name="show_on_map"
                checked={form.show_on_map}
                onChange={updateField}
              />
              Mapa
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <input
              className="rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-semibold text-white outline-none focus:border-neonPink"
              name="city"
              value={form.city}
              onChange={updateField}
              placeholder="Ciudad"
            />
            <input
              className="rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-semibold text-white outline-none focus:border-neonPink"
              name="area"
              value={form.area}
              onChange={updateField}
              placeholder="Zona"
            />
          </div>

          <button
            className="mt-3 h-11 w-full rounded-lg border border-neonGreen/30 bg-neonGreen/10 text-sm font-black text-neonGreen"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? "Buscando..." : "Usar mi ubicación actual"}
          </button>

          {locationError ? (
            <p className="mt-3 text-sm font-semibold text-neonPink">{locationError}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night shadow-neon disabled:opacity-60"
          disabled={isSubmitting || isUploading}
          type="submit"
        >
          {isSubmitting ? "Publicando..." : "Publicar Story"}
        </button>
      </form>
    </section>
  );
}

export default CreateStory;
