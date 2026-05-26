import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Room, RoomEvent, Track } from "livekit-client";
import {
  AlertTriangle,
  ArrowLeft,
  Flag,
  Gift,
  Heart,
  Radio,
  Send,
  Share2,
  ShieldCheck,
  Signal,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import apiClient from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const qualityOptions = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Ahorro datos" },
  { value: "high", label: "Alta calidad" },
];

const reportReasons = [
  ["spam", "Spam"],
  ["contenido ofensivo", "Contenido ofensivo"],
  ["violencia", "Violencia"],
  ["desnudos", "Desnudos"],
  ["acoso", "Acoso"],
  ["otro", "Otro"],
];

function LivePageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[72vh] animate-pulse rounded-[2rem] bg-gradient-to-br from-white/8 via-white/5 to-liveRed/12" />
      <div className="glass-panel rounded-[1.75rem] p-4">
        <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-2xl bg-white/8" />
      </div>
    </div>
  );
}

function LiveBadge({ isLive }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${
        isLive ? "bg-liveRed text-white shadow-live" : "bg-white/10 text-white/58"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isLive ? "bg-white [animation:live-pulse_1.4s_ease-in-out_infinite]" : "bg-white/38"
        }`}
      />
      {isLive ? "Live" : "Finalizado"}
    </span>
  );
}

function Avatar({ user }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-liveRed via-neonPink to-neonCyan p-[2px] shadow-live">
      {user?.avatar_url ? (
        <img
          alt={user.display_name || user.username}
          className="h-full w-full rounded-full border-2 border-night object-cover"
          loading="lazy"
          src={user.avatar_url}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-night bg-black/52 text-base font-black text-white">
          {(user?.display_name || user?.username || "B").charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function LiveComment({ comment }) {
  return (
    <motion.div
      className="max-w-[88%] rounded-[1.1rem] border border-white/10 bg-black/34 px-3 py-2 text-sm shadow-cyan backdrop-blur-xl"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <p className="text-xs font-black text-neonYellow">@{comment.username || "bucandey"}</p>
      <p className="mt-0.5 break-words font-semibold leading-5 text-white">{comment.text}</p>
    </motion.div>
  );
}

function StatusPill({ icon: Icon, label, value, tone = "cyan" }) {
  const tones = {
    cyan: "border-neonCyan/30 bg-neonCyan/10 text-neonCyan",
    red: "border-liveRed/35 bg-liveRed/12 text-liveRed",
    pink: "border-neonPink/30 bg-neonPink/10 text-neonPink",
    white: "border-white/10 bg-white/8 text-white/72",
  };

  return (
    <div className={`rounded-full border px-3 py-2 ${tones[tone] || tones.white}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-black">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] opacity-62">
        {label}
      </p>
    </div>
  );
}

function LivePage() {
  const { liveId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { sendEvent, subscribe } = useRealtime();
  const videoContainerRef = useRef(null);
  const commentsEndRef = useRef(null);
  const roomRef = useRef(null);
  const heartbeatRef = useRef(null);
  const statsRef = useRef(null);
  const [live, setLive] = useState(null);
  const [stats, setStats] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [qualityMode, setQualityMode] = useState("auto");
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType)) {
      setQualityMode("low");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/lives/${liveId}`);
        setLive(response.data);
        const statsResponse = await apiClient.get(`/lives/${liveId}/stats`);
        setStats(statsResponse.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [liveId]);

  useEffect(() => {
    return subscribe("live_comment", (comment) => {
      if (comment.live_id !== liveId) return;
      setComments((current) => [...current.slice(-60), comment]);
    });
  }, [liveId, subscribe]);

  useEffect(() => {
    return subscribe("live_viewers_update", (payload) => {
      if (payload.live_id !== liveId) return;
      setLive((current) =>
        current
          ? {
              ...current,
              viewers_count: payload.viewers_count,
              peak_viewers: payload.peak_viewers,
            }
          : current
      );
    });
  }, [liveId, subscribe]);

  useEffect(() => {
    return subscribe("live_ended", (payload) => {
      if (payload.id !== liveId) return;
      setLive(payload);
      setHasJoined(false);
      roomRef.current?.disconnect();
    });
  }, [liveId, subscribe]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments]);

  useEffect(() => {
    return () => {
      window.clearInterval(heartbeatRef.current);
      window.clearInterval(statsRef.current);
      roomRef.current?.disconnect();
    };
  }, []);

  function attachTrack(track) {
    if (!track || track.kind !== Track.Kind.Video || !videoContainerRef.current) {
      return;
    }
    videoContainerRef.current.innerHTML = "";
    const element = track.attach();
    element.autoplay = true;
    element.playsInline = true;
    element.controls = true;
    element.className = "h-full w-full bg-black object-cover";
    videoContainerRef.current.appendChild(element);
  }

  async function joinLive() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    try {
      setIsJoining(true);
      setError("");
      const tokenResponse = await apiClient.post(`/lives/${liveId}/join`);
      await apiClient.post(`/lives/${liveId}/viewer`);

      const room = new Room({
        adaptiveStream: qualityMode !== "high",
        dynacast: true,
      });
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
      room.on(RoomEvent.ParticipantConnected, () => {});
      await room.connect(tokenResponse.data.livekit_url, tokenResponse.data.token);
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => attachTrack(publication.track));
      });
      setHasJoined(true);

      heartbeatRef.current = window.setInterval(() => {
        apiClient.post(`/lives/${liveId}/heartbeat`, { role: "viewer" }).catch(() => {});
      }, 20000);
      statsRef.current = window.setInterval(async () => {
        try {
          const response = await apiClient.get(`/lives/${liveId}/stats`);
          setStats(response.data);
        } catch {
          window.clearInterval(statsRef.current);
        }
      }, 30000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiClient.post(`/lives/${liveId}/report`, {
        reason: reportReason,
        details: reportDetails,
      });
      setNotice("Reporte enviado. El equipo revisará este live.");
      setShowReport(false);
      setReportDetails("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function endLive() {
    try {
      const response = await apiClient.post(`/lives/${liveId}/end`);
      setLive(response.data);
      setHasJoined(false);
      roomRef.current?.disconnect();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function shareLive() {
    try {
      if (navigator.share) {
        await navigator.share({ title: live?.title || "BUCAN DEY Live", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Enlace del live copiado.");
        window.setTimeout(() => setNotice(""), 2500);
      }
    } catch {
      setNotice("No se pudo compartir ahora.");
      window.setTimeout(() => setNotice(""), 2500);
    }
  }

  function sendComment(event) {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    const sent = sendEvent("live_comment", { live_id: liveId, text });
    if (!sent) {
      apiClient.post(`/lives/${liveId}/comments`, { text }).catch(() => {});
    }
    setCommentText("");
  }

  const isCreator = user?.id && live?.creator_id === user.id;
  const viewersCount = stats?.current_viewers ?? live?.viewers_count ?? 0;
  const durationMinutes = Math.floor((stats?.duration_seconds || 0) / 60);
  const connectionLabel = useMemo(() => {
    if (qualityMode === "low") return "Ahorro";
    if (qualityMode === "high") return "Alta";
    return "Excelente";
  }, [qualityMode]);

  if (isLoading) {
    return <LivePageSkeleton />;
  }

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-5rem)] overflow-hidden bg-night text-white sm:mx-0 sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,48,64,.24),transparent_32%),radial-gradient(circle_at_100%_35%,rgba(0,217,255,.16),transparent_28%),linear-gradient(180deg,rgba(7,11,20,.2),#070B14_82%)]" />

      {live ? (
        <article className="relative flex min-h-[calc(100vh-5rem)] flex-col">
          <div className="relative min-h-[68vh] flex-1 overflow-hidden bg-black">
            <div
              ref={videoContainerRef}
              className="flex h-full min-h-[68vh] w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(124,58,237,.35),rgba(0,0,0,.96)_72%)] text-center text-sm font-bold text-white/54"
            >
              <div className="px-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-liveRed/35 bg-liveRed/12 text-liveRed shadow-live">
                  <Radio className="h-9 w-9" />
                </div>
                {!live.is_live ? (
                  <>
                    <p className="mt-5 text-base font-black text-white">
                      El directo ha terminado.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white/48">
                      {live.description || "BUCAN DEY Live"}
                    </p>
                  </>
                ) : null}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/82 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-night via-night/74 to-transparent" />

            <header className="absolute inset-x-3 top-3 z-20">
              <motion.div
                className="glass-panel rounded-[1.7rem] p-3"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3">
                  <Link
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
                    to="/"
                    aria-label="Cerrar live"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <Avatar user={live.creator_snapshot} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <LiveBadge isLive={live.is_live} />
                      <motion.span
                        key={viewersCount}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-xs font-black text-white"
                        initial={{ scale: 1.08 }}
                        animate={{ scale: 1 }}
                      >
                        <Users className="h-3.5 w-3.5 text-neonCyan" />
                        {viewersCount}
                      </motion.span>
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-white">
                      {live.title || "Directo BUCAN DEY"}
                    </p>
                    <p className="truncate text-xs font-semibold text-white/54">
                      @{live.creator_snapshot.username}
                      {live.location?.city ? ` · ${live.location.city}` : ""}
                      {live.category ? ` · ${live.category}` : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            </header>

            <div className="absolute bottom-28 left-3 right-3 z-40 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <StatusPill icon={Signal} label="conexión" value={connectionLabel} />
                <StatusPill icon={ShieldCheck} label="calidad" value={qualityMode} tone="white" />
                <StatusPill icon={Zap} label="duración" value={`${durationMinutes}m`} tone="pink" />
              </div>

              <div className="max-h-44 space-y-2 overflow-y-auto pr-5 scrollbar-none">
                {comments.length === 0 ? (
                  <div className="inline-flex rounded-full border border-white/10 bg-black/34 px-3 py-2 text-xs font-bold text-white/52 backdrop-blur-xl">
                    Sé el primero en comentar.
                  </div>
                ) : null}
                {comments.slice(-8).map((comment, index) => (
                  <LiveComment comment={comment} key={`${comment.created_at}-${index}`} />
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {!hasJoined && live.is_live ? (
              <motion.button
                className="absolute left-1/2 top-1/2 z-20 flex h-16 -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-gradient-to-r from-liveRed via-neonPink to-neonCyan px-7 text-base font-black text-white shadow-live disabled:opacity-60"
                type="button"
                onClick={joinLive}
                disabled={isJoining}
                whileTap={{ scale: 0.96 }}
              >
                <Radio className="h-5 w-5" />
                {isJoining ? "Entrando..." : "Entrar al live"}
              </motion.button>
            ) : null}
          </div>

          <div className="relative z-30 -mt-28 px-3 pb-28">
            {error ? (
              <div className="mb-3 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-xl">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mb-3 rounded-[1.2rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-xl">
                {notice}
              </div>
            ) : null}

            <div className="glass-panel rounded-[1.7rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">
                    {live.title || "Directo BUCAN DEY"}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/62">
                    {live.description || "Directo en BUCAN DEY."}
                  </p>
                </div>
                <button
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
                  type="button"
                  onClick={shareLive}
                  aria-label="Compartir live"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[1.1rem] bg-white/7 p-3">
                  <p className="text-lg font-black text-white">{viewersCount}</p>
                  <p className="text-[10px] font-black uppercase text-white/38">actuales</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/7 p-3">
                  <p className="text-lg font-black text-white">
                    {stats?.total_unique_viewers ?? live.total_unique_viewers ?? 0}
                  </p>
                  <p className="text-[10px] font-black uppercase text-white/38">únicos</p>
                </div>
                <div className="rounded-[1.1rem] bg-white/7 p-3">
                  <p className="text-lg font-black text-white">{live.peak_viewers || 0}</p>
                  <p className="text-[10px] font-black uppercase text-white/38">pico</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none">
                {qualityOptions.map((option) => (
                  <button
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                      qualityMode === option.value
                        ? "border-neonCyan/50 bg-neonCyan/14 text-white shadow-cyan"
                        : "border-white/10 bg-white/7 text-white/58"
                    }`}
                    key={option.value}
                    type="button"
                    onClick={() => setQualityMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {!live.is_live ? (
                <p className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/7 px-4 py-3 text-sm font-bold text-white/68">
                  El directo ha terminado.
                </p>
              ) : null}

              <div className="mt-4 flex gap-2">
                {isCreator && live.is_live ? (
                  <button
                    className="h-12 flex-1 rounded-full bg-liveRed text-sm font-black text-white shadow-live"
                    type="button"
                    onClick={endLive}
                  >
                    Terminar directo
                  </button>
                ) : (
                  <button
                    className="h-12 flex-1 rounded-full border border-neonPink/35 bg-neonPink/10 text-sm font-black text-neonPink"
                    type="button"
                    onClick={() => setShowReport(true)}
                  >
                    Reportar live
                  </button>
                )}
              </div>
            </div>
          </div>

          <form
            className="glass-panel fixed inset-x-3 bottom-24 z-[950] rounded-[1.7rem] p-2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
            onSubmit={sendComment}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              {[
                { icon: Gift, label: "Gifts" },
                { icon: Heart, label: "Reacciones" },
                { icon: Sparkles, label: "Coins" },
                { icon: Flag, label: "Reportar", onClick: () => setShowReport(true) },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/7 text-white/54"
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
                placeholder="Comenta en vivo..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <motion.button
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-liveRed via-neonPink to-neonCyan text-white shadow-live"
                type="submit"
                whileTap={{ scale: 0.92 }}
                aria-label="Enviar comentario"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </form>

          {showReport ? (
            <motion.div
              className="fixed inset-0 z-[1000] flex items-end bg-black/62 p-3 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.form
                className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-night p-4 shadow-live"
                onSubmit={submitReport}
                initial={{ y: 80 }}
                animate={{ y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-white">Reportar live</p>
                    <p className="mt-1 text-sm font-semibold text-white/52">
                      Ayuda a moderar BUCAN DEY.
                    </p>
                  </div>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white"
                    type="button"
                    onClick={() => setShowReport(false)}
                    aria-label="Cerrar reporte"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <select
                  className="mt-4 h-12 w-full rounded-[1rem] border border-white/10 bg-white/7 px-3 text-sm font-bold text-white outline-none focus:border-neonPink"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  {reportReasons.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  className="mt-3 min-h-24 w-full rounded-[1rem] border border-white/10 bg-white/7 px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/34 focus:border-neonPink"
                  placeholder="Detalles opcionales"
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                />
                <button
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-liveRed text-sm font-black text-white shadow-live"
                  type="submit"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Enviar reporte
                </button>
              </motion.form>
            </motion.div>
          ) : null}
        </article>
      ) : (
        <div className="relative z-10 mx-4 rounded-[1.75rem] border border-neonPink/30 bg-neonPink/10 p-5 text-sm font-bold text-white">
          {error || "No se pudo cargar este live."}
        </div>
      )}
    </section>
  );
}

export default LivePage;
