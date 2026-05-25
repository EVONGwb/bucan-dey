import { useEffect, useMemo, useState } from "react";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import { ListSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const TABS = [
  { id: "summary", label: "Resumen" },
  { id: "users", label: "Usuarios" },
  { id: "posts", label: "Publicaciones" },
  { id: "reports", label: "Reportes" },
  { id: "reminders", label: "Recordatorios" },
];

const POST_TYPES = ["", "normal", "fiesta", "cumpleaños", "evento", "live", "bar", "ambiente", "video"];
const VISIBILITIES = ["", "global", "profile_only", "private"];
const REPORT_STATUSES = ["pending", "reviewed", "resolved", "dismissed"];
const REMINDER_STATUSES = ["pending", "sent", "failed", "cancelled"];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Admin() {
  const [activeTab, setActiveTab] = useState("summary");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [search, setSearch] = useState("");
  const [postType, setPostType] = useState("");
  const [visibility, setVisibility] = useState("");
  const [hidden, setHidden] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const statCards = useMemo(
    () => [
      ["Usuarios", stats?.total_users ?? 0],
      ["Activos", stats?.active_users ?? 0],
      ["Posts", stats?.total_posts ?? 0],
      ["Globales", stats?.global_posts ?? 0],
      ["Ocultos", stats?.hidden_posts ?? 0],
      ["Comentarios", stats?.total_comments ?? 0],
      ["Reportes", stats?.total_reports ?? 0],
      ["Pendientes", stats?.pending_reports ?? 0],
    ],
    [stats]
  );

  async function loadStats() {
    const response = await apiClient.get("/admin/stats");
    setStats(response.data);
  }

  async function loadUsers() {
    const response = await apiClient.get("/admin/users", {
      params: { search: search || undefined },
    });
    setUsers(response.data.items || []);
  }

  async function loadPosts() {
    const response = await apiClient.get("/admin/posts", {
      params: {
        type: postType || undefined,
        visibility: visibility || undefined,
        hidden: hidden === "" ? undefined : hidden === "true",
      },
    });
    setPosts(response.data.items || []);
  }

  async function loadReports() {
    const response = await apiClient.get("/admin/reports", {
      params: { status: reportStatus || undefined },
    });
    setReports(response.data.items || []);
  }

  async function loadReminders() {
    const response = await apiClient.get("/admin/event-reminders", {
      params: { status: reminderStatus || undefined },
    });
    setReminders(response.data.items || []);
  }

  async function refreshCurrentTab() {
    setIsLoading(true);
    setError("");
    try {
      if (activeTab === "summary") await loadStats();
      if (activeTab === "users") await loadUsers();
      if (activeTab === "posts") await loadPosts();
      if (activeTab === "reports") await loadReports();
      if (activeTab === "reminders") await loadReminders();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshCurrentTab();
  }, [activeTab, postType, visibility, hidden, reportStatus, reminderStatus]);

  async function updateUser(userId, payload) {
    setError("");
    setNotice("");
    try {
      await apiClient.patch(`/admin/users/${userId}`, payload);
      setNotice("Usuario actualizado.");
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function moderatePost(post) {
    setError("");
    setNotice("");
    try {
      await apiClient.patch(`/admin/posts/${post.id}/moderate`, {
        is_hidden: !post.is_hidden,
        reason: post.is_hidden ? "Restaurado por admin" : "Moderación admin",
      });
      setNotice(post.is_hidden ? "Publicación restaurada." : "Publicación oculta.");
      await Promise.all([loadPosts(), loadStats()]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function updateReport(reportId, status) {
    setError("");
    setNotice("");
    try {
      await apiClient.patch(`/admin/reports/${reportId}`, { status });
      setNotice("Reporte actualizado.");
      await Promise.all([loadReports(), loadStats()]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function onSearchSubmit(event) {
    event.preventDefault();
    refreshCurrentTab();
  }

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        Moderación
      </p>
      <h1 className="mt-3 text-3xl font-black text-white">Panel admin</h1>
      <p className="mt-3 text-sm leading-6 text-white/64">
        Control rápido de usuarios, publicaciones y reportes.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {TABS.map((tab) => (
          <button
            className={`rounded-lg border px-3 py-3 text-sm font-black ${
              activeTab === tab.id
                ? "border-neonPink bg-neonPink/16 text-neonPink"
                : "border-white/10 bg-white/5 text-white/68"
            }`}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : null}

      {!isLoading && activeTab === "summary" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {statCards.map(([label, value]) => (
            <div className="rounded-lg border border-white/10 bg-surface p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/42">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && activeTab === "users" ? (
        <div className="mt-6 space-y-4">
          <form className="flex gap-2" onSubmit={onSearchSubmit}>
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-neonGreen"
              placeholder="Buscar usuario"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="rounded-lg bg-neonGreen px-4 py-3 text-sm font-black text-night" type="submit">
              Buscar
            </button>
          </form>
          {users.map((item) => (
            <article className="rounded-lg border border-white/10 bg-surface p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{item.display_name}</p>
                  <p className="truncate text-xs font-semibold text-white/48">
                    @{item.username} · {item.email}
                  </p>
                  <p className="mt-2 text-xs font-bold text-white/48">
                    {item.city || "Sin ciudad"} · {item.role} · {item.is_active ? "Activo" : "Inactivo"}
                  </p>
                </div>
                {item.is_verified ? (
                  <span className="rounded-full border border-neonGreen/30 bg-neonGreen/10 px-2 py-1 text-xs font-black text-neonGreen">
                    Verificado
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/74" type="button" onClick={() => updateUser(item.id, { is_active: !item.is_active })}>
                  {item.is_active ? "Desactivar" : "Activar"}
                </button>
                <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/74" type="button" onClick={() => updateUser(item.id, { is_verified: !item.is_verified })}>
                  {item.is_verified ? "Quitar verificado" : "Verificar"}
                </button>
                <button className="col-span-2 rounded-lg border border-neonPink/30 bg-neonPink/10 px-3 py-2 text-xs font-black text-neonPink" type="button" onClick={() => updateUser(item.id, { role: item.role === "admin" ? "user" : "admin" })}>
                  Cambiar a {item.role === "admin" ? "user" : "admin"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && activeTab === "posts" ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-bold text-white" value={postType} onChange={(event) => setPostType(event.target.value)}>
              {POST_TYPES.map((item) => (
                <option key={item || "all"} value={item}>{item || "Todos los tipos"}</option>
              ))}
            </select>
            <select className="rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-bold text-white" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              {VISIBILITIES.map((item) => (
                <option key={item || "all"} value={item}>{item || "Toda visibilidad"}</option>
              ))}
            </select>
            <select className="col-span-2 rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-bold text-white" value={hidden} onChange={(event) => setHidden(event.target.value)}>
              <option value="">Todas</option>
              <option value="false">Visibles</option>
              <option value="true">Ocultas</option>
            </select>
          </div>
          {posts.map((post) => (
            <div className="space-y-2" key={post.id}>
              <PostCard post={post} />
              <button className={`w-full rounded-lg px-4 py-3 text-sm font-black ${post.is_hidden ? "bg-neonGreen text-night" : "bg-neonPink text-white"}`} type="button" onClick={() => moderatePost(post)}>
                {post.is_hidden ? "Restaurar publicación" : "Ocultar publicación"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && activeTab === "reports" ? (
        <div className="mt-6 space-y-4">
          <select className="w-full rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-bold text-white" value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}>
            <option value="">Todos los reportes</option>
            {REPORT_STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {reports.map((report) => (
            <article className="rounded-lg border border-white/10 bg-surface p-4" key={report.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{report.reason}</p>
                  <p className="mt-1 text-xs font-semibold text-white/48">
                    {report.target_type} · {formatDate(report.created_at)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    {report.details || "Sin detalles adicionales."}
                  </p>
                  <p className="mt-2 text-xs font-bold text-white/44">
                    Reportado por @{report.reporter_snapshot?.username}
                  </p>
                </div>
                <span className="rounded-full border border-neonYellow/30 bg-neonYellow/10 px-2 py-1 text-xs font-black text-neonYellow">
                  {report.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-black text-white/74" type="button" onClick={() => updateReport(report.id, "reviewed")}>
                  Revisar
                </button>
                <button className="rounded-lg border border-neonGreen/30 bg-neonGreen/10 px-2 py-2 text-xs font-black text-neonGreen" type="button" onClick={() => updateReport(report.id, "resolved")}>
                  Resolver
                </button>
                <button className="rounded-lg border border-neonPink/30 bg-neonPink/10 px-2 py-2 text-xs font-black text-neonPink" type="button" onClick={() => updateReport(report.id, "dismissed")}>
                  Descartar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && activeTab === "reminders" ? (
        <div className="mt-6 space-y-4">
          <select className="w-full rounded-lg border border-white/10 bg-night px-3 py-3 text-sm font-bold text-white" value={reminderStatus} onChange={(event) => setReminderStatus(event.target.value)}>
            <option value="">Todos los recordatorios</option>
            {REMINDER_STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {reminders.length === 0 ? (
            <article className="rounded-lg border border-white/10 bg-surface p-4">
              <p className="text-sm font-bold text-white/62">No hay recordatorios con este filtro.</p>
            </article>
          ) : null}
          {reminders.map((reminder) => (
            <article className="rounded-lg border border-white/10 bg-surface p-4" key={reminder.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">
                    {reminder.event_title || "Evento"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/48">
                    @{reminder.username || "usuario"} · {reminder.reminder_type === "one_hour" ? "1 hora antes" : "15 min antes"}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/62">
                    Programado: {formatDate(reminder.scheduled_for)}
                  </p>
                  {reminder.sent_at ? (
                    <p className="mt-1 text-xs font-semibold text-white/42">
                      Enviado: {formatDate(reminder.sent_at)}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full border border-neonYellow/30 bg-neonYellow/10 px-2 py-1 text-xs font-black text-neonYellow">
                  {reminder.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default Admin;
