import { GoogleLogin } from "@react-oauth/google";

function GoogleAuthButton({ disabled = false, onError, onSuccess }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/58">
        Google estará disponible cuando se configure el Client ID.
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
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
        width="100%"
      />
    </div>
  );
}

export default GoogleAuthButton;
