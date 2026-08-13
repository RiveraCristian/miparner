import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Route as RouteIcon, ShieldAlert, LogOut, Compass } from "lucide-react";
import { useAuth } from "../../lib/auth";

const nav = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/usuarios", icon: Users, label: "Usuarios" },
  { to: "/admin/viajes", icon: RouteIcon, label: "Viajes" },
  { to: "/admin/panicos", icon: ShieldAlert, label: "Pánico" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "248px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "var(--sidebar)", color: "var(--sidebar-ink)", display: "flex", flexDirection: "column", padding: "20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 22px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "grid", placeItems: "center", color: "#fff" }}>
            <Compass size={20} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Rumbo</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Administración</div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 4, flex: 1 }}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 13px",
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 600,
                color: isActive ? "#fff" : "var(--sidebar-ink)",
                background: isActive ? "var(--sidebar-active)" : "transparent",
              })}
            >
              <n.icon size={19} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>
            {user?.nombre?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.nombre}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Administrador</div>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            aria-label="Cerrar sesión"
            style={{ background: "transparent", border: 0, color: "var(--sidebar-ink)", cursor: "pointer", padding: 6 }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main style={{ padding: "28px clamp(20px, 4vw, 40px)", overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
