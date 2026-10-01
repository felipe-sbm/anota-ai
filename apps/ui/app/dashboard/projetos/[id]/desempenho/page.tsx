'use client';

import { BurndownChart } from '@/components/dashboard/burndown';
import { useProject } from '@/components/dashboard/project/context';

function EmptyState({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function DiagramSection({ diagram, maxDiagram }: { diagram: NonNullable<import('@/lib/api').Project['diagram']>; maxDiagram: number }) {
	return (
		<section className="rounded-2xl border border-stone-200 bg-gradient-to-t from-stone-50 to-stone-100 p-5">
			<div className="mb-5 flex flex-col">
				<h2 className="font-medium text-stone-900">Distribuição do trabalho</h2>
				<p className="mt-1 text-sm text-stone-500">Visão atual do trabalho registrado</p>
			</div>
			<div className="space-y-4">
				{diagram.length ? (
					diagram.map((item) => (
						<div key={item.label}>
							<div className="mb-1 flex justify-between text-sm">
								<span className="text-stone-600">{item.label}</span>
								<strong className="text-stone-900">{item.value}</strong>
							</div>
							<div className="h-3 overflow-hidden rounded-full bg-stone-100">
								<div
									className="h-full rounded-full bg-brand"
									style={{ width: `${Math.max(4, (item.value / maxDiagram) * 100)}%` }}
								/>
							</div>
						</div>
					))
				) : (
					<EmptyState>Ainda não há dados de distribuição.</EmptyState>
				)}
			</div>
		</section>
	);
}

export default function DesempenhoTabPage() {
	const { project } = useProject();
	if (!project) return null;

	const diagram = project.diagram ?? [];
	const burndown = project.burndown ?? [];
	const maxDiagram = Math.max(1, ...diagram.map((item) => item.value));

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 p-5">
				<div className="mb-5">
					<h2 className="font-medium text-stone-900">Burndown do projeto</h2>
					<p className="mt-1 text-sm text-stone-500">Compare o trabalho restante com a trajetória ideal até hoje</p>
				</div>
				{burndown.length ? <BurndownChart points={burndown} /> : <EmptyState>Adicione issues pontuadas para acompanhar o progresso.</EmptyState>}
			</section>
			<DiagramSection diagram={diagram} maxDiagram={maxDiagram} />
		</div>
	);
}
