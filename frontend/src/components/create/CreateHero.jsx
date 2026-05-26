import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Briefcase, CalendarDays, MapPin, PencilLine, Radio, Search, Settings } from "lucide-react";

const heroActions = [
  { id: "post", label: "Publicación", icon: PencilLine },
  { id: "event", label: "Evento", icon: CalendarDays },
  { id: "business", label: "Negocio", icon: Briefcase },
  { id: "live", label: "Live", icon: Radio },
];

function CreateHero({ activeMode, onModeChange, onLive }) {
  return (
    <motion.header
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-night p-5 shadow-cyan"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="creator-aurora absolute inset-0 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-night/12 via-night/42 to-night/94" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase leading-none text-white">
            Creador <span className="text-neonPink">Vivo</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-white/82">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neonPink" />
              Malabo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_16px_rgba(34,197,94,.8)]" />
              248 usuarios activos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-neonPink" />
              17 eventos hoy
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { icon: Search, label: "Buscar" },
            { icon: Bell, label: "Notificaciones", badge: "12" },
            { icon: Settings, label: "Ajustes" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                className="relative flex h-11 w-11 items-center justify-center rounded-[1rem] border border-neonPink/24 bg-white/7 text-white backdrop-blur-xl transition active:scale-95"
                type="button"
                aria-label={item.label}
                key={item.label}
              >
                <Icon className="h-5 w-5" />
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-neonPink px-1 text-center text-[10px] font-black text-white shadow-neon">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {heroActions.map((action) => {
          const Icon = action.icon;
          const isActive = activeMode === action.id;
          const content = (
            <motion.button
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] border text-sm font-black transition ${
                isActive
                  ? "border-neonPink/70 bg-gradient-to-r from-neonPink to-fiestaPurple text-white shadow-neon"
                  : "border-white/10 bg-white/7 text-white/82 backdrop-blur-xl hover:bg-white/10"
              }`}
              type="button"
              onClick={() => {
                if (action.id === "live") onLive?.();
                else onModeChange(action.id);
              }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon className="h-5 w-5" />
              {action.label}
            </motion.button>
          );

          if (action.id === "event") {
            return (
              <div key={action.id} className="space-y-2">
                {content}
                <Link className="sr-only" to="/events/create">
                  Crear evento real
                </Link>
              </div>
            );
          }

          return <div key={action.id}>{content}</div>;
        })}
      </div>
    </motion.header>
  );
}

export default CreateHero;
