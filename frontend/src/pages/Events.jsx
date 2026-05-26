import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, LocateFixed, Plus, Search, Sparkles, Star } from "lucide-react";

import apiClient from "../api/client.js";
import EventCard, { categoryLabels } from "../components/events/EventCard.jsx";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const categories = [
  { value: "", label: "Todos" },
  { value: "fiesta", label: "Fiesta" },
  { value: "cumpleaños", label: "Cumpleaños" },
  { value: "concierto", label: "Concierto" },
  { value: "bar", label: "Bar" },
  { value: "deporte", label: "Deporte" },
  { value: "otro", label: "Otro" },
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

function SectionHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/56">
          <Icon className="h-4 w-4 text-neonYellow" />
          {title}
        </p>
        {subtitle ? <p className="mt-1 text-sm font-semibold text-white/44">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Events() {
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
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

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return events;
    return events.filter((event) =>
      [
        event.title,
        event.description,
        event.location?.city,
        event.location?.area,
        event.location?.venue_name,
        categoryLabels[event.category],
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [events, query]);

  const popular = useMemo(
    () =>
      [...events]
        .sort(
          (a, b) =>
            b.attendees_count +
            b.interested_count -
            (a.attendees_count + a.interested_count)
        )
        .slice(0, 6),
    [events]
  );

  return (
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden pb-6">
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-neonYellow/14 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-neonPink/14 blur-3xl" />

      <motion.header
        className="glass-panel relative z-10 rounded-[2rem] p-5 shadow-neon"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neonYellow">
              <CalendarDays className="h-4 w-4" />
              Eventos
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Eventos</h1>
            <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-white/62">
              Descubre planes, fiestas y ambiente cerca.
            </p>
          </div>
          <Link
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neonYellow via-neonPink to-neonCyan text-white shadow-neon"
            to="/events/create"
            aria-label="Crear evento"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-3">
          <Search className="h-5 w-5 text-white/40" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/34"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar fiestas, bares o zonas"
          />
        </div>

        <button
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-neonCyan/30 bg-neonCyan/10 text-sm font-black text-neonCyan disabled:opacity-60"
          type="button"
          onClick={loadNearby}
          disabled={isLocating}
        >
          <LocateFixed className="h-4 w-4" />
          {isLocating ? "Buscando cerca..." : "Eventos cerca de mí"}
        </button>
      </motion.header>

      <div className="scrollbar-none relative z-10 mt-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <motion.button
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-black ${
              category === item.value
                ? "border-neonYellow/50 bg-neonYellow/14 text-neonYellow shadow-neon"
                : "border-white/10 bg-white/7 text-white/58"
            }`}
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
            whileTap={{ scale: 0.96 }}
          >
            {item.label}
          </motion.button>
        ))}
      </div>

      {error ? (
        <div className="relative z-10 mt-4 rounded-[1.2rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? <ListSkeleton count={3} /> : null}

      {!isLoading && nearby.length ? (
        <section className="relative z-10 mt-7">
          <SectionHeader title="Cerca de ti" subtitle="Planes detectados por ubicación" icon={LocateFixed} />
          <div className="space-y-4">
            {nearby.map((event) => (
              <EventCard key={event.id} event={event} onAttendanceChange={handleAttendanceChange} />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && featured.length ? (
        <section className="relative z-10 mt-7">
          <SectionHeader title="Destacados" subtitle="Eventos con más señal social" icon={Star} />
          <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {featured.map((event) => (
              <div className="min-w-[19rem]" key={event.id}>
                <EventCard event={event} onAttendanceChange={handleAttendanceChange} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading ? (
        <section className="relative z-10 mt-7">
          <SectionHeader title="Próximos" subtitle="Ordenados por actividad reciente" icon={CalendarDays} />
          {filteredEvents.length === 0 ? (
            <div className="glass-panel rounded-[1.75rem] p-5 text-center">
              <p className="text-base font-black text-white">Todavía no hay eventos.</p>
              <p className="mt-2 text-sm font-semibold text-white/54">
                Crea el primer plan de BUCAN DEY.
              </p>
              <Link
                className="mt-4 inline-flex h-12 items-center rounded-full bg-neonYellow px-5 text-sm font-black text-night"
                to="/events/create"
              >
                Crear evento
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} onAttendanceChange={handleAttendanceChange} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!isLoading && popular.length ? (
        <section className="relative z-10 mt-7">
          <SectionHeader title="Populares" subtitle="Más apuntados e interesados" icon={Sparkles} />
          <div className="grid gap-3">
            {popular.map((event, index) => (
              <Link
                className="glass-panel flex items-center gap-3 rounded-[1.45rem] p-4"
                key={event.id}
                to={`/events/${event.id}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neonYellow/14 text-sm font-black text-neonYellow">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-white">{event.title}</p>
                  <p className="mt-1 text-sm font-semibold text-white/50">
                    {event.attendees_count} apuntados · {event.interested_count} interesados
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default Events;
