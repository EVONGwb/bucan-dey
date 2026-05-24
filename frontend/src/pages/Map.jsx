import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";

const MALABO_CENTER = [3.7523, 8.7741];

const filters = [
  { value: "", label: "Todos" },
  { value: "fiesta", label: "Fiesta" },
  { value: "cumpleaños", label: "Cumpleaños" },
  { value: "evento", label: "Evento" },
  { value: "live", label: "Live" },
  { value: "bar", label: "Bar" },
  { value: "ambiente", label: "Ambiente" },
];

const markerColors = {
  normal: "#ffffff",
  video: "#ff1478",
  fiesta: "#ff8a1f",
  cumpleaños: "#ffd21f",
  evento: "#17f56b",
  live: "#ff1478",
  bar: "#ffd21f",
  ambiente: "#17f56b",
};

const typeLabels = {
  normal: "Normal",
  video: "Vídeo",
  fiesta: "Fiesta",
  cumpleaños: "Cumpleaños",
  evento: "Evento",
  live: "Live",
  bar: "Bar",
  ambiente: "Ambiente",
};

function createMarkerIcon(type) {
  const color = markerColors[type] || markerColors.normal;

  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:999px;background:${color};border:3px solid #08070d;box-shadow:0 0 18px ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function FitMarkers({ posts }) {
  const map = useMap();

  useEffect(() => {
    if (!posts.length) return;

    const bounds = L.latLngBounds(
      posts.map((post) => [post.location.lat, post.location.lng])
    );
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [map, posts]);

  return null;
}

function Map() {
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeType, setActiveType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const markers = useMemo(
    () =>
      posts.filter(
        (post) =>
          typeof post.location?.lat === "number" &&
          typeof post.location?.lng === "number"
      ),
    [posts]
  );

  useEffect(() => {
    async function loadMap() {
      try {
        setIsLoading(true);
        setError("");
        const params = { limit: 100 };
        if (activeType) params.type = activeType;

        const [postsResponse, ambientResponse] = await Promise.all([
          apiClient.get("/map/posts", { params }),
          apiClient.get("/map/ambient"),
        ]);
        setPosts(postsResponse.data.items);
        setZones(ambientResponse.data.zones);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadMap();
  }, [activeType]);

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Mapa de ambiente
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Mapa</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Descubre qué está pasando cerca.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${
              activeType === filter.value
                ? "border-neonPink bg-neonPink/16 text-neonPink"
                : "border-white/10 bg-surface text-white/68"
            }`}
            type="button"
            onClick={() => setActiveType(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-surface">
        <div className="h-[28rem] w-full">
          <MapContainer
            center={MALABO_CENTER}
            className="h-full w-full"
            scrollWheelZoom={false}
            zoom={12}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMarkers posts={markers} />
            {markers.map((post) => (
              <Marker
                key={post.id}
                icon={createMarkerIcon(post.type)}
                position={[post.location.lat, post.location.lng]}
              >
                <Popup>
                  <div className="min-w-44">
                    <p className="text-xs font-bold uppercase">{typeLabels[post.type]}</p>
                    <p className="mt-1 font-bold">{post.author_snapshot.display_name}</p>
                    <p className="mt-1 text-sm">{post.text.slice(0, 120)}</p>
                    <p className="mt-2 text-xs">
                      {[post.location.city, post.location.area].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs">{formatRelativeDate(post.created_at)}</p>
                    <p className="mt-2 text-xs">
                      {post.stats.likes_count} likes · {post.stats.comments_count} comentarios
                    </p>
                    <Link className="mt-2 inline-block text-sm font-bold" to="/">
                      Ver publicación
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 flex justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-neonPink" />
        </div>
      ) : null}

      {!isLoading && markers.length === 0 ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-surface p-5">
          <p className="text-base font-black text-white">
            Todavía no hay puntos de ambiente en el mapa.
          </p>
        </div>
      ) : null}

      {zones.length ? (
        <div className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
            Zonas activas
          </p>
          <div className="mt-3 space-y-3">
            {zones.slice(0, 5).map((zone) => (
              <div
                className="rounded-lg border border-white/10 bg-surface p-4"
                key={`${zone.city}-${zone.area}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-white">{zone.area}</p>
                    <p className="text-sm font-semibold text-white/48">{zone.city}</p>
                  </div>
                  <span className="rounded-full border border-neonGreen/30 bg-neonGreen/12 px-3 py-1 text-xs font-black text-neonGreen">
                    {zone.heat_level}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white/58">
                  {zone.posts_count} posts · {zone.live_count} lives · {zone.event_count} eventos
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default Map;
