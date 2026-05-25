import { Link } from "react-router-dom";

export const liveCategoryLabels = {
  fiesta: "Fiesta",
  bar: "Bar",
  cumpleaños: "Cumpleaños",
  evento: "Evento",
  ambiente: "Ambiente",
  música: "Música",
  otro: "Otro",
};

function LiveCard({ live, compact = false }) {
  return (
    <Link
      className={`block rounded-lg border border-neonPink/30 bg-neonPink/10 ${
        compact ? "min-w-64 p-4" : "p-5"
      }`}
      to={`/lives/${live.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-neonPink px-3 py-1 text-xs font-black uppercase text-white">
          En directo
        </span>
        <span className="text-xs font-black text-neonPink">
          {live.viewers_count || 0} viendo
        </span>
      </div>
      <p className={`${compact ? "mt-3 text-lg" : "mt-4 text-2xl"} font-black leading-tight text-white`}>
        {live.title}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-neonYellow">
        {liveCategoryLabels[live.category] || live.category}
      </p>
      <p className="mt-2 text-sm font-semibold text-white/58">
        @{live.creator_snapshot.username}
        {live.location?.city ? ` · ${live.location.city}` : ""}
      </p>
    </Link>
  );
}

export default LiveCard;
