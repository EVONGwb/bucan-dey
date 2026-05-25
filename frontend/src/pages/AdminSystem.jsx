import { useEffect, useMemo, useState } from "react";

import apiClient from "../api/client.js";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ value }) {
  const ok = value === "ok" || value === "success";
  const warn = value === "not_configured" || value === "degraded" || value === "running";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${
      ok
        ? "bg-neonGreen/12 text-neonGreen"
        : warn
          ? "bg-neonYellow/12 text-neonYellow"
          : "bg-neonPink/12 text-neonPink"
    }`}>
      {value || "unknown"}
    </span>
  );
}

function MiniChart({ items, field, color = "#00ff85" }) {
  const points = useMemo(() => {
    if (!items?.length) return "";
    const values = items.map((item) => Number(item[field] || 0));
    const max = Math.max(...values, 1);
    return values
      .map((value, index) => {
        const x = items.length === 1 ? 0 : (index / (items.length - 1)) * 100;
        const y = 36 - (value / max) * 32;
        return `${x},${y}`;
      })
      .join(" ");
  }, [field, items]);

  return (
    <svg className="h-12 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function AdminSystem() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadSystem() {
    setError("");
    try {
      const response = await apiClient.get("/admin/system");
      setData(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSystem();
  }, []);

  async function runBackup() {
    setError("");
    setNotice("");
    setIsRunningBackup(true);
    try {
      await apiClient.post("/admin/system/backups/run");
      setNotice("Backup ejecutado. Revisa el historial abajo.");
      await loadSystem();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsRunningBackup(false);
    }
  }

  const health = data?.health || {};
  const metrics = data?.metrics || [];
  const checks = [
    ["Backend", health.status],
    ["MongoDB", health.mongodb],
    ["LiveKit", health.livekit],
    ["Cloudinary", health.cloudinary],
    ["Push", health.push],
    ["WebSocket", health.websocket],
  ];

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Producción
      </p>
      <h1 className="mt-3 text-3xl font-black text-white">Sistema</h1>
      <p className="mt-3 text-sm leading-6 text-white/64">
        Estado, backups, logs y métricas reales de BUCAN DEY.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mt-4 rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-4 py-3 text-sm font-bold text-white">
          {notice}
        </div>
      ) : null}
      {isLoading ? <ListSkeleton count={4} /> : null}

      {!isLoading && data ? (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {checks.map(([label, value]) => (
              <div className="rounded-lg border border-white/10 bg-surface p-4" key={label}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/42">{label}</p>
                <div className="mt-3"><StatusPill value={value} /></div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-white/42">Uptime</p>
                <p className="mt-1 text-2xl font-black text-white">{Math.floor((health.uptime_seconds || 0) / 60)}m</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white/42">Lives activos</p>
                <p className="mt-1 text-2xl font-black text-neonPink">{health.active_lives || 0}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white/42">Usuarios online</p>
                <p className="mt-1 text-2xl font-black text-neonGreen">{health.active_users_estimate || 0}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white/42">Actualizado</p>
                <p className="mt-1 text-sm font-bold text-white/64">{formatDate(health.timestamp)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              ["Usuarios", "total_users", "#00ff85"],
              ["Posts", "total_posts", "#ffdc2e"],
              ["Lives activos", "active_lives", "#ff1478"],
              ["WebSocket", "websocket_connections", "#7dd3fc"],
            ].map(([label, field, color]) => (
              <div className="rounded-lg border border-white/10 bg-surface p-4" key={field}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-white">{label}</p>
                  <p className="text-xs font-bold text-white/42">{metrics.at(-1)?.[field] ?? 0}</p>
                </div>
                <MiniChart color={color} field={field} items={metrics} />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Backups recientes</p>
                <p className="mt-1 text-xs font-semibold text-white/46">MongoDB, Cloudinary manifest y GitHub metadata.</p>
              </div>
              <button className="rounded-lg bg-neonGreen px-3 py-2 text-xs font-black text-night disabled:opacity-60" type="button" onClick={runBackup} disabled={isRunningBackup}>
                {isRunningBackup ? "Ejecutando..." : "Backup"}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {data.backups?.length ? null : <p className="text-sm font-bold text-white/48">Sin backups registrados.</p>}
              {data.backups?.map((backup) => (
                <div className="rounded-lg bg-white/5 p-3" key={backup.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-white">{backup.type}</p>
                    <StatusPill value={backup.status} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white/48">
                    {formatDate(backup.started_at)} · {Math.round((backup.size_bytes || 0) / 1024)} KB
                  </p>
                  <p className="mt-1 break-words text-xs font-semibold text-white/40">{backup.notes}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-surface p-4">
            <p className="text-sm font-black text-white">Logs recientes</p>
            <div className="mt-4 space-y-2">
              {data.logs?.length ? null : <p className="text-sm font-bold text-white/48">Sin logs recientes.</p>}
              {data.logs?.map((log) => (
                <div className="rounded-lg bg-white/5 p-3" key={log.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-white">{log.message}</p>
                    <StatusPill value={log.level} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white/48">
                    {log.source} · {formatDate(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AdminSystem;
