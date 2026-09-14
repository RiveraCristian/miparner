import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Privacidad } from "./pages/Privacidad";
import { NoEncontrado } from "./pages/NoEncontrado";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Usuarios } from "./pages/admin/Usuarios";
import { Validaciones } from "./pages/admin/Validaciones";
import { Viajes } from "./pages/admin/Viajes";
import { Panicos } from "./pages/admin/Panicos";
import { MiCuenta } from "./pages/admin/MiCuenta";
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
      {/* Pública: se lee antes de registrarse, sin sesión. */}
      <Route path="/privacidad" element={<Privacidad />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cuenta" element={<MiCuenta />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="validaciones" element={<Validaciones />} />
        <Route path="viajes" element={<Viajes />} />
        <Route path="panicos" element={<Panicos />} />
      </Route>
      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  );
}
