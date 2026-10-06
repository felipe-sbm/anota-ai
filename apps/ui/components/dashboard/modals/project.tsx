'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import {
	createProject,
	fetchRepositories,
	fetchTeams,
	updateProject,
	type Project,
	type Repository,
	type TeamResponse,
} from '@/lib/api';

type ProjectModalProps = {
	token: string;
	/** Projeto em edição; null para criar um novo. */
	project: Project | null;
	onClose: () => void;
	/** Chamado após criar/atualizar, para atualizar a lista. */
	onSave: (saved: Project) => void;
};

export function ProjectModal({ token, project, onClose, onSave }: ProjectModalProps) {
	const editing = project !== null;

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

	function toggle(value: string, values: string[], setValues: (next: string[]) => void) {
		setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token) return;
		if (!name.trim()) {
			setError('Informe um nome para o projeto.');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: name.trim(),
				description: description.trim(),
				repositories: selectedRepos,
				team_ids: selectedTeams,
			};
			const saved = editing && project ? await updateProject(token, project.id, payload) : await createProject(token, payload);
			onSave(saved);
			onClose();
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o projeto.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
			<div className="absolute inset-0 bg-stone-700/50 transition-opacity" onClick={onClose} aria-hidden="true" />

			<form
				onSubmit={handleSubmit}
				className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200"
			>
				<div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
					<div>
						<h2 className="text-lg font-medium text-stone-900">{editing ? 'Editar projeto' : 'Novo projeto'}</h2>
						<p className="mt-0.5 text-sm text-stone-500">Configure os dados e os vínculos do projeto.</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fechar"
						className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 cursor-pointer"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{error ? <p className="mx-5 mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

				<div className="flex-1 space-y-6 overflow-y-auto p-5">
					<div className="space-y-5">
						<label className="block">
							<span className="mb-1 block text-xs font-semibold text-stone-600">Nome</span>
							<input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex.: Desenvolvimento WEB do Cliente" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand" />
						</label>
						<label className="block">
							<span className="mb-1 block text-xs font-semibold text-stone-600">Descrição</span>
							<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="O que este projeto acompanha?" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-brand" />
						</label>
					</div>

					<section>
						<h3 className="font-medium text-stone-900">Repositórios</h3>
						<p className="mt-1 text-sm text-stone-500">Código conectado ao projeto.</p>
						<div className="mt-4 space-y-2">
							{loadingLinks ? (
								<p className="text-sm text-stone-500">Carregando…</p>
							) : repositories.length ? (
								repositories.map((repo) => (
									<label key={repo.full_name} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
										<input type="checkbox" checked={selectedRepos.includes(repo.full_name)} onChange={() => toggle(repo.full_name, selectedRepos, setSelectedRepos)} />
										{repo.full_name}
									</label>
								))
							) : (
								<p className="text-sm text-stone-500">Nenhum repositório disponível.</p>
							)}
						</div>
					</section>

					<section>
						<h3 className="font-medium text-stone-900">Equipes</h3>
						<p className="mt-1 text-sm text-stone-500">Pessoas que acompanham este projeto.</p>
						<div className="mt-4 space-y-2">
							{teams.length ? (
								teams.map((team) => (
									<label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
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

				<div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4">
					<button
						type="submit"
						disabled={saving || !name.trim()}
						className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar projeto'}
					</button>
				</div>
			</form>
		</div>
	);
}