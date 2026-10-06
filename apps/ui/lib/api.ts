/**
 * eaê senhores!
 * esse aqui é o mínimo da dashboard para a api do anota aí.
 *
 * a rota base vem de NEXT_PUBLIC_API_URL; se não estiver definida,
 * assume como http://localhost:8000.
 */

import { isDemoRoute } from '@/lib/demo';
import { DEMO_TOKEN, demoFetch, demoMutate } from '@/lib/demo-data';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const GITHUB_LOGIN_PATH = '/api/auth/github/login';
export const ME_PATH = '/api/auth/github/me';
export const GITHUB_REPOS_PATH = '/api/github/repos';
export const AUDIO_RECORDS_PATH = '/api/audio/records';
export const AUDIO_RECORDS_COUNT_PATH = '/api/audio/records/count';
export const TEAMS_PATH = '/api/teams';
export const ISSUES_PATH = '/api/issues';

/**
 * monta uma url de login do github.
 * next é a url para onde a api deve redirecionar o navegador após a autenticação,
 * com o token JWT na query string, por exemplo http://localhost:3000/login.
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
	project_id?: string | null;
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

export type CreatedIssue = {
	number?: number;
	title?: string;
	html_url?: string;
	repo_full_name?: string;
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

export type RepoAssignee = {
	login: string;
	name?: string | null;
	avatar_url?: string | null;
};

export type RepoLabel = {
	name: string;
	color: string;
	description?: string | null;
};

export type RepoMilestone = {
	number?: number | null;
	title: string;
	state?: string;
	description?: string | null;
	open_issues?: number;
	closed_issues?: number;
};

export type RepoProject = {
	id?: number | null;
	number?: number | null;
	name: string;
	state?: string;
	html_url?: string | null;
	columns?: string[];
};

export type RepoMeta = {
	assignees: RepoAssignee[];
	labels: RepoLabel[];
	milestones: RepoMilestone[];
	projects: RepoProject[];
};

export type Repository = {
	id: string;
	full_name: string;
	name: string;
	owner: string;
	private: boolean;
	description?: string | null;
	html_url?: string | null;
	default_branch?: string | null;
	created_at: string;
};

export type IssueSource = 'external' | 'draft' | 'anota_ai';
export type IssuePriority = 'low' | 'medium' | 'high';

export type Issue = {
	id: string;
	github_issue_id?: number | null;
	number?: number | null;
	title: string;
	body?: string | null;
	state: string;
	repo_full_name: string;
	source: IssueSource;
	points: number;
	priority: IssuePriority;
	priority_source?: string | null;
	assignee?: string | null;
	html_url?: string | null;
	record_id?: string | null;
	project_id?: string | null;
	created_at: string;
	updated_at: string;
};

export type ConfirmIssueResult = {
	id: string;
	ok: boolean;
	already?: boolean;
	issue?: Issue;
	error?: string;
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
	if (isDemoRoute() && token === DEMO_TOKEN) {
		return demoFetch(path) as T;
	}

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

export async function fetchAudioRecords(token: string, limit = 8): Promise<AudioRecord[]> {
	const data = await fetchAuthorized<{ records: AudioRecord[] }>(`${AUDIO_RECORDS_PATH}?limit=${limit}&offset=0`, token);
	return data.records ?? [];
}

export async function fetchAudioRecordsCount(token: string): Promise<number> {
	const data = await fetchAuthorized<{ count: number }>(AUDIO_RECORDS_COUNT_PATH, token);
	return data.count ?? 0;
}

export type RecordingStatus = 'uploaded' | 'processing' | 'pending_review' | 'reviewed' | 'error';

/** busca uma gravação diretamente pelo id (sem paginar 200 registros). */
export async function fetchAudioRecord(token: string, recordId: string): Promise<AudioRecord> {
	const data = await fetchAuthorized<{ record: AudioRecord }>(`${AUDIO_RECORDS_PATH}/${recordId}`, token);
	if (!data.record) throw new Error('Gravação não encontrada');
	return data.record;
}

/** vocabulário canónico de estados de gravação compartilhado com a extensão. */
export async function fetchAudioStatuses(token: string): Promise<{ statuses: RecordingStatus[]; labels: Record<string, string> }> {
	return fetchAuthorized<{ statuses: RecordingStatus[]; labels: Record<string, string> }>(`${AUDIO_RECORDS_PATH}/statuses`, token);
}

export async function fetchTeams(token: string): Promise<TeamResponse[]> {
	const data = await fetchAuthorized<{ teams: TeamResponse[] }>(TEAMS_PATH, token);
	return data.teams ?? [];
}

export async function fetchTeamMembers(token: string, teamId: string): Promise<TeamMember[]> {
	const data = await fetchAuthorized<{ members: TeamMember[] }>(`${TEAMS_PATH}/${teamId}/members`, token);
	return data.members ?? [];
}

export type TeamMemberStats = {
	github_login: string;
	name: string;
	assigned_issues: number;
	open_count: number;
	remaining_points: number;
	closed_count: number;
	closed_points: number;
	points_done: number;
	pending_drafts: number;
	last_activity: string | null;
};

export type TeamDetailMember = {
	github_login: string;
	added_at: string;
	name: string;
	avatar_url?: string | null;
	stats?: TeamMemberStats;
};

export type TeamDetailProject = {
	id: string;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	repositories: number;
};

export type TeamDetail = {
	id: string;
	name: string;
	created_at: string;
	member_count: number;
	members: TeamDetailMember[];
	member_stats: TeamMemberStats[];
	projects: TeamDetailProject[];
	repositories: string[];
	issues: Issue[];
};

/** detalhe da equipe: membros, projetos, repositórios e issues por pessoa. */
export async function fetchTeamDetail(token: string, teamId: string): Promise<TeamDetail> {
	const data = await fetchAuthorized<{ team: TeamDetail }>(`${TEAMS_PATH}/${teamId}`, token);
	return data.team;
}

export type GithubUserSummary = {
	github_login: string;
	name: string | null;
	avatar_url: string | null;
};

/** busca usuários do GitHub por login ou nome para montar equipes. */
export async function searchGithubUsers(token: string, query: string): Promise<GithubUserSummary[]> {
	const data = await fetchAuthorized<{ users: GithubUserSummary[] }>(`/api/github/users/search?q=${encodeURIComponent(query)}`, token);
	return data.users ?? [];
}

export async function fetchGithubRepos(token: string): Promise<GithubRepo[]> {
	const data = await fetchAuthorized<{ repos: GithubRepo[] }>(GITHUB_REPOS_PATH, token);
	return data.repos ?? [];
}

/** busca os dados auxiliares de um repositório (assignees, labels, milestones, projetos). */
export async function fetchRepoMeta(token: string, repoFullName: string): Promise<RepoMeta> {
	return fetchAuthorized<RepoMeta>(`/api/github/repos/${repoFullName}/meta`, token);
}

export const REPOSITORIES_PATH = '/api/repositories';

export async function fetchRepositories(token: string): Promise<Repository[]> {
	const data = await fetchAuthorized<{ repositories: Repository[] }>(REPOSITORIES_PATH, token);
	return data.repositories ?? [];
}

export async function addRepositories(token: string, fullNames: string[]): Promise<{ added: string[]; errors: Array<{ full_name: string; error: string }> }> {
	return mutateAuthorized<{ added: string[]; errors: Array<{ full_name: string; error: string }> }>(REPOSITORIES_PATH, token, 'POST', { full_names: fullNames });
}

export async function removeRepository(token: string, fullName: string): Promise<{ ok: boolean }> {
	return mutateAuthorized<{ ok: boolean }>(`${REPOSITORIES_PATH}/${fullName}`, token, 'DELETE');
}

async function mutateAuthorized<T>(path: string, token: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
	if (isDemoRoute() && token === DEMO_TOKEN) {
		return demoMutate(path, method, body) as T;
	}

	const res = await fetch(`${API_BASE_URL}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body ? { 'Content-Type': 'application/json' } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});
	if (!res.ok) throw new Error(`Falha na operação (status ${res.status})`);
	return (await res.json()) as T;
}

export async function createTeam(token: string, name: string) {
	return mutateAuthorized<{ team_id: string }>(TEAMS_PATH, token, 'POST', { name });
}

export async function updateTeam(token: string, teamId: string, name: string) {
	return mutateAuthorized<{ ok: boolean }>(`${TEAMS_PATH}/${teamId}`, token, 'PUT', { name });
}

export async function addTeamMembers(token: string, teamId: string, githubLogins: string[]) {
	return mutateAuthorized<{ ok: boolean }>(`${TEAMS_PATH}/members`, token, 'POST', {
		team_id: teamId,
		github_logins: githubLogins,
	});
}

export async function removeTeamMember(token: string, teamId: string, githubLogin: string) {
	return mutateAuthorized<{ ok: boolean }>(`${TEAMS_PATH}/${teamId}/members/${encodeURIComponent(githubLogin)}`, token, 'DELETE');
}

export async function createIssuesBatch(token: string, fileId: string, tasks: Array<{ title: string; body: string; repo_full_name: string; assignee?: string }>) {
	return mutateAuthorized<{ created_issues: CreatedIssue[]; errors: Array<Record<string, string>> }>('/api/issues/batch', token, 'POST', { file_id: fileId, tasks });
}

export async function fetchIssues(token: string): Promise<Issue[]> {
	const data = await fetchAuthorized<{ issues: Issue[]; total: number }>(`${ISSUES_PATH}?limit=1000&offset=0`, token);
	return data.issues ?? [];
}

export async function createInstantIssue(
	token: string,
	payload: {
		repo_full_name: string;
		title: string;
		body?: string;
		assignee?: string | null;
		labels?: string[];
		milestone?: number | null;
		project?: number | null;
		points: number;
		priority: IssuePriority;
	},
): Promise<{ issue: Issue }> {
	return mutateAuthorized<{ issue: Issue }>(ISSUES_PATH, token, 'POST', payload);
}

export async function updateIssue(token: string, issueId: string, payload: Record<string, unknown>): Promise<{ issue: Issue }> {
	return mutateAuthorized<{ issue: Issue }>(`${ISSUES_PATH}/${issueId}`, token, 'PATCH', payload);
}

export type ProjectMetric = {
	issues: number;
	drafts: number;
	open_issues: number;
	closed_issues: number;
	recordings: number;
};

export type ProjectMember = {
	name: string;
	user_name: string;
	team_github_login: string;
	team_name: string;
	team_role: string;
	assigned_issues: number;
};

export type Project = {
	id: string;
	name: string;
	description: string;
	repositories: string[];
	team_ids: string[];
	record_count?: number;
	issue_count?: number;
	records?: AudioRecord[];
	issues?: Issue[];
	team_members?: ProjectMember[];
	metrics?: ProjectMetric;
	diagram?: Array<{ label: string; value: number; }>;
	burndown?: BurndownPoint[];
};

export type ProjectPayload = {
	name: string;
	description?: string;
	repositories: string[];
	team_ids: string[];
};

export async function fetchProjects(token: string): Promise<Project[]> {
	const data = await fetchAuthorized<{ projects: Project[] }>('/api/projects', token);
	return data.projects ?? [];
}

export async function fetchProject(token: string, projectId: string): Promise<Project> {
	const data = await fetchAuthorized<{ project: Project }>(`/api/projects/${projectId}`, token);
	return data.project;
}

export async function createProject(token: string, payload: ProjectPayload): Promise<Project> {
	const data = await mutateAuthorized<{ project: Project }>('/api/projects', token, 'POST', payload);
	return data.project;
}

export async function updateProject(token: string, projectId: string, payload: Partial<ProjectPayload>): Promise<Project> {
	const data = await mutateAuthorized<{ project: Project }>(`/api/projects/${projectId}`, token, 'PATCH', payload);
	return data.project;
}

export async function deleteProject(token: string, projectId: string): Promise<void> {
	// arquivamento suave: respaldo el proyecto (recuperable via restore)
	await mutateAuthorized<{ ok: boolean }>(`/api/projects/${projectId}`, token, 'DELETE');
}

/** restaura um projeto arquivado. */
export async function restoreProject(token: string, projectId: string): Promise<{ ok: boolean }> {
	return mutateAuthorized<{ ok: boolean }>(`/api/projects/${projectId}/restore`, token, 'POST');
}

// ---------------------------------------------------------------------------
// desempenho do projeto
// ---------------------------------------------------------------------------

export type PerformanceGranularity = 'daily' | 'weekly';

export type MemberPerformance = {
	github_login: string;
	name: string;
	assigned_issues: number;
	open_count: number;
	remaining_points: number;
	closed_count: number;
	closed_points: number;
	points_done: number;
	pending_drafts: number;
	last_activity: string | null;
};

export type RiskItem = {
	type: 'overloaded' | 'stale' | 'unassigned' | 'stalled_draft';
	severity: 'high' | 'medium';
	member?: string;
	member_name?: string;
	issue_ids?: string[];
	message: string;
};

export type PerformanceSummary = {
	total_issues: number;
	open_issues: number;
	closed_issues: number;
	drafts: number;
	pending_drafts: number;
	confirmed_drafts: number;
	draft_conversion_rate: number | null;
	total_points: number;
	delivered_points: number;
	remaining_points: number;
	throughput_weekly_avg: number;
	throughput_by_week: Record<string, number>;
	lead_time_avg_days: number | null;
	unassigned: number;
	late_issues: number;
};

export type PerformanceTimelinePoint = {
	label: string;
	created: number;
	closed: number;
	open: number;
	points_done: number;
	points_done_cumulative: number;
	points_total_cumulative: number;
};

export type BurnupPoint = {
	label: string;
	done: number;
	total: number;
};

export type ProjectPerformance = {
	generated_at: string;
	period: { start: string; end: string; granularity: PerformanceGranularity };
	partial_history: { detected: boolean; message: string };
	summary: PerformanceSummary;
	timeline: PerformanceTimelinePoint[];
	burndown: BurndownPoint[];
	burnup: BurnupPoint[];
	by_status: Array<{ status: string; count: number }>;
	by_priority: Array<{ priority: string; count: number }>;
	by_member: MemberPerformance[];
	activity_ranking: Array<{ github_login: string; name: string; closed_issues: number; points_done: number; last_activity: string | null }>;
	risks: RiskItem[];
};

export type PerformanceFilters = {
	period_start?: string;
	period_end?: string;
	granularity?: PerformanceGranularity;
	team_id?: string;
	member?: string;
	sprint_id?: string;
};

export async function fetchProjectPerformance(token: string, projectId: string, filters: PerformanceFilters = {}): Promise<ProjectPerformance> {
	const params = new URLSearchParams();
	if (filters.period_start) params.set('period_start', filters.period_start);
	if (filters.period_end) params.set('period_end', filters.period_end);
	if (filters.granularity) params.set('granularity', filters.granularity);
	if (filters.team_id) params.set('team_id', filters.team_id);
	if (filters.member) params.set('member', filters.member);
	if (filters.sprint_id) params.set('sprint_id', filters.sprint_id);
	const query = params.toString() ? `?${params.toString()}` : '';
	const data = await fetchAuthorized<{ performance: ProjectPerformance }>(`/api/projects/${projectId}/performance${query}`, token);
	return data.performance;
}

export async function attachRecordToProject(token: string, projectId: string, recordId: string): Promise<AudioRecord> {
	const data = await mutateAuthorized<{ record: AudioRecord }>(`/api/projects/${projectId}/records/${recordId}`, token, 'PATCH');
	return data.record;
}

export async function deleteIssue(token: string, issueId: string): Promise<{ ok: boolean }> {
	return mutateAuthorized<{ ok: boolean }>(`${ISSUES_PATH}/${issueId}`, token, 'DELETE');
}

export async function confirmIssues(token: string, issueIds: string[]): Promise<{ results: ConfirmIssueResult[] }> {
	return mutateAuthorized<{ results: ConfirmIssueResult[] }>(`${ISSUES_PATH}/confirm`, token, 'POST', { issue_ids: issueIds });
}

export async function syncIssues(token: string): Promise<{ added: number; errors: Array<{ repo: string; error: string }> }> {
	return mutateAuthorized<{ added: number; errors: Array<{ repo: string; error: string }> }>(`${ISSUES_PATH}/sync`, token, 'POST');
}

export async function fetchDashboardSummary(token: string): Promise<DashboardSummary> {
	const [recentRecords, totalRecords, teams] = await Promise.all([fetchAudioRecords(token, 50), fetchAudioRecordsCount(token), fetchTeams(token)]);

	const totalIssues = recentRecords.reduce((count, record) => {
		const createdIssues = Array.isArray(record.created_issues) ? record.created_issues : [];
		return count + createdIssues.length;
	}, 0);

	const pendingTasks = recentRecords.reduce((count, record) => {
		const tasks = Array.isArray(record.tasks) ? record.tasks : [];
		const created = Array.isArray(record.created_issues) ? record.created_issues.length : 0;
		return count + Math.max(0, tasks.length - created);
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

// ---------------------------------------------------------------------------
// sprints (scrum enxuto do TCC)
// ---------------------------------------------------------------------------

export const SPRINTS_PATH = '/api/sprints';

export type SprintStatus = 'planned' | 'active' | 'completed';
export type SprintTaskStatus = 'todo' | 'in_progress' | 'done';
export type SprintTaskOrigin = 'meeting' | 'manual';

export type SprintTask = {
	id: string;
	sprint_id: string;
	title: string;
	description: string;
	assignee?: string | null;
	points: number;
	status: SprintTaskStatus;
	origin: SprintTaskOrigin;
	record_id?: string | null;
	issue_id?: string | null;
	created_by_github_login: string;
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
};

export type SprintSummary = {
	id: string;
	name: string;
	goal: string;
	start_date: string;
	end_date: string;
	status: SprintStatus;
	created_by_github_login: string;
	created_at: string;
	updated_at: string;
	task_count: number;
	done_task_count: number;
	total_points: number;
	done_points: number;
	linked_issues: number;
};

export type BurndownPoint = {
	date: string;
	remaining: number;
	ideal: number;
};

export type SprintDetail = SprintSummary & {
	tasks: SprintTask[];
	burndown: BurndownPoint[];
};

export type SprintPayload = {
	name: string;
	goal: string;
	start_date: string;
	end_date: string;
	status: SprintStatus;
};

export type SprintTaskPayload = {
	title: string;
	description?: string;
	assignee?: string | null;
	points?: number;
	status?: SprintTaskStatus;
	origin?: SprintTaskOrigin;
	record_id?: string | null;
	issue_id?: string | null;
};

export async function fetchSprints(token: string): Promise<SprintSummary[]> {
	const data = await fetchAuthorized<{ sprints: SprintSummary[] }>(SPRINTS_PATH, token);
	return data.sprints ?? [];
}

export async function fetchSprint(token: string, sprintId: string): Promise<SprintDetail> {
	const data = await fetchAuthorized<{ sprint: SprintDetail }>(`${SPRINTS_PATH}/${sprintId}`, token);
	return data.sprint;
}

export async function createSprint(token: string, payload: SprintPayload): Promise<SprintSummary> {
	const data = await mutateAuthorized<{ sprint: SprintSummary }>(SPRINTS_PATH, token, 'POST', payload);
	return data.sprint;
}

export async function updateSprint(token: string, sprintId: string, payload: Partial<SprintPayload>): Promise<SprintSummary> {
	const data = await mutateAuthorized<{ sprint: SprintSummary }>(`${SPRINTS_PATH}/${sprintId}`, token, 'PATCH', payload);
	return data.sprint;
}

export async function deleteSprint(token: string, sprintId: string): Promise<{ ok: boolean }> {
	return mutateAuthorized<{ ok: boolean }>(`${SPRINTS_PATH}/${sprintId}`, token, 'DELETE');
}

export async function createSprintTask(token: string, sprintId: string, payload: SprintTaskPayload): Promise<SprintTask> {
	const data = await mutateAuthorized<{ task: SprintTask }>(`${SPRINTS_PATH}/${sprintId}/tasks`, token, 'POST', payload);
	return data.task;
}

export async function updateSprintTask(token: string, taskId: string, payload: Partial<SprintTaskPayload>): Promise<SprintTask> {
	const data = await mutateAuthorized<{ task: SprintTask }>(`${SPRINTS_PATH}/tasks/${taskId}`, token, 'PATCH', payload);
	return data.task;
}

export async function deleteSprintTask(token: string, taskId: string): Promise<{ ok: boolean }> {
	return mutateAuthorized<{ ok: boolean }>(`${SPRINTS_PATH}/tasks/${taskId}`, token, 'DELETE');
}
