'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FolderGit2, Plus, UsersRound, CircleDot, AudioLines, Rocket, Archive } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { deleteProject, fetchProjects, type Project } from '@/lib/api';
import { routeHref } from '@/lib/demo';
import { ProjectModal } from '@/components/dashboard/modals/project';

export default function ProjectsPage() {
	const router = useRouter();
	const { token, loading } = useAuth();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loadingProjects, setLoadingProjects] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<Project | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !token) {
			router.push('/login');
			return;
		}
		if (!token) return;
		const authToken = token;
		async function loadProjects() {
			try {
				setProjects(await fetchProjects(authToken));
			} catch {
				setError('Não foi possível carregar seus projetos.');
			} finally {
				setLoadingProjects(false);
			}
		}
		loadProjects();
	}, [loading, router, token]);

	async function handleDelete(project: Project) {
		if (!token || !window.confirm(`Tem certeza que deseja arquivar o projeto "${project.name}"? Os vínculos serão arquivados. Só é possível recuperar em um prazo de 30 dias corridos.`)) return;
		try {
			await deleteProject(token, project.id);
			setProjects((current) => current.filter((item) => item.id !== project.id));
		} catch (deleteError) {
			setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o projeto.');
		}
	}

	if (loading || !token) return <div className="flex min-h-screen items-center justify-center text-sm text-stone-400">Carregando…</div>;

	return (
		<>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-medium tracking-tight text-stone-900">Projetos</h1>
					<p className="mt-1 text-sm text-stone-500">Escolha um projeto para acompanhar o trabalho dos repositórios, das equipes e das gravações.</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setEditing(null);
						setModalOpen(true);
					}}
					className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-hover cursor-pointer transition"
				>
					<Plus className="h-4 w-4" />
					Novo projeto
				</button>
			</div>
			{error ? <p className="mb-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
			{modalOpen ? (
				<ProjectModal
					token={token}
					project={editing}
					onClose={() => setModalOpen(false)}
					onSave={(saved) => setProjects((current) => (current.some((item) => item.id === saved.id) ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]))}
				/>
			) : null}
			{loadingProjects ? (
				<div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Carregando projetos…</div>
			) : projects.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
					<Rocket className="mx-auto h-10 w-10 text-stone-300" />
					<p className="mt-3 font-medium text-stone-800">Nenhum projeto criado ainda... :/</p>
					<p className="mt-1 text-sm text-stone-500">Crie um projeto e escolha os repositórios e equipes que trabalham nele.</p>
				</div>
			) : (
				<div className="grid gap-5 lg:grid-cols-2">
					{projects.map((project) => (
						<Link
							key={project.id}
							className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-100 p-6 hover:border-stone-300 hover:to-60% transition duration-500 cursor-pointer group"
							href={routeHref(`/dashboard/projetos/${project.id}`)}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
										<Rocket className="h-4 w-4" />
									</div>
									<h1 className="min-w-0 truncate text-lg font-medium text-stone-800 cursor-context-menu">{project.name}</h1>
								</div>
								<button
									type="button"
									onClick={() => handleDelete(project)}
									aria-label={`Arquivar o ${project.name}`}
									title={`Arquivar o projeto "${project.name}" do Anota Aí?`}
									className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-500 cursor-pointer"
								>
									<Archive className="h-4 w-4" />
								</button>
							</div>
							<p className="mt-3 min-h-10 text-sm text-stone-600">{project.description || 'Projeto sem descrição.'}</p>
							<div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-600">
								<span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-200">
									<FolderGit2 className="h-3.5 w-3.5" />
									{project.repositories.length} repositórios
								</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-200">
									<UsersRound className="h-3.5 w-3.5" />
									{project.team_ids.length} equipes
								</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-200">
									<CircleDot className="h-3.5 w-3.5" />
									{project.issue_count ?? 0} issues
								</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-200">
									<AudioLines className="h-3.5 w-3.5" />
									{project.record_count ?? 0} gravações
								</span>
							</div>
						</Link>
					))}
				</div>
			)}
		</>
	);
}
