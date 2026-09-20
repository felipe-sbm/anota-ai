/**
 * Eaê senhores!
 * esse aqui é mínimo da dashboard para API do Anota Aí.
 *
 * A rota base vem de NEXT_PUBLIC_API_URL; se não estiver definida,
 * assume como http://localhost:8000.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const GITHUB_LOGIN_PATH = "/api/auth/github/login";
export const ME_PATH = "/api/auth/github/me";

/**
 * monda uma url de login do github.
 * `next` é a url para onde a api deve redirecionar o navegador após a autenticação,
 * com o token JWT no query string (tipo "http://localhost:3000/login").
 */

export function buildGithubLoginUrl(next?: string): string {
  const base = `${API_BASE_URL}${GITHUB_LOGIN_PATH}`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

export type MeResponse = {
  github_login: string;
  avatar_url: string | null;
  name: string | null;
};

/** chama GET /api/auth/github/me com o token e retorna os dados do usuário. */
export async function fetchMe(token: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE_URL}${ME_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(
      `Falha ao carregar usuário autenticado (status ${res.status})`,
    );
  }

  return (await res.json()) as MeResponse;
}