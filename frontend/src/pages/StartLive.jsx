import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, RoomEvent, createLocalTracks } from "livekit-client";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

function StartLive() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const tracksRef = useRef([]);
  const heartbeatRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ambiente",
    visibility: "public",
    bitrate_mode: "auto",
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
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType)) {
      setForm((current) => ({ ...current, bitrate_mode: "low" }));
    }
    return () => {
      window.clearInterval(heartbeatRef.current);
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
        bitrate_mode: form.bitrate_mode,
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
      const videoOptions = {
        low: { resolution: { width: 360, height: 640 }, frameRate: 15 },
        medium: { resolution: { width: 540, height: 960 }, frameRate: 24 },
        high: { resolution: { width: 720, height: 1280 }, frameRate: 30 },
        auto: true,
      };
      const tracks = await createLocalTracks({
        audio: true,
        video: videoOptions[form.bitrate_mode] || true,
      });
      tracksRef.current = tracks;
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
        if (track.kind === "video" && videoRef.current) {
          track.attach(videoRef.current);
        }
      }

      setLive(response.data.live);
      setViewersCount(response.data.live.viewers_count || 0);
      heartbeatRef.current = window.setInterval(() => {
        apiClient.post(`/lives/${response.data.live.id}/heartbeat`, { role: "streamer" }).catch(() => {});
      }, 20000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsStarting(false);
    }
  }

  async function endLive() {
    if (!live) return;
    try {
      await apiClient.post(`/lives/${live.id}/end`);
      window.clearInterval(heartbeatRef.current);
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
        <form className="mt-6 overflow-hidden rounded-[1.4rem] border border-liveRed/25 bg-white/[0.055] p-4 shadow-live backdrop-blur-2xl sm:p-5" onSubmit={startLive}>
          <div className="rounded-[1.15rem] border border-white/10 bg-night/55 p-4">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-liveRed">
              Título del directo
            </label>
            <input
              className="mt-3 w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-white/30"
              placeholder="¿Qué está pasando?"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </div>

          <button
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-liveRed via-neonPink to-fiestaPurple text-base font-black text-white shadow-live disabled:opacity-60"
            type="submit"
            disabled={isStarting}
          >
            {isStarting ? "Conectando cámara..." : "Iniciar directo"}
          </button>

          <p className="mt-3 text-center text-xs font-semibold leading-5 text-white/46">
            BUCAN DEY usará cámara y micrófono solo cuando pulses iniciar.
          </p>
        </form>
      )}
    </section>
  );
}

export default StartLive;
