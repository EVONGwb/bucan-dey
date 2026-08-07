import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";

function GoogleAuthButton({ disabled = false, onError, onSuccess }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    function updateWidth() {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      const normalizedWidth = Math.max(240, Math.min(400, nextWidth || 320));
      setButtonWidth((current) => (current === normalizedWidth ? current : normalizedWidth));
    }

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (!googleClientId) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/58">
        Google estará disponible cuando se configure el Client ID.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-[40px] w-full overflow-hidden rounded-lg ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      {buttonWidth ? (
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onSuccess(credentialResponse.credential);
            } else {
              onError("Google no devolvió una credencial válida.");
            }
          }}
          onError={() => onError("No se pudo completar el acceso con Google.")}
          shape="rectangular"
          size="large"
          text="continue_with"
          theme="filled_black"
          useOneTap={false}
          width={buttonWidth}
        />
      ) : (
        <div className="grid h-10 w-full place-items-center rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white/70">
          Continuar con Google
        </div>
      )}
    </div>
  );
}

export default GoogleAuthButton;
