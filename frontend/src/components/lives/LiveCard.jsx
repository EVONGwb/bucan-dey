import { motion } from "framer-motion";
import { Radio, Users } from "lucide-react";
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
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link
        className={`relative block overflow-hidden rounded-[1.5rem] border border-liveRed/35 bg-gradient-to-br from-liveRed/20 via-white/7 to-neonCyan/10 shadow-live ${
          compact ? "min-w-72 p-4" : "p-5"
        }`}
        to={`/lives/${live.id}`}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/14 to-transparent" />
        <div className="relative flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-liveRed px-3 py-1 text-xs font-black uppercase text-white shadow-live">
            <span className="h-2 w-2 rounded-full bg-white [animation:live-pulse_1.4s_ease-in-out_infinite]" />
            LIVE
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-black text-white/84">
            <Users className="h-3.5 w-3.5" />
            {live.viewers_count || 0}
          </span>
        </div>
        <div className="relative mt-9 flex h-28 items-end rounded-[1.15rem] border border-white/10 bg-black/30 p-3">
          <Radio className="absolute right-3 top-3 h-5 w-5 text-liveRed" />
          <div>
            <p className={`${compact ? "text-lg" : "text-2xl"} font-black leading-tight text-white`}>
              {live.title}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-neonYellow">
              {liveCategoryLabels[live.category] || live.category}
            </p>
          </div>
        </div>
        <p className="relative mt-3 truncate text-sm font-semibold text-white/68">
          @{live.creator_snapshot.username}
          {live.location?.city ? ` · ${live.location.city}` : ""}
        </p>
      </Link>
    </motion.div>
  );
}

export default LiveCard;
