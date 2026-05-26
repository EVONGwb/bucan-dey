import { Check } from "lucide-react";

export const creatorThemes = [
  { id: "neon", label: "Neon", bg: "from-neonPink via-fiestaPurple to-neonCyan" },
  { id: "africa", label: "África", bg: "from-green-500 via-neonYellow to-neonOrange" },
  { id: "oro", label: "Oro", bg: "from-neonYellow via-neonOrange to-amber-900" },
  { id: "evo", label: "EVO", bg: "from-neonCyan via-emerald-500 to-night" },
  { id: "minimal", label: "Minimal", bg: "from-white/70 via-white/20 to-slate-700" },
  { id: "discord", label: "Discord", bg: "from-fiestaPurple via-indigo-500 to-night" },
];

function ThemeEditor({ selectedTheme, onThemeChange }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
          Temas
        </h2>
        <button className="text-sm font-black text-neonPink" type="button">
          Ver más
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {creatorThemes.map((theme) => (
          <button
            className={`relative h-20 overflow-hidden rounded-[0.95rem] border ${
              selectedTheme === theme.id ? "border-neonPink shadow-neon" : "border-white/10"
            }`}
            key={theme.id}
            type="button"
            onClick={() => onThemeChange(theme.id)}
          >
            <span className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
            <span className="absolute inset-0 bg-black/10" />
            {selectedTheme === theme.id ? (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-neonPink text-white">
                <Check className="h-4 w-4" />
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-1 text-center text-xs font-black text-white drop-shadow">
              {theme.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default ThemeEditor;
