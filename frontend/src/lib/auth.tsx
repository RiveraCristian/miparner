import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "./api";

export interface Usuario {
  usuarioId: number;
  correo: string;
  nombre: string;
  rol: string;
}

interface AuthCtx {
  user: Usuario | null;
  loading: boolean;
  login: (correo: string, password: string) => Promise<Usuario>;
  logout: () => void;
  /** Recarga los datos del usuario desde /auth/me (tras editar el perfil). */
  refrescar: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<Usuario>("/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (correo: string, password: string) => {
    const res = await api<{ accessToken: string; usuario: Usuario }>("/auth/login", {
      method: "POST",
      body: { correo, password },
    });
    setToken(res.accessToken);
    setUser(res.usuario);
    return res.usuario;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const refrescar = async () => {
    if (!getToken()) return;
    const u = await api<Usuario>("/auth/me");
    setUser(u);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refrescar }}>{children}</Ctx.Provider>
  );
}
