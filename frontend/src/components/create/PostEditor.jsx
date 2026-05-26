import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ImageIcon, Music, Smile, Type, Video, Briefcase } from "lucide-react";

function Avatar({ user }) {
  if (user?.avatar_url) {
    return (
      <img
        alt={user.display_name || user.username}
        className="h-[4.5rem] w-[4.5rem] rounded-full border-2 border-neonPink object-cover shadow-neon"
        src={user.avatar_url}
      />
    );
  }

  return (
    <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-neonPink bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan text-2xl font-black text-white shadow-neon">
      {(user?.display_name || user?.username || "B").charAt(0).toUpperCase()}
    </div>
  );
}

function PostEditor({
  user,
  form,
  updateField,
  mediaItems,
  isUploading,
  uploadError,
  handleMediaSelect,
  removeMedia,
  hasEventFields,
}) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <div className="flex items-start gap-4">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-black text-white">
              {user?.display_name || user?.username || "BUCAN DEY"}
            </p>
            {user?.is_verified ? (
              <span className="rounded-full bg-neonCyan px-1.5 text-[10px] font-black text-night">
                ✓
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-white/58">
            {form.visibility === "global" ? "Público" : form.visibility === "private" ? "Privado" : "Solo perfil"} · {form.city || user?.city || "Malabo"}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-green-400">
            <Music className="h-4 w-4" />
            Sonando ahora
          </p>
        </div>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/7 text-white"
          type="button"
          aria-label="Más opciones"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <textarea
        className="mt-5 min-h-32 w-full resize-none border-0 bg-transparent text-xl font-semibold leading-8 text-white outline-none placeholder:text-white/36"
        name="text"
        value={form.text}
        onChange={updateField}
        placeholder="¿Qué quieres compartir hoy?"
        maxLength={1000}
        required
      />

      {mediaItems.length ? (
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-night">
          {mediaItems.map((item) =>
            item.type === "image" ? (
              <img
                alt="Preview"
                className="max-h-[26rem] w-full object-cover"
                key={item.public_id || item.url}
                src={item.url}
              />
            ) : (
              <video
                className="max-h-[26rem] w-full bg-black"
                controls
                key={item.public_id || item.url}
                preload="metadata"
                src={item.url}
              />
            )
          )}
          <button
            className="h-12 w-full border-t border-white/10 text-sm font-black text-neonPink"
            type="button"
            onClick={removeMedia}
          >
            Quitar archivo
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex gap-2 overflow-x-auto border-t border-white/10 pt-4 scrollbar-none">
        {[
          { label: "Texto", icon: Type },
          { label: "Imagen", icon: ImageIcon, upload: true },
          { label: "Video", icon: Video, upload: true },
          { label: "Evento", icon: CalendarDays },
          { label: "Negocio", icon: Briefcase },
          { label: "Emoji", icon: Smile },
        ].map((action) => {
          const Icon = action.icon;
          const button = (
            <motion.span
              className="flex h-12 min-w-28 items-center justify-center gap-2 rounded-[0.85rem] border border-white/10 bg-white/6 px-3 text-sm font-bold text-white"
              whileTap={{ scale: 0.96 }}
            >
              <Icon className="h-5 w-5 text-neonPink" />
              {action.upload && isUploading ? "Subiendo..." : action.label}
            </motion.span>
          );

          if (action.upload) {
            return (
              <label className="cursor-pointer" key={action.label}>
                {button}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleMediaSelect}
                  disabled={isUploading}
                />
              </label>
            );
          }

          return <button key={action.label} type="button">{button}</button>;
        })}
      </div>

      {uploadError ? (
        <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {uploadError}
        </div>
      ) : null}

      {hasEventFields ? (
        <div className="mt-5 rounded-[1.25rem] border border-neonOrange/24 bg-neonOrange/10 p-4">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-neonOrange">
            Datos del evento
          </p>
          <div className="mt-4 grid gap-3">
            <input
              className="h-12 rounded-[0.9rem] border border-white/10 bg-black/22 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonOrange"
              name="event_title"
              value={form.event_title}
              onChange={updateField}
              placeholder="Título del evento"
            />
            <input
              className="h-12 rounded-[0.9rem] border border-white/10 bg-black/22 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonOrange"
              name="venue"
              value={form.venue}
              onChange={updateField}
              placeholder="Lugar"
            />
            <input
              className="h-12 rounded-[0.9rem] border border-white/10 bg-black/22 px-4 text-sm text-white outline-none focus:border-neonOrange"
              name="start_at"
              type="datetime-local"
              value={form.start_at}
              onChange={updateField}
            />
            <input
              className="h-12 rounded-[0.9rem] border border-white/10 bg-black/22 px-4 text-sm text-white outline-none placeholder:text-white/34 focus:border-neonOrange"
              name="price"
              value={form.price}
              onChange={updateField}
              placeholder="Precio"
            />
            <label className="flex items-center justify-between rounded-[0.9rem] border border-white/10 bg-black/22 px-4 py-3">
              <span className="text-sm font-bold text-white">Evento abierto</span>
              <input
                className="h-5 w-5 accent-orange-500"
                type="checkbox"
                name="is_open"
                checked={form.is_open}
                onChange={updateField}
              />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PostEditor;
