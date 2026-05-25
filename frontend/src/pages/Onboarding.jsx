import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, user } = useAuth();
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    city: "",
    country: "",
    bio: "",
    avatar_url: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    setForm({
      display_name: user.display_name || "",
      username: user.username || "",
      city: user.city || "",
      country: user.country || "",
      bio: user.bio || "",
      avatar_url: user.avatar_url || "",
    });
  }, [user]);

  if (user?.onboarding_completed) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await completeOnboarding({
        ...form,
        username: form.username.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim() || null,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const avatarPreview = form.avatar_url.trim();
  const initial = form.display_name?.charAt(0) || form.username?.charAt(0) || "B";

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Primer paso
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Bienvenido a BUCAN DEY</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Completa tu perfil para empezar a descubrir qué está pasando.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-surface p-4">
          {avatarPreview ? (
            <img
              alt={form.display_name || "Avatar"}
              className="h-16 w-16 rounded-full object-cover"
              src={avatarPreview}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-2xl font-black text-night">
              {initial.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">
              {form.display_name || "Tu nombre visible"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-neonPink">
              @{form.username || "username"}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Nombre visible</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="display_name"
            value={form.display_name}
            onChange={updateField}
            autoComplete="name"
            placeholder="Tu nombre"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Nombre de usuario</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="username"
            value={form.username}
            onChange={updateField}
            autoComplete="username"
            placeholder="bucan_user"
            minLength={3}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-white/78">Ciudad</span>
            <input
              className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
              name="city"
              value={form.city}
              onChange={updateField}
              placeholder="Malabo"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-white/78">País</span>
            <input
              className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
              name="country"
              value={form.country}
              onChange={updateField}
              placeholder="Guinea Ecuatorial"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Bio opcional</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-none rounded-lg border border-white/10 bg-surface px-4 py-3 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="bio"
            value={form.bio}
            onChange={updateField}
            placeholder="Cuéntale algo a tu gente."
            maxLength={300}
          />
          <span className="mt-1 block text-right text-xs font-semibold text-white/38">
            {form.bio.length}/300
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Avatar URL opcional</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="avatar_url"
            value={form.avatar_url}
            onChange={updateField}
            placeholder="https://..."
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="h-14 w-full rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-base font-black text-night shadow-neon transition active:scale-[0.99] disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Entrar a BUCAN DEY"}
        </button>
      </form>
    </section>
  );
}

export default Onboarding;
