import type { AudioRecord, BurndownPoint, Issue, Project, ProjectPerformance, Repository, SprintDetail, SprintSummary, TeamDetail, TeamMember, TeamResponse } from '@/lib/api';

export const DEMO_TOKEN = 'anota-ai-demo-token';

const now = '2026-09-30T10:00:00.000Z';

/* -------------------------------------------------------------------------- */
/*                                   Times                                    */
/* -------------------------------------------------------------------------- */

const demoTeams: TeamResponse[] = [
	{ id: 'team-product', name: 'Produto & Design', created_at: '2026-08-05T10:00:00.000Z', member_count: 3 },
	{ id: 'team-platform', name: 'Desenvolvimento WEB', created_at: '2026-07-18T10:00:00.000Z', member_count: 6 },
	{ id: 'team-growth', name: 'Inteligência Artifical', created_at: '2026-08-19T10:00:00.000Z', member_count: 3 },
	{ id: 'team-mobile', name: 'Desenvolvimento Mobile', created_at: '2026-09-02T10:00:00.000Z', member_count: 2 },
];

const demoTeamMembers: Record<string, TeamMember[]> = {
	'team-product': [
		{ github_login: 'MatsuCode', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'quiradon', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'Gabriel-GH1', added_at: '2026-09-01T10:00:00.000Z' },
	],
	'team-platform': [
		{ github_login: 'fernandocg1', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'EricInacio01', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'jagaldino', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'Jmspter', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'euandrelucas', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'GaroteDePrograma', added_at: '2026-09-01T10:00:00.000Z' },
	],
	'team-growth': [
		{ github_login: 'felipe-sbm', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'felipepotigol', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'thi-silva', added_at: '2026-09-01T10:00:00.000Z' },
	],
	'team-mobile': [
		{ github_login: 'thyevidal', added_at: '2026-09-01T10:00:00.000Z' },
		{ github_login: 'oscarkemuel', added_at: '2026-09-01T10:00:00.000Z' },
	],
};

/* -------------------------------------------------------------------------- */
/*                                Repositorios                                */
/* -------------------------------------------------------------------------- */

const demoRepositories: Repository[] = [
	{
		id: 'repo-anota',
		full_name: 'anota-ai/web',
		name: 'web',
		owner: 'anota-ai',
		private: false,
		description: 'Interface principal do Anota Aí',
		html_url: 'https://github.com/anota-ai/web',
		default_branch: 'main',
		created_at: '2026-06-01T10:00:00.000Z',
	},
	{
		id: 'repo-api',
		full_name: 'anota-ai/api',
		name: 'api',
		owner: 'anota-ai',
		private: false,
		description: 'API e processamento de reuniões',
		html_url: 'https://github.com/anota-ai/api',
		default_branch: 'main',
		created_at: '2026-06-01T10:00:00.000Z',
	},
	{
		id: 'repo-extension',
		full_name: 'anota-ai/extension',
		name: 'extension',
		owner: 'anota-ai',
		private: true,
		description: 'Extensão para gravações',
		html_url: 'https://github.com/anota-ai/extension',
		default_branch: 'main',
		created_at: '2026-06-10T10:00:00.000Z',
	},
	{
		id: 'repo-mobile',
		full_name: 'anota-ai/mobile',
		name: 'mobile',
		owner: 'anota-ai',
		private: true,
		description: 'Aplicativo mobile do Anota Aí',
		html_url: 'https://github.com/anota-ai/mobile',
		default_branch: 'develop',
		created_at: '2026-07-02T10:00:00.000Z',
	},
	{
		id: 'repo-infra',
		full_name: 'anota-ai/infra',
		name: 'infra',
		owner: 'anota-ai',
		private: true,
		description: 'Terraform, filas e observabilidade',
		html_url: 'https://github.com/anota-ai/infra',
		default_branch: 'main',
		created_at: '2026-06-15T10:00:00.000Z',
	},
	{
		id: 'repo-design-system',
		full_name: 'anota-ai/design-system',
		name: 'design-system',
		owner: 'anota-ai',
		private: false,
		description: 'Tokens e componentes compartilhados',
		html_url: 'https://github.com/anota-ai/design-system',
		default_branch: 'main',
		created_at: '2026-06-20T10:00:00.000Z',
	},
	{
		id: 'repo-docs',
		full_name: 'anota-ai/docs',
		name: 'docs',
		owner: 'anota-ai',
		private: false,
		description: 'Documentação pública e runbooks',
		html_url: 'https://github.com/anota-ai/docs',
		default_branch: 'main',
		created_at: '2026-06-25T10:00:00.000Z',
	},
];

/* -------------------------------------------------------------------------- */
/*                                  Tarefas                                   */
/* -------------------------------------------------------------------------- */

const demoIssues: Issue[] = [
	// ------------------------------ project-launch ------------------------------
	{
		id: 'issue-demo-1',
		github_issue_id: 142,
		number: 142,
		title: 'Criar visão semanal do progresso',
		body: 'Adicionar uma leitura semanal para o time.',
		state: 'draft',
		repo_full_name: 'anota-ai/web',
		source: 'anota_ai',
		points: 5,
		priority: 'high',
		assignee: 'MatsuCode',
		html_url: 'https://github.com/anota-ai/web/issues/142',
		project_id: 'project-launch',
		created_at: '2026-09-23T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-2',
		github_issue_id: 138,
		number: 138,
		title: 'Sincronizar rascunhos da extensão',
		body: 'Enviar rascunhos confirmados para o GitHub.',
		state: 'closed',
		repo_full_name: 'anota-ai/extension',
		source: 'anota_ai',
		points: 3,
		priority: 'medium',
		assignee: 'EricInacio01',
		html_url: 'https://github.com/anota-ai/extension/issues/138',
		project_id: 'project-launch',
		created_at: '2026-09-19T10:00:00.000Z',
		updated_at: '2026-09-27T10:00:00.000Z',
	},
	{
		id: 'issue-demo-3',
		title: 'Revisar permissões do workspace',
		body: 'Validar o fluxo de permissões.',
		state: 'draft',
		repo_full_name: 'anota-ai/api',
		source: 'anota_ai',
		points: 2,
		priority: 'low',
		assignee: 'fernandocg1',
		record_id: 'record-demo-2',
		project_id: 'project-launch',
		created_at: '2026-09-29T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-4',
		github_issue_id: 131,
		number: 131,
		title: 'Adicionar filtros por repositório',
		body: 'Permitir combinar repositório, responsável e prioridade.',
		state: 'open',
		repo_full_name: 'anota-ai/web',
		source: 'anota_ai',
		points: 3,
		priority: 'medium',
		assignee: 'Gabriel-GH1',
		html_url: 'https://github.com/anota-ai/web/issues/131',
		project_id: 'project-launch',
		created_at: '2026-09-22T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-5',
		github_issue_id: 126,
		number: 126,
		title: 'Exportar resumo da reunião em PDF',
		body: 'Gerar um PDF com resumo, tarefas e issues criadas.',
		state: 'closed',
		repo_full_name: 'anota-ai/web',
		source: 'external',
		points: 5,
		priority: 'high',
		assignee: 'quiradon',
		html_url: 'https://github.com/anota-ai/web/issues/126',
		project_id: 'project-launch',
		created_at: '2026-09-11T10:00:00.000Z',
		updated_at: '2026-09-26T10:00:00.000Z',
	},
	{
		id: 'issue-demo-6',
		title: 'Alinhar nomenclatura de projetos',
		body: 'Padronizar os nomes usados no dashboard e nos relatórios.',
		state: 'draft',
		repo_full_name: 'anota-ai/docs',
		source: 'anota_ai',
		points: 1,
		priority: 'low',
		assignee: 'jagaldino',
		record_id: 'record-demo-7',
		project_id: 'project-launch',
		created_at: '2026-09-30T09:40:00.000Z',
		updated_at: now,
	},

	// ----------------------------- project-insights -----------------------------
	{
		id: 'issue-demo-7',
		github_issue_id: 97,
		number: 97,
		title: 'Melhorar busca de gravações',
		body: 'A busca precisa considerar transcrição.',
		state: 'open',
		repo_full_name: 'anota-ai/web',
		source: 'external',
		points: 3,
		priority: 'medium',
		assignee: 'MatsuCode',
		html_url: 'https://github.com/anota-ai/web/issues/97',
		project_id: 'project-insights',
		created_at: '2026-09-15T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-8',
		github_issue_id: 103,
		number: 103,
		title: 'Destacar decisões na transcrição',
		body: 'Marcar visualmente os trechos classificados como decisão.',
		state: 'open',
		repo_full_name: 'anota-ai/web',
		source: 'anota_ai',
		points: 5,
		priority: 'high',
		assignee: 'euandrelucas',
		html_url: 'https://github.com/anota-ai/web/issues/103',
		project_id: 'project-insights',
		created_at: '2026-09-18T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-9',
		github_issue_id: 88,
		number: 88,
		title: 'Agrupar tarefas por responsável',
		body: 'Mostrar as tarefas extraídas agrupadas por pessoa.',
		state: 'closed',
		repo_full_name: 'anota-ai/web',
		source: 'external',
		points: 2,
		priority: 'low',
		assignee: 'GaroteDePrograma',
		html_url: 'https://github.com/anota-ai/web/issues/88',
		project_id: 'project-insights',
		created_at: '2026-09-05T10:00:00.000Z',
		updated_at: '2026-09-24T10:00:00.000Z',
	},
	{
		id: 'issue-demo-10',
		title: 'Sinalizar trechos ambíguos na ata',
		body: 'Pedir confirmação humana quando a confiança for baixa.',
		state: 'draft',
		repo_full_name: 'anota-ai/api',
		source: 'anota_ai',
		points: 3,
		priority: 'medium',
		assignee: 'felipe-sbm',
		record_id: 'record-demo-3',
		project_id: 'project-insights',
		created_at: '2026-09-29T15:10:00.000Z',
		updated_at: now,
	},

	// ------------------------------ project-mobile ------------------------------
	{
		id: 'issue-demo-11',
		github_issue_id: 57,
		number: 57,
		title: 'Notificações de resumo semanal',
		body: 'Enviar push com o resumo das reuniões da semana.',
		state: 'open',
		repo_full_name: 'anota-ai/mobile',
		source: 'external',
		points: 5,
		priority: 'high',
		assignee: 'thyevidal',
		html_url: 'https://github.com/anota-ai/mobile/issues/57',
		project_id: 'project-mobile',
		created_at: '2026-09-09T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-12',
		github_issue_id: 61,
		number: 61,
		title: 'Modo offline para rascunhos',
		body: 'Permitir gravar e revisar rascunhos sem conexão.',
		state: 'open',
		repo_full_name: 'anota-ai/mobile',
		source: 'anota_ai',
		points: 8,
		priority: 'high',
		assignee: 'oscarkemuel',
		html_url: 'https://github.com/anota-ai/mobile/issues/61',
		project_id: 'project-mobile',
		created_at: '2026-09-14T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-13',
		github_issue_id: 45,
		number: 45,
		title: 'Login com GitHub no app',
		body: 'Fluxo de autenticação OAuth dentro do aplicativo.',
		state: 'closed',
		repo_full_name: 'anota-ai/mobile',
		source: 'external',
		points: 3,
		priority: 'medium',
		assignee: 'thyevidal',
		html_url: 'https://github.com/anota-ai/mobile/issues/45',
		project_id: 'project-mobile',
		created_at: '2026-08-28T10:00:00.000Z',
		updated_at: '2026-09-20T10:00:00.000Z',
	},
	{
		id: 'issue-demo-14',
		title: 'Ajustar tema escuro',
		body: 'Revisar contraste dos componentes no tema escuro.',
		state: 'draft',
		repo_full_name: 'anota-ai/design-system',
		source: 'anota_ai',
		points: 2,
		priority: 'low',
		assignee: 'felipepotigol',
		record_id: 'record-demo-4',
		project_id: 'project-mobile',
		created_at: '2026-09-28T11:20:00.000Z',
		updated_at: now,
	},

	// --------------------------- project-reliability ----------------------------
	{
		id: 'issue-demo-15',
		github_issue_id: 210,
		number: 210,
		title: 'Alertas de falha no processamento',
		body: 'Notificar o time quando um áudio falhar no pipeline.',
		state: 'open',
		repo_full_name: 'anota-ai/infra',
		source: 'anota_ai',
		points: 5,
		priority: 'high',
		assignee: 'Jmspter',
		html_url: 'https://github.com/anota-ai/infra/issues/210',
		project_id: 'project-reliability',
		created_at: '2026-09-16T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-16',
		github_issue_id: 204,
		number: 204,
		title: 'Fila de reprocessamento de áudio',
		body: 'Reprocessar arquivos que falharam sem intervenção manual.',
		state: 'open',
		repo_full_name: 'anota-ai/api',
		source: 'external',
		points: 8,
		priority: 'high',
		assignee: 'euandrelucas',
		html_url: 'https://github.com/anota-ai/api/issues/204',
		project_id: 'project-reliability',
		created_at: '2026-09-12T10:00:00.000Z',
		updated_at: now,
	},
	{
		id: 'issue-demo-17',
		github_issue_id: 198,
		number: 198,
		title: 'Reduzir custo de armazenamento',
		body: 'Mover áudios antigos para storage frio.',
		state: 'closed',
		repo_full_name: 'anota-ai/infra',
		source: 'external',
		points: 3,
		priority: 'medium',
		assignee: 'GaroteDePrograma',
		html_url: 'https://github.com/anota-ai/infra/issues/198',
		project_id: 'project-reliability',
		created_at: '2026-09-02T10:00:00.000Z',
		updated_at: '2026-09-22T10:00:00.000Z',
	},
	{
		id: 'issue-demo-18',
		title: 'Documentar runbook de incidentes',
		body: 'Escrever o passo a passo para incidentes de processamento.',
		state: 'draft',
		repo_full_name: 'anota-ai/docs',
		source: 'anota_ai',
		points: 2,
		priority: 'low',
		assignee: 'thi-silva',
		record_id: 'record-demo-8',
		project_id: 'project-reliability',
		created_at: '2026-09-30T08:15:00.000Z',
		updated_at: now,
	},
];

/* -------------------------------------------------------------------------- */
/*                              Audio records                                 */
/* -------------------------------------------------------------------------- */

const demoRecords: AudioRecord[] = [
	{
		id: 'record-demo-1',
		file_id: 'file-demo-1',
		original_filename: 'planejamento-produto.wav',
		filename: 'planejamento-produto.wav',
		created_at: '2026-09-28T14:30:00.000Z',
		status: 'reviewed',
		summary: 'O time alinhou o lançamento do novo painel de projetos, priorizando visibilidade do progresso e uma experiência mais simples para equipes.',
		transcript:
			'MatsuCode: Vamos deixar o resumo do projeto como a primeira leitura.\nEricInacio01: Também precisamos preservar os rascunhos até alguém confirmar a issue.\nGabriel-GH1: Posso cuidar da busca e dos filtros.',
		tasks: [
			{ title: 'Criar visão semanal do progresso', description: 'Adicionar uma leitura semanal para o time.', assignee: 'MatsuCode' },
			{ title: 'Documentar fluxo de confirmação', description: 'Explicar quando um rascunho vira issue.', assignee: 'quiradon' },
		],
		created_issues: [
			{
				title: 'Adicionar filtros por repositório',
				html_url: 'https://github.com/anota-ai/web/issues/131',
				repo_full_name: 'anota-ai/web',
				assignee: 'Gabriel-GH1',
			},
		],
		repo_full_name: 'anota-ai/web',
		project_id: 'project-launch',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-2',
		file_id: 'file-demo-2',
		original_filename: 'retrospectiva-time.mp3',
		filename: 'retrospectiva-time.mp3',
		created_at: '2026-09-25T09:15:00.000Z',
		status: 'pending_review',
		summary: 'A retrospectiva identificou permissões e sincronização como os próximos pontos de atenção.',
		transcript: 'fernandocg1: A sincronização funcionou bem, mas as permissões ainda geram dúvidas.\nEricInacio01: Vou abrir um rascunho para revisarmos com o time.',
		tasks: [{ title: 'Revisar permissões do workspace', description: 'Validar o fluxo de permissões.', assignee: 'fernandocg1' }],
		created_issues: [],
		repo_full_name: 'anota-ai/api',
		project_id: 'project-launch',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-3',
		file_id: 'file-demo-3',
		original_filename: 'pesquisa-usuarios.m4a',
		filename: 'pesquisa-usuarios.m4a',
		created_at: '2026-09-21T16:45:00.000Z',
		status: 'reviewed',
		summary: 'Usuários querem encontrar rapidamente decisões e tarefas extraídas das reuniões.',
		transcript: 'MatsuCode: A busca por transcrição é a melhoria mais pedida.\nquiradon: Vale destacar as decisões dentro do texto.',
		tasks: [{ title: 'Melhorar busca de gravações', description: 'A busca precisa considerar transcrição.', assignee: 'MatsuCode' }],
		created_issues: [
			{
				title: 'Melhorar busca de gravações',
				html_url: 'https://github.com/anota-ai/web/issues/97',
				repo_full_name: 'anota-ai/web',
				assignee: 'Gabriel-GH1',
			},
		],
		repo_full_name: 'anota-ai/web',
		project_id: 'project-insights',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-4',
		file_id: 'file-demo-4',
		original_filename: 'daily-mobile.wav',
		filename: 'daily-mobile.wav',
		created_at: '2026-09-29T11:20:00.000Z',
		status: 'pending_review',
		summary: 'O time mobile priorizou o modo offline e discutiu o tema escuro no design system.',
		transcript: 'thyevidal: O modo offline é o que mais trava a adoção hoje.\noscarkemuel: Se a gravação funcionar sem rede, o resto flui.\nfelipe-sbm: Vou revisar o contraste do tema escuro enquanto isso.',
		tasks: [
			{ title: 'Notificações de resumo semanal', description: 'Enviar push com o resumo da semana.', assignee: 'thyevidal' },
			{ title: 'Modo offline para rascunhos', description: 'Permitir gravar e revisar sem conexão.', assignee: 'oscarkemuel' },
		],
		created_issues: [],
		repo_full_name: 'anota-ai/mobile',
		project_id: 'project-mobile',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-5',
		file_id: 'file-demo-5',
		original_filename: 'revisao-infra.mp3',
		filename: 'revisao-infra.mp3',
		created_at: '2026-09-24T08:05:00.000Z',
		status: 'reviewed',
		summary: 'Revisão semanal de infraestrutura focou em observabilidade do pipeline de áudio.',
		transcript: 'EricInacio01: Precisamos saber de falhas antes do cliente reclamar.\nJmspter: Vou montar os alertas por etapa do pipeline.',
		tasks: [{ title: 'Alertas de falha no processamento', description: 'Notificar o time quando um áudio falhar.', assignee: 'EricInacio01' }],
		created_issues: [
			{
				title: 'Alertas de falha no processamento',
				html_url: 'https://github.com/anota-ai/infra/issues/210',
				repo_full_name: 'anota-ai/infra',
				assignee: 'EricInacio01',
			},
		],
		repo_full_name: 'anota-ai/infra',
		project_id: 'project-reliability',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-6',
		file_id: 'file-demo-6',
		original_filename: 'onboarding-clientes.m4a',
		filename: 'onboarding-clientes.m4a',
		created_at: '2026-09-19T13:40:00.000Z',
		status: 'reviewed',
		summary: 'Sessão de onboarding mostrou onde as decisões se perdem entre a reunião e o board.',
		transcript: 'euandrelucas: As pessoas decidem na call e esquecem de registrar.\nfelipe-sbm: Se a decisão ficar destacada, o retrabalho cai.',
		tasks: [{ title: 'Destacar decisões na transcrição', description: 'Marcar trechos classificados como decisão.', assignee: 'euandrelucas' }],
		created_issues: [
			{
				title: 'Destacar decisões na transcrição',
				html_url: 'https://github.com/anota-ai/web/issues/103',
				repo_full_name: 'anota-ai/web',
				assignee: 'euandrelucas',
			},
		],
		repo_full_name: 'anota-ai/web',
		project_id: 'project-insights',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-7',
		file_id: 'file-demo-7',
		original_filename: 'kickoff-design-system.wav',
		filename: 'kickoff-design-system.wav',
		created_at: '2026-09-30T09:40:00.000Z',
		status: 'pending_review',
		summary: 'Kickoff do design system definiu nomenclatura de projetos e ajustes de tema escuro.',
		transcript: 'jagaldino: Os nomes dos projetos estão inconsistentes entre dashboard e relatórios.\nfelipe-sbm: E o tema escuro precisa de uma passada de contraste.',
		tasks: [
			{ title: 'Alinhar nomenclatura de projetos', description: 'Padronizar os nomes no dashboard.', assignee: 'jagaldino' },
			{ title: 'Ajustar tema escuro', description: 'Revisar contraste dos componentes.', assignee: 'felipe-sbm' },
		],
		created_issues: [],
		repo_full_name: 'anota-ai/design-system',
		project_id: 'project-launch',
		user_github_login: 'demo-user',
	},
	{
		id: 'record-demo-8',
		file_id: 'file-demo-8',
		original_filename: 'incidente-api.mp3',
		filename: 'incidente-api.mp3',
		created_at: '2026-09-30T08:15:00.000Z',
		status: 'reviewed',
		summary: 'Postmortem do incidente de processamento apontou necessidade de reprocessamento automático e runbook.',
		transcript: 'Jmspter: A fila travou e ninguém percebeu por duas horas.\nEricInacio01: Precisamos de um runbook e de reprocessamento automático.\nGaroteDePrograma: Também vale revisar o custo do storage.',
		tasks: [
			{ title: 'Fila de reprocessamento de áudio', description: 'Reprocessar falhas sem intervenção manual.', assignee: 'Jmspter' },
			{ title: 'Documentar runbook de incidentes', description: 'Passo a passo para incidentes de processamento.', assignee: 'Jmspter' },
		],
		created_issues: [
			{
				title: 'Fila de reprocessamento de áudio',
				html_url: 'https://github.com/anota-ai/api/issues/204',
				repo_full_name: 'anota-ai/api',
				assignee: 'Jmspter',
			},
		],
		repo_full_name: 'anota-ai/api',
		project_id: 'project-reliability',
		user_github_login: 'demo-user',
	},
];

/* -------------------------------------------------------------------------- */
/*                                 Burndowns                                  */
/* -------------------------------------------------------------------------- */

const demoBurndown: BurndownPoint[] = [
	{ date: '2026-09-21', remaining: 26, ideal: 26 },
	{ date: '2026-09-22', remaining: 24, ideal: 24 },
	{ date: '2026-09-23', remaining: 22, ideal: 22 },
	{ date: '2026-09-24', remaining: 21, ideal: 20 },
	{ date: '2026-09-25', remaining: 18, ideal: 18 },
	{ date: '2026-09-26', remaining: 17, ideal: 16 },
	{ date: '2026-09-27', remaining: 15, ideal: 14 },
	{ date: '2026-09-28', remaining: 12, ideal: 12 },
	{ date: '2026-09-29', remaining: 11, ideal: 10 },
	{ date: '2026-09-30', remaining: 8, ideal: 8 },
	{ date: '2026-10-01', remaining: 6, ideal: 6 },
	{ date: '2026-10-02', remaining: 4, ideal: 4 },
	{ date: '2026-10-03', remaining: 2, ideal: 2 },
	{ date: '2026-10-04', remaining: 0, ideal: 0 },
];

const demoBurndownInsights: BurndownPoint[] = [
	{ date: '2026-09-21', remaining: 13, ideal: 13 },
	{ date: '2026-09-22', remaining: 13, ideal: 12 },
	{ date: '2026-09-23', remaining: 11, ideal: 11 },
	{ date: '2026-09-24', remaining: 10, ideal: 9 },
	{ date: '2026-09-25', remaining: 9, ideal: 8 },
	{ date: '2026-09-26', remaining: 7, ideal: 7 },
	{ date: '2026-09-27', remaining: 6, ideal: 5 },
	{ date: '2026-09-28', remaining: 4, ideal: 4 },
	{ date: '2026-09-29', remaining: 3, ideal: 3 },
	{ date: '2026-09-30', remaining: 1, ideal: 1 },
];

const demoBurndownMobile: BurndownPoint[] = [
	{ date: '2026-09-21', remaining: 18, ideal: 18 },
	{ date: '2026-09-22', remaining: 18, ideal: 16 },
	{ date: '2026-09-23', remaining: 16, ideal: 15 },
	{ date: '2026-09-24', remaining: 15, ideal: 13 },
	{ date: '2026-09-25', remaining: 14, ideal: 12 },
	{ date: '2026-09-26', remaining: 11, ideal: 10 },
	{ date: '2026-09-27', remaining: 10, ideal: 9 },
	{ date: '2026-09-28', remaining: 7, ideal: 7 },
	{ date: '2026-09-29', remaining: 5, ideal: 5 },
	{ date: '2026-09-30', remaining: 2, ideal: 2 },
];

const demoBurndownReliability: BurndownPoint[] = [
	{ date: '2026-09-21', remaining: 18, ideal: 18 },
	{ date: '2026-09-22', remaining: 17, ideal: 16 },
	{ date: '2026-09-23', remaining: 15, ideal: 15 },
	{ date: '2026-09-24', remaining: 14, ideal: 13 },
	{ date: '2026-09-25', remaining: 12, ideal: 12 },
	{ date: '2026-09-26', remaining: 11, ideal: 10 },
	{ date: '2026-09-27', remaining: 9, ideal: 9 },
	{ date: '2026-09-28', remaining: 8, ideal: 7 },
	{ date: '2026-09-29', remaining: 6, ideal: 6 },
	{ date: '2026-09-30', remaining: 4, ideal: 4 },
];

/* -------------------------------------------------------------------------- */
/*                                  Projects                                  */
/* -------------------------------------------------------------------------- */

const demoProjects: Project[] = [
	{
		id: 'project-launch',
		name: 'Lançamento do painel',
		description: 'Uma experiência mais clara para acompanhar o trabalho do time.',
		repositories: ['anota-ai/web', 'anota-ai/api', 'anota-ai/extension', 'anota-ai/design-system', 'anota-ai/docs'],
		team_ids: ['team-product', 'team-platform', 'team-growth'],
		record_count: 3,
		issue_count: 7,
		records: demoRecords.filter((record) => record.project_id === 'project-launch'),
		issues: demoIssues.filter((issue) => issue.project_id === 'project-launch'),
		team_members: [
			{ name: 'Bruno Ramon', user_name: 'MatsuCode', team_github_login: 'MatsuCode', team_name: 'Produto & Design', team_role: 'Desenvolvedor full-stack', assigned_issues: 4 },
			{ name: 'Arthur Gabriel Araújo', user_name: 'quiradon', team_github_login: 'quiradon', team_name: 'Produto & Design', team_role: 'Produto & Design', assigned_issues: 1 },
			{ name: 'Gabriel Henrique', user_name: 'Gabriel-GH1', team_github_login: 'Gabriel-GH1', team_name: 'Produto & Design', team_role: 'Analista', assigned_issues: 1 },
			{ name: 'Fernando Castro Gadelha', user_name: 'fernandocg1', team_github_login: 'fernandocg1', team_name: 'Desenvolvimento WEB', team_role: 'Pesquisador de Hardware', assigned_issues: 1 },
			{ name: 'Eric Inácio', user_name: 'EricInacio01', team_github_login: 'EricInacio01', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'João Arthur', user_name: 'jagaldino', team_github_login: 'jagaldino', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'James Peter', user_name: 'Jmspter', team_github_login: 'Jmspter', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Ruby', assigned_issues: 1 },
			{ name: 'André "ADG" Paiva', user_name: 'euandrelucas', team_github_login: 'euandrelucas', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'Tempest', user_name: 'GaroteDePrograma', team_github_login: 'GaroteDePrograma', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend e Técnico em Cloud', assigned_issues: 1 },
			{ name: 'Felipe Samuel', user_name: 'felipe-sbm', team_github_login: 'felipe-sbm', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
			{ name: 'Felipe', user_name: 'felipepotigol', team_github_login: 'felipepotigol', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
			{ name: 'Thiago Silva', user_name: 'thi-silva', team_github_login: 'thi-silva', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
		],
		metrics: { issues: 15, drafts: 3, open_issues: 1, closed_issues: 2, recordings: 3 },
		diagram: [
			{ label: 'Issues abertas', value: 3},
			{ label: 'Rascunhos', value: 3},
			{ label: 'Issues fechadas', value: 2},
		],
		burndown: demoBurndown,
	},
	{
		id: 'project-insights',
		name: 'IA embarcada em ESP32',
		description: 'Desenvolvimento de um modelo de IA para rodar em microcontroladores ESP32, permitindo gravação e revisão de reuniões sem depender de nuvem',
		repositories: ['anota-ai/web', 'anota-ai/api'],
		team_ids: ['team-product', 'team-growth'],
		record_count: 2,
		issue_count: 4,
		records: demoRecords.filter((record) => record.project_id === 'project-insights'),
		issues: demoIssues.filter((issue) => issue.project_id === 'project-insights'),
		team_members: [
			{ name: 'Gabriel Henrique', user_name: 'Gabriel-GH1', team_github_login: 'Gabriel-GH1', team_name: 'Produto & Design', team_role: 'Analista e Orientador de Projeto', assigned_issues: 0 },
			{ name: 'Arthur Gabriel Araújo', user_name: 'quiradon', team_github_login: 'quiradon', team_name: 'Produto & Design', team_role: 'QA e PO', assigned_issues: 1 },
			{ name: 'Bruno Ramon', user_name: 'MatsuCode', team_github_login: 'MatsuCode', team_name: 'Produto & Design', team_role: 'Desenvolvedor Full-Stack', assigned_issues: 3 },
			{ name: 'Felipe', user_name: 'felipepotigol', team_github_login: 'felipepotigol', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 0 },
			{ name: 'Thiago Silva', user_name: 'thi-silva', team_github_login: 'thi-silva', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 2 },
			{ name: 'Felipe Samuel', user_name: 'felipe-sbm', team_github_login: 'felipe-sbm', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 5 },
		],
		metrics: { issues: 4, drafts: 1, open_issues: 2, closed_issues: 1, recordings: 2 },
		diagram: [
			{ label: 'Issues abertas', value: 2 },
			{ label: 'Rascunhos', value: 1 },
			{ label: 'Issues fechadas', value: 1 },
		],
		burndown: demoBurndownInsights,
	},
	{
		id: 'project-mobile',
		name: 'Aplicativo mobile',
		description: 'Levar gravação e revisão de reuniões para o celular.',
		repositories: ['anota-ai/mobile', 'anota-ai/design-system'],
		team_ids: ['team-mobile', 'team-growth'],
		record_count: 1,
		issue_count: 4,
		records: demoRecords.filter((record) => record.project_id === 'project-mobile'),
		issues: demoIssues.filter((issue) => issue.project_id === 'project-mobile'),
		team_members: [
			{ name: 'Thierry Henry Vidal Mandogou', user_name: 'thyevidal', team_github_login: 'thyevidal', team_name: 'Desenvolvimento Mobile', team_role: 'Desenvolvedor Desenvolvimento Mobile', assigned_issues: 1 },
			{ name: 'Oscar Kemuel', user_name: 'oscarkemuel', team_github_login: 'oscarkemuel', team_name: 'Desenvolvimento Mobile', team_role: 'Desenvolvedor Desenvolvimento Mobile', assigned_issues: 1 },
			{ name: 'Felipe Samuel', user_name: 'felipe-sbm', team_github_login: 'felipe-sbm', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
			{ name: 'Felipe', user_name: 'felipepotigol', team_github_login: 'felipepotigol', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
			{ name: 'Thiago Silva', user_name: 'thi-silva', team_github_login: 'thi-silva', team_name: 'Inteligência Artifical', team_role: 'Técnico em Inteligência Artificial', assigned_issues: 1 },
		],
		metrics: { issues: 4, drafts: 1, open_issues: 2, closed_issues: 1, recordings: 1 },
		diagram: [
			{ label: 'Issues abertas', value: 2 },
			{ label: 'Rascunhos', value: 1 },
			{ label: 'Issues fechadas', value: 1 },
		],
		burndown: demoBurndownMobile,
	},
	{
		id: 'project-reliability',
		name: 'Confiabilidade & Infra',
		description: 'Processamento de áudio previsível, observável e barato.',
		repositories: ['anota-ai/infra', 'anota-ai/api', 'anota-ai/docs'],
		team_ids: ['team-platform'],
		record_count: 2,
		issue_count: 4,
		records: demoRecords.filter((record) => record.project_id === 'project-reliability'),
		issues: demoIssues.filter((issue) => issue.project_id === 'project-reliability'),
		team_members: [
			{ name: 'Fernando Castro Gadelha', user_name: 'fernandocg1', team_github_login: 'fernandocg1', team_name: 'Desenvolvimento WEB', team_role: 'Pesquisador e Analista', assigned_issues: 1 },
			{ name: 'Eric Inácio', user_name: 'EricInacio01', team_github_login: 'EricInacio01', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'João Arthur', user_name: 'jagaldino', team_github_login: 'jagaldino', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Full-Stack', assigned_issues: 1 },
			{ name: 'James Peter', user_name: 'Jmspter', team_github_login: 'Jmspter', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'André "ADG" Paiva', user_name: 'euandrelucas', team_github_login: 'euandrelucas', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend', assigned_issues: 1 },
			{ name: 'Tempest', user_name: 'GaroteDePrograma', team_github_login: 'GaroteDePrograma', team_name: 'Desenvolvimento WEB', team_role: 'Desenvolvedor Backend e Técnico em Cloud', assigned_issues: 1 },
		],
		metrics: { issues: 4, drafts: 1, open_issues: 2, closed_issues: 1, recordings: 2 },
		diagram: [
			{ label: 'Issues abertas', value: 2 },
			{ label: 'Rascunhos', value: 1 },
			{ label: 'Issues fechadas', value: 1 },
		],
		burndown: demoBurndownReliability,
	},
];

/* -------------------------------------------------------------------------- */
/*                                  Sprints                                   */
/* -------------------------------------------------------------------------- */

const demoSprints: SprintSummary[] = [
	{
		id: 'sprint-demo-1',
		name: 'Sprint 12 · Painel',
		goal: 'Fechar a experiência de demonstração do painel',
		start_date: '2026-09-21',
		end_date: '2026-10-04',
		status: 'active',
		created_by_github_login: 'demo-user',
		created_at: '2026-09-21T10:00:00.000Z',
		updated_at: now,
		task_count: 6,
		done_task_count: 3,
		total_points: 26,
		done_points: 16,
		linked_issues: 5,
	},
	{
		id: 'sprint-demo-2',
		name: 'Sprint 11 · Insights',
		goal: 'Deixar a busca por transcrição utilizável',
		start_date: '2026-09-07',
		end_date: '2026-09-20',
		status: 'completed',
		created_by_github_login: 'demo-user',
		created_at: '2026-09-07T10:00:00.000Z',
		updated_at: '2026-09-20T18:00:00.000Z',
		task_count: 5,
		done_task_count: 5,
		total_points: 13,
		done_points: 13,
		linked_issues: 4,
	},
	{
		id: 'sprint-demo-3',
		name: 'Sprint 13 · Desenvolvimento Mobile',
		goal: 'Habilitar gravação offline no aplicativo',
		start_date: '2026-10-05',
		end_date: '2026-10-18',
		status: 'planned',
		created_by_github_login: 'demo-user',
		created_at: '2026-09-29T10:00:00.000Z',
		updated_at: now,
		task_count: 4,
		done_task_count: 0,
		total_points: 18,
		done_points: 0,
		linked_issues: 3,
	},
	{
		id: 'sprint-demo-4',
		name: 'Sprint 10 · Confiabilidade',
		goal: 'Reduzir falhas silenciosas no pipeline de áudio',
		start_date: '2026-08-24',
		end_date: '2026-09-06',
		status: 'completed',
		created_by_github_login: 'demo-user',
		created_at: '2026-08-24T10:00:00.000Z',
		updated_at: '2026-09-06T18:00:00.000Z',
		task_count: 5,
		done_task_count: 4,
		total_points: 18,
		done_points: 15,
		linked_issues: 3,
	},
];

const demoSprintDetails: Record<string, SprintDetail> = {
	'sprint-demo-1': {
		...demoSprints[0],
		tasks: [
			{
				id: 'task-demo-1',
				sprint_id: 'sprint-demo-1',
				title: 'Revisar dados do dashboard',
				description: 'Conferir os números exibidos no painel.',
				assignee: 'MatsuCode',
				points: 3,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-21T10:00:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-2',
				sprint_id: 'sprint-demo-1',
				title: 'Publicar fluxo de gravações',
				description: '',
				assignee: 'EricInacio01',
				points: 5,
				status: 'in_progress',
				origin: 'meeting',
				record_id: 'record-demo-1',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-24T10:00:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-3',
				sprint_id: 'sprint-demo-1',
				title: 'Adicionar filtros por repositório',
				description: 'Combinar repositório, responsável e prioridade.',
				assignee: 'Gabriel-GH1',
				points: 3,
				status: 'in_progress',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-22T10:00:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-4',
				sprint_id: 'sprint-demo-1',
				title: 'Exportar resumo em PDF',
				description: '',
				assignee: 'quiradon',
				points: 5,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-23T10:00:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-5',
				sprint_id: 'sprint-demo-1',
				title: 'Documentar fluxo de confirmação',
				description: 'Explicar quando um rascunho vira issue.',
				assignee: 'quiradon',
				points: 2,
				status: 'todo',
				origin: 'meeting',
				record_id: 'record-demo-1',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-25T10:00:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-6',
				sprint_id: 'sprint-demo-1',
				title: 'Alinhar nomenclatura de projetos',
				description: 'Padronizar nomes no dashboard e nos relatórios.',
				assignee: 'jagaldino',
				points: 8,
				status: 'done',
				origin: 'meeting',
				record_id: 'record-demo-7',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-30T09:45:00.000Z',
				updated_at: now,
			},
		],
		burndown: demoBurndown,
	},
	'sprint-demo-2': {
		...demoSprints[1],
		tasks: [
			{
				id: 'task-demo-7',
				sprint_id: 'sprint-demo-2',
				title: 'Indexar transcrições na busca',
				description: '',
				assignee: 'MatsuCode',
				points: 5,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-07T10:00:00.000Z',
				updated_at: '2026-09-15T10:00:00.000Z',
			},
			{
				id: 'task-demo-8',
				sprint_id: 'sprint-demo-2',
				title: 'Agrupar tarefas por responsável',
				description: '',
				assignee: 'Gabriel-GH1',
				points: 2,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-08T10:00:00.000Z',
				updated_at: '2026-09-14T10:00:00.000Z',
			},
			{
				id: 'task-demo-9',
				sprint_id: 'sprint-demo-2',
				title: 'Destacar decisões na transcrição',
				description: '',
				assignee: 'euandrelucas',
				points: 3,
				status: 'done',
				origin: 'meeting',
				record_id: 'record-demo-6',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-10T10:00:00.000Z',
				updated_at: '2026-09-18T10:00:00.000Z',
			},
			{
				id: 'task-demo-10',
				sprint_id: 'sprint-demo-2',
				title: 'Revisar rótulos de confiança',
				description: '',
				assignee: 'felipe-sbm',
				points: 2,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-11T10:00:00.000Z',
				updated_at: '2026-09-19T10:00:00.000Z',
			},
			{
				id: 'task-demo-11',
				sprint_id: 'sprint-demo-2',
				title: 'Escrever teste de regressão da busca',
				description: '',
				assignee: 'felipepotigol',
				points: 1,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-12T10:00:00.000Z',
				updated_at: '2026-09-20T10:00:00.000Z',
			},
		],
		burndown: demoBurndownInsights,
	},
	'sprint-demo-3': {
		...demoSprints[2],
		tasks: [
			{
				id: 'task-demo-12',
				sprint_id: 'sprint-demo-3',
				title: 'Modo offline para rascunhos',
				description: '',
				assignee: 'oscarkemuel',
				points: 8,
				status: 'todo',
				origin: 'meeting',
				record_id: 'record-demo-4',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-29T11:30:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-13',
				sprint_id: 'sprint-demo-3',
				title: 'Notificações de resumo semanal',
				description: '',
				assignee: 'thyevidal',
				points: 5,
				status: 'todo',
				origin: 'meeting',
				record_id: 'record-demo-4',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-29T11:30:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-14',
				sprint_id: 'sprint-demo-3',
				title: 'Ajustar tema escuro',
				description: '',
				assignee: 'felipepotigol',
				points: 2,
				status: 'todo',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-30T09:50:00.000Z',
				updated_at: now,
			},
			{
				id: 'task-demo-15',
				sprint_id: 'sprint-demo-3',
				title: 'Preparar build de beta',
				description: '',
				assignee: 'thyevidal',
				points: 3,
				status: 'todo',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-30T09:55:00.000Z',
				updated_at: now,
			},
		],
		burndown: demoBurndownMobile,
	},
	'sprint-demo-4': {
		...demoSprints[3],
		tasks: [
			{
				id: 'task-demo-16',
				sprint_id: 'sprint-demo-4',
				title: 'Alertas de falha no processamento',
				description: '',
				assignee: 'EricInacio01',
				points: 5,
				status: 'done',
				origin: 'meeting',
				record_id: 'record-demo-5',
				created_by_github_login: 'demo-user',
				created_at: '2026-08-24T10:00:00.000Z',
				updated_at: '2026-09-04T10:00:00.000Z',
			},
			{
				id: 'task-demo-17',
				sprint_id: 'sprint-demo-4',
				title: 'Mover áudios antigos para storage frio',
				description: '',
				assignee: 'GaroteDePrograma',
				points: 3,
				status: 'done',
				origin: 'meeting',
				created_by_github_login: 'demo-user',
				created_at: '2026-08-25T10:00:00.000Z',
				updated_at: '2026-09-02T10:00:00.000Z',
			},
			{
				id: 'task-demo-18',
				sprint_id: 'sprint-demo-4',
				title: 'Painel de latência do pipeline',
				description: '',
				assignee: 'Jmspter',
				points: 5,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-08-26T10:00:00.000Z',
				updated_at: '2026-09-05T10:00:00.000Z',
			},
			{
				id: 'task-demo-19',
				sprint_id: 'sprint-demo-4',
				title: 'Reprocessar áudios da fila travada',
				description: '',
				assignee: 'euandrelucas',
				points: 3,
				status: 'done',
				origin: 'manual',
				created_by_github_login: 'demo-user',
				created_at: '2026-08-28T10:00:00.000Z',
				updated_at: '2026-09-05T10:00:00.000Z',
			},
			{
				id: 'task-demo-20',
				sprint_id: 'sprint-demo-4',
				title: 'Documentar runbook de incidentes',
				description: '',
				assignee: 'thi-silva',
				points: 2,
				status: 'todo',
				origin: 'meeting',
				record_id: 'record-demo-8',
				created_by_github_login: 'demo-user',
				created_at: '2026-09-06T10:00:00.000Z',
				updated_at: now,
			},
		],
		burndown: demoBurndownReliability,
	},
};

const demoSprintDetail: SprintDetail = demoSprintDetails['sprint-demo-1'];

/* -------------------------------------------------------------------------- */
/*                        Desempenho (modo demo)                               */
/* -------------------------------------------------------------------------- */

const demoPerformance: ProjectPerformance = {
	generated_at: '2026-09-30T12:00:00.000Z',
	period: { start: '2026-09-01', end: '2026-09-30', granularity: 'weekly' },
	partial_history: { detected: false, message: '' },
	summary: {
		total_issues: 12,
		open_issues: 4,
		closed_issues: 6,
		drafts: 2,
		pending_drafts: 1,
		confirmed_drafts: 1,
		draft_conversion_rate: 0.5,
		total_points: 52,
		delivered_points: 30,
		remaining_points: 22,
		throughput_weekly_avg: 2.0,
		throughput_by_week: { '2026-09-07': 2, '2026-09-14': 2, '2026-09-21': 1, '2026-09-28': 1 },
		lead_time_avg_days: 4.2,
		unassigned: 1,
		late_issues: 2,
	},
	timeline: [
		{ label: '2026-09-07', created: 3, closed: 1, open: 2, points_done: 4, points_done_cumulative: 4, points_total_cumulative: 14 },
		{ label: '2026-09-14', created: 4, closed: 2, open: 4, points_done: 10, points_done_cumulative: 14, points_total_cumulative: 28 },
		{ label: '2026-09-21', created: 3, closed: 2, open: 5, points_done: 8, points_done_cumulative: 22, points_total_cumulative: 42 },
		{ label: '2026-09-28', created: 2, closed: 1, open: 6, points_done: 8, points_done_cumulative: 30, points_total_cumulative: 52 },
	],
	burndown: demoBurndown,
	burnup: [
		{ label: '2026-09-21', done: 0, total: 26 },
		{ label: '2026-09-22', done: 2, total: 26 },
		{ label: '2026-09-24', done: 5, total: 26 },
		{ label: '2026-09-27', done: 11, total: 26 },
		{ label: '2026-09-30', done: 18, total: 26 },
	],
	by_status: [
		{ status: 'open', count: 4 },
		{ status: 'closed', count: 6 },
		{ status: 'draft', count: 2 },
	],
	by_priority: [
		{ priority: 'high', count: 2 },
		{ priority: 'medium', count: 3 },
		{ priority: 'low', count: 1 },
	],
	by_member: [
		{ github_login: 'MatsuCode', name: 'Bruno Ramon', assigned_issues: 4, open_count: 2, remaining_points: 10, closed_count: 2, closed_points: 12, points_done: 12, pending_drafts: 0, last_activity: '2026-09-28' },
		{ github_login: 'quiradon', name: 'Arthur Gabriel', assigned_issues: 3, open_count: 1, remaining_points: 6, closed_count: 2, closed_points: 10, points_done: 10, pending_drafts: 1, last_activity: '2026-09-26' },
		{ github_login: 'jagaldino', name: 'João Arthur', assigned_issues: 3, open_count: 2, remaining_points: 14, closed_count: 1, closed_points: 4, points_done: 4, pending_drafts: 0, last_activity: '2026-09-24' },
		{ github_login: 'fernandocg1', name: 'Fernando Gadelha', assigned_issues: 1, open_count: 0, remaining_points: 0, closed_count: 1, closed_points: 4, points_done: 4, pending_drafts: 0, last_activity: '2026-09-20' },
	],
	activity_ranking: [
		{ github_login: 'MatsuCode', name: 'Bruno Ramon', closed_issues: 2, points_done: 12, last_activity: '2026-09-28' },
		{ github_login: 'quiradon', name: 'Arthur Gabriel', closed_issues: 2, points_done: 10, last_activity: '2026-09-26' },
		{ github_login: 'jagaldino', name: 'João Arthur', closed_issues: 1, points_done: 4, last_activity: '2026-09-24' },
		{ github_login: 'fernandocg1', name: 'Fernando Gadelha', closed_issues: 1, points_done: 4, last_activity: '2026-09-20' },
	],
	risks: [
		{ type: 'overloaded', severity: 'high', member: 'jagaldino', member_name: 'João Arthur', message: 'João Arthur acumula 14 pontos abertos (2 issues).' },
		{ type: 'stale', severity: 'medium', issue_ids: ['issue-demo-1', 'issue-demo-2'], message: '2 issues abertas levam mais de 21 dias sem fechar.' },
		{ type: 'unassigned', severity: 'medium', issue_ids: ['issue-demo-3'], message: '1 issue aberta não tem responsável atribuído.' },
		{ type: 'stalled_draft', severity: 'medium', issue_ids: ['issue-demo-4'], message: '1 rascunho leva mais de 3 dias sem confirmação.' },
	],
};

const demoTeamDetails: Record<string, TeamDetail> = {
	'team-product': {
		id: 'team-product',
		name: 'Produto & Design',
		created_at: '2026-08-05T10:00:00.000Z',
		member_count: 3,
		members: [
			{ github_login: 'MatsuCode', added_at: '2026-09-01T10:00:00.000Z', name: 'Bruno Ramon', avatar_url: 'https://github.com/MatsuCode.png', stats: demoPerformance.by_member[0] },
			{ github_login: 'quiradon', added_at: '2026-09-01T10:00:00.000Z', name: 'Arthur Gabriel Araújo', avatar_url: 'https://github.com/quiradon.png', stats: demoPerformance.by_member[1] },
			{ github_login: 'Gabriel-GH1', added_at: '2026-09-01T10:00:00.000Z', name: 'Gabriel', avatar_url: 'https://github.com/Gabriel-GH1.png', stats: undefined },
		],
		member_stats: demoPerformance.by_member.slice(0, 2),
		projects: [
			{ id: 'project-launch', name: 'Lançamento do painel', description: 'Uma experiência mais clara para acompanhar o trabalho do time.', created_at: '2026-09-01T10:00:00.000Z', updated_at: '2026-09-28T10:00:00.000Z', repositories: 5 },
		],
		repositories: ['anota-ai/web', 'anota-ai/api', 'anota-ai/extension', 'anota-ai/design-system', 'anota-ai/docs'],
		issues: demoIssues.filter((issue) => issue.project_id === 'project-launch'),
	},
	'team-platform': {
		id: 'team-platform',
		name: 'Desenvolvimento WEB',
		created_at: '2026-07-18T10:00:00.000Z',
		member_count: 6,
		members: (demoTeamMembers['team-platform'] ?? []).map((member, index) => ({
			...member,
			name: ['Fernando Castro Gadelha', 'Eric Inácio', 'João Arthur', 'James Peter', 'André Paiva', 'Tempest'][index] ?? member.github_login,
			avatar_url: `https://github.com/${member.github_login}.png`,
			stats: index === 2 ? demoPerformance.by_member[2] : index === 3 ? demoPerformance.by_member[3] : undefined,
		})),
		member_stats: [demoPerformance.by_member[2], demoPerformance.by_member[3]],
		projects: [
			{ id: 'project-launch', name: 'Lançamento do painel', description: 'Uma experiência mais clara para acompanhar o trabalho do time.', created_at: '2026-09-01T10:00:00.000Z', updated_at: '2026-09-28T10:00:00.000Z', repositories: 5 },
			{ id: 'project-reliability', name: 'Confiabilidade & Infra', description: 'Processamento de áudio previsível, observável e barato.', created_at: '2026-09-02T10:00:00.000Z', updated_at: '2026-09-26T10:00:00.000Z', repositories: 3 },
		],
		repositories: ['anota-ai/infra', 'anota-ai/api', 'anota-ai/docs'],
		issues: demoIssues.filter((issue) => ['project-launch', 'project-reliability'].includes(issue.project_id ?? '')),
	},
};

/* -------------------------------------------------------------------------- */
/*                                   Fetch                                    */
/* -------------------------------------------------------------------------- */

export function demoFetch(path: string): unknown {
	if (path === '/api/auth/github/me') {
		return {
			github_login: 'jagaldino',
			avatar_url: 'https://github.com//jagaldino.png',
			name: 'João Arthur (conta demo)',
		};
	}

	if (path.startsWith('/api/audio/records/count')) return { count: demoRecords.length };

	const recordMatch = path.match(/^\/api\/audio\/records\/([^/]+)$/);
	if (recordMatch) {
		return { record: demoRecords.find((record) => record.id === recordMatch[1]) ?? demoRecords[0] };
	}
	if (path.startsWith('/api/audio/records')) {
		const url = new URL(path, 'https://demo.local');
		const projectId = url.searchParams.get('project_id');
		const status = url.searchParams.get('status');
		let records = demoRecords;
		if (projectId) records = records.filter((record) => record.project_id === projectId);
		if (status) records = records.filter((record) => record.status === status);
		return { records };
	}

	const teamMembersMatch = path.match(/^\/api\/teams\/([^/]+)\/members/);
	if (teamMembersMatch) return { members: demoTeamMembers[teamMembersMatch[1]] ?? [] };

	const teamMatch = path.match(/^\/api\/teams\/([^/]+)$/);
	if (teamMatch) {
		const known = demoTeamDetails[teamMatch[1]];
		if (known) return { team: known };
		const base = demoTeams.find((team) => team.id === teamMatch[1]) ?? demoTeams[0];
		return {
			team: {
				...base,
				members: demoTeamMembers[base.id] ?? [],
				member_stats: [],
				projects: [],
				repositories: [],
				issues: [],
			},
		};
	}
	if (path === '/api/teams') return { teams: demoTeams };

	if (path === '/api/audio/statuses') {
		return {
			statuses: ['uploaded', 'processing', 'pending_review', 'reviewed', 'error'],
			labels: { uploaded: 'Enviada', processing: 'Processando', pending_review: 'Lista para revisar', reviewed: 'Revisada', error: 'Erro' },
		};
	}

	if (path.startsWith('/api/github/users/search')) {
		const query = new URL(path, 'https://demo.local').searchParams.get('q') ?? '';
		const pool = [
			{ github_login: 'MatsuCode', name: 'Bruno Ramon', avatar_url: 'https://github.com/MatsuCode.png' },
			{ github_login: 'quiradon', name: 'Arthur Gabriel Araújo', avatar_url: 'https://github.com/quiradon.png' },
			{ github_login: 'jagaldino', name: 'João Arthur', avatar_url: 'https://github.com/jagaldino.png' },
			{ github_login: 'felipe-sbm', name: 'Felipe Samuel', avatar_url: 'https://github.com/felipe-sbm.png' },
			{ github_login: 'thyevidal', name: 'Thierry Henry Vidal Mandogou', avatar_url: 'https://github.com/thyevidal.png' },
		];
		const term = query.toLowerCase();
		return {
			users: pool
				.filter((user) => user.github_login.toLowerCase().includes(term) || (user.name ?? '').toLowerCase().includes(term))
				.slice(0, 6),
		};
	}

	if (path.startsWith('/api/github/repos/') && path.endsWith('/meta')) {
		return {
			assignees: [],
			labels: [
				{ name: 'demo', color: '4169e1' },
				{ name: 'bug', color: 'd73a4a' },
				{ name: 'enhancement', color: 'a2eeef' },
			],
			milestones: [],
			projects: [],
		};
	}
	if (path === '/api/github/repos') {
		return {
			repos: demoRepositories.map((repo) => ({
				...repo,
				id: Number.parseInt(repo.id.replace(/\D/g, '').slice(0, 8) || '1', 10),
			})),
		};
	}
	if (path === '/api/repositories') return { repositories: demoRepositories };

	if (path.startsWith('/api/issues')) {
		const url = new URL(path, 'https://demo.local');
		const projectId = url.searchParams.get('project_id');
		const state = url.searchParams.get('state');
		const source = url.searchParams.get('source');
		const assignee = url.searchParams.get('assignee');

		let issues = demoIssues;
		if (projectId) issues = issues.filter((issue) => issue.project_id === projectId);
		if (state) issues = issues.filter((issue) => issue.state === state);
		if (source) issues = issues.filter((issue) => issue.source === source);
		if (assignee) issues = issues.filter((issue) => issue.assignee === assignee);

		return { issues, total: issues.length };
	}

	const performanceMatch = path.match(/^\/api\/projects\/([^/]+)\/performance/);
	if (performanceMatch) return { performance: demoPerformance };

	const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
	if (projectMatch) {
		return { project: demoProjects.find((project) => project.id === projectMatch[1]) ?? demoProjects[0] };
	}
	if (path === '/api/projects') return { projects: demoProjects };

	const sprintMatch = path.match(/^\/api\/sprints\/([^/]+)$/);
	if (sprintMatch) {
		return { sprint: demoSprintDetails[sprintMatch[1]] ?? demoSprintDetail };
	}
	if (path === '/api/sprints') return { sprints: demoSprints };

	return {};
}

/* -------------------------------------------------------------------------- */
/*                                  Mutate                                    */
/* -------------------------------------------------------------------------- */

export function demoMutate(path: string, method: string, body?: unknown): unknown {
	if (path.includes('/confirm')) {
		return { results: (body as { issue_ids?: string[] })?.issue_ids?.map((id) => ({ id, ok: true })) ?? [] };
	}
	if (path.match(/^\/api\/projects\/[^/]+\/records\/[^/]+$/)) return { record: demoRecords[0] };
	if (path === '/api/issues/batch') return { created_issues: [], errors: [] };
	if (path === '/api/issues' && method === 'POST') return { issue: demoIssues[0] };
	if (path === '/api/teams' && method === 'POST') return { team_id: 'team-demo-new' };
	if (path.match(/^\/api\/teams\/[^/]+\/members$/) && method === 'POST') return { members: demoTeamMembers['team-product'] };
	if (path.match(/^\/api\/teams\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') return { ok: true };
	if (path === '/api/repositories' && method === 'POST') return { added: [], errors: [] };
	if (path.includes('/restore')) return { ok: true, archived: false };
	if (path.includes('/projects') && method === 'PATCH') return { project: demoProjects[0] };
	if (path.includes('/projects') && method === 'POST') return { project: demoProjects[0] };
	if (path.includes('/projects') && method === 'DELETE') return { ok: true, archived: true };
	if (path.includes('/sprints') && path.includes('/tasks')) return { task: demoSprintDetail.tasks[0] };
	if (path.includes('/sprints')) return { sprint: demoSprints[0] };
	if (path.includes('/issues') && method === 'PATCH') return { issue: demoIssues[0] };
	return { ok: true };
}
