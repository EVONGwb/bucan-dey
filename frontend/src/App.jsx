import { Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/layout/AdminRoute.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import Admin from "./pages/Admin.jsx";
import Chat from "./pages/Chat.jsx";
import CreatePost from "./pages/CreatePost.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Map from "./pages/Map.jsx";
import Notifications from "./pages/Notifications.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";

const appRoutes = [
  { path: "/", element: <Home /> },
  { path: "/map", element: <Map /> },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <CreatePost />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute requireOnboarding={false}>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: "/notifications",
    element: (
      <ProtectedRoute>
        <Notifications />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <Admin />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/users/:username", element: <Profile /> },
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
