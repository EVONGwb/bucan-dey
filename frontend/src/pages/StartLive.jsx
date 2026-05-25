import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, RoomEvent, createLocalTracks } from "livekit-client";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

const categories = ["fiesta", "bar", "cumpleaños", "evento", "ambiente", "música", "otro"];

function StartLive() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const tracksRef = useRef([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ambiente",
    visibility: "public",
    city: "Malabo",
    area: "",
    lat: null,
    lng: null,
    show_on_map: true,
  });
  const [live, setLive] = useState(null);
  const [viewersCount, setViewersCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((track) => track.stop());
      roomRef.current?.disconnect();
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function startLive(event) {
    event.preventDefault();
    setError("");
    setIsStarting(true);

    try {
      const response = await apiClient.post("/lives/start", {
        title: form.title,
        description: form.description,
        category: form.category,
        visibility: form.visibility,
        location: {
          city: form.city,
          area: form.area,
          lat: form.lat,
          lng: form.lng,
          show_on_map: form.show_on_map,
        },
      });

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => setViewersCount(0));

      await room.connect(response.data.livekit_url, response.data.token);
      const tracks = await createLocalTracks({ audio: true, video: true });
      tracksRef.current = tracks;
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
        if (track.kind === "video" && videoRef.current) {
          track.attach(videoRef.current);
        }
      }

      setLive(response.data.live);
      setViewersCount(response.data.live.viewers_count || 0);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsStarting(false);
    }
  }

  function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("lat", position.coords.latitude);
        updateField("lng", position.coords.longitude);
      },
      () => setError("No se pudo obtener tu ubicación para el mapa."),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function endLive() {
    if (!live) return;
    try {
      await apiClient.post(`/lives/${live.id}/end`);
      tracksRef.current.forEach((track) => track.stop());
      roomRef.current?.disconnect();
      navigate(`/lives/${live.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Directo
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Empezar live</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Comparte lo que está pasando ahora mismo.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white">
          {error}
        </div>
      ) : null}

      {live ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-neonPink/30 bg-surface">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-[9/14] w-full bg-black object-cover" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neonPink px-3 py-1 text-xs font-black uppercase text-white">
                En directo
              </span>
              <span className="text-sm font-black text-neonPink">{viewersCount} viendo</span>
            </div>
            <p className="mt-3 text-xl font-black text-white">{live.title}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white" type="button" onClick={() => navigate(`/lives/${live.id}`, { state: { host: true } })}>
                Ver live
              </button>
              <button className="h-12 rounded-lg bg-neonPink text-sm font-black text-white" type="button" onClick={endLive}>
                Terminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={startLive}>
          <input className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-base font-bold text-white outline-none focus:border-neonPink" placeholder="Título del directo" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
          <textarea className="min-h-28 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white outline-none focus:border-neonPink" placeholder="Descripción opcional" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          <select className="w-full rounded-lg border border-white/10 bg-night px-4 py-4 text-base font-bold text-white" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-base font-bold text-white outline-none focus:border-neonPink" placeholder="Ciudad" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
            <input className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-base font-bold text-white outline-none focus:border-neonPink" placeholder="Zona" value={form.area} onChange={(event) => updateField("area", event.target.value)} />
          </div>
          <select className="w-full rounded-lg border border-white/10 bg-night px-4 py-4 text-base font-bold text-white" value={form.visibility} onChange={(event) => updateField("visibility", event.target.value)}>
            <option value="public">Público</option>
            <option value="followers">Solo seguidores</option>
          </select>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface p-4 text-sm font-bold text-white">
            <input type="checkbox" checked={form.show_on_map} onChange={(event) => updateField("show_on_map", event.target.checked)} />
            Mostrar en el mapa si hay ubicación
          </label>
          <button className="h-12 w-full rounded-lg border border-neonGreen/30 bg-neonGreen/10 text-sm font-black text-neonGreen" type="button" onClick={useCurrentLocation}>
            Usar mi ubicación para el mapa
          </button>
          {form.lat && form.lng ? (
            <p className="text-xs font-bold text-white/50">
              Ubicación preparada: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
            </p>
          ) : null}
          <button className="h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-base font-black text-night disabled:opacity-60" type="submit" disabled={isStarting}>
            {isStarting ? "Conectando cámara..." : "Empezar directo"}
          </button>
        </form>
      )}
    </section>
  );
}

export default StartLive;
