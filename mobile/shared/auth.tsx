import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, loadToken, setToken } from "./api";
import { connectSocket, disconnectSocket } from "./socket";
import type { Usuario } from "./types";

interface AuthCtx {
  user: Usuario | null;
  loading: boolean;
  login: (correo: string, password: string) => Promise<Usuario>;
  register: (data: Record<string, unknown>) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (!token) return setLoading(false);
      try {
        const me = await api<Usuario>("/auth/me");
        setUser(me);
        await connectSocket();
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAuth(res: { accessToken: string; usuario: Usuario }) {
    await setToken(res.accessToken);
    setUser(res.usuario);
    await connectSocket();
    return res.usuario;
  }

  type AuthRes = { accessToken: string; usuario: Usuario };

  const login = async (correo: string, password: string) =>
    handleAuth(await api<AuthRes>("/auth/login", { method: "POST", body: { correo, password }, auth: false }));

  const register = async (data: Record<string, unknown>) =>
    handleAuth(await api<AuthRes>("/auth/register", { method: "POST", body: data, auth: false }));

  const logout = async () => {
    disconnectSocket();
    await clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
