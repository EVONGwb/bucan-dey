import { motion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  Camera,
  Car,
  Clapperboard,
  Flame,
  MapPin,
  Mic,
  Package,
  Store,
} from "lucide-react";

const actions = [
  { id: "photo", label: "Foto", icon: Camera, tone: "pink" },
  { id: "reel", label: "Reel", icon: Clapperboard, tone: "purple" },
  { id: "audio", label: "Audio", icon: Mic, tone: "cyan" },
  { id: "place", label: "Lugar", icon: MapPin, tone: "blue" },
  { id: "event", label: "Evento", icon: CalendarDays, tone: "orange" },
  { id: "taxi", label: "Taxi", icon: Car, tone: "yellow" },
  { id: "job", label: "Trabajo", icon: Briefcase, tone: "green" },
  { id: "pallets", label: "Palets", icon: Package, tone: "orange" },
  { id: "business", label: "Negocio", icon: Store, tone: "blue" },
  { id: "trend", label: "Tendencia", icon: Flame, tone: "pink" },
];

const tones = {
  pink: "border-neonPink/35 bg-neonPink/12 text-neonPink shadow-neon",
  purple: "border-fiestaPurple/35 bg-fiestaPurple/16 text-neonPink shadow-neon",
  cyan: "border-neonCyan/35 bg-neonCyan/12 text-neonCyan shadow-cyan",
  blue: "border-blue-400/35 bg-blue-500/12 text-blue-300 shadow-cyan",
  orange: "border-neonOrange/35 bg-neonOrange/12 text-neonOrange",
  yellow: "border-neonYellow/35 bg-neonYellow/12 text-neonYellow",
  green: "border-green-400/35 bg-green-500/12 text-green-400",
};

function QuickActions({ onAction }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        Creador rápido
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              className={`min-h-24 rounded-[1.15rem] border p-3 text-center ${tones[action.tone]}`}
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="mx-auto h-8 w-8" />
              <span className="mt-2 block text-sm font-black text-white">{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;
