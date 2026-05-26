import { Building2, Globe2, Lock, UserRound, Users } from "lucide-react";

export const privacyOptions = [
  { id: "all", label: "Todos", description: "Público", value: "global", icon: Globe2 },
  { id: "followers", label: "Seguidores", description: "Solo tus seguidores", value: "profile_only", icon: UserRound },
  { id: "friends", label: "Solo amigos", description: "Amigos que sigues", value: "profile_only", icon: Users },
  { id: "private", label: "Privado", description: "Solo yo", value: "private", icon: Lock },
  { id: "company", label: "Empresa", description: "Solo mi empresa", value: "profile_only", icon: Building2 },
];

function PrivacyEditor({ selectedPrivacy, onPrivacyChange }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        Privacidad
      </h2>
      <p className="mt-1 text-xs font-semibold text-white/50">
        ¿Quién puede ver tu publicación?
      </p>
      <div className="mt-4 space-y-2">
        {privacyOptions.map((option) => {
          const Icon = option.icon;
          const isActive = selectedPrivacy === option.id;
          return (
            <button
              className={`flex w-full items-center gap-3 rounded-[0.95rem] border px-3 py-3 text-left transition ${
                isActive ? "border-neonPink/50 bg-neonPink/12" : "border-white/10 bg-white/5"
              }`}
              key={option.id}
              type="button"
              onClick={() => onPrivacyChange(option)}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-neonPink" : "text-white/62"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">{option.label}</span>
              </span>
              <span className="text-xs font-semibold text-white/42">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default PrivacyEditor;
