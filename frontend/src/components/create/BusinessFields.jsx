function BusinessFields({ creatorMode, extraFields, onExtraChange }) {
  if (!["job", "business", "taxi", "pallets", "sale"].includes(creatorMode)) return null;

  const isJob = creatorMode === "job" || creatorMode === "taxi";
  const isPallet = creatorMode === "pallets";
  const title = isPallet ? "Modo ConectaPalet" : isJob ? "Modo empleo" : "Publicación negocio";

  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        {title}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.company}
          onChange={(event) => onExtraChange("company", event.target.value)}
          placeholder={isPallet ? "Empresa / vendedor" : "Empresa"}
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.role}
          onChange={(event) => onExtraChange("role", event.target.value)}
          placeholder={isPallet ? "Producto" : isJob ? "Puesto" : "Servicio"}
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.salary}
          onChange={(event) => onExtraChange("salary", event.target.value)}
          placeholder={isPallet ? "Cantidad / precio" : "Salario"}
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.city}
          onChange={(event) => onExtraChange("city", event.target.value)}
          placeholder="Ciudad"
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.schedule}
          onChange={(event) => onExtraChange("schedule", event.target.value)}
          placeholder="Horario"
        />
        <input
          className="h-12 rounded-[0.9rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonPink"
          value={extraFields.contact}
          onChange={(event) => onExtraChange("contact", event.target.value)}
          placeholder="Contacto"
        />
      </div>
    </section>
  );
}

export default BusinessFields;
