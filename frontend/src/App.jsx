import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/layout/AdminRoute.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import { PageFallback } from "./components/ui/Skeletons.jsx";
import Home from "./pages/Home.jsx";

const Admin = lazy(() => import("./pages/Admin.jsx"));
const Chat = lazy(() => import("./pages/Chat.jsx"));
const CreatePost = lazy(() => import("./pages/CreatePost.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Map = lazy(() => import("./pages/Map.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));

function LazyPage({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

const appRoutes = [
  { path: "/", element: <Home /> },
  {
    path: "/map",
    element: (
      <LazyPage>
        <Map />
      </LazyPage>
    ),
  },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <CreatePost />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <Chat />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <Profile />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <LazyPage>
        <Login />
      </LazyPage>
    ),
  },
  {
    path: "/register",
    element: (
      <LazyPage>
        <Register />
      </LazyPage>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute requireOnboarding={false}>
        <LazyPage>
          <Onboarding />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/notifications",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <Notifications />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <LazyPage>
            <Admin />
          </LazyPage>
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/users/:username",
    element: (
      <LazyPage>
        <Profile />
      </LazyPage>
    ),
  },
];

function App() {
  return (
    <div className="min-h-screen bg-night text-white">
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-5">
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;
