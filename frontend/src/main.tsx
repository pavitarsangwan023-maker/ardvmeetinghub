import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Suspense, lazy } from "react";
import { LoadingScreen } from "./components/LoadingScreen";

const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const CreateMeeting = lazy(() => import("./pages/CreateMeeting").then(m => ({ default: m.CreateMeeting })));
const JoinMeeting = lazy(() => import("./pages/JoinMeeting").then(m => ({ default: m.JoinMeeting })));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom").then(m => ({ default: m.MeetingRoom })));
const SchedulerDashboard = lazy(() => import("./pages/SchedulerDashboard").then(m => ({ default: m.SchedulerDashboard })));
const PublicBookingPage = lazy(() => import("./pages/PublicBookingPage").then(m => ({ default: m.PublicBookingPage })));
import "./index.css";

import { useLocation } from "react-router-dom";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function Public({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<Public><Login /></Public>} />
              <Route path="/register" element={<Public><Register /></Public>} />
              <Route path="/book/:slug" element={<PublicBookingPage />} />
              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/scheduler" element={<Protected><SchedulerDashboard /></Protected>} />
              <Route path="/create" element={<Protected><CreateMeeting /></Protected>} />
              <Route path="/join" element={<Protected><JoinMeeting /></Protected>} />
              <Route path="/meeting/:meetingId" element={<Protected><MeetingRoom /></Protected>} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
