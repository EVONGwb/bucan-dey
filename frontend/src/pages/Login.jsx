import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import GoogleAuthButton from "../components/auth/GoogleAuthButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";

  function getPostAuthPath(authUser) {
    if (authUser?.onboarding_completed === false) {
      return "/onboarding";
    }

    return from === "/onboarding" ? "/" : from;
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
      const authUser = await login({
        identifier: form.identifier,
        password: form.password,
      });
      navigate(getPostAuthPath(authUser), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin(idToken) {
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
        Acceso
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">Entrar</h1>
      <p className="mt-3 text-base leading-7 text-white/68">
        Entra para ver tu perfil y preparar tu mundo social en BUCAN DEY.
      </p>

      <div className="mt-8">
        <GoogleAuthButton
          disabled={isSubmitting}
          onError={setError}
          onSuccess={handleGoogleLogin}
        />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/38">
          o
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-white/78">Email o username</span>
          <input
            className="mt-2 h-14 w-full rounded-lg border border-white/10 bg-surface px-4 text-base text-white outline-none transition placeholder:text-white/32 focus:border-neonPink"
            name="identifier"
            value={form.identifier}
            onChange={updateField}
            autoComplete="username"
            placeholder="tuusuario o email"
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
            autoComplete="current-password"
            placeholder="Tu contraseña"
            minLength={6}
            required
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}

        <button
          className="h-14 w-full rounded-lg bg-gradient-to-r from-neonPink to-neonOrange text-base font-black text-white shadow-neon transition active:scale-[0.99] disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/64">
        ¿No tienes cuenta?{" "}
        <Link className="font-bold text-neonGreen" to="/register">
          Crear cuenta
        </Link>
      </p>
    </section>
  );
}

export default Login;
