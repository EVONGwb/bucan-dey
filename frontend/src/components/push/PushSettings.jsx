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
      className="glass-panel rounded-[1.75rem] p-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-neonCyan">
          <Bell className="h-4 w-4" />
          Notificaciones Push
        </p>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Activa las notificaciones para enterarte de mensajes, comentarios y
          movimiento en BUCAN DEY aunque no tengas la app abierta.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-[0.12em]">
        <div className="rounded-[1.15rem] border border-white/10 bg-black/24 p-3 text-white/55">
          Estado
          <p className="mt-1 flex items-center gap-1.5 text-sm normal-case tracking-normal text-white">
            <Smartphone className="h-4 w-4 text-neonCyan" />
            {state.isSubscribed ? "Suscrito" : "No suscrito"}
          </p>
        </div>
        <div className="rounded-[1.15rem] border border-white/10 bg-black/24 p-3 text-white/55">
          Permiso
          <p className="mt-1 text-sm normal-case tracking-normal text-white">
            {permissionLabel(state.permission)}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-[1.1rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <motion.button
          className="h-12 rounded-full bg-gradient-to-r from-neonCyan via-fiestaPurple to-neonPink text-sm font-black text-white shadow-cyan disabled:opacity-50"
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
          className="h-12 rounded-full border border-neonPink/40 bg-neonPink/10 text-sm font-black text-white disabled:opacity-50"
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
          className="h-12 rounded-full border border-white/10 bg-white/7 text-sm font-black text-white disabled:opacity-50"
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
    </motion.div>
  );
}

export default PushSettings;
