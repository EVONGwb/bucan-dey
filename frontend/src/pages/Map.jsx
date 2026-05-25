import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import apiClient from "../api/client.js";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const MALABO_CENTER = [3.7523, 8.7741];
const radiusOptions = [2, 5, 10, 25];

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
  concierto: "#ff1478",
  meetup: "#17f56b",
  deporte: "#ffffff",
  otro: "#ffffff",
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
  concierto: "Concierto",
  meetup: "Meetup",
  deporte: "Deporte",
  otro: "Otro",
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

function createUserIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:22px;height:22px;border-radius:999px;background:#17f56b;border:4px solid #08070d;box-shadow:0 0 20px #17f56b;"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
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

function CenterOnUser({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;
    map.setView([userLocation.lat, userLocation.lng], 14);
  }, [map, userLocation]);

  return null;
}

function Map() {
  const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeType, setActiveType] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
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
        if (nearbyMode && userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
          params.radius_km = radiusKm;
        }

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
  }, [activeType, nearbyMode, radiusKm, userLocation]);

  function handleNearMe() {
    setError("");

    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setNearbyMode(true);
        setIsLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación. El mapa seguirá mostrando el ambiente general.");
        setNearbyMode(false);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

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

      <div className="mt-3 rounded-lg border border-white/10 bg-surface p-3">
        <div className="flex gap-2">
          <button
            className="min-h-12 flex-1 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink px-4 text-sm font-black text-night transition active:scale-[0.99] disabled:opacity-60"
            type="button"
            onClick={handleNearMe}
            disabled={isLocating}
          >
            {isLocating ? "Buscando..." : "Cerca de mí"}
          </button>
          {nearbyMode ? (
            <button
              className="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-white"
              type="button"
              onClick={() => {
                setNearbyMode(false);
                setUserLocation(null);
              }}
            >
              Ver todo
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {radiusOptions.map((radius) => (
            <button
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${
                radiusKm === radius
                  ? "border-neonGreen bg-neonGreen/12 text-neonGreen"
                  : "border-white/10 bg-white/5 text-white/62"
              }`}
              key={radius}
              type="button"
              onClick={() => setRadiusKm(radius)}
            >
              {radius} km
            </button>
          ))}
        </div>

        {nearbyMode ? (
          <p className="mt-2 text-xs font-semibold text-white/54">
            Mostrando publicaciones a {radiusKm} km de tu ubicación aproximada.
          </p>
        ) : null}
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
            <CenterOnUser userLocation={userLocation} />
            {userLocation ? (
              <Marker
                icon={createUserIcon()}
                position={[userLocation.lat, userLocation.lng]}
              >
                <Popup>Tú estás aquí, aproximadamente</Popup>
              </Marker>
            ) : null}
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
                    {post.distance_km !== null && post.distance_km !== undefined ? (
                      <p className="mt-1 text-xs font-bold">a {post.distance_km} km</p>
                    ) : null}
                    <p className="mt-2 text-xs">
                      {post.source_type === "event"
                        ? `${post.attendees_count || 0} apuntados`
                        : `${post.stats.likes_count} likes · ${post.stats.comments_count} comentarios`}
                    </p>
                    <Link
                      className="mt-2 inline-block text-sm font-bold"
                      to={post.source_type === "event" ? `/events/${post.id}` : `/posts/${post.id}`}
                    >
                      {post.source_type === "event" ? "Ver evento" : "Ver publicación"}
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton count={2} />
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
