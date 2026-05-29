import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, RoomEvent, createLocalTracks } from "livekit-client";
import { Focus, SlidersHorizontal, SwitchCamera, ZoomIn } from "lucide-react";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

function StartLive() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const tracksRef = useRef([]);
  const localVideoTrackRef = useRef(null);
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
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("user");
  const [cameraControls, setCameraControls] = useState({
    zoom: { supported: false, min: 1, max: 1, step: 0.1, value: 1 },
    focus: { supported: false, min: 0, max: 0, step: 0.1, value: 0 },
  });
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

  useEffect(() => {
    if (!live || !localVideoTrackRef.current || !videoRef.current) return;
    attachLocalVideoTrack(localVideoTrackRef.current);
  }, [live]);

  function getVideoCaptureOptions(nextFacingMode = cameraFacingMode) {
    const options = {
      low: {
        facingMode: nextFacingMode,
        width: { ideal: 360 },
        height: { ideal: 640 },
        frameRate: { ideal: 15, max: 20 },
      },
      medium: {
        facingMode: nextFacingMode,
        width: { ideal: 540 },
        height: { ideal: 960 },
        frameRate: { ideal: 24, max: 30 },
      },
      high: {
        facingMode: nextFacingMode,
        width: { ideal: 720 },
        height: { ideal: 1280 },
        frameRate: { ideal: 30, max: 30 },
      },
      auto: {
        facingMode: nextFacingMode,
        width: { ideal: 540 },
        height: { ideal: 960 },
        frameRate: { ideal: 24, max: 30 },
      },
    };

    return options[form.bitrate_mode] || options.auto;
  }

  function stopLocalTracks() {
    tracksRef.current.forEach((track) => track.stop());
    tracksRef.current = [];
    localVideoTrackRef.current = null;
  }

  function attachLocalVideoTrack(track) {
    if (!track || !videoRef.current) return;
    const element = videoRef.current;
    element.muted = true;
    element.autoplay = true;
    element.playsInline = true;
    track.attach(element);
    element.play?.().catch(() => {});
  }

  function getBrowserVideoTrack(track) {
    return track?.mediaStreamTrack || track?.track || null;
  }

  function refreshCameraControls(track) {
    const mediaTrack = getBrowserVideoTrack(track);
    if (!mediaTrack?.getCapabilities) return;

    const capabilities = mediaTrack.getCapabilities();
    const settings = mediaTrack.getSettings?.() || {};
    setCameraControls({
      zoom: capabilities.zoom
        ? {
            supported: true,
            min: Number(capabilities.zoom.min ?? 1),
            max: Number(capabilities.zoom.max ?? 1),
            step: Number(capabilities.zoom.step ?? 0.1),
            value: Number(settings.zoom ?? capabilities.zoom.min ?? 1),
          }
        : { supported: false, min: 1, max: 1, step: 0.1, value: 1 },
      focus: capabilities.focusDistance
        ? {
            supported: true,
            min: Number(capabilities.focusDistance.min ?? 0),
            max: Number(capabilities.focusDistance.max ?? 0),
            step: Number(capabilities.focusDistance.step ?? 0.1),
            value: Number(settings.focusDistance ?? capabilities.focusDistance.min ?? 0),
          }
        : { supported: false, min: 0, max: 0, step: 0.1, value: 0 },
    });
  }

  async function applyCameraConstraint(type, value) {
    const mediaTrack = getBrowserVideoTrack(localVideoTrackRef.current);
    if (!mediaTrack?.applyConstraints) return;

    const numericValue = Number(value);
    const constraint =
      type === "focus"
        ? { focusMode: "manual", focusDistance: numericValue }
        : { zoom: numericValue };

    try {
      await mediaTrack.applyConstraints({ advanced: [constraint] });
      setCameraControls((current) => ({
        ...current,
        [type]: {
          ...current[type],
          value: numericValue,
        },
      }));
    } catch {
      setError(
        type === "focus"
          ? "Este móvil no permite cambiar la distancia de enfoque desde el navegador."
          : "Este móvil no permite cambiar el zoom desde el navegador."
      );
    }
  }

  function getLiveStartErrorMessage(err) {
    if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
      return "Permite el acceso a la cámara y al micrófono para iniciar el directo.";
    }

    if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
      return "No se encontró cámara o micrófono en este dispositivo.";
    }

    if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
      return "La cámara está ocupada por otra app. Ciérrala e inténtalo de nuevo.";
    }

    if (err?.message?.toLowerCase().includes("permission")) {
      return "Permite el acceso a cámara y micrófono para iniciar el directo.";
    }

    return getApiErrorMessage(err);
  }

  async function createMobileFriendlyLocalTracks() {
    try {
      return await createLocalTracks({
        audio: true,
        video: getVideoCaptureOptions(),
      });
    } catch (err) {
      if (err?.name !== "OverconstrainedError" && err?.name !== "ConstraintNotSatisfiedError") {
        throw err;
      }

      return createLocalTracks({
        audio: true,
        video: true,
      });
    }
  }

  async function createVideoTrackForCamera(nextFacingMode) {
    try {
      const tracks = await createLocalTracks({
        audio: false,
        video: getVideoCaptureOptions(nextFacingMode),
      });
      return tracks.find((track) => track.kind === "video");
    } catch (err) {
      if (err?.name !== "OverconstrainedError" && err?.name !== "ConstraintNotSatisfiedError") {
        throw err;
      }

      const tracks = await createLocalTracks({
        audio: false,
        video: { facingMode: nextFacingMode },
      });
      return tracks.find((track) => track.kind === "video");
    }
  }

  async function switchCamera() {
    if (!localVideoTrackRef.current || isSwitchingCamera) return;

    const previousVideoTrack = localVideoTrackRef.current;
    const nextFacingMode = cameraFacingMode === "user" ? "environment" : "user";

    try {
      setError("");
      setIsSwitchingCamera(true);
      const nextVideoTrack = await createVideoTrackForCamera(nextFacingMode);
      if (!nextVideoTrack) throw new Error("No se pudo activar la otra cámara.");

      if (roomRef.current?.localParticipant) {
        await roomRef.current.localParticipant.unpublishTrack(previousVideoTrack);
        await roomRef.current.localParticipant.publishTrack(nextVideoTrack);
      }

      previousVideoTrack.stop();
      tracksRef.current = [
        ...tracksRef.current.filter((track) => track.kind !== "video"),
        nextVideoTrack,
      ];
      localVideoTrackRef.current = nextVideoTrack;
      setCameraFacingMode(nextFacingMode);
      attachLocalVideoTrack(nextVideoTrack);
      refreshCameraControls(nextVideoTrack);
    } catch (err) {
      setError(getLiveStartErrorMessage(err));
    } finally {
      setIsSwitchingCamera(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function startLive(event) {
    event.preventDefault();
    setError("");
    setIsStarting(true);
    let createdLive = null;

    try {
      stopLocalTracks();
      const tracks = await createMobileFriendlyLocalTracks();
      tracksRef.current = tracks;
      localVideoTrackRef.current = tracks.find((track) => track.kind === "video") || null;
      refreshCameraControls(localVideoTrackRef.current);

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
      createdLive = response.data.live;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => setViewersCount(0));

      await room.connect(response.data.livekit_url, response.data.token);
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }

      setLive(createdLive);
      setViewersCount(createdLive.viewers_count || 0);
      heartbeatRef.current = window.setInterval(() => {
        apiClient.post(`/lives/${createdLive.id}/heartbeat`, { role: "streamer" }).catch(() => {});
      }, 20000);
    } catch (err) {
      if (createdLive?.id) {
        apiClient.post(`/lives/${createdLive.id}/end`, { ended_reason: "network" }).catch(() => {});
      }
      roomRef.current?.disconnect();
      stopLocalTracks();
      setError(getLiveStartErrorMessage(err));
    } finally {
      setIsStarting(false);
    }
  }

  async function endLive() {
    if (!live) return;
    try {
      await apiClient.post(`/lives/${live.id}/end`);
      window.clearInterval(heartbeatRef.current);
      stopLocalTracks();
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
          <div className="relative bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-[9/14] w-full bg-black object-cover" />
            <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/54 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
              {cameraFacingMode === "user" ? "Cámara frontal" : "Cámara trasera"}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neonPink px-3 py-1 text-xs font-black uppercase text-white">
                En directo
              </span>
              <span className="text-sm font-black text-neonPink">{viewersCount} viendo</span>
            </div>
            <p className="mt-3 text-xl font-black text-white">{live.title}</p>
            <div className="mt-4 rounded-[1rem] border border-white/10 bg-night/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neonCyan">
                    <SlidersHorizontal className="h-4 w-4" />
                    Cámara
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/50">
                    Cambia cámara y ajusta zoom/enfoque si tu móvil lo permite.
                  </p>
                </div>
                <button
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-neonCyan/25 bg-neonCyan/10 px-3 text-xs font-black text-neonCyan disabled:opacity-50"
                  type="button"
                  onClick={switchCamera}
                  disabled={isSwitchingCamera}
                >
                  <SwitchCamera className="h-4 w-4" />
                  {isSwitchingCamera ? "..." : "Cambiar"}
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <label className={`block rounded-[0.9rem] border border-white/8 bg-white/[0.04] p-3 ${cameraControls.zoom.supported ? "" : "opacity-50"}`}>
                  <span className="flex items-center justify-between gap-3 text-xs font-black text-white">
                    <span className="flex items-center gap-2">
                      <ZoomIn className="h-4 w-4 text-neonPink" />
                      Zoom
                    </span>
                    <span className="text-white/46">
                      {cameraControls.zoom.supported ? `${cameraControls.zoom.value.toFixed(1)}x` : "No disponible"}
                    </span>
                  </span>
                  <input
                    className="mt-3 w-full accent-neonPink disabled:opacity-40"
                    type="range"
                    min={cameraControls.zoom.min}
                    max={cameraControls.zoom.max}
                    step={cameraControls.zoom.step || 0.1}
                    value={cameraControls.zoom.value}
                    disabled={!cameraControls.zoom.supported}
                    onChange={(event) => applyCameraConstraint("zoom", event.target.value)}
                  />
                </label>

                <label className={`block rounded-[0.9rem] border border-white/8 bg-white/[0.04] p-3 ${cameraControls.focus.supported ? "" : "opacity-50"}`}>
                  <span className="flex items-center justify-between gap-3 text-xs font-black text-white">
                    <span className="flex items-center gap-2">
                      <Focus className="h-4 w-4 text-neonCyan" />
                      Distancia enfoque
                    </span>
                    <span className="text-white/46">
                      {cameraControls.focus.supported ? cameraControls.focus.value.toFixed(1) : "No disponible"}
                    </span>
                  </span>
                  <input
                    className="mt-3 w-full accent-neonCyan disabled:opacity-40"
                    type="range"
                    min={cameraControls.focus.min}
                    max={cameraControls.focus.max}
                    step={cameraControls.focus.step || 0.1}
                    value={cameraControls.focus.value}
                    disabled={!cameraControls.focus.supported}
                    onChange={(event) => applyCameraConstraint("focus", event.target.value)}
                  />
                </label>
              </div>
            </div>
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
