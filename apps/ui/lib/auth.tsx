"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { fetchMe } from "@/lib/api";
import type { MeResponse } from "@/lib/api";

/** Chave usada no localStorage para persistir a sessão. */
export const TOKEN_STORAGE_KEY = "anota_ai_token";

type AuthContextValue = {
  /** JWT emitido pela API após o login com o github */
  token: string | null;
  /** dados do usuário (que vem do /me) */
  user: MeResponse | null;
  /** true enquanto restauramos/validamos a sessão no navegador */
  loading: boolean;
  /** salva o token recebido no callback do GitHub */
  signIn: (token: string) => void;
  /** limpa a sessão local (logout). */
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // lê o token salvo de forma preguiçosa kk
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // sempre que o token mudar, busca os dados do usuário na API
  useEffect(() => {
    let active = true;

    async function loadUser(currentToken: string | null) {
      if (!currentToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await fetchMe(currentToken);
        if (active) setUser(me);
      } catch {
        // se o token estiver ausente ou expirado
        if (active) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY); // encerra sessão
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser(token);

    return () => {
      active = false;
    };
  }, [token]);

  const signIn = useCallback((newToken: string) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, signIn, signOut }),
    [token, user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa ser usado dentro do <AuthProvider>, boy!");
  }
  return ctx;
}
