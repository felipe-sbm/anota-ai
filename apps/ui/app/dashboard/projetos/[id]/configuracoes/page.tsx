'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { useProject } from '@/components/dashboard/project/context';
import { fetchRepositories, fetchTeams, updateProject, type Repository, type TeamResponse } from '@/lib/api';

export default function ConfiguracoesTabPage() {
	const { token } = useAuth();
	const { project, setProject } = useProject();

	const [name, setName] = useState(project?.name ?? '');
	const [description, setDescription] = useState(project?.description ?? '');
	const [selectedRepos, setSelectedRepos] = useState<string[]>(project?.repositories ?? []);
	const [selectedTeams, setSelectedTeams] = useState<string[]>(project?.team_ids ?? []);
	const [repositories, setRepositories] = useState<Repository[]>([]);
	const [teams, setTeams] = useState<TeamResponse[]>([]);
	const [loadingLinks, setLoadingLinks] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		Promise.all([fetchRepositories(token), fetchTeams(token)])
			.then(([repoData, teamData]) => {
				setRepositories(repoData);
				setTeams(teamData);
			})
			.catch(() => setError('Não foi possível carregar repositórios e equipes.'))
			.finally(() => setLoadingLinks(false));
	}, [token]);

	if (!token || !project) return null;

	function toggle(value: string, values: string[], setValues: (next: string[]) => void) {
		setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token || !project) return;
		if (!name.trim()) {
			setError('Informe um nome para o projeto.');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const saved = await updateProject(token, project.id, {
				name: name.trim(),
				description: description.trim(),
				repositories: selectedRepos,
				team_ids: selectedTeams,
			});
			setProject(saved);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o projeto.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
			<section className="rounded-2xl border border-stone-200 bg-gradient-to-r from-stone-50 to-stone-200/50 to-80% p-5">
				<div>
					<h2 className="font-medium text-stone-900">Dados do projeto</h2>
					<p className="mt-1 text-sm text-stone-500">Atualize as informações principais deste projeto.</p>
				</div>
				{error ? <p className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
				<div className="mt-6 space-y-5">
					<label className="block">
						<span className="mb-1 block text-xs font-semibold text-stone-600">Nome</span>
						<input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand" />
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-semibold text-stone-600">Descrição</span>
						<textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={4}
							className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand"
						/>
					</label>
				</div>
			</section>

			<div className="space-y-6">
				<button type="submit" disabled={saving} className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50 cursor-pointer">
					{saving ? 'Salvando…' : 'Salvar alterações'}
				</button>

				<section className="rounded-2xl border border-stone-200 bg-gradient-to-bl from-stone-50 to-stone-200/50 p-5">
					<h2 className="font-medium text-stone-900">Repositórios</h2>
					<p className="mt-1 text-sm text-stone-500">Código conectado ao projeto.</p>
					<div className="mt-4 space-y-2">
						{loadingLinks ? (
							<p className="text-sm text-stone-500">Carregando…</p>
						) : repositories.length ? (
							repositories.map((repo) => (
								<label key={repo.full_name} className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
									<input type="checkbox" checked={selectedRepos.includes(repo.full_name)} onChange={() => toggle(repo.full_name, selectedRepos, setSelectedRepos)} />
									{repo.full_name}
								</label>
							))
						) : (
							<p className="text-sm text-stone-500">Nenhum repositório disponível.</p>
						)}
					</div>
				</section>

				<section className="rounded-2xl border border-stone-200 bg-gradient-to-tl from-stone-50 to-stone-200/50 p-5">
					<h2 className="font-medium text-stone-900">Equipes</h2>
					<p className="mt-1 text-sm text-stone-500">Pessoas que acompanham este projeto.</p>
					<div className="mt-4 space-y-2">
						{teams.length ? (
							teams.map((team) => (
								<label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
									<input type="checkbox" checked={selectedTeams.includes(team.id)} onChange={() => toggle(team.id, selectedTeams, setSelectedTeams)} />
									{team.name}
									<span className="ml-auto text-xs text-stone-400">{team.member_count}</span>
								</label>
							))
						) : (
							<p className="text-sm text-stone-500">Nenhuma equipe cadastrada.</p>
						)}
					</div>
				</section>
			</div>
		</form>
	);
}
