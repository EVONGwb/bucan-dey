import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

function readGoogleCallbackParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    error: hashParams.get("error") || queryParams.get("error"),
    idToken: hashParams.get("id_token") || queryParams.get("id_token"),
    state: hashParams.get("state") || queryParams.get("state"),
  };
}

function GoogleCallback() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleLogin() {
      const { error: googleError, idToken } = readGoogleCallbackParams();
      window.history.replaceState({}, document.title, "/auth/google/callback");

      if (googleError) {
        setError("Google canceló o rechazó el inicio de sesión.");
        return;
      }

      if (!idToken) {
        setError("Google no devolvió una credencial válida.");
        return;
      }

      try {
        const authUser = await loginWithGoogle(idToken);
        if (cancelled) return;
        navigate(authUser?.onboarding_completed === false ? "/onboarding" : "/", {
          replace: true,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    finishGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate]);

  return (
    <section className="grid min-h-[calc(100vh-7rem)] place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/6 p-6 text-center shadow-neon backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-neonCyan">
          Google
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {error ? "No se pudo entrar" : "Conectando cuenta"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
          {error || "Estamos validando tu cuenta de Google con BUCAN DEY."}
        </p>
        {error ? (
          <Link
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-neonPink to-neonPurple text-sm font-black text-white"
            to="/login"
            replace
          >
            Volver a entrar
          </Link>
        ) : (
          <div className="mx-auto mt-5 h-10 w-10 animate-pulse rounded-full bg-gradient-to-r from-neonCyan via-neonPurple to-neonPink" />
        )}
      </div>
    </section>
  );
}

export default GoogleCallback;
