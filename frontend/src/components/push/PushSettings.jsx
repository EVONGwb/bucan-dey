import { useEffect, useState } from "react";

import {
  getPushPermission,
  getPushState,
  isPushSupported,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../services/push.js";
import { getApiErrorMessage } from "../../utils/errors.js";

function permissionLabel(permission) {
  if (permission === "granted") return "Permiso concedido";
  if (permission === "denied") return "Permiso denegado";
  if (permission === "unsupported") return "No compatible";
  return "Pendiente";
}

function PushSettings() {
  const [state, setState] = useState({
    isSupported: isPushSupported(),
    permission: getPushPermission(),
    isSubscribed: false,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshState() {
    try {
      setState(await getPushState());
    } catch {
      setState({
        isSupported: false,
        permission: "unsupported",
        isSubscribed: false,
      });
    }
  }

  useEffect(() => {
    refreshState();
  }, []);

  async function handleEnable() {
    try {
      setIsBusy(true);
      setError("");
      setMessage("");
      await subscribeToPush();
      await refreshState();
      setMessage("Notificaciones push activadas.");
    } catch (err) {
      setError(err.message || getApiErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisable() {
    try {
      setIsBusy(true);
      setError("");
      setMessage("");
      await unsubscribeFromPush();
      await refreshState();
      setMessage("Notificaciones push desactivadas.");
    } catch (err) {
      setError(err.message || getApiErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTest() {
    try {
      setIsBusy(true);
      setError("");
      setMessage("");
      const response = await sendTestPush();
      setMessage(
        response.sent > 0
          ? "Push de prueba enviado."
          : "No hay una suscripcion activa para este dispositivo."
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-neonGreen">
          Notificaciones Push
        </p>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Activa las notificaciones para enterarte de mensajes, comentarios y
          movimiento en BUCAN DEY aunque no tengas la app abierta.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-[0.12em]">
        <div className="rounded-lg border border-white/10 bg-night/50 p-3 text-white/55">
          Estado
          <p className="mt-1 text-sm normal-case tracking-normal text-white">
            {state.isSubscribed ? "Suscrito" : "No suscrito"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-night/50 p-3 text-white/55">
          Permiso
          <p className="mt-1 text-sm normal-case tracking-normal text-white">
            {permissionLabel(state.permission)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-4 py-3 text-sm font-semibold text-white">
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          className="h-12 rounded-lg bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink text-sm font-black text-night transition active:scale-[0.99] disabled:opacity-50"
          type="button"
          onClick={handleEnable}
          disabled={!state.isSupported || state.isSubscribed || isBusy}
        >
          Activar
        </button>
        <button
          className="h-12 rounded-lg border border-neonPink/40 bg-neonPink/10 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-50"
          type="button"
          onClick={handleDisable}
          disabled={!state.isSupported || !state.isSubscribed || isBusy}
        >
          Desactivar
        </button>
        <button
          className="h-12 rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-50"
          type="button"
          onClick={handleTest}
          disabled={!state.isSupported || !state.isSubscribed || isBusy}
        >
          Enviar prueba
        </button>
      </div>
    </div>
  );
}

export default PushSettings;
