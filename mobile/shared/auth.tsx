import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, loadToken, setToken } from "./api";
import { connectSocket, disconnectSocket } from "./socket";
import type { Usuario, Validacion } from "./types";

/** Lo que devuelve /auth/me: el usuario más el estado de su validación. */
interface Perfil extends Usuario {
  validacion: Validacion;
}

interface AuthCtx {
  user: Usuario | null;
  /** Qué documentos le piden, cuáles subió y en qué va su revisión. */
  validacion: Validacion | null;
  /** Atajo: la cuenta ya puede operar (pedir o aceptar acompañamientos). */
  aprobado: boolean;
  loading: boolean;
  login: (correo: string, password: string) => Promise<Usuario>;
  register: (data: Record<string, unknown>) => Promise<Usuario>;
  /** Relee el perfil: se llama tras subir un documento o al volver a la app. */
  refrescar: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const [loading, setLoading] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const me = await api<Perfil>("/auth/me");
      setUser(me);
      setValidacion(me.validacion ?? null);
    } catch {
      /* la sesión sigue como estaba: no se cierra por un fallo de red */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (!token) return setLoading(false);
      try {
        const me = await api<Perfil>("/auth/me");
        setUser(me);
        setValidacion(me.validacion ?? null);
        await connectSocket();
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAuth(res: { accessToken: string; usuario: Usuario; validacion?: Validacion }) {
    await setToken(res.accessToken);
    setUser(res.usuario);
    setValidacion(res.validacion ?? null);
    await connectSocket();
    // El login básico no trae la validación: se pide aparte.
    if (!res.validacion) await refrescar();
    return res.usuario;
  }

  type AuthRes = { accessToken: string; usuario: Usuario; validacion?: Validacion };

  const login = async (correo: string, password: string) =>
    handleAuth(await api<AuthRes>("/auth/login", { method: "POST", body: { correo, password }, auth: false }));

  const register = async (data: Record<string, unknown>) =>
    handleAuth(await api<AuthRes>("/auth/register", { method: "POST", body: data, auth: false }));

  const logout = async () => {
    disconnectSocket();
    await clearToken();
    setUser(null);
    setValidacion(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        validacion,
        aprobado: (validacion?.estadoValidacion ?? user?.estadoValidacion) === "aprobado",
        loading,
        login,
        register,
        refrescar,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
