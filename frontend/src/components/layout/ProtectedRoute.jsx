import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

function ProtectedRoute({ children, requireOnboarding = true }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-neonPink" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    requireOnboarding &&
    user &&
    user.onboarding_completed === false &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
