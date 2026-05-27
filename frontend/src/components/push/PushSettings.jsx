import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Send, Smartphone } from "lucide-react";

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
    <motion.div
      className="glass-panel rounded-[1.35rem] p-2.5 sm:rounded-[1.6rem] sm:p-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-black/20 px-3 py-2.5">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] bg-neonCyan/12 text-neonCyan">
              <Bell className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-[0.12em] text-white">
                Notificaciones Push
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold text-white/50">
                {state.isSubscribed ? "Suscrito" : "No suscrito"} · {permissionLabel(state.permission)}
              </span>
            </span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-black text-neonCyan">
            Ajustar
          </span>
        </summary>

        <p className="mt-3 px-2 text-xs leading-5 text-white/58 sm:text-sm sm:leading-6">
          Activa avisos de mensajes, comentarios y movimiento aunque no tengas la app abierta.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:gap-3 sm:text-xs">
          <div className="rounded-[1rem] border border-white/10 bg-black/24 p-2.5 text-white/55 sm:p-3">
            Estado
            <p className="mt-1 flex items-center gap-1.5 text-xs normal-case tracking-normal text-white sm:text-sm">
              <Smartphone className="h-4 w-4 text-neonCyan" />
              {state.isSubscribed ? "Suscrito" : "No suscrito"}
            </p>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-black/24 p-2.5 text-white/55 sm:p-3">
            Permiso
            <p className="mt-1 text-xs normal-case tracking-normal text-white sm:text-sm">
              {permissionLabel(state.permission)}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-[1rem] border border-neonPink/30 bg-neonPink/10 px-3 py-2.5 text-xs font-semibold text-white sm:text-sm">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-3 rounded-[1rem] border border-neonCyan/30 bg-neonCyan/10 px-3 py-2.5 text-xs font-semibold text-white sm:text-sm">
            {message}
          </div>
        ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        <motion.button
          className="h-10 rounded-[0.9rem] bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-xs font-black text-white shadow-cyan disabled:opacity-50 sm:h-12 sm:rounded-full sm:text-sm"
          type="button"
          onClick={handleEnable}
          disabled={!state.isSupported || state.isSubscribed || isBusy}
          whileTap={{ scale: 0.96 }}
        >
          <span className="inline-flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Activar
          </span>
        </motion.button>
        <motion.button
          className="h-10 rounded-[0.9rem] border border-neonPink/40 bg-neonPink/10 text-xs font-black text-white disabled:opacity-50 sm:h-12 sm:rounded-full sm:text-sm"
          type="button"
          onClick={handleDisable}
          disabled={!state.isSupported || !state.isSubscribed || isBusy}
          whileTap={{ scale: 0.96 }}
        >
          <span className="inline-flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Desactivar
          </span>
        </motion.button>
        <motion.button
          className="h-10 rounded-[0.9rem] border border-white/10 bg-white/7 text-xs font-black text-white disabled:opacity-50 sm:h-12 sm:rounded-full sm:text-sm"
          type="button"
          onClick={handleTest}
          disabled={!state.isSupported || !state.isSubscribed || isBusy}
          whileTap={{ scale: 0.96 }}
        >
          <span className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
            Prueba
          </span>
        </motion.button>
      </div>
      </details>
    </motion.div>
  );
}

export default PushSettings;
