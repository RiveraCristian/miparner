import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Usuarios } from "./pages/admin/Usuarios";
import { Viajes } from "./pages/admin/Viajes";
import { Panicos } from "./pages/admin/Panicos";
import type { ReactNode } from "react";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <div className="spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="viajes" element={<Viajes />} />
        <Route path="panicos" element={<Panicos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
