/**
 * Authentication layer for the Anota Aí dashboard (Next.js App Router)
 *
 * Owns the browser session of the authenticated user: it reads the JWT
 * persisted in `localStorage`, validates it by calling `GET /api/auth/github/me`
 * and exposes a React context consumed by every protected page.
 *
 * The demo mode is isolated from the real API: when the pathname matches a
 * demo route (`/demo*`), the stored token is swapped for the well-known demo
 * token so the dashboard can be explored without a backend.
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { isDemoPathname, isDemoRoute } from '@/lib/demo';
import { fetchMe } from '@/lib/api';
import type { MeResponse } from '@/lib/api';
import { DEMO_TOKEN } from '@/lib/demo-data';

/** chave usada no localStorage para persistir a sessão. */
export const TOKEN_STORAGE_KEY = 'anota_ai_token';

type AuthContextValue = {
	/** JWT emitido pela API após o login com o github */
	token: string | null;
	/** dados do usuário (que vem do /me) */
	user: MeResponse | null;
	/** true enquanto restauramos/validamos a sessão no navegador */
	loading: boolean;
	/** true quando a navegação atual pertence à demonstração pública */
	isDemo: boolean;
	/** salva o token recebido no callback do GitHub */
	signIn: (token: string) => void;
	/** limpa a sessão local (logout). */
	signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}
/**
 * Provides the authentication context for the whole dashboard.
 *
 * On mount, it reads the stored JWT (falling back to the demo token in demo
 * routes), validates it asynchronously with `fetchMe`, and refreshes the user
 * profile whenever the token changes. An invalid or expired token clears the
 * session automatically. Protected pages must be wrapped by this provider.
 *
 * @param children - The elements that require an authenticated session.
 */

export function AuthProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const isDemo = isDemoPathname(pathname);
	// lê o token salvo de forma preguiçosa
	const [token, setToken] = useState<string | null>(() => (isDemoRoute() ? DEMO_TOKEN : readStoredToken()));
	const [user, setUser] = useState<MeResponse | null>(null);
	const [loading, setLoading] = useState(true);

	// sempre que o token mudar, busca os dados do usuário na API
	useEffect(() => {
		let active = true;

		async function loadUser(currentToken: string | null) {
			// modo demo: quando navegamos por /demo/* entramos sempre com o token
			// de demo, mesmo se houver outro token guardado, para isolar a demo
			// da API real.
			if (isDemo && currentToken !== DEMO_TOKEN) {
				setToken(DEMO_TOKEN);
				return;
			}

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
					window.localStorage.removeItem(TOKEN_STORAGE_KEY); // encerra a sessão
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
	}, [isDemo, token]);

	const signIn = useCallback((newToken: string) => {
		window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
		setToken(newToken);
	}, []);

	const signOut = useCallback(() => {
		window.localStorage.removeItem(TOKEN_STORAGE_KEY);
		setToken(null);
		setUser(null);
	}, []);

	const value = useMemo(() => ({ token, user, loading, isDemo, signIn, signOut }), [token, user, loading, isDemo, signIn, signOut]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
/**
 * Value of the authentication context exposed by {@link AuthProvider}.
 *
 * @property token - JWT issued by the API after GitHub OAuth, used to call
 *   protected endpoints.
 * @property user - Decoded identity returned by `GET /api/auth/github/me`.
 * @property loading - `true` while the session is being validated on mount.
 * @property isDemo - `true` when the current route is part of the public demo.
 * @property signIn - Persists a token received in the GitHub callback and marks
 *   the session as authenticated.
 * @property signOut - Clears the stored JWT and the current user.
 *
 * @returns The context value. Throws if called outside `<AuthProvider>`.
 */

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error('useAuth precisa ser usado dentro do <AuthProvider>, boy!');
	}
	return ctx;
}
