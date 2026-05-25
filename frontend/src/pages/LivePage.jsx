import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Room, RoomEvent, Track } from "livekit-client";

import apiClient from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function LivePage() {
  const { liveId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { sendEvent, subscribe } = useRealtime();
  const videoContainerRef = useRef(null);
  const roomRef = useRef(null);
  const heartbeatRef = useRef(null);
  const [live, setLive] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/lives/${liveId}`);
        setLive(response.data);
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
      roomRef.current?.disconnect();
    });
  }, [liveId, subscribe]);

  useEffect(() => {
    return () => {
      window.clearInterval(heartbeatRef.current);
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

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
      room.on(RoomEvent.ParticipantConnected, () => {});
      await room.connect(tokenResponse.data.livekit_url, tokenResponse.data.token);
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => attachTrack(publication.track));
      });

      heartbeatRef.current = window.setInterval(() => {
        apiClient.post(`/lives/${liveId}/heartbeat`).catch(() => {});
      }, 20000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  }

  async function endLive() {
    try {
      const response = await apiClient.post(`/lives/${liveId}/end`);
      setLive(response.data);
      roomRef.current?.disconnect();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function sendComment(event) {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    const sent = sendEvent("live_comment", { live_id: liveId, text });
    if (!sent) {
      apiClient.post(`/lives/${liveId}/comments`, { text }).catch(() => {});
    }
    setCommentText("");
  }

  const isCreator = user?.id && live?.creator_id === user.id;

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonPink">
            Live
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            {live?.title || "Directo"}
          </h1>
        </div>
        <Link className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white" to="/">
          Inicio
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 h-96 animate-pulse rounded-lg bg-white/8" />
      ) : null}

      {!isLoading && live ? (
        <article className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-surface">
          <div ref={videoContainerRef} className="flex aspect-[9/14] max-h-[70vh] w-full items-center justify-center bg-black text-center text-sm font-bold text-white/54">
            {live.is_live ? "Pulsa entrar para ver el directo." : "Este directo ha terminado."}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${live.is_live ? "bg-neonPink text-white" : "bg-white/10 text-white/58"}`}>
                {live.is_live ? "En directo" : "Finalizado"}
              </span>
              <span className="text-sm font-black text-neonPink">
                {live.viewers_count || 0} viendo · pico {live.peak_viewers || 0}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white/62">
              @{live.creator_snapshot.username}
              {live.location?.city ? ` · ${live.location.city}` : ""}
            </p>
            <p className="mt-3 text-base leading-7 text-white/72">
              {live.description || "Directo en BUCAN DEY."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="h-12 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night disabled:opacity-60" type="button" onClick={joinLive} disabled={!live.is_live || isJoining}>
                {isJoining ? "Entrando..." : "Entrar al live"}
              </button>
              {isCreator && live.is_live ? (
                <button className="h-12 rounded-lg bg-neonPink text-sm font-black text-white" type="button" onClick={endLive}>
                  Terminar
                </button>
              ) : (
                <button className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white" type="button" onClick={() => navigator.share?.({ title: live.title, url: window.location.href })}>
                  Compartir
                </button>
              )}
            </div>
          </div>
        </article>
      ) : null}

      <div className="mt-5 rounded-lg border border-white/10 bg-surface p-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Chat live
        </p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm font-semibold text-white/48">Sé el primero en comentar.</p>
          ) : null}
          {comments.map((comment, index) => (
            <div className="rounded-lg bg-white/5 px-3 py-2" key={`${comment.created_at}-${index}`}>
              <p className="text-xs font-black text-neonYellow">@{comment.username}</p>
              <p className="text-sm font-semibold text-white">{comment.text}</p>
            </div>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={sendComment}>
          <input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-neonPink" placeholder="Comenta en vivo..." value={commentText} onChange={(event) => setCommentText(event.target.value)} />
          <button className="rounded-lg bg-neonPink px-4 py-3 text-sm font-black text-white" type="submit">
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}

export default LivePage;
