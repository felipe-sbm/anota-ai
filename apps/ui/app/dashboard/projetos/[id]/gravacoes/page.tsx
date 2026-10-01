'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, FileAudio } from 'lucide-react';

import { useProject } from '@/components/dashboard/project/context';
import { routeHref } from '@/lib/demo';

function EmptyState({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function formatRecordDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function GravacoesTabPage() {
	const { project } = useProject();
	if (!project) return null;

	const records = project.records ?? [];
	if (!records.length) return <EmptyState>Nenhuma gravação está vinculada a este projeto.</EmptyState>;

	return (
		<section className="space-y-4">
			<div className="flex flex-col mb-4">
				<h2 className="font-medium text-stone-900">Gravações do projeto</h2>
				<p className="mt-1 text-sm text-stone-500">
					{records.length} vinculada{records.length === 1 ? '' : 's'} ao projeto. Abra cada gravação para ver o resumo, as issues e a transcrição.
				</p>
			</div>

			<div className="space-y-3">
				{records.map((record) => (
					<Link
						key={record.id}
						href={routeHref(`/dashboard/projetos/${project.id}/gravacoes/${record.id}`)}
						className="block w-full rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-100 to-80% p-4 text-left transition hover:to-stone-200 hover:border-stone-300 hover:bg-stone-100 cursor-pointer"
					>
						<div className="flex items-center justify-between gap-4">
							<div className="flex gap-2 items-center mb-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
									<FileAudio className="h-4 w-4" />
								</div>

								<div className="min-w-0 truncate">
									<p className="truncate text-base font-medium text-stone-900">{record.original_filename || record.filename}</p>
									<p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
										<CalendarDays className="h-3.5 w-3.5" />
										<span>{formatRecordDate(record.created_at)}</span>
									</p>
								</div>
							</div>

							<span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
								Abrir
								<ArrowRight className="h-3.5 w-3.5" />
							</span>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
}
