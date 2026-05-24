import { Home, Map, MessageCircle, PlusCircle, User } from "lucide-react";
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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-night/92 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex min-h-14 flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition",
                  isActive
                    ? "bg-white/10 text-neonPink shadow-neon"
                    : "text-white/62 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
            >
              <Icon aria-hidden="true" className="mb-1 h-5 w-5" strokeWidth={2.2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
