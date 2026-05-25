import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import GoogleAuthButton from "../components/auth/GoogleAuthButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const initialForm = {
  username: "",
  display_name: "",
  email: "",
  password: "",
  city: "",
  country: "",
};

function Register() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getPostAuthPath(authUser) {
    return authUser?.onboarding_completed === false ? "/onboarding" : "/";
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
      const authUser = await register(form);
      navigate(getPostAuthPath(authUser), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleRegister(idToken) {
    setError("");
    setIsSubmitting(true);

    try {
      const authUser = await loginWithGoogle(idToken);
      navigate(getPostAuthPath(authUser), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Cuenta
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Crear cuenta</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Crea tu perfil local para participar en BUCAN DEY.
      </p>

      <div className="mt-8">
        <GoogleAuthButton
          disabled={isSubmitting}
          onError={setError}
          onSuccess={handleGoogleRegister}
        />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/38">
          o
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-white/78">Username</span>
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
          <span className="text-sm font-semibold text-white/78">Email</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            placeholder="tu@email.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/78">Password</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            minLength={6}
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
            />
          </label>
        </div>

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
          {isSubmitting ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/64">
        ¿Ya tienes cuenta?{" "}
        <Link className="font-bold text-neonGreen" to="/login">
          Entrar
        </Link>
      </p>
    </section>
  );
}

export default Register;
