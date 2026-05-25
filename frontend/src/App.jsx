import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/layout/AdminRoute.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import { PageFallback } from "./components/ui/Skeletons.jsx";
import Home from "./pages/Home.jsx";

const Admin = lazy(() => import("./pages/Admin.jsx"));
const Chat = lazy(() => import("./pages/Chat.jsx"));
const CreateEvent = lazy(() => import("./pages/CreateEvent.jsx"));
const CreatePost = lazy(() => import("./pages/CreatePost.jsx"));
const CreateStory = lazy(() => import("./pages/CreateStory.jsx"));
const EventPage = lazy(() => import("./pages/EventPage.jsx"));
const Events = lazy(() => import("./pages/Events.jsx"));
const FollowList = lazy(() => import("./pages/FollowList.jsx"));
const LivePage = lazy(() => import("./pages/LivePage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Map = lazy(() => import("./pages/Map.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const PostPage = lazy(() => import("./pages/PostPage.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const StoryViewer = lazy(() => import("./pages/StoryViewer.jsx"));
const StartLive = lazy(() => import("./pages/StartLive.jsx"));
const Trending = lazy(() => import("./pages/Trending.jsx"));

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
    path: "/events",
    element: (
      <LazyPage>
        <Events />
      </LazyPage>
    ),
  },
  {
    path: "/events/create",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <CreateEvent />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/events/:eventId",
    element: (
      <LazyPage>
        <EventPage />
      </LazyPage>
    ),
  },
  {
    path: "/lives/start",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <StartLive />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/lives/:liveId",
    element: (
      <LazyPage>
        <LivePage />
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
    path: "/stories/create",
    element: (
      <ProtectedRoute>
        <LazyPage>
          <CreateStory />
        </LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "/stories/:storyId",
    element: (
      <LazyPage>
        <StoryViewer />
      </LazyPage>
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
    path: "/posts/:postId",
    element: (
      <LazyPage>
        <PostPage />
      </LazyPage>
    ),
  },
  {
    path: "/trending",
    element: (
      <LazyPage>
        <Trending />
      </LazyPage>
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
  {
    path: "/users/:username/followers",
    element: (
      <LazyPage>
        <FollowList mode="followers" />
      </LazyPage>
    ),
  },
  {
    path: "/users/:username/following",
    element: (
      <LazyPage>
        <FollowList mode="following" />
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
