function getGoogleRedirectOrigin() {
  const { hostname } = window.location;

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return "http://localhost:5173";
  }

  return window.location.origin;
}

function createNonce() {
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function GoogleAuthButton({ disabled = false, onError }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function startGoogleRedirect() {
    if (!googleClientId) {
      onError?.("Google estará disponible cuando se configure el Client ID.");
      return;
    }

    const redirectOrigin = getGoogleRedirectOrigin();
    const redirectUri = `${redirectOrigin}/auth/google/callback`;
    const nonce = createNonce();
    sessionStorage.setItem("bucan_google_oauth_nonce", nonce);

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", googleClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("prompt", "select_account");

    window.location.assign(authUrl.toString());
  }

  if (!googleClientId) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/58">
        Google estará disponible cuando se configure el Client ID.
      </div>
    );
  }

  return (
    <button
      className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4 text-sm font-black text-white shadow-[0_0_22px_rgba(255,255,255,0.06)] transition hover:border-white/20 hover:bg-white/14 active:scale-[0.99] disabled:opacity-60"
      type="button"
      disabled={disabled}
      onClick={startGoogleRedirect}
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-base font-black text-[#4285F4]">
        G
      </span>
      Continuar con Google
    </button>
  );
}

export default GoogleAuthButton;
