import { Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

function MusicWidget() {
  return (
    <section className="glass-panel rounded-[1.6rem] border-neonCyan/20 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
          Sonando ahora
        </h2>
        <Volume2 className="h-5 w-5 text-green-400" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-[1rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,216,77,.6),transparent_35%),linear-gradient(135deg,rgba(255,79,216,.75),rgba(7,11,20,.92))]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-white">Me Conozco</p>
          <p className="mt-1 text-sm font-semibold text-white/58">Roku</p>
          <div className="mt-3 flex items-center gap-3">
            <SkipBack className="h-4 w-4 text-white" />
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-neonPink text-white shadow-neon" type="button" aria-label="Play">
              <Play className="h-5 w-5 fill-current" />
            </button>
            <SkipForward className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex h-8 items-center gap-1">
        {Array.from({ length: 28 }).map((_, index) => (
          <span
            className={`w-1 rounded-full ${index < 17 ? "bg-neonPink" : "bg-white/24"}`}
            key={index}
            style={{ height: `${8 + (index % 7) * 3}px` }}
          />
        ))}
      </div>
    </section>
  );
}

export default MusicWidget;
