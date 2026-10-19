'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, ExternalLink, FileText, FolderKanban, Gavel, GitBranch, Info, ListChecks, MessageSquareText, Search, UsersRound } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { attachRecordToProject, fetchAudioRecord, fetchProjects, type AudioRecord, type Project } from '@/lib/api';

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}

function extractIssuePeople(issue: Record<string, unknown> | null | undefined) {
	const candidates = [issue?.assignees, issue?.assignee, issue?.assigned_to, issue?.people, issue?.participants];

	const values: string[] = [];

	for (const candidate of candidates) {
		if (!candidate) continue;

		if (Array.isArray(candidate)) {
			for (const item of candidate) {
				if (typeof item === 'string') values.push(item);
				else if (item && typeof item === 'object') {
					const login = (item as Record<string, unknown>).github_login ?? (item as Record<string, unknown>).login ?? (item as Record<string, unknown>).name;
					if (typeof login === 'string') values.push(login);
				}
			}
		} else if (typeof candidate === 'string') {
			values.push(candidate);
		} else if (candidate && typeof candidate === 'object') {
			const login = (candidate as Record<string, unknown>).github_login ?? (candidate as Record<string, unknown>).login ?? (candidate as Record<string, unknown>).name;
			if (typeof login === 'string') values.push(login);
		}
	}

	return Array.from(new Set(values)).filter(Boolean);
}

type DecisionItem = {
	title: string;
	context: string;
	status: 'aligned' | 'needs_discussion';
};

type NextStepItem = {
	title: string;
	body: string;
	people: string[];
};

type DetailItem = {
	topic: string;
	notes: string;
};

function parseDecisions(value: AudioRecord['decisions']): DecisionItem[] {
	if (!Array.isArray(value)) return [];

	return value.reduce<DecisionItem[]>((items, raw) => {
		const entry = (raw ?? {}) as Record<string, unknown>;
		const title = typeof entry.title === 'string' ? entry.title.trim() : '';
		if (!title) return items;

		items.push({
			title,
			context: typeof entry.context === 'string' ? entry.context : '',
			status: entry.status === 'needs_discussion' ? 'needs_discussion' : 'aligned',
		});
		return items;
	}, []);
}

function parseSteps(value: AudioRecord['tasks']): NextStepItem[] {
	if (!Array.isArray(value)) return [];

	return value.reduce<NextStepItem[]>((items, raw) => {
		const entry = (raw ?? {}) as Record<string, unknown>;
		const title = typeof entry.title === 'string' ? entry.title.trim() : '';
		if (!title) return items;

		const body = typeof entry.body === 'string' ? entry.body : '';

		items.push({
			title,
			// a seção "Anexos/Referências" é exigida no corpo da issue, mas não
			// faz sentido na leitura das próximas etapas.
			body: body.replace(/\s*\n*an[eé]xos\/refer[eê]ncias:\s*$/i, '').trim(),
			people: extractIssuePeople(entry),
		});
		return items;
	}, []);
}

function parseDetails(value: AudioRecord['details']): DetailItem[] {
	if (!Array.isArray(value)) return [];

	return value.reduce<DetailItem[]>((items, raw) => {
		const entry = (raw ?? {}) as Record<string, unknown>;
		const topic = typeof entry.topic === 'string' ? entry.topic.trim() : '';
		const notes = typeof entry.notes === 'string' ? entry.notes : '';
		if (!topic && !notes) return items;

		items.push({ topic: topic || 'Tópico', notes });
		return items;
	}, []);
}

type IssueGroup = {
	key: string;
	title: string;
	number?: number;
	html_url?: string;
	repo_full_name?: string;
	people: string[];
};

type RecordDetailProps = {
	/** id da gravação; quando omitido, é lido do último segmento da URL. */
	recordId?: string;
};

type SectionCardProps = {
	icon: typeof FileText;
	title: string;
	children: React.ReactNode;
	tone?: 'br' | 'tr' | 'bl' | 'tl';
};

function SectionCard({ icon: Icon, title, children, tone = 'br' }: SectionCardProps) {
	const gradient = {
		br: 'bg-gradient-to-br from-white to-stone-100',
		tr: 'bg-gradient-to-tr from-white to-stone-100',
		bl: 'bg-gradient-to-bl from-white to-stone-100',
		tl: 'bg-gradient-to-tl from-white to-stone-100',
	}[tone];

	return (
		<section className={`rounded-3xl border border-stone-200 ${gradient} p-5`}>
			<div className="mb-3 flex gap-2 items-center">
				<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
					<Icon className="h-4 w-4" />
				</div>
				<p className="text-sm font-medium">{title}</p>
			</div>
			{children}
		</section>
	);
}

/**
 * Página de detalhe de uma gravação: exibe o título gerado pela IA, o resumo
 * executivo, as decisões (agrupadas por status), as próximas etapas, os
 * detalhes por tópico e a transcrição, além do vínculo com repositório/issue.
 *
 * @param recordIdProp - ID da gravação; quando omitido, é lido do último
 *   segmento da URL.
 * @returns O detalhe da gravação e os controles de vínculo ao projeto.
 */

export function RecordDetail({ recordId: recordIdProp }: RecordDetailProps) {
	const router = useRouter();
	const pathname = usePathname() ?? '';
	const segments = pathname.split('/').filter((segment) => segment.length > 0);
	const recordId = recordIdProp || segments[segments.length - 1] || '';
	const { token, loading } = useAuth();
	const [record, setRecord] = useState<AudioRecord | null>(null);
	const [projects, setProjects] = useState<Project[]>([]);
	const [savingProject, setSavingProject] = useState(false);
	const [projectError, setProjectError] = useState<string | null>(null);
	const [loadingRecord, setLoadingRecord] = useState(true);

	useEffect(() => {
		if (!loading && !token) {
			router.replace('/login');
			return;
		}

		if (token === null || recordId === '') return;

		const authToken = token;

		async function loadRecord() {
			try {
				const [found, projectData] = await Promise.all([fetchAudioRecord(authToken, recordId), fetchProjects(authToken)]);
				setRecord(found);
				setProjects(projectData);
			} catch (error) {
				console.error(error);
			} finally {
				setLoadingRecord(false);
			}
		}

		loadRecord();
	}, [loading, recordId, router, token]);

	async function handleProjectChange(projectId: string) {
		if (!token || !record) return;
		setSavingProject(true);
		setProjectError(null);
		try {
			const updated = await attachRecordToProject(token, projectId, record.id);
			setRecord(updated);
		} catch (error) {
			setProjectError(error instanceof Error ? error.message : 'Não foi possível anexar a gravação.');
		} finally {
			setSavingProject(false);
		}
	}

	const issueGroups = useMemo<IssueGroup[]>(() => {
		if (!record) return [];

		return Array.isArray(record.created_issues)
			? record.created_issues.map((issue, index) => ({
					key: `${record.id}-issue-${index}`,
					title: typeof issue?.title === 'string' && issue.title ? issue.title : `Issue ${index + 1}`,
					number: typeof issue?.number === 'number' ? issue.number : undefined,
					html_url: typeof issue?.html_url === 'string' ? issue.html_url : undefined,
					repo_full_name: typeof issue?.repo_full_name === 'string' ? issue.repo_full_name : (record.repo_full_name ?? undefined),
					people: extractIssuePeople(issue),
				}))
			: [];
	}, [record]);

	const decisions = useMemo(() => parseDecisions(record?.decisions), [record]);
	const nextSteps = useMemo(() => parseSteps(record?.tasks), [record]);
	const details = useMemo(() => parseDetails(record?.details), [record]);

	const pendingDecisions = decisions.filter((decision) => decision.status === 'needs_discussion');
	const alignedDecisions = decisions.filter((decision) => decision.status === 'aligned');

	if (loading || !token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-white">
				<p className="text-sm text-stone-400">Carregando…</p>
			</div>
		);
	}

	if (loadingRecord) {
		return <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Carregando detalhes da gravação…</div>;
	}

	if (!record) {
		return (
			<div className="space-y-5">
				<div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">Gravação não encontrada.</div>
			</div>
		);
	}

	const heading = record.title?.trim() || record.original_filename || record.filename;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="mt-2 text-2xl font-medium tracking-tight text-stone-900">{heading}</h1>
					{record.title?.trim() && (record.original_filename || record.filename) ? (
						<p className="mt-1 text-xs text-stone-500">{record.original_filename || record.filename}</p>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
					<span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5">
						<CalendarDays className="h-3.5 w-3.5" />
						{formatDate(record.created_at)}
					</span>
					{record.repo_full_name ? (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5">
							<GitBranch className="h-3.5 w-3.5" />
							{record.repo_full_name}
						</span>
					) : null}
					<label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-600">
						<FolderKanban className="h-3.5 w-3.5" />
						<select
							value={record.project_id ?? ''}
							onChange={(event) => handleProjectChange(event.target.value)}
							disabled={savingProject}
							className="max-w-40 bg-transparent outline-none"
							aria-label="Projeto da gravação"
						>
							<option value="">Sem projeto</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>
			{projectError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{projectError}</p> : null}

			<div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
				<div className="space-y-6">
					<SectionCard icon={FileText} title="Resumo" tone="br">
						<p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">{record.summary || 'Nenhum resumo foi gerado para esta gravação.'}</p>
					</SectionCard>

					{decisions.length > 0 ? (
						<SectionCard icon={Gavel} title="Decisões" tone="tr">
							<div className="space-y-5">
								{[
									{ key: 'needs_discussion', label: 'Precisa de mais conversa', items: pendingDecisions },
									{ key: 'aligned', label: 'Alinhada', items: alignedDecisions },
								]
									.filter((group) => group.items.length > 0)
									.map((group) => (
										<div key={group.key} className="space-y-2.5">
											<p className={`text-xs font-semibold uppercase tracking-wide ${group.key === 'needs_discussion' ? 'text-amber-600' : 'text-emerald-600'}`}>{group.label}</p>
											<ul className="space-y-2.5">
												{group.items.map((decision, index) => (
													<li key={`${group.key}-${index}`} className="rounded-2xl border border-stone-200 bg-white p-3.5">
														<div className="flex items-start gap-2">
															{group.key === 'needs_discussion' ? (
																<Info className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
															) : (
																<CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
															)}
															<div className="min-w-0">
																<p className="text-sm font-medium text-stone-900">{decision.title}</p>
																{decision.context ? <p className="mt-1 text-sm leading-6 text-stone-600">{decision.context}</p> : null}
															</div>
														</div>
													</li>
												))}
											</ul>
										</div>
									))}
							</div>
						</SectionCard>
					) : null}

					{nextSteps.length > 0 ? (
						<SectionCard icon={ListChecks} title="Próximas etapas" tone="br">
							<ul className="space-y-3">
								{nextSteps.map((step, index) => (
									<li key={`step-${index}`} className="rounded-2xl border border-stone-200 bg-white p-3.5">
										<div className="flex items-start gap-2">
											<span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border border-stone-300 bg-stone-50 text-[10px] text-stone-400">✓</span>
											<div className="min-w-0">
												<p className="text-sm font-medium text-stone-900">
													{step.people.length > 0 ? <span className="text-stone-500">[{step.people.map((person) => `@${person}`).join(', ')}] </span> : null}
													{step.title}
												</p>
												{step.body ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-600">{step.body}</p> : null}
											</div>
										</div>
									</li>
								))}
							</ul>
						</SectionCard>
					) : null}

					{details.length > 0 ? (
						<SectionCard icon={Info} title="Detalhes" tone="tl">
							<div className="space-y-4">
								{details.map((detail, index) => (
									<div key={`detail-${index}`} className="rounded-2xl border border-stone-200 bg-white p-3.5">
										<p className="text-sm font-semibold text-stone-900">{detail.topic}</p>
										{detail.notes ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-600">{detail.notes}</p> : null}
									</div>
								))}
							</div>
						</SectionCard>
					) : null}

					<SectionCard icon={MessageSquareText} title="Transcrição completa" tone="tr">
						<div className="max-h-[32rem] overflow-auto rounded-2xl border border-stone-200 bg-white p-4">
							<p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">{record.transcript || 'Nenhuma transcrição está disponível para esta gravação.'}</p>
						</div>
					</SectionCard>
				</div>

				<aside className="space-y-6">
					<section className="rounded-2xl border border-stone-200 bg-gradient-to-bl from-white to-stone-100 p-6">
						<div className="flex gap-2 items-center mb-2">
							<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-stone-500">
								<GitBranch className="h-4 w-4" />
							</div>
							<p className="text-sm font-medium">Issues criadas</p>
						</div>

						{issueGroups.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
								<Search className="mx-auto h-8 w-8 text-stone-300" />
								<p className="mt-3 text-sm text-stone-500">Nenhuma issue foi criada a partir desta gravação.</p>
							</div>
						) : (
							<div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
								<table className="min-w-full divide-y divide-stone-200 text-sm">
									<tbody className="divide-y divide-stone-100">
										{issueGroups.map((issue) => (
											<tr key={issue.key} className="transition duration-500 hover:bg-gradient-to-b from-stone-100/70 to-stone-200/70">
												<td className="px-4 py-3">
													<div className="flex min-w-0 items-center gap-2">
														<div className="min-w-0 flex-1">
															{issue.html_url ? (
																<a
																	href={issue.html_url}
																	target="_blank"
																	rel="noopener noreferrer"
																	title={`Abrir issue no GitHub: ${issue.title}`}
																	aria-label={`Abrir issue no GitHub: ${issue.title}`}
																	className="block max-w-full truncate text-sm font-medium text-stone-900 cursor-pointer"
																>
																	{issue.title}
																</a>
															) : (
																<p className="truncate text-sm font-medium text-stone-900">{issue.title}</p>
															)}
															<p className="mt-0.5 text-[11px] text-stone-500">
																{issue.number ? `#${issue.number}` : '—'}
																{issue.people.length > 0 ? ' · ' + issue.people.map((person) => `@${person}`).join(' · ') : null}
															</p>
														</div>
													</div>
												</td>

												<td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
													<a
														href={issue.repo_full_name ? `https://github.com/${issue.repo_full_name}` : ''}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 text-stone-500 hover:text-brand hover:underline decoration-dotted transition"
													>
														<GitBranch className="h-3.5 w-3.5" />
														{issue.repo_full_name || 'Sem repo'}
													</a>
												</td>

												<td className="px-4 py-3">
													<div className="flex items-end justify-end gap-1.5">
														{issue.html_url ? (
															<a
																href={issue.html_url}
																target="_blank"
																rel="noopener noreferrer"
																title="Ir para GitHub"
																aria-label="Ir para GitHub"
																className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 cursor-pointer"
															>
																<ExternalLink className="h-4 w-4" />
															</a>
														) : null}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>

					<section className="rounded-3xl border border-stone-200 bg-gradient-to-tl from-white to-stone-100 p-5">
						<div className="flex gap-2 items-center mb-2">
							<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-stone-500">
								<UsersRound className="h-4 w-4" />
							</div>
							<p className="text-sm font-medium">Pessoas na gravação</p>
						</div>

						<div className="flex flex-wrap gap-2">
							{Array.from(new Set([...issueGroups.flatMap((issue) => issue.people), ...nextSteps.flatMap((step) => step.people)])).map((person) => (
								<span key={person} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700 ring-1 ring-stone-200">
									{person}
								</span>
							))}
						</div>

						{issueGroups.flatMap((issue) => issue.people).length === 0 && nextSteps.flatMap((step) => step.people).length === 0 ? (
							<p className="mt-3 text-sm text-stone-500">Nenhuma pessoa foi associada a esta gravação.</p>
						) : null}
					</section>
				</aside>
			</div>
		</div>
	);
}
