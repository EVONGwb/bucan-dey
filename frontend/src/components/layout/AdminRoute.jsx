import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-neonPink" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <section className="min-h-[calc(100vh-7rem)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonPink">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Acceso denegado</h1>
        <p className="mt-3 text-sm leading-6 text-white/64">
          Esta zona solo está disponible para moderadores de BUCAN DEY.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-neonPink px-5 py-3 text-sm font-black text-white"
          to="/"
        >
          Volver al inicio
        </Link>
      </section>
    );
  }

  return children;
}

export default AdminRoute;
