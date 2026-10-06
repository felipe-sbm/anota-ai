'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, UsersRound } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { routeHref } from '@/lib/demo';
import { fetchTeams, type TeamResponse, fetchTeamMembers, type TeamMember, createTeam } from '@/lib/api';

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(date);
}

export default function TeamsPage() {
	const router = useRouter();
	const { token, loading, isDemo } = useAuth();
	const [teams, setTeams] = useState<TeamResponse[]>([]);
	const [membersByTeam, setMembersByTeam] = useState<Record<string, TeamMember[]>>({});
	const [loadingTeams, setLoadingTeams] = useState(true);
	const [newTeamName, setNewTeamName] = useState('');
	const [actionError, setActionError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function reloadTeams(authToken: string) {
		const data = await fetchTeams(authToken);
		setTeams(data);
		const result: Record<string, TeamMember[]> = {};
		await Promise.all(
			data.map(async (team) => {
				result[team.id] = await fetchTeamMembers(authToken, team.id);
			}),
		);
		setMembersByTeam(result);
	}

	useEffect(() => {
		if (!loading && !token && !isDemo) {
			router.replace('/login');
			return;
		}

		if (token === null) return;

		const authToken: string = token;

		async function loadTeams() {
			try {
				await reloadTeams(authToken);
			} catch (error) {
				console.error(error);
			} finally {
				setLoadingTeams(false);
			}
		}

		loadTeams();
	}, [isDemo, loading, router, token]);

	async function handleCreateTeam() {
		if (!token || !newTeamName.trim()) return;
		setSaving(true);
		setActionError(null);
		try {
			await createTeam(token, newTeamName.trim());
			setNewTeamName('');
			await reloadTeams(token);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Não foi possível criar a equipe.');
		} finally {
			setSaving(false);
		}
	}

	if (loading || !token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-white">
				<p className="text-sm text-stone-400">Carregando…</p>
			</div>
		);
	}

	return (
		<>
			<div className="mb-8 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-medium tracking-tight text-stone-900">Equipes</h1>
					<p className="mt-1 text-sm text-stone-500">Grupos e membros cadastrados para o seu workspace.</p>
				</div>

				<button
					type="button"
					onClick={() => setNewTeamName((value) => value || 'Nova equipe')}
					className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover"
				>
					<Plus className="h-4 w-4" />
					Nova equipe
				</button>
			</div>

			{newTeamName ? (
				<form
					className="mb-5 flex flex-col gap-2 rounded-2xl border border-brand/20 bg-brand-light/30 p-4 sm:flex-row"
					onSubmit={(event) => {
						event.preventDefault();
						handleCreateTeam();
					}}
				>
					<input
						autoFocus
						value={newTeamName}
						onChange={(event) => setNewTeamName(event.target.value)}
						placeholder="Nome da equipe"
						className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
					/>
					<button type="submit" disabled={saving} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
						Criar
					</button>
					<button type="button" onClick={() => setNewTeamName('')} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600">
						Cancelar
					</button>
				</form>
			) : null}

			{actionError ? <p className="mb-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}

			{loadingTeams ? (
				<div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Carregando equipes…</div>
			) : teams.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">Nenhuma equipe cadastrada ainda.</div>
			) : (
				<div className="grid gap-5 lg:grid-cols-2">
					{teams.map((team) => (
						<Link key={team.id} href={routeHref(`/dashboard/equipes/${team.id}`)} className="group rounded-3xl border border-stone-200 bg-gradient-to-t from-stone-100 to-white p-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									{/** eu queria fazer essa página de equipes de uma forma mais completa,
									 * tipo, poder encaixar uma organização à equipe, ter uma página para ver
									 * todas as issues que possui na equipe, todos os repositórios em que
									 * a equipe atua, ver os membros de forma detalhada, para ver o
									 * desempenho de cada um (assim implementando o diagrama de burndown). */}

									<h2 className="mt-1 text-xl font-medium text-stone-900">{team.name}</h2>
								</div>
								<div className="flex shrink-0 flex-col items-end gap-1.5">
									<div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
										<UsersRound className="h-3.5 w-3.5" />
										{team.member_count}
									</div>
								</div>
							</div>

							<p className="mt-1 text-xs text-stone-500">Criada em: {formatDate(team.created_at)}.</p>

							<div className="flex items-end mt-5">
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2 text-xs text-stone-700">Membros:</div>

									{membersByTeam[team.id]?.length ? (
										<div className="group/avatars flex items-center">
											{membersByTeam[team.id].map((member, index) => (
												<div
													key={`${team.id}-${member.github_login}`}
													className={`relative transition-[margin] duration-400 group-hover:border-transpartent ${index === 0 ? 'ml-0' : '-ml-1.5 group-hover:ml-0.5'}`}
													style={{ zIndex: membersByTeam[team.id].length - index }} >
													<div title={`@${member.github_login}`} className="relative h-7 w-7 overflow-hidden rounded-full border border-stone-200">
														<Image
															src={`https://github.com/${encodeURIComponent(member.github_login)}.png?size=80`}
															alt={`Avatar de @${member.github_login}`}
															width={40}
															height={40}
															unoptimized
															className="h-full w-full object-cover"
														/>
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-stone-500">Nenhum membro adicionado a esta equipe.</p>
									)}
								</div>

								<span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand underline decoration-dotted decoration-transparent group-hover:decoration-brand transition duration-200">
									Abrir equipe
								</span>
							</div>
						</Link>
					))}
				</div>
			)}
		</>
	);
}
