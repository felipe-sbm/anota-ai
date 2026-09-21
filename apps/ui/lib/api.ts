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
export const GITHUB_REPOS_PATH = "/api/github/repos";
export const AUDIO_RECORDS_PATH = "/api/audio/records";
export const AUDIO_RECORDS_COUNT_PATH = "/api/audio/records/count";
export const TEAMS_PATH = "/api/teams";

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

export type AudioRecord = {
  id: string;
  file_id: string;
  original_filename: string;
  filename: string;
  created_at: string;
  status: string;
  summary?: string | null;
  transcript?: string | null;
  tasks?: Array<Record<string, unknown>> | null;
  decisions?: Array<Record<string, unknown>> | null;
  created_issues?: Array<Record<string, unknown>> | null;
  repo_full_name?: string | null;
  user_github_login?: string;
};

export type TeamResponse = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
};

export type TeamMember = {
  github_login: string;
  added_at: string;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url?: string;
  description?: string | null;
  default_branch?: string;
};

export type DashboardSummary = {
  totalRecords: number;
  totalIssues: number;
  totalTeams: number;
  pendingTasks: number;
  recentRecords: AudioRecord[];
  teams: TeamResponse[];
};

async function fetchAuthorized<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Falha ao carregar ${path} (status ${res.status})`);
  }

  return (await res.json()) as T;
}

/** chama GET /api/auth/github/me com o token e retorna os dados do usuário. */
export async function fetchMe(token: string): Promise<MeResponse> {
  return fetchAuthorized<MeResponse>(ME_PATH, token);
}

export async function fetchAudioRecords(
  token: string,
  limit = 8,
): Promise<AudioRecord[]> {
  const data = await fetchAuthorized<{ records: AudioRecord[] }>(
    `${AUDIO_RECORDS_PATH}?limit=${limit}&offset=0`,
    token,
  );
  return data.records ?? [];
}

export async function fetchAudioRecordsCount(token: string): Promise<number> {
  const data = await fetchAuthorized<{ count: number }>(
    AUDIO_RECORDS_COUNT_PATH,
    token,
  );
  return data.count ?? 0;
}

export async function fetchTeams(token: string): Promise<TeamResponse[]> {
  const data = await fetchAuthorized<{ teams: TeamResponse[] }>(TEAMS_PATH, token);
  return data.teams ?? [];
}

export async function fetchTeamMembers(
  token: string,
  teamId: string,
): Promise<TeamMember[]> {
  const data = await fetchAuthorized<{ members: TeamMember[] }>(
    `${TEAMS_PATH}/${teamId}/members`,
    token,
  );
  return data.members ?? [];
}

export async function fetchGithubRepos(token: string): Promise<GithubRepo[]> {
  const data = await fetchAuthorized<{ repos: GithubRepo[] }>(
    GITHUB_REPOS_PATH,
    token,
  );
  return data.repos ?? [];
}

export async function fetchDashboardSummary(
  token: string,
): Promise<DashboardSummary> {
  const [recentRecords, totalRecords, teams] = await Promise.all([
    fetchAudioRecords(token, 8),
    fetchAudioRecordsCount(token),
    fetchTeams(token),
  ]);

  const totalIssues = recentRecords.reduce((count, record) => {
    const createdIssues = Array.isArray(record.created_issues)
      ? record.created_issues
      : [];
    return count + createdIssues.length;
  }, 0);

  const pendingTasks = recentRecords.reduce((count, record) => {
    const tasks = Array.isArray(record.tasks) ? record.tasks : [];
    return count + tasks.length;
  }, 0);

  return {
    totalRecords,
    totalIssues,
    totalTeams: teams.length,
    pendingTasks,
    recentRecords,
    teams,
  };
}