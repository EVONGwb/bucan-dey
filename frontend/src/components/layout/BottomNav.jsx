import { Home, Map, MessageCircle, PlusCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/create", label: "Publicar", icon: PlusCircle },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Perfil", icon: User },
];

function BottomNav() {
  const location = useLocation();
  const isPublishPage = location.pathname === "/create";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-night/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_38px_rgba(0,0,0,.36)] backdrop-blur-2xl">
      <div
        className={[
          "mx-auto grid grid-cols-5 gap-1 px-2 py-1.5 sm:px-4 sm:py-2",
          isPublishPage ? "max-w-5xl" : "max-w-2xl",
        ].join(" ")}
      >
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "relative flex touch-manipulation flex-col items-center justify-center rounded-[1.05rem] font-extrabold transition active:scale-[0.96] sm:rounded-[1.2rem]",
                  isPublishPage ? "min-h-12 text-[10px] sm:min-h-14 sm:text-[11px]" : "min-h-14 text-[11px]",
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
                  <Icon
                    aria-hidden="true"
                    className={isPublishPage ? "mb-0.5 h-[18px] w-[18px] sm:mb-1 sm:h-5 sm:w-5" : "mb-1 h-5 w-5"}
                    strokeWidth={2.3}
                  />
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
