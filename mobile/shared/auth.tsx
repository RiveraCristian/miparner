import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  alCerrarseLaSesion,
  api,
  cerrarSesion,
  esSesionCerrada,
  guardarSesion,
  guardarUsuarioEnCache,
  haySesionGuardada,
  leerUsuarioEnCache,
  type TokensSesion,
} from "./api";
import { connectSocket, disconnectSocket } from "./socket";
import type { Usuario, Validacion } from "./types";

/** Lo que devuelve /auth/me: el usuario más el estado de su validación. */
interface Perfil extends Usuario {
  validacion: Validacion;
}

/** Lo que se guarda en el teléfono para poder abrir la app sin red. */
interface CopiaUsuario {
  user: Usuario;
  validacion: Validacion | null;
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

/**
 * Solo los campos públicos de la cuenta.
 *
 * /auth/me trae también la caracterización del deportista, con datos de salud.
 * Esos no hace falta guardarlos en el teléfono para abrir la app: cada pantalla
 * de perfil los pide al servidor cuando se abre.
 */
function soloPublico(u: Usuario): Usuario {
  // Se quitan los anexos en vez de copiar campo a campo: así un campo público
  // nuevo en `Usuario` no se pierde por olvidar añadirlo aquí.
  const {
    deportistaPerfil: _d,
    voluntarioPerfil: _v,
    validacion: _val,
    ...publico
  } = u as Usuario & { deportistaPerfil?: unknown; voluntarioPerfil?: unknown; validacion?: unknown };
  return publico;
}

/** Espera entre reintentos de /auth/me cuando no hay red: 2 s, 4 s… hasta 1 min. */
const esperaReintento = (intento: number) => Math.min(2000 * 2 ** intento, 60_000);

type AuthRes = TokensSesion & { usuario: Usuario; validacion?: Validacion };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Sube con cada login o logout. El arranque reintenta /auth/me en segundo
   * plano mientras no haya red; si entretanto la persona cierra sesión o entra
   * con otra cuenta, esa respuesta tardía ya no debe pisar el estado.
   */
  const sesionRef = useRef(0);

  const aplicarPerfil = useCallback((me: Perfil) => {
    const publico = soloPublico(me);
    setUser(publico);
    setValidacion(me.validacion ?? null);
    void guardarUsuarioEnCache({ user: publico, validacion: me.validacion ?? null } satisfies CopiaUsuario);
  }, []);

  const refrescar = useCallback(async () => {
    const sesion = sesionRef.current;
    try {
      const me = await api<Perfil>("/auth/me");
      if (sesion === sesionRef.current) aplicarPerfil(me);
    } catch {
      /* la sesión sigue como estaba: no se cierra por un fallo de red. Si la
         cerró el servidor, ya lo atendió `alCerrarseLaSesion`. */
    }
  }, [aplicarPerfil]);

  // El servidor rechazó la renovación (venció, se revocó o se desactivó la
  // cuenta): de vuelta al acceso, desde cualquier pantalla.
  useEffect(
    () =>
      alCerrarseLaSesion(() => {
        sesionRef.current++;
        disconnectSocket();
        setUser(null);
        setValidacion(null);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    let vivo = true;
    const sesion = sesionRef.current;
    const sigue = () => vivo && sesion === sesionRef.current;

    (async () => {
      if (!(await haySesionGuardada())) return setLoading(false);

      /*
       * Con una copia del usuario, la app abre de inmediato y sin red: quien
       * vuelve a la app no tiene por qué esperar al servidor, ni volver a la
       * pantalla de acceso porque el metro no tenía señal. El perfil se pone al
       * día en cuanto el servidor responda.
       */
      const copia = await leerUsuarioEnCache<CopiaUsuario>();
      if (!sigue()) return;
      if (copia?.user) {
        setUser(copia.user);
        setValidacion(copia.validacion ?? null);
        setLoading(false);
        // El socket reintenta solo hasta que haya red.
        void connectSocket();
      }

      for (let intento = 0; sigue(); intento++) {
        try {
          // Si el acceso venció, `api` lo renueva con el token de renovación.
          const me = await api<Perfil>("/auth/me");
          if (!sigue()) return;
          aplicarPerfil(me);
          setLoading(false);
          await connectSocket();
          return;
        } catch (e) {
          // El servidor dijo que la sesión no existe: ya se volvió al acceso.
          if (esSesionCerrada(e) || !sigue()) return;
          /*
           * Sin red o servidor caído: la sesión se conserva. Sin copia (por
           * ejemplo, la primera apertura tras actualizar la app) no hay nada
           * que enseñar, así que tras el primer fallo se muestra el acceso,
           * pero se sigue reintentando y, en cuanto haya red, entra sola.
           */
          setLoading(false);
          await new Promise<void>((r) => setTimeout(r, esperaReintento(intento)));
        }
      }
    })();

    return () => {
      vivo = false;
    };
  }, [aplicarPerfil]);

  async function handleAuth(res: AuthRes) {
    sesionRef.current++;
    await guardarSesion(res);
    const publico = soloPublico(res.usuario);
    setUser(publico);
    setValidacion(res.validacion ?? null);
    void guardarUsuarioEnCache({ user: publico, validacion: res.validacion ?? null } satisfies CopiaUsuario);
    // Un socket de una sesión anterior llevaría el token de otra cuenta.
    disconnectSocket();
    await connectSocket();
    // El login básico no trae la validación: se pide aparte.
    if (!res.validacion) await refrescar();
    return res.usuario;
  }

  const login = async (correo: string, password: string) =>
    handleAuth(await api<AuthRes>("/auth/login", { method: "POST", body: { correo, password }, auth: false }));

  const register = async (data: Record<string, unknown>) =>
    handleAuth(await api<AuthRes>("/auth/register", { method: "POST", body: data, auth: false }));

  const logout = async () => {
    sesionRef.current++;
    disconnectSocket();
    // Borra los dos tokens y la copia del usuario, y revoca en el servidor.
    await cerrarSesion();
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
