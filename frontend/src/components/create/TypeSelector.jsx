import { motion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  Car,
  Clapperboard,
  Package,
  PencilLine,
  Radio,
  Store,
  Tag,
  Users,
} from "lucide-react";

export const creatorTypes = [
  { id: "post", label: "POST", backendType: "normal", icon: PencilLine, tone: "pink" },
  { id: "reel", label: "REEL", backendType: "video", icon: Clapperboard, tone: "purple" },
  { id: "event", label: "EVENTO", backendType: "evento", icon: CalendarDays, tone: "orange" },
  { id: "live", label: "LIVE", backendType: "live", icon: Radio, tone: "red" },
  { id: "job", label: "TRABAJO", backendType: "normal", icon: Briefcase, tone: "green" },
  { id: "business", label: "NEGOCIO", backendType: "bar", icon: Store, tone: "blue" },
  { id: "sale", label: "VENTA", backendType: "normal", icon: Tag, tone: "yellow" },
  { id: "taxi", label: "TAXI", backendType: "ambiente", icon: Car, tone: "yellow" },
  { id: "pallets", label: "PALETS", backendType: "normal", icon: Package, tone: "orange" },
  { id: "community", label: "COMUNIDAD", backendType: "normal", icon: Users, tone: "purple" },
];

const tones = {
  pink: "border-neonPink/40 bg-neonPink/12 text-neonPink",
  purple: "border-fiestaPurple/40 bg-fiestaPurple/16 text-neonPink",
  orange: "border-neonOrange/40 bg-neonOrange/12 text-neonOrange",
  red: "border-liveRed/40 bg-liveRed/12 text-liveRed shadow-live",
  green: "border-green-400/40 bg-green-500/12 text-green-400",
  blue: "border-blue-400/40 bg-blue-500/12 text-blue-300",
  yellow: "border-neonYellow/40 bg-neonYellow/12 text-neonYellow",
};

function TypeSelector({ activeType, onSelect }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        Tipos de publicación
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {creatorTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.id;
          return (
            <motion.button
              className={`min-h-24 rounded-[1.15rem] border p-3 text-center transition ${
                isActive ? `${tones[type.tone]} shadow-neon` : "border-white/10 bg-white/7 text-white/72"
              }`}
              key={type.id}
              type="button"
              onClick={() => onSelect(type)}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="mx-auto h-8 w-8" />
              <span className="mt-2 block text-sm font-black text-white">{type.label}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default TypeSelector;
