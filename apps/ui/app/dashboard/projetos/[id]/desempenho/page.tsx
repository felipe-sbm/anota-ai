'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Transition } from '@/components/transition';

import { BurndownChart } from '@/components/dashboard/burndown';
import { useProject } from '@/components/dashboard/context/project';
import { useAuth } from '@/lib/auth';
import { fetchProjectPerformance, fetchSprints, type PerformanceFilters, type PerformanceGranularity, type ProjectPerformance, type RiskItem, type SprintSummary } from '@/lib/api';
import Image from 'next/image';

function formatDayLabel(value: string): string {
	const [, month, day] = value.split('-');
	return `${day}/${month}`;
}

function formatNumber(value?: number | null): string {
	if (value === null || value === undefined) return '—';
	return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
}

function EmptyText({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

type HealthCardProps = {
	label: string;
	value: string;
	hint: string;
	accent?: 'brand' | 'green' | 'amber' | 'red';
	icon?: React.ReactNode;
};

function HealthCard({ label, value, hint }: HealthCardProps) {
	return (
		<div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-4">
			<div className="flex items-center">
				<p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
			</div>
			<p className="mt-2 text-2xl font-medium tracking-tight text-stone-900">{value}</p>
			<p className="mt-1 text-xs text-stone-500">{hint}</p>
		</div>
	);
}

const riskMeta: Record<RiskItem['type'], { label: string }> = {
	overloaded: { label: 'Sobrecarga' },
	stale: { label: 'Issues antigas' },
	unassigned: { label: 'Sem responsável' },
	stalled_draft: { label: 'Rascunho parado' },
};

function RiskList({ risks }: { risks: RiskItem[] }) {
	if (!risks.length) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
				<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
				<p>Nenhum risco evidente no período. Mantenha as issues com responsável e os rascunhos em movimento.</p>
			</div>
		);
	}
	return (
		<ul className="space-y-2">
			{risks.map((risk, index) => {
				const meta = riskMeta[risk.type];
				const severityStyles = risk.severity === 'high' ? 'bg-red-600/85' : 'bg-yellow-500/85';
				return (
					<li key={`${risk.type}-${index}`} className={`flex items-start gap-3 py-3 text-sm border-b border-stone-200 last:border-b-0`}>
						<div className={`mt-0.5 h-15 w-1 shrink-0 rounded-full ${severityStyles}`} />
						<div className="min-w-0">
							<p className="font-medium text-stone-900">{meta.label}</p>
							<p className="mt-0.5">{risk.message}</p>
							{risk.member ? <p className="mt-1 font-mono text-xs leading-tight opacity-70">@{risk.member}</p> : null}
							{risk.issue_ids?.length ? <p className="mt-1 text-xs opacity-60">{risk.issue_ids.length} issues envolvidas</p> : null}
						</div>
					</li>
				);
			})}
		</ul>
	);
}

export default function DesempenhoTabPage() {
	const { project } = useProject();
	const { token } = useAuth();
	const [performance, setPerformance] = useState<ProjectPerformance | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sprints, setSprints] = useState<SprintSummary[]>([]);
	const [periodStart, setPeriodStart] = useState('');
	const [periodEnd, setPeriodEnd] = useState('');
	const [granularity, setGranularity] = useState<PerformanceGranularity>('weekly');
	const [member, setMember] = useState('');
	const [sprintId, setSprintId] = useState('');

	useEffect(() => {
		if (!token) return;
		fetchSprints(token)
			.then(setSprints)
			.catch(() => setSprints([]));
	}, [token]);

	useEffect(() => {
		if (!token || !project?.id) return;
		let cancelled = false;
		const filters: PerformanceFilters = {
			period_start: periodStart || undefined,
			period_end: periodEnd || undefined,
			granularity,
			member: member || undefined,
			sprint_id: sprintId || undefined,
		};
		fetchProjectPerformance(token, project.id, filters)
			.then((data) => {
				if (cancelled) return;
				setPerformance(data);
				setError(null);
			})
			.catch(() => {
				if (!cancelled) setError('Não foi possível carregar o desempenho deste projeto.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [granularity, member, periodEnd, periodStart, project?.id, sprintId, token]);

	const members = useMemo(() => {
		const lookups = performance?.by_member ?? [];
		const known = new Map(lookups.map((item) => [item.github_login, item]));
		for (const item of project?.team_members ?? []) {
			if (known.has(item.team_github_login)) continue;
			known.set(item.team_github_login, {
				github_login: item.team_github_login,
				name: item.name || item.user_name || item.team_github_login,
				assigned_issues: 0,
				open_count: 0,
				remaining_points: 0,
				closed_count: 0,
				closed_points: 0,
				points_done: 0,
				pending_drafts: 0,
				last_activity: null,
			});
		}
		return Array.from(known.values()).sort((a, b) => b.assigned_issues - a.assigned_issues);
	}, [performance?.by_member, project?.team_members]);

	if (!project) return null;

	const summary = performance?.summary;
	const healthCards = summary
		? [
				{ label: 'Issues abertas', value: String(summary.open_issues), hint: `${summary.unassigned} sem responsável` },
				{ label: 'Issues fechadas', value: String(summary.closed_issues), hint: `${summary.late_issues} abertas há +7 dias` },
				{ label: 'Pontos entregues', value: formatNumber(summary.delivered_points), hint: `de ${formatNumber(summary.total_points)} pontos no total` },
				{ label: 'Restantes', value: formatNumber(summary.remaining_points), hint: 'a concluir no escopo atual' },
				{ label: 'Vazão média', value: `${formatNumber(summary.throughput_weekly_avg)}/sem`, hint: 'issues fechadas por semana' },
				{ label: 'Prazo de execução médio', value: summary.lead_time_avg_days === null ? '—' : `${formatNumber(summary.lead_time_avg_days)} d`, hint: 'da criação ao fechamento' },
				{
					label: 'Conversão de rascunhos',
					value: summary.draft_conversion_rate === null ? '—' : `${Math.round(summary.draft_conversion_rate * 100)}%`,
					hint: `${summary.confirmed_drafts} de ${summary.drafts} rascunhos confirmados`,
				},
			]
		: [];

	return (
		<div className="space-y-6">
			{performance?.partial_history.detected ? (
				<div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<div>
						<p className="font-medium text-stone-900">Atenção: dados históricos parciais</p>
						<p className="mt-0.5">{performance.partial_history.message}</p>
					</div>
				</div>
			) : null}

			<section className="overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50">
				<div className="px-5 py-4">
					<h2 className="font-medium text-stone-900">Filtros e período</h2>
					<p className="mt-1 text-sm text-stone-500">Ajuste o recorte das métricas abaixo.</p>
				</div>

				<div className="flex flex-wrap items-center gap-2 p-5 pt-0">
					<label className="min-w-[10.5rem] flex-1">
						<span className="sr-only">Período inicial</span>
						<input
							type="date"
							aria-label="Período inicial"
							value={periodStart}
							onChange={(event) => setPeriodStart(event.target.value)}
							className="w-full rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 cursor-pointer"
						/>
					</label>
					<label className="min-w-[10.5rem] flex-1">
						<span className="sr-only">Período final</span>
						<input
							type="date"
							aria-label="Período final"
							value={periodEnd}
							onChange={(event) => setPeriodEnd(event.target.value)}
							className="w-full rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 cursor-pointer"
						/>
					</label>
					<div className="relative min-w-[9.5rem] flex-1">
						<select
							value={granularity}
							onChange={(event) => setGranularity(event.target.value as PerformanceGranularity)}
							className="w-full appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 cursor-pointer"
						>
							<option value="daily">Granularidade: diária</option>
							<option value="weekly">Granularidade: semanal</option>
						</select>
						<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
					</div>
					<div className="relative min-w-[9.5rem] flex-1">
						<select
							value={member}
							onChange={(event) => setMember(event.target.value)}
							className="w-full appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 cursor-pointer"
						>
							<option value="">Pessoa: todas</option>
							{members.map((item) => (
								<option key={item.github_login} value={item.github_login}>
									@{item.github_login}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
					</div>
					<div className="relative min-w-[9.5rem] flex-1">
						<select
							value={sprintId}
							onChange={(event) => setSprintId(event.target.value)}
							className="w-full appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 cursor-pointer"
						>
							<option value="">Sprint: todas</option>
							{sprints.map((sprint) => (
								<option key={sprint.id} value={sprint.id}>
									{sprint.name}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
					</div>
				</div>
			</section>

			{loading ? (
				<div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">Calculando métricas…</div>
			) : error ? (
				<p className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error}</p>
			) : performance && summary ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{healthCards.map((card) => (
							<HealthCard key={card.label} {...card} />
						))}
					</div>
					<section className="rounded-2xl border border-stone-200 bg-white p-5">
						<div className="mb-4">
							<h2 className="font-medium text-stone-900">Burndown</h2>
							<p className="mt-1 text-sm text-stone-500">Trabalho restante (pontos) comparado à trajetória ideal até hoje.</p>
						</div>
						{performance.burndown.length ? <BurndownChart points={performance.burndown} /> : <EmptyText>Adicione issues pontuadas para acompanhar o burndown.</EmptyText>}
					</section>
					<section className="rounded-2xl border border-stone-200 bg-white p-5">
						<div className="mb-4">
							<h2 className="font-medium text-stone-900">Burnup</h2>
							<p className="mt-1 text-sm text-stone-500">Planejado (pontos totais) versus realizado (pontos concluídos) ao longo do tempo.</p>
						</div>
						{performance.burnup.length ? (
							<div className="h-[280px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={performance.burnup} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
										<defs>
											<linearGradient id="burnupDone" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="#4169e1" stopOpacity={0.25} />
												<stop offset="100%" stopColor="#4169e1" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid stroke="#f5f5f4" vertical={false} />
										<XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} tickFormatter={formatDayLabel} minTickGap={28} />
										<YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} width={32} allowDecimals={false} />
										<Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: 12 }} />
										<Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
										<Area type="monotone" dataKey="total" name="Planejado" stroke="#a8a29e" strokeDasharray="6 5" fill="none" strokeWidth={2} />
										<Area type="monotone" dataKey="done" name="Realizado" stroke="#4169e1" fill="url(#burnupDone)" strokeWidth={2.5} />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						) : (
							<EmptyText>Sem pontos planejados no período para o burnup.</EmptyText>
						)}
					</section>

					<section className="rounded-2xl border border-stone-200 bg-white p-5">
						<div className="mb-4">
							<h2 className="font-medium text-stone-900">Trabalho concluído ao longo do tempo</h2>
							<p className="mt-1 text-sm text-stone-500">Pontos entregues acumulados versus escopo criado (planejado).</p>
						</div>
						{performance.timeline.length ? (
							<div className="h-[280px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={performance.timeline} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
										<CartesianGrid stroke="#f5f5f4" vertical={false} />
										<XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} tickFormatter={formatDayLabel} minTickGap={28} />
										<YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} width={32} allowDecimals={false} />
										<Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: 12 }} />
										<Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
										<Line type="monotone" dataKey="points_total_cumulative" name="Escopo (pontos)" stroke="#a8a29e" strokeDasharray="6 5" strokeWidth={2} dot={false} />
										<Line type="monotone" dataKey="points_done_cumulative" name="Concluído (pontos)" stroke="#4169e1" strokeWidth={2.5} dot={{ r: 3, fill: '#4169e1', strokeWidth: 0 }} />
									</LineChart>
								</ResponsiveContainer>
							</div>
						) : (
							<EmptyText>Adicione issues pontuadas para acompanhar a evolução.</EmptyText>
						)}
					</section>
					<section className="rounded-2xl border border-stone-200 bg-white p-5">
						<div className="mb-4">
							<h2 className="font-medium text-stone-900">Criadas × concluídas por período</h2>
							<p className="mt-1 text-sm text-stone-500">Volume de entrada e entrega de issues (semanal ou diária).</p>
						</div>
						{performance.timeline.some((point) => point.created > 0 || point.closed > 0) ? (
							<div className="h-[240px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={performance.timeline} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
										<CartesianGrid stroke="#f5f5f4" vertical={false} />
										<XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} tickFormatter={formatDayLabel} minTickGap={28} />
										<YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} width={32} allowDecimals={false} />
										<Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: 12 }} cursor={{ fill: '#fafaf9' }} />
										<Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
										<Bar dataKey="created" name="Criadas" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
										<Bar dataKey="closed" name="Concluídas" fill="#4169e1" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<EmptyText>Sem volume de issues no período selecionado.</EmptyText>
						)}
					</section>

					<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
						<section className="col-span-2 overflow-hidden rounded-2xl border border-stone-200 bg-white">
							<div className="bg-gradient-to-b from-white to-stone-50 px-5 py-4">
								<div>
									<h2 className="font-medium text-stone-900">Carga por pessoa</h2>
									<p className="mt-1 text-sm text-stone-500">Uma visão dos pontos abertos e entregues por membro.</p>
								</div>
							</div>

							{members.length ? (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-stone-200 text-sm">
										<thead className="bg-stone-50">
											<tr>
												<th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Membro</th>
												<th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Carga de Trabalho</th>
												<th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Abertas</th>
												<th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Entregues</th>
												<th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">Ultima atividade</th>
											</tr>
										</thead>

										<tbody className="divide-y divide-stone-100">
											{members.map((member) => {
												const assigned = Math.max(member.assigned_issues, 0);
												const closed = Math.min(member.closed_count, assigned);
												const progress = assigned > 0 ? Math.round((closed / assigned) * 100) : 0;

												return (
													<tr key={member.github_login} className="transition duration-500 hover:bg-gradient-to-b from-stone-100/70 to-stone-200/70">
														<td className="px-5 py-4">
															<div className="flex min-w-0 items-center gap-3">
																<Image src={`https://github.com/${member.github_login}.png?size=40`} alt={member.name} width={40} height={40} className="flex-shrink-0 rounded-full" />

																<div className="min-w-0">
																	<p className="truncate text-sm font-medium text-stone-900">
																		<Transition first={member.name} second={`@${member.github_login}`} />
																	</p>

																	<p className="mt-0.5 text-xs text-stone-400">{assigned === 1 ? '1 issue atribuída' : `${assigned} issues atribuídas`}</p>
																</div>
															</div>
														</td>

														<td className="w-[240px] px-4 py-4">
															<div className="flex items-center gap-3">
																<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
																	<div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
																</div>

																<span className="w-9 text-right text-xs font-medium text-stone-600">{progress}%</span>
															</div>
														</td>

														<td className="px-4 py-4 text-center">
															<span className="text-sm font-medium text-stone-900">{member.remaining_points}</span>
															<p className="mt-0.5 text-[11px] text-stone-400">pontos</p>
														</td>

														<td className="px-4 py-4 text-center">
															<div className="flex flex-col items-center">
																<span className="text-sm font-medium text-stone-900">{member.points_done}</span>
																<p className="mt-0.5 text-[11px] text-stone-400">pontos</p>
															</div>
														</td>

														<td className="px-5 py-4 text-right">
															{member.last_activity ? (
																<div>
																	<p className="text-xs font-medium text-stone-600">{formatDayLabel(member.last_activity)}</p>
																</div>
															) : (
																<i className="text-xs text-stone-400">Sem atividade</i>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							) : (
								<div className="px-5 py-8">
									<EmptyText>Sem membros vinculados para distribuir carga.</EmptyText>
								</div>
							)}
						</section>

						<section className="rounded-2xl border border-stone-200 bg-white p-5">
							<div className="mb-4">
								<h2 className="font-medium text-stone-900">Entregas por pessoa</h2>
								<p className="my-1 text-sm text-stone-500">Ranking só como auxílio de revisão</p>
								<p className="text-xs text-stone-500">OBS: não é competição, use para equilibrar a próxima rodada!</p>
							</div>
							{performance.activity_ranking.length ? (
								<ul className="divide-y divide-stone-100">
									{performance.activity_ranking.map((item, index) => (
										<li key={item.github_login} className="flex items-center gap-3 py-3">
											<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium bg-stone-100 text-stone-500">{index + 1}º.</span>
											<div className="min-w-0 flex-1 text-sm">
												<Transition first={item.name} second={`@${item.github_login}`} />
											</div>
											<div className="text-right text-xs text-stone-500">
												<p className="font-medium text-stone-700">{item.closed_issues} issues fechadas</p>
												<p>{item.points_done} pontos entregues</p>
											</div>
										</li>
									))}
								</ul>
							) : (
								<EmptyText>Sem entregas no período para ordenar.</EmptyText>
							)}
						</section>

						<section className="rounded-2xl border border-stone-200 bg-white p-5">
							<div className="mb-4">
								<h2 className="font-medium text-stone-900">Riscos e atenção</h2>
								<p className="mt-1 text-sm text-stone-500">Alertas acionáveis: sobrecarga, issues paradas, sem responsável e rascunhos travados.</p>
							</div>
							<RiskList risks={performance.risks} />
						</section>
					</div>
				</>
			) : null}
		</div>
	);
}
