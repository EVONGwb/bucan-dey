import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import apiClient from "../api/client.js";
import EventCard from "../components/events/EventCard.jsx";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const categories = [
  { value: "", label: "Todos" },
  { value: "fiesta", label: "Fiesta" },
  { value: "cumpleaños", label: "Cumpleaños" },
  { value: "concierto", label: "Concierto" },
  { value: "bar", label: "Bar" },
  { value: "evento", label: "Evento" },
];

function updateEventAttendance(events, eventId, attendance) {
  return events.map((event) =>
    event.id === eventId
      ? {
          ...event,
          my_attendance_status: attendance.status,
          attendees_count: attendance.attendees_count,
          interested_count: attendance.interested_count,
        }
      : event
  );
}

function Events() {
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");

  async function loadEvents() {
    const params = { limit: 40 };
    if (category) params.category = category;
    const [eventsResponse, featuredResponse] = await Promise.all([
      apiClient.get("/events", { params }),
      apiClient.get("/events", { params: { featured: true, limit: 8 } }),
    ]);
    setEvents(eventsResponse.data.items);
    setFeatured(featuredResponse.data.items);
  }

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError("");
        await loadEvents();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [category]);

  function handleAttendanceChange(eventId, attendance) {
    setEvents((current) => updateEventAttendance(current, eventId, attendance));
    setFeatured((current) => updateEventAttendance(current, eventId, attendance));
    setNearby((current) => updateEventAttendance(current, eventId, attendance));
  }

  function loadNearby() {
    setError("");
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await apiClient.get("/events", {
            params: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              radius_km: 10,
              limit: 20,
              category: category || undefined,
            },
          });
          setNearby(response.data.items);
        } catch (err) {
          setError(getApiErrorMessage(err));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("No se pudo obtener tu ubicación.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  const popular = [...events]
    .sort((a, b) => b.attendees_count + b.interested_count - (a.attendees_count + a.interested_count))
    .slice(0, 6);

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
            Eventos reales
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">Eventos</h1>
        </div>
        <Link
          className="mt-2 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink px-4 py-3 text-sm font-black text-night"
          to="/events/create"
        >
          Crear
        </Link>
      </div>

      <p className="mt-3 text-base leading-7 text-white/68">
        Fiestas, cumpleaños, bares y planes con asistencia real.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${
              category === item.value
                ? "border-neonPink bg-neonPink/16 text-neonPink"
                : "border-white/10 bg-surface text-white/68"
            }`}
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        className="mt-3 h-12 w-full rounded-lg border border-neonGreen/30 bg-neonGreen/10 text-sm font-black text-neonGreen"
        type="button"
        onClick={loadNearby}
        disabled={isLocating}
      >
        {isLocating ? "Buscando cerca..." : "Eventos cerca de mí"}
      </button>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? <ListSkeleton count={3} /> : null}

      {!isLoading && nearby.length ? (
        <section className="mt-7">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-white/48">
            Cerca de mí
          </p>
          <div className="space-y-4">
            {nearby.map((event) => (
              <EventCard key={event.id} event={event} onAttendanceChange={handleAttendanceChange} />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && featured.length ? (
        <section className="mt-7">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-white/48">
            Destacados
          </p>
          <div className="space-y-4">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} onAttendanceChange={handleAttendanceChange} />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading ? (
        <section className="mt-7">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-white/48">
            Próximos
          </p>
          {events.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-surface p-5">
              <p className="text-base font-black text-white">
                Todavía no hay eventos. Crea el primero.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onAttendanceChange={handleAttendanceChange} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!isLoading && popular.length ? (
        <section className="mt-7">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-white/48">
            Populares
          </p>
          <div className="grid gap-3">
            {popular.map((event) => (
              <Link
                className="rounded-lg border border-white/10 bg-white/5 p-4"
                key={event.id}
                to={`/events/${event.id}`}
              >
                <p className="text-base font-black text-white">{event.title}</p>
                <p className="mt-1 text-sm font-semibold text-white/50">
                  {event.attendees_count} apuntados · {event.interested_count} interesados
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default Events;
