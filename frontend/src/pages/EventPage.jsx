import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Share2,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import apiClient from "../api/client.js";
import { categoryLabels, formatEventDate } from "../components/events/EventCard.jsx";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { optimizeCloudinaryImage } from "../utils/media.js";

function createEventIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:34px;height:34px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fff,#FFD84D 36%,#7C3AED 78%);border:4px solid #070B14;box-shadow:0 0 0 8px rgba(255,216,77,.18),0 0 30px rgba(255,216,77,.72);"></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function InfoCard({ icon: Icon, label, value, tone = "cyan" }) {
  const colors = {
    cyan: "text-neonCyan bg-neonCyan/10 border-neonCyan/24",
    yellow: "text-neonYellow bg-neonYellow/10 border-neonYellow/24",
    pink: "text-neonPink bg-neonPink/10 border-neonPink/24",
  };

  return (
    <div className={`rounded-[1.25rem] border p-4 ${colors[tone]}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value || "Pendiente"}</p>
    </div>
  );
}

function EventPage() {
  const { eventId } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadEvent() {
    const [eventResponse, attendeesResponse] = await Promise.all([
      apiClient.get(`/events/${eventId}`),
      apiClient.get(`/events/${eventId}/attendees`),
    ]);
    setEvent(eventResponse.data);
    setAttendees(attendeesResponse.data.items);
  }

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        await loadEvent();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [eventId]);

  async function setAttendance(status) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await apiClient.post(`/events/${eventId}/attend`, { status });
      setEvent((current) => ({
        ...current,
        my_attendance_status: response.data.status,
        attendees_count: response.data.attendees_count,
        interested_count: response.data.interested_count,
      }));
      await loadEvent();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeAttendance() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await apiClient.delete(`/events/${eventId}/attend`);
      setEvent((current) => ({
        ...current,
        my_attendance_status: null,
        attendees_count: response.data.attendees_count,
        interested_count: response.data.interested_count,
      }));
      await loadEvent();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function shareEvent() {
    const url = `${window.location.origin}/events/${eventId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.description || "Mira este evento en BUCAN DEY",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Enlace copiado.");
      }
      const response = await apiClient.post(`/events/${eventId}/share`);
      setEvent((current) => ({ ...current, shares_count: response.data.shares_count }));
    } catch (err) {
      if (err?.name !== "AbortError") setError("No se pudo compartir el evento.");
    }
  }

  const position =
    typeof event?.location?.lat === "number" && typeof event?.location?.lng === "number"
      ? [event.location.lat, event.location.lng]
      : null;
  const coverUrl =
    event?.cover_media?.type === "image"
      ? optimizeCloudinaryImage(event.cover_media.url, { width: 1080 })
      : event?.cover_media?.thumbnail_url;
  const location = [event?.location?.city, event?.location?.area, event?.location?.venue_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden pb-8 text-white sm:mx-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,216,77,.18),transparent_30%),radial-gradient(circle_at_0%_30%,rgba(255,79,216,.14),transparent_32%)]" />

      {error ? (
        <div className="relative z-20 mx-4 mt-3 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="relative z-20 mx-4 mt-3 rounded-[1.2rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
          {notice}
        </div>
      ) : null}
      {isLoading ? <div className="px-4"><ListSkeleton count={2} /></div> : null}

      {!isLoading && event ? (
        <article className="relative z-10">
          <motion.div
            className="relative min-h-[29rem] overflow-hidden rounded-b-[2.25rem] bg-surface"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {coverUrl ? (
              <img alt={event.title} className="absolute inset-0 h-full w-full object-cover" src={coverUrl} />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,216,77,.42),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,79,216,.34),transparent_32%),linear-gradient(135deg,rgba(124,58,237,.52),rgba(7,11,20,.98))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/46 to-black/18" />

            <div className="absolute inset-x-4 top-4 flex items-center justify-between">
              <Link
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/34 text-white backdrop-blur-xl"
                to="/events"
                aria-label="Volver a eventos"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex gap-2">
                {event.is_featured ? (
                  <span className="flex h-11 items-center gap-2 rounded-full border border-neonYellow/35 bg-neonYellow/14 px-4 text-sm font-black text-neonYellow backdrop-blur-xl">
                    <Star className="h-4 w-4" />
                    Destacado
                  </span>
                ) : null}
                {event.is_cancelled ? (
                  <span className="flex h-11 items-center rounded-full bg-liveRed px-4 text-sm font-black text-white">
                    Cancelado
                  </span>
                ) : null}
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-5">
              <span className="inline-flex rounded-full border border-neonYellow/40 bg-neonYellow/16 px-3 py-1 text-xs font-black uppercase text-neonYellow backdrop-blur-xl">
                {categoryLabels[event.category] || event.category}
              </span>
              <h1 className="mt-4 text-4xl font-black leading-tight text-white">
                {event.title}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-sm font-black text-neonYellow">
                <CalendarDays className="h-4 w-4" />
                {formatEventDate(event.start_at)}
              </p>
              <p className="mt-2 text-sm font-semibold text-white/68">
                Por @{event.creator_snapshot?.username || "bucandey"}
              </p>
            </div>
          </motion.div>

          <div className="px-4">
            <div className="glass-panel -mt-8 rounded-[1.75rem] p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[1.05rem] bg-white/7 p-3">
                  <p className="text-2xl font-black text-white">{event.attendees_count}</p>
                  <p className="text-[10px] font-black uppercase text-white/38">apuntados</p>
                </div>
                <div className="rounded-[1.05rem] bg-white/7 p-3">
                  <p className="text-2xl font-black text-white">{event.interested_count}</p>
                  <p className="text-[10px] font-black uppercase text-white/38">interés</p>
                </div>
                <div className="rounded-[1.05rem] bg-white/7 p-3">
                  <p className="text-2xl font-black text-white">{event.shares_count || 0}</p>
                  <p className="text-[10px] font-black uppercase text-white/38">shares</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
                <motion.button
                  className={`h-12 rounded-full text-sm font-black disabled:opacity-60 ${
                    event.my_attendance_status === "going"
                      ? "border border-neonYellow/40 bg-neonYellow/16 text-neonYellow shadow-neon"
                      : "bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan"
                  }`}
                  type="button"
                  onClick={() => setAttendance("going")}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.96 }}
                >
                  Me apunto
                </motion.button>
                <motion.button
                  className={`h-12 rounded-full border text-sm font-black disabled:opacity-60 ${
                    event.my_attendance_status === "interested"
                      ? "border-neonPink/40 bg-neonPink/14 text-neonPink"
                      : "border-white/10 bg-white/7 text-white"
                  }`}
                  type="button"
                  onClick={() => setAttendance("interested")}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.96 }}
                >
                  Me interesa
                </motion.button>
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-neonYellow/30 bg-neonYellow/10 text-neonYellow"
                  type="button"
                  onClick={shareEvent}
                  aria-label="Compartir evento"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              {event.my_attendance_status ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.2rem] border border-neonCyan/24 bg-neonCyan/10 px-4 py-3 text-sm font-bold text-white">
                  <Bell className="h-5 w-5 text-neonCyan" />
                  Recibirás recordatorios antes del evento.
                  <button className="ml-auto text-xs font-black text-neonPink" type="button" onClick={removeAttendance}>
                    Quitar
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <InfoCard icon={MapPin} label="Ubicación" value={location} tone="cyan" />
              <InfoCard icon={Clock} label="Hora" value={formatEventDate(event.start_at)} tone="yellow" />
              <InfoCard icon={Users} label="Visibilidad" value={event.visibility === "followers" ? "Seguidores" : "Público"} tone="pink" />
            </div>

            <section className="glass-panel mt-4 rounded-[1.75rem] p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-white/44">
                Descripción
              </p>
              <p className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-white/72">
                {event.description || "Sin descripción."}
              </p>
            </section>

            {position ? (
              <section className="glass-panel mt-4 overflow-hidden rounded-[1.75rem] p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-white/44">
                    Mapa
                  </p>
                  <Link className="text-sm font-black text-neonCyan" to="/map">
                    Ver en mapa
                  </Link>
                </div>
                <div className="h-64 overflow-hidden rounded-[1.35rem] border border-white/10">
                  <MapContainer center={position} className="bucan-map h-full w-full" scrollWheelZoom={false} zoom={14} zoomControl={false}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker icon={createEventIcon()} position={position} />
                  </MapContainer>
                </div>
              </section>
            ) : null}

            <section className="glass-panel mt-4 rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white/44">
                  Asistentes
                </p>
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-black text-white/58">
                  {attendees.length}
                </span>
              </div>
              <div className="mt-4 flex -space-x-3">
                {attendees.slice(0, 8).map((attendee) => (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-night bg-gradient-to-br from-neonYellow via-neonPink to-neonCyan text-sm font-black text-white"
                    key={attendee.user_id}
                    title={attendee.username}
                  >
                    {(attendee.display_name || attendee.username || "B").charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {attendees.length === 0 ? (
                  <p className="text-sm font-semibold text-white/52">Todavía nadie se ha apuntado.</p>
                ) : (
                  attendees.slice(0, 5).map((attendee) => (
                    <div className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/7 p-3" key={attendee.user_id}>
                      <div>
                        <p className="text-sm font-black text-white">{attendee.display_name}</p>
                        <p className="text-xs font-semibold text-white/45">@{attendee.username}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-neonYellow">
                        <Check className="h-3.5 w-3.5" />
                        {attendee.status === "going" ? "Va" : "Interés"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </article>
      ) : null}
    </section>
  );
}

export default EventPage;
