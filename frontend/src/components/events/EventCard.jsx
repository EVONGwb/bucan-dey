import { Link, useNavigate } from "react-router-dom";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { optimizeCloudinaryImage } from "../../utils/media.js";

const categoryLabels = {
  fiesta: "Fiesta",
  cumpleaños: "Cumpleaños",
  concierto: "Concierto",
  bar: "Bar",
  evento: "Evento",
  meetup: "Meetup",
  deporte: "Deporte",
  otro: "Otro",
};

export function formatEventDate(value) {
  return new Date(value).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventCard({ event, onAttendanceChange }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const location = [event.location?.city, event.location?.area, event.location?.venue_name]
    .filter(Boolean)
    .join(" · ");
  const coverUrl =
    event.cover_media?.type === "image"
      ? optimizeCloudinaryImage(event.cover_media.url, 720)
      : event.cover_media?.thumbnail_url;

  async function setAttendance(status) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const response = await apiClient.post(`/events/${event.id}/attend`, { status });
    onAttendanceChange?.(event.id, response.data);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-surface">
      {coverUrl ? (
        <Link to={`/events/${event.id}`}>
          <img
            alt={event.title}
            className="aspect-[16/10] w-full object-cover"
            loading="lazy"
            src={coverUrl}
          />
        </Link>
      ) : null}

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-neonPink/30 bg-neonPink/12 px-3 py-1 text-xs font-black text-neonPink">
            {categoryLabels[event.category] || "Evento"}
          </span>
          {event.distance_km !== null && event.distance_km !== undefined ? (
            <span className="text-xs font-black text-neonGreen">
              a {event.distance_km} km
            </span>
          ) : null}
        </div>

        <Link to={`/events/${event.id}`}>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white">
            {event.title}
          </h2>
        </Link>
        <p className="mt-2 text-sm font-bold text-neonYellow">
          {formatEventDate(event.start_at)}
        </p>
        {location ? (
          <p className="mt-2 text-sm font-semibold text-white/55">{location}</p>
        ) : null}
        {event.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/68">
            {event.description}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-lg font-black text-white">{event.attendees_count}</p>
            <p className="text-[11px] font-bold uppercase text-white/42">Apuntados</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-lg font-black text-white">{event.interested_count}</p>
            <p className="text-[11px] font-bold uppercase text-white/42">Interés</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-lg font-black text-white">{event.shares_count || 0}</p>
            <p className="text-[11px] font-bold uppercase text-white/42">Shares</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={`h-12 rounded-lg text-sm font-black transition active:scale-[0.99] ${
              event.my_attendance_status === "going"
                ? "border border-neonGreen/40 bg-neonGreen/16 text-neonGreen"
                : "bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-night"
            }`}
            type="button"
            onClick={() => setAttendance("going")}
          >
            Me apunto
          </button>
          <button
            className={`h-12 rounded-lg border text-sm font-black transition active:scale-[0.99] ${
              event.my_attendance_status === "interested"
                ? "border-neonYellow/40 bg-neonYellow/14 text-neonYellow"
                : "border-white/10 bg-white/5 text-white"
            }`}
            type="button"
            onClick={() => setAttendance("interested")}
          >
            Me interesa
          </button>
        </div>
      </div>
    </article>
  );
}

export default EventCard;
