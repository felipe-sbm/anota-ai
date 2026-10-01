'use client';

import { CircleDot, FileAudio, FileText, GitBranch, UsersRound } from 'lucide-react';

import { BurndownChart } from '@/components/dashboard/burndown';
import { useProject } from '@/components/dashboard/project/context';
import { routeHref } from '@/lib/demo';
import { type Project } from '@/lib/api';

function EmptyState({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function Metric({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) {
	return (
		<div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-100 p-4">
			<div className="mb-2 flex items-center gap-2">
				<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
					<Icon className="h-4 w-4" />
				</div>
				<p className="text-sm text-stone-500">{label}</p>
			</div>
			<p className="text-2xl font-semibold text-stone-600">{value}</p>
		</div>
	);
}

function RepositoriesSection({ repositories }: { repositories: string[] }) {
	return (
		<section className="rounded-2xl border border-stone-200 bg-gradient-to-bl from-white to-stone-100 p-5">
			<div>
				<h2 className="font-medium text-stone-900">Repositórios conectados</h2>
				<p className="mt-1 text-sm text-stone-500">Fontes de código relacionadas ao projeto.</p>
			</div>
			<div className="mt-4 space-y-2">
				{repositories.length ? (
					repositories.map((repo) => (
						<div key={repo} className="rounded-full border border-stone-200 bg-white to-stone-100 p-4 flex items-center gap-3">
							<div className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
								<GitBranch className="h-4 w-4" />
							</div>
							<p className="text-sm text-stone-500">{repo}</p>
						</div>
					))
				) : (
					<p className="text-sm text-stone-500">Nenhum repositório conectado.</p>
				)}
			</div>
		</section>
	);
}

export default function ResumoPage() {
	const { project } = useProject();
	if (!project) return null;

	const metrics = project.metrics ?? { issues: 0, drafts: 0, open_issues: 0, closed_issues: 0, recordings: 0 };
	const burndown = project.burndown ?? [];

	return (
		<div className="space-y-6">
			<div className="flex items-end justify-between gap-3">
				<div>
					<h2 className="text-lg font-medium text-stone-900">Visão geral</h2>
					<p className="mt-1 text-sm text-stone-500">Uma leitura rápida do andamento deste projeto.</p>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.45fr_0.3fr]">
				<section className="grid grid-cols-2 gap-6">
					<div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-100 p-5">
						<div className="mb-5">
							<h2 className="font-medium text-stone-900">Progresso do projeto</h2>
							<p className="text-sm text-stone-500">Trabalho restante ao longo do tempo.</p>
						</div>
						{burndown.length ? <BurndownChart points={burndown} /> : <EmptyState>Adicione issues pontuadas para acompanhar o progresso.</EmptyState>}
					</div>
					<RepositoriesSection repositories={project.repositories} />
				</section>
				<div className="space-y-6">
					<div className="grid gap-6 grid-rows-4">
						<Metric label="Issues" value={metrics.issues} Icon={CircleDot} />
						<Metric label="Rascunhos" value={metrics.drafts} Icon={FileText} />
						<Metric label="Gravações" value={metrics.recordings} Icon={FileAudio} />
						<Metric label="Pessoas" value={project.team_members?.length ?? 0} Icon={UsersRound} />
					</div>
				</div>
			</div>
		</div>
	);
}
