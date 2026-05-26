import { BarChart3, Gift, Hash, Link as LinkIcon, MapPin, Music, Paperclip, Palette, Smile, Tags } from "lucide-react";

const tools = [
  { label: "Etiquetas", icon: Tags },
  { label: "Encuesta", icon: BarChart3 },
  { label: "GIF", icon: Gift },
  { label: "Emoji", icon: Smile },
  { label: "Música", icon: Music },
  { label: "Ubicación", icon: MapPin },
  { label: "Hashtags", icon: Hash },
  { label: "Link", icon: LinkIcon },
  { label: "Adjuntos", icon: Paperclip },
  { label: "Fondo", icon: Palette },
];

function AdvancedTools() {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        Editor avanzado
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              className="min-h-16 rounded-[0.9rem] border border-white/10 bg-white/6 p-2 text-xs font-bold text-white/82 transition active:scale-95"
              key={tool.label}
              type="button"
            >
              <Icon className="mx-auto mb-1 h-5 w-5 text-neonYellow" />
              {tool.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default AdvancedTools;
