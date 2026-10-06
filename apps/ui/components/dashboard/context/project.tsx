'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';
import {
	confirmIssues,
	deleteIssue,
	fetchProject,
	updateIssue,
	type Issue,
	type IssuePriority,
	type Project,
} from '@/lib/api';

type ProjectContextValue = {
	project: Project | null;
	loading: boolean;
	error: string | null;
	reloadProject: () => Promise<void>;
	setProject: (project: Project) => void;
	confirmIssue: (issue: Issue) => Promise<void>;
	removeIssue: (issue: Issue) => Promise<void>;
	updateIssuePoints: (issue: Issue, points: number) => Promise<void>;
	updateIssuePriority: (issue: Issue, priority: IssuePriority) => Promise<void>;
	updateIssueLocal: (issue: Issue, changes: Partial<Issue>) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const { token, loading } = useAuth();
	const [project, setProject] = useState<Project | null>(null);
	const [loadingProject, setLoadingProject] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !token) {
			router.replace('/login');
			return;
		}
		if (!token || !params?.id) return;
		let cancelled = false;
		fetchProject(token, params.id)
			.then((loaded) => {
				if (cancelled) return;
				setError(null);
				setProject(loaded);
			})
			.catch(() => {
				if (!cancelled) setError('Não foi possível carregar este projeto.');
			})
			.finally(() => {
				if (!cancelled) setLoadingProject(false);
			});
		return () => {
			cancelled = true;
		};
	}, [loading, params?.id, router, token]);

	async function reloadProject() {
		if (!token || !params?.id) return;
		const updated = await fetchProject(token, params.id);
		setProject(updated);
	}

	/** atualiza uma issue no estado local sem recarregar o projeto inteiro. */
	function updateIssueLocal(issue: Issue, changes: Partial<Issue>) {
		setProject((current) => {
			if (!current) return current;
			return {
				...current,
				issues: (current.issues ?? []).map((item) =>
					item.id === issue.id ? { ...item, ...changes } : item,
				),
			};
		});
	}

	async function confirmIssue(issue: Issue) {
		if (!token) return;
		if (!window.confirm(`Enviar "${issue.title}" ao GitHub?`)) return;
		const result = await confirmIssues(token, [issue.id]);
		const outcome = result.results?.[0];
		if (!outcome?.ok) throw new Error(outcome?.error ?? 'Não foi possível confirmar a issue.');
		if (outcome.issue) {
			updateIssueLocal(issue, outcome.issue);
		} else {
			await reloadProject();
		}
	}

	async function removeIssue(issue: Issue) {
		if (!token) return;
		if (!window.confirm(`Descartar o rascunho "${issue.title}"?`)) return;
		await deleteIssue(token, issue.id);
		setProject((current) => {
			if (!current) return current;
			return {
				...current,
				issues: (current.issues ?? []).filter((item) => item.id !== issue.id),
			};
		});
	}

	async function updateIssuePoints(issue: Issue, points: number) {
		if (!token || points === issue.points) return;
		const result = await updateIssue(token, issue.id, { points });
		updateIssueLocal(issue, result.issue);
	}

	async function updateIssuePriority(issue: Issue, priority: IssuePriority) {
		if (!token || priority === issue.priority) return;
		const result = await updateIssue(token, issue.id, { priority });
		updateIssueLocal(issue, result.issue);
	}

	return (
		<ProjectContext.Provider
			value={{
				project,
				loading: loading || !token || loadingProject,
				error,
				reloadProject,
				setProject,
				confirmIssue,
				removeIssue,
				updateIssuePoints,
				updateIssuePriority,
				updateIssueLocal,
			}}
		>
			{children}
		</ProjectContext.Provider>
	);
}

export function useProject(): ProjectContextValue {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error('useProject precisa ser usado dentro de <ProjectProvider>.');
	}
	return context;
}