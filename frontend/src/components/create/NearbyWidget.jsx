import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const MALABO_CENTER = [3.7523, 8.7741];

const nearbyPeople = [
  ["Pmm", "2 km", "bg-green-400"],
  ["Taxi Driver", "1 km", "bg-green-400"],
  ["Maria", "3 km", "bg-blue-400"],
  ["Juan", "5 km", "bg-white/40"],
];

function createSelectedIcon() {
  return L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fff,#00D9FF 38%,#FF4FD8 78%);border:4px solid #070B14;box-shadow:0 0 0 8px rgba(0,217,255,.18),0 0 28px rgba(0,217,255,.64);"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });

  return null;
}

function NearbyWidget({
  form,
  updateField,
  showLocationPicker,
  setShowLocationPicker,
  handleUseCurrentLocation,
  isLocating,
  locationError,
  setSelectedLocation,
}) {
  const position = form.lat && form.lng ? [Number(form.lat), Number(form.lng)] : null;

  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
          Cerca de ti
        </h2>
        <Link className="text-sm font-black text-neonPink" to="/map">
          Ver mapa
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-night">
        <div className="relative h-36 bg-[linear-gradient(135deg,rgba(0,217,255,.18),rgba(255,79,216,.14)),repeating-linear-gradient(35deg,rgba(255,255,255,.08)_0_1px,transparent_1px_32px),repeating-linear-gradient(120deg,rgba(255,255,255,.05)_0_1px,transparent_1px_38px)]">
          {[
            "left-8 top-8 border-green-400",
            "left-28 top-16 border-neonPink",
            "right-12 top-10 border-neonYellow",
          ].map((classes, index) => (
            <span
              className={`absolute flex h-10 w-10 items-center justify-center rounded-full border-2 bg-night text-xs font-black text-white shadow-cyan ${classes}`}
              key={classes}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <div className="divide-y divide-white/10">
          {nearbyPeople.map(([name, distance, dot]) => (
            <div className="flex items-center gap-3 px-3 py-2" key={name}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neonPink to-neonCyan text-xs font-black text-white">
                {name.charAt(0)}
              </span>
              <span className="flex-1 text-sm font-bold text-white">{name}</span>
              <span className="text-xs font-semibold text-white/52">{distance}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
          name="city"
          value={form.city}
          onChange={updateField}
          placeholder="Ciudad"
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonCyan"
          name="area"
          value={form.area}
          onChange={updateField}
          placeholder="Zona/Barrio"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-[0.9rem] border border-neonCyan/30 bg-neonCyan/10 px-3 text-sm font-black text-neonCyan disabled:opacity-60"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          <LocateFixed className="h-4 w-4" />
          {isLocating ? "Buscando..." : "Usar ubicación"}
        </button>
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-[0.9rem] border border-neonPink/30 bg-neonPink/10 px-3 text-sm font-black text-neonPink"
          type="button"
          onClick={() => setShowLocationPicker((current) => !current)}
        >
          <MapPin className="h-4 w-4" />
          Elegir mapa
        </button>
      </div>

      {position ? (
        <div className="mt-3 rounded-[0.95rem] border border-neonCyan/25 bg-neonCyan/10 px-4 py-3 text-sm font-bold text-white">
          Ubicación seleccionada: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
        </div>
      ) : null}

      {showLocationPicker ? (
        <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-white/10">
          <div className="h-72 w-full">
            <MapContainer
              center={position || MALABO_CENTER}
              className="bucan-map h-full w-full"
              scrollWheelZoom={false}
              zoom={13}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={(latlng) => setSelectedLocation(latlng.lat, latlng.lng)} />
              {position ? <Marker icon={createSelectedIcon()} position={position} /> : null}
            </MapContainer>
          </div>
          <p className="bg-night px-4 py-3 text-xs font-semibold text-white/56">
            Toca el mapa para seleccionar el punto de la publicación.
          </p>
        </div>
      ) : null}

      {locationError ? (
        <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {locationError}
        </div>
      ) : null}

      <label className="mt-3 flex items-center justify-between rounded-[0.95rem] border border-white/10 bg-white/6 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Navigation className="h-4 w-4 text-neonCyan" />
          Mostrar en mapa
        </span>
        <input
          className="h-5 w-5 accent-cyan-400"
          type="checkbox"
          name="show_on_map"
          checked={form.show_on_map}
          onChange={updateField}
        />
      </label>
    </section>
  );
}

export default NearbyWidget;
