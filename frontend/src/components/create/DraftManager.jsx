import { Briefcase, CalendarDays, PencilLine, Radio } from "lucide-react";

const drafts = [
  { label: "Publicación", time: "Hoy, 12:30", icon: PencilLine, color: "text-neonOrange" },
  { label: "Evento", time: "Ayer, 18:45", icon: CalendarDays, color: "text-neonPink" },
  { label: "Trabajo", time: "07/05/2025", icon: Briefcase, color: "text-green-400" },
  { label: "Live", time: "05/05/2025", icon: Radio, color: "text-liveRed" },
];

function DraftManager() {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
          Borradores
        </h2>
        <button className="text-sm font-black text-neonPink" type="button">
          Ver todos
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {drafts.map((draft) => {
          const Icon = draft.icon;
          return (
            <button
              className="flex w-full items-center gap-3 rounded-[0.95rem] border border-white/10 bg-white/5 px-3 py-3 text-left"
              key={draft.label}
              type="button"
            >
              <Icon className={`h-5 w-5 ${draft.color}`} />
              <span className="flex-1 text-sm font-black text-white">{draft.label}</span>
              <span className="text-xs font-semibold text-white/44">{draft.time}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default DraftManager;
