import { Home, Map, MessageCircle, PlusCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/create", label: "Crear", icon: PlusCircle },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Perfil", icon: User },
];

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2">
      <div className="glass-panel mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.7rem] p-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "relative flex min-h-14 touch-manipulation flex-col items-center justify-center rounded-[1.2rem] text-[11px] font-extrabold transition active:scale-[0.96]",
                  isActive
                    ? "bg-white/12 text-white shadow-cyan"
                    : "text-white/56 hover:bg-white/7 hover:text-white",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-gradient-to-r from-neonCyan to-neonPink"
                      layoutId="bottom-nav-active"
                    />
                  ) : null}
                  <Icon aria-hidden="true" className="mb-1 h-5 w-5" strokeWidth={2.3} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
