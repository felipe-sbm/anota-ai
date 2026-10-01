'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { ArrowLeft, AudioLines, BarChart3, CircleDot, Cog, FileText, LayoutDashboard, UsersRound } from 'lucide-react';

import { routeHref } from '@/lib/demo';
import { ProjectProvider, useProject } from '@/components/dashboard/project/context';

type ProjectTab = {
	href: string;
	label: string;
	Icon: ComponentType<{ className?: string }>;
};

/** A aba Resumo vive na rota raiz do projeto; as demais em sub-rotas. */
const tabs: ProjectTab[] = [
	{ href: '', label: 'Resumo', Icon: LayoutDashboard },
	{ href: '/equipe', label: 'Equipe', Icon: UsersRound },
	{ href: '/desempenho', label: 'Desempenho', Icon: BarChart3 },
	{ href: '/issues', label: 'Issues', Icon: CircleDot },
	{ href: '/rascunhos', label: 'Rascunhos', Icon: FileText },
	{ href: '/gravacoes', label: 'Gravações', Icon: AudioLines },
	{ href: '/configuracoes', label: 'Configurações', Icon: Cog },
];

export default function ProjectLayout({ children }: { children: ReactNode }) {
	return (
		<ProjectProvider>
			<ProjectLayoutShell>{children}</ProjectLayoutShell>
		</ProjectProvider>
	);
}

function ProjectLayoutShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const { project, loading, error } = useProject();

	if (loading) {
		return <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Carregando projeto…</div>;
	}

	if (!project) {
		return (
			<div className="space-y-4">
				<Link href={routeHref('/dashboard/projetos')} className="inline-flex items-center gap-2 text-sm text-stone-600">
					<ArrowLeft className="h-4 w-4" />
					Voltar para projetos
				</Link>
				<p className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error || 'Projeto não encontrado.'}</p>
			</div>
		);
	}

	const pathParts = pathname?.split('/').filter(Boolean) ?? [];
	const projectIndex = pathParts.findIndex((part) => part === 'projetos');
	const tabSegment = projectIndex >= 0 ? pathParts[projectIndex + 2] : pathParts[pathParts.length - 1];
	const activeHref = tabs.find((tab) => tab.href.slice(1) === (tabSegment ?? ''))?.href ?? '';

	return (
		<section className="space-y-6">
			<div className="flex flex-col mb-5">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-medium tracking-tight text-stone-900">{project.name}</h1>
				</div>
				<p className="mt-1 max-w-2xl text-sm text-stone-500">{project.description || 'Acompanhe o trabalho conectado a este projeto.'}</p>
			</div>

			<nav className="-mx-2 overflow-x-auto border-b border-stone-200 px-2" aria-label="Seções do projeto">
				<div className="flex min-w-max gap-6">
					{tabs.map(({ href, label, Icon }) => {
						const active = activeHref === href;
						return (
							<Link
								key={label}
								href={routeHref(`/dashboard/projetos/${project.id}${href}`)}
								aria-current={active ? 'page' : undefined}
								className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors cursor-pointer ${active ? 'border-brand text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
							>
								<Icon className="h-4 w-4" />
								{label}
							</Link>
						);
					})}
				</div>
			</nav>

			{children}
		</section>
	);
}
