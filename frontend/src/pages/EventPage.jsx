import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import apiClient from "../api/client.js";
import { formatEventDate } from "../components/events/EventCard.jsx";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";
import { optimizeCloudinaryImage } from "../utils/media.js";

function createEventIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:28px;height:28px;border-radius:999px;background:#ff1478;border:4px solid #08070d;box-shadow:0 0 22px #ff1478;"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function EventPage() {
  const { eventId } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    const response = await apiClient.post(`/events/${eventId}/attend`, { status });
    setEvent((current) => ({
      ...current,
      my_attendance_status: response.data.status,
      attendees_count: response.data.attendees_count,
      interested_count: response.data.interested_count,
    }));
    await loadEvent();
  }

  async function removeAttendance() {
    const response = await apiClient.delete(`/events/${eventId}/attend`);
    setEvent((current) => ({
      ...current,
      my_attendance_status: null,
      attendees_count: response.data.attendees_count,
      interested_count: response.data.interested_count,
    }));
    await loadEvent();
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
      ? optimizeCloudinaryImage(event.cover_media.url, 900)
      : event?.cover_media?.thumbnail_url;

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
            Evento
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">BUCAN DEY</h1>
        </div>
        <Link className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white" to="/events">
          Eventos
        </Link>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mt-5 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-4 py-3 text-sm font-semibold text-white">
          {notice}
        </div>
      ) : null}
      {isLoading ? <ListSkeleton count={2} /> : null}

      {!isLoading && event ? (
        <article className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-surface">
          {coverUrl ? (
            <img alt={event.title} className="aspect-[16/11] w-full object-cover" src={coverUrl} />
          ) : null}
          <div className="p-5">
            <span className="rounded-full border border-neonPink/30 bg-neonPink/12 px-3 py-1 text-xs font-black uppercase text-neonPink">
              {event.category}
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-white">{event.title}</h2>
            <p className="mt-3 text-base font-black text-neonYellow">{formatEventDate(event.start_at)}</p>
            <p className="mt-3 text-sm font-semibold text-white/58">
              {[event.location?.city, event.location?.area, event.location?.venue_name].filter(Boolean).join(" · ")}
            </p>
            {event.location?.address ? (
              <p className="mt-1 text-sm font-semibold text-white/48">{event.location.address}</p>
            ) : null}
            <p className="mt-5 whitespace-pre-line text-base leading-7 text-white/72">
              {event.description || "Sin descripción."}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-black text-white">{event.attendees_count}</p>
                <p className="text-[11px] font-bold uppercase text-white/42">Apuntados</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-black text-white">{event.interested_count}</p>
                <p className="text-[11px] font-bold uppercase text-white/42">Interés</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-black text-white">{event.shares_count || 0}</p>
                <p className="text-[11px] font-bold uppercase text-white/42">Shares</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="h-12 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night" type="button" onClick={() => setAttendance("going")}>
                Me apunto
              </button>
              <button className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white" type="button" onClick={() => setAttendance("interested")}>
                Me interesa
              </button>
              <button className="h-12 rounded-lg border border-neonPink/30 bg-neonPink/10 text-sm font-black text-neonPink" type="button" onClick={removeAttendance} disabled={!event.my_attendance_status}>
                Quitar
              </button>
              <button className="h-12 rounded-lg border border-neonYellow/30 bg-neonYellow/10 text-sm font-black text-neonYellow" type="button" onClick={shareEvent}>
                Compartir
              </button>
            </div>

            {event.my_attendance_status ? (
              <div className="mt-4 rounded-lg border border-neonGreen/25 bg-neonGreen/10 px-4 py-3 text-sm font-bold text-neonGreen">
                Recibirás recordatorios antes del evento: 1 hora y 15 minutos antes.
              </div>
            ) : null}

            {position ? (
              <div className="mt-5 h-64 overflow-hidden rounded-lg border border-white/10">
                <MapContainer center={position} className="h-full w-full" scrollWheelZoom={false} zoom={14}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker icon={createEventIcon()} position={position} />
                </MapContainer>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
                Asistentes
              </p>
              <div className="mt-3 space-y-2">
                {attendees.length === 0 ? (
                  <p className="text-sm font-semibold text-white/52">Todavía nadie se ha apuntado.</p>
                ) : (
                  attendees.map((attendee) => (
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3" key={attendee.user_id}>
                      <div>
                        <p className="text-sm font-black text-white">{attendee.display_name}</p>
                        <p className="text-xs font-semibold text-white/45">@{attendee.username}</p>
                      </div>
                      <span className="text-xs font-black text-neonGreen">
                        {attendee.status === "going" ? "Va" : "Interés"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}

export default EventPage;
