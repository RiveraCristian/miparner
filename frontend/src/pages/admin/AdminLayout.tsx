import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Route as RouteIcon, ShieldAlert, Users } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Sidebar, type ItemNav } from "../../components/layout/Sidebar";

const items: ItemNav[] = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Panel" },
  { to: "/admin/usuarios", icon: Users, label: "Personas" },
  { to: "/admin/viajes", icon: RouteIcon, label: "Viajes" },
  { to: "/admin/panicos", icon: ShieldAlert, label: "Alertas" },
];

const CLAVE = "miparner:lateral-colapsada";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [colapsada, setColapsada] = useState(() => localStorage.getItem(CLAVE) === "1");

  useEffect(() => {
    localStorage.setItem(CLAVE, colapsada ? "1" : "0");
  }, [colapsada]);

  return (
    <div className="admin" data-min={colapsada ? "1" : "0"}>
      <a href="#contenido" className="salto-contenido">Saltar al contenido</a>

      <Sidebar
        items={items}
        submodulo="Administración"
        colapsada={colapsada}
        onColapsar={() => setColapsada((v) => !v)}
        usuario={{ nombre: user?.nombre, rol: user?.rol }}
        onSalir={() => {
          logout();
          navigate("/login");
        }}
      />

      <main id="contenido" className="admin__principal">
        <Outlet />
      </main>

      <style>{`
        .admin{display:grid;grid-template-columns:248px 1fr;min-height:100vh}
        .admin[data-min="1"]{grid-template-columns:72px 1fr}
        .admin__principal{
          padding:32px clamp(20px,4vw,44px) 56px;
          overflow:auto;
        }
        @media (max-width:767px){
          .admin,.admin[data-min="1"]{grid-template-columns:1fr}
          .admin__principal{padding:24px 18px 44px}
        }
      `}</style>
    </div>
  );
}
