// precisa ter opção de editar tudo, ainda não temos! :(

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, GitBranch } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { addTeamMembers, fetchTeamDetail, searchGithubUsers, type GithubUserSummary, type TeamDetail } from '@/lib/api';
import { routeHref } from '@/lib/demo';
import { IssuesTable } from '@/components/dashboard/table';

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function Empty({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

export default function TeamDetailPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const { token, loading } = useAuth();
	const [team, setTeam] = useState<TeamDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [memberInput, setMemberInput] = useState('');
	const [suggestions, setSuggestions] = useState<GithubUserSummary[]>([]);
	const [savingMember, setSavingMember] = useState(false);
	const searchTimer = useRef<number | null>(null);

	useEffect(() => {
		if (!loading && !token) {
			router.replace('/login');
			return;
		}
		if (token === null || !params?.id) return;
		let cancelled = false;
		fetchTeamDetail(token, params.id)
			.then((data) => {
				if (!cancelled) setTeam(data);
			})
			.catch(() => {
				if (!cancelled) setError('Não foi possível carregar esta equipe.');
			});
		return () => {
			cancelled = true;
		};
	}, [loading, params?.id, router, token]);

	async function searchMembers(query: string) {
		if (!token || query.trim().length < 2) {
			setSuggestions([]);
			return;
		}
		try {
			setSuggestions(await searchGithubUsers(token, query.trim()));
		} catch {
			setSuggestions([]);
		}
	}

	function handleMemberInput(value: string) {
		setMemberInput(value);
		if (searchTimer.current) window.clearTimeout(searchTimer.current);
		searchTimer.current = window.setTimeout(() => searchMembers(value), 350);
	}

	async function handleAddMember() {
		const login = memberInput.trim();
		if (!token || !team || !login) return;
		setSavingMember(true);
		setError(null);
		try {
			await addTeamMembers(token, team.id, [login]);
			setMemberInput('');
			setSuggestions([]);
			setTeam(await fetchTeamDetail(token, team.id));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o membro.');
		} finally {
			setSavingMember(false);
		}
	}

	if (loading) return <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Carregando equipe…</div>;

	if (error || !team) {
		return (
			<div className="space-y-4">
				<Link href={routeHref('/dashboard/equipes')} className="inline-flex items-center gap-2 text-sm text-stone-600">
					<ArrowLeft className="h-4 w-4" />
					Voltar para equipes
				</Link>
				<p className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error || 'Equipe não encontrada.'}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<Link href={routeHref('/dashboard/equipes')} className="mb-3 inline-flex items-center gap-2 text-sm text-stone-600">
					<ArrowLeft className="h-4 w-4" />
					Voltar para equipes
				</Link>
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-medium tracking-tight text-stone-900">{team.name}</h1>
				</div>
				<p className="mt-1 text-sm text-stone-500">Criada em {formatDate(team.created_at)}</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-50 to-stone-100 p-5">
					<div className="mb-4 flex items-center justify-between gap-3">
						<h2 className="flex font-medium text-stone-900">Membros</h2>
						<span className="text-xs text-stone-500">Gerencie os acessos da equipe</span>
					</div>
					<form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); handleAddMember(); }}>
						<input
							value={memberInput}
							onChange={(event) => handleMemberInput(event.target.value)}
							list="team-member-suggestions"
							placeholder="Buscar por login do GitHub"
							className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
						/>
						<datalist id="team-member-suggestions">
							{suggestions.map((user) => (
								<option key={user.github_login} value={user.github_login}>
									{user.name} — @{user.github_login}
								</option>
							))}
						</datalist>
						<button type="submit" disabled={savingMember} className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 disabled:opacity-50">
							Adicionar
						</button>
					</form>

					{suggestions.length > 0 ? <p className="mb-4 text-[11px] text-stone-400">Digite o login sugerido acima ou cole o login completo.</p> : null}
					{team.members.length ? (
						<ul className="space-y-3">
							{team.members.map((member) => {
								const stats = member.stats;

								return (
									<li key={member.github_login} className="rounded-xl border border-stone-200 bg-white p-3">
										<div className="flex items-center gap-3">
											{member.avatar_url ? (
												<Image src={member.avatar_url} alt={`Avatar de ${member.github_login}`} width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-full object-cover" />
											) : (
												<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-medium text-brand">{member.github_login.slice(0, 1).toUpperCase()}</span>
											)}

											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-stone-800">{member.name || member.github_login}</p>
												<p className="text-xs text-stone-500">@{member.github_login}</p>
											</div>
											{stats ? <span className="ml-auto shrink-0 text-xs font-medium text-brand">{stats.points_done} pts</span> : null}
										</div>

										{stats ? (
											<div className="flex flex-row justify-between items-center mt-3">
												<div className="mb-2 flex flex-col text-left text-[11px] text-stone-500">
													<span>
														{stats.open_count} abertas · {stats.closed_count} fechadas
													</span>
													<span>{Math.max(stats.assigned_issues ?? stats.open_count + stats.closed_count, 0)} issues</span>
												</div>
												
												<div className="flex flex-col items-end text-right text-[11px] text-stone-500">
													<div className="flex flex-wrap items-center gap-0.5">
													{Array.from({ length: Math.max(stats.assigned_issues ?? stats.open_count + stats.closed_count, 0) }).map((_, index) => {
														const isDone = index < stats.closed_count;
														return (
															<span
																key={`${member.github_login}-${index}`}
																className={`h-5 w-1 shrink-0 rounded-full transition-colors ${isDone ? 'bg-green-500/85' : 'bg-green-500/15'}`}
																title={isDone ? 'Tarefa concluída' : 'Tarefa em aberto'}
															/>
														);
													})}
													</div>

												{stats.last_activity ? <p className="mt-1 text-[11px] text-stone-400">Última atividade em {formatDate(stats.last_activity)}</p> : null}
												</div>
											</div>
										) : (
											<p className="mt-2 text-[11px] text-stone-400">Sem issues atribuídas ainda.</p>
										)}
									</li>
								);
							})}
						</ul>
					) : ( <Empty>Nenhum membro nesta equipe.</Empty> )}
				</section>

				<div className="space-y-6">
					<section className="rounded-2xl border border-stone-200 bg-gradient-to-l from-stone-50 to-stone-100 p-5">
						<h2 className="mb-4 flex items-center font-medium text-stone-900">Projetos em que a equipe atua</h2>
						{team.projects.length ? (
							<ul className="space-y-2">
								{team.projects.map((project) => (
									<li key={project.id}>
										<Link href={routeHref(`/dashboard/projetos/${project.id}`)} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-stone-200 hover:bg-white">
											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-stone-800">{project.name}</p>
												<p className="truncate text-xs text-stone-500">{project.description || 'Sem descrição'}</p>
											</div>
											<span className="shrink-0 text-xs text-stone-500">{project.repositories} repositórios</span>
										</Link>
									</li>
								))}
							</ul>
						) : ( <Empty>Esta equipe ainda não está em nenhum projeto.</Empty> )}
					</section>

					<section className="rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-50 to-stone-100 p-5">
						<h2 className="mb-4 flex items-center font-medium text-stone-900">Repositórios relacionados</h2>
						{team.repositories.length ? (
							<div className="flex flex-wrap gap-2">
								{team.repositories.map((repo) => (
									<span key={repo} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
										<GitBranch className="h-3.5 w-3.5 text-stone-400" />
										{repo}
									</span>
								))}
							</div>
						) : (
							<Empty>Nenhum repositório vinculado via projetos.</Empty>
						)}
					</section>
				</div>
			</div>

			<section className="">
				<h2 className="mb-4 font-medium text-stone-900">
					Issues da equipe
					<span className="ml-2 text-sm font-normal text-stone-500">{team.issues.length} registradas</span>
				</h2>
				{team.issues.length ? (
					<IssuesTable issues={team.issues.slice(0, 30)} onConfirm={() => undefined} onDelete={() => undefined} onUpdatePoints={() => undefined} onUpdatePriority={() => undefined} />
				) : (
					<Empty>Sem issues atribuídas aos membros desta equipe.</Empty>
				)}
			</section>
		</div>
	);
}
