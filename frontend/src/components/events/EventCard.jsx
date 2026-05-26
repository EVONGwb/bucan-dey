import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Star, Ticket, Users } from "lucide-react";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { optimizeCloudinaryImage } from "../../utils/media.js";

export const categoryLabels = {
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

function getDateParts(value) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("es-ES", { day: "2-digit" }),
    month: date.toLocaleDateString("es-ES", { month: "short" }),
    time: date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
  };
}

function EventCard({ event, onAttendanceChange }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = [event.location?.city, event.location?.area, event.location?.venue_name]
    .filter(Boolean)
    .join(" · ");
  const coverUrl =
    event.cover_media?.type === "image"
      ? optimizeCloudinaryImage(event.cover_media.url, { width: 720 })
      : event.cover_media?.thumbnail_url;
  const dateParts = getDateParts(event.start_at);

  async function setAttendance(status) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiClient.post(`/events/${event.id}/attend`, { status });
      onAttendanceChange?.(event.id, response.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.article
      className="group overflow-hidden rounded-[1.8rem] border border-neonYellow/24 bg-surface shadow-[0_20px_70px_rgba(0,0,0,.28)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      layout
    >
      <Link className="relative block h-56 overflow-hidden" to={`/events/${event.id}`}>
        {coverUrl ? (
          <img
            alt={event.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={coverUrl}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,216,77,.42),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,79,216,.34),transparent_32%),linear-gradient(135deg,rgba(124,58,237,.52),rgba(7,11,20,.98))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/22 to-black/16" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-neonYellow/40 bg-neonYellow/16 px-3 py-1 text-xs font-black uppercase text-neonYellow shadow-neon backdrop-blur-xl">
            <Star className="h-3.5 w-3.5" />
            {categoryLabels[event.category] || "Evento"}
          </span>
          {event.distance_km !== null && event.distance_km !== undefined ? (
            <span className="rounded-full border border-neonCyan/30 bg-neonCyan/12 px-3 py-1 text-xs font-black text-neonCyan backdrop-blur-xl">
              a {event.distance_km} km
            </span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 rounded-[1.1rem] border border-white/10 bg-black/46 px-3 py-2 text-center backdrop-blur-xl">
          <p className="text-2xl font-black leading-none text-white">{dateParts.day}</p>
          <p className="mt-1 text-[10px] font-black uppercase text-neonYellow">{dateParts.month}</p>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <h2 className="line-clamp-2 text-2xl font-black leading-tight text-white">
            {event.title}
          </h2>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-black text-neonYellow">
            <CalendarDays className="h-4 w-4" />
            {dateParts.time}
          </p>
        </div>
      </Link>

      <div className="p-4">
        {location ? (
          <p className="flex items-center gap-2 truncate text-sm font-semibold text-white/58">
            <MapPin className="h-4 w-4 shrink-0 text-neonCyan" />
            {location}
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/68">
            {event.description}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[1.05rem] border border-white/10 bg-white/7 p-2">
            <p className="text-lg font-black text-white">{event.attendees_count}</p>
            <p className="text-[10px] font-black uppercase text-white/38">Apuntados</p>
          </div>
          <div className="rounded-[1.05rem] border border-white/10 bg-white/7 p-2">
            <p className="text-lg font-black text-white">{event.interested_count}</p>
            <p className="text-[10px] font-black uppercase text-white/38">Interés</p>
          </div>
          <div className="rounded-[1.05rem] border border-white/10 bg-white/7 p-2">
            <p className="text-lg font-black text-white">{event.shares_count || 0}</p>
            <p className="text-[10px] font-black uppercase text-white/38">Shares</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <motion.button
            className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-black transition disabled:opacity-60 ${
              event.my_attendance_status === "going"
                ? "border border-neonYellow/40 bg-neonYellow/16 text-neonYellow shadow-neon"
                : "bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-white shadow-cyan"
            }`}
            type="button"
            onClick={() => setAttendance("going")}
            disabled={isSubmitting}
            whileTap={{ scale: 0.96 }}
          >
            <Ticket className="h-4 w-4" />
            Me apunto
          </motion.button>
          <motion.button
            className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-black transition disabled:opacity-60 ${
              event.my_attendance_status === "interested"
                ? "border-neonPink/40 bg-neonPink/14 text-neonPink"
                : "border-white/10 bg-white/7 text-white"
            }`}
            type="button"
            onClick={() => setAttendance("interested")}
            disabled={isSubmitting}
            whileTap={{ scale: 0.96 }}
          >
            <Users className="h-4 w-4" />
            Me interesa
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
