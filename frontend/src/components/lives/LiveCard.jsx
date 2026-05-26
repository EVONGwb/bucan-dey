import { motion } from "framer-motion";
import { MapPin, Radio, Users } from "lucide-react";
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
  const thumbnail = live.thumbnail_url || live.cover_media?.url || "";
  const category = liveCategoryLabels[live.category] || live.category || "Live";

  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} layout>
      <Link
        className={`group relative block overflow-hidden rounded-[1.65rem] border border-liveRed/40 bg-black shadow-live ${
          compact ? "min-w-[18.5rem]" : ""
        }`}
        to={`/lives/${live.id}`}
      >
        <div className={`${compact ? "h-44" : "h-60"} relative overflow-hidden`}>
          {thumbnail ? (
            <img
              alt={live.title}
              className="h-full w-full object-cover opacity-88 transition duration-500 group-hover:scale-105"
              loading="lazy"
              src={thumbnail}
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(255,48,64,.55),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(0,217,255,.32),transparent_30%),linear-gradient(135deg,rgba(124,58,237,.56),rgba(7,11,20,.95))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/28 to-black/28" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-liveRed px-3 py-1 text-xs font-black uppercase text-white shadow-live">
              <span className="h-2 w-2 rounded-full bg-white [animation:live-pulse_1.4s_ease-in-out_infinite]" />
              LIVE
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/42 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">
              <Users className="h-3.5 w-3.5 text-neonCyan" />
              {live.viewers_count || 0}
            </span>
          </div>
          <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-liveRed backdrop-blur-xl">
            <Radio className="h-5 w-5" />
          </div>
          <div className="absolute inset-x-3 bottom-3">
            <p className={`${compact ? "text-xl" : "text-2xl"} line-clamp-2 font-black leading-tight text-white`}>
              {live.title}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-neonYellow">
                {category}
              </p>
              {live.location?.city ? (
                <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-bold text-white/78 backdrop-blur-xl">
                  <MapPin className="h-3 w-3 shrink-0 text-neonCyan" />
                  <span className="truncate">{live.location.city}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
          <p className="truncate text-sm font-black text-white">
            @{live.creator_snapshot.username}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-white/48">
            {live.location?.area || "BUCAN DEY en vivo"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default LiveCard;
