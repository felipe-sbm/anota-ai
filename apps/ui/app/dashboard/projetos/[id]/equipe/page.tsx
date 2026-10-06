'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useProject } from '@/components/dashboard/context/project';
import { Transition } from '@/components/transition';
import { routeHref } from '@/lib/demo';
import { type Issue, type ProjectMember } from '@/lib/api';

function EmptyState({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function githubAvatar(login: string | null | undefined) {
	const handle = (login ?? '').replace(/^@+/, '');
	return handle ? `https://github.com/${encodeURIComponent(handle)}.png?size=80` : null;
}

function normalizeLogin(value?: string | null) {
	return (value ?? '').replace(/^@+/, '').toLowerCase();
}

function formatDay(value?: string | null) {
	if (!value) return null;
	const day = value.slice(0, 10);
	const date = new Date(day);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
}

type MemberStats = {
	assigned: number;
	open: number;
	openPoints: number;
	done: number;
	donePoints: number;
	lastActivity: string | null;
};

function buildMemberStats(logins: string[], issues: Issue[]): Record<string, MemberStats> {
	const result: Record<string, MemberStats> = {};
	for (const login of logins) {
		result[login] = { assigned: 0, open: 0, openPoints: 0, done: 0, donePoints: 0, lastActivity: null };
	}
	for (const issue of issues) {
		const login = normalizeLogin(issue.assignee);
		const stats = result[login];
		if (!stats) continue;
		stats.assigned += 1;
		const stamp = issue.updated_at || issue.created_at;
		if (!stats.lastActivity || (stamp ?? '') > stats.lastActivity) stats.lastActivity = stamp ?? null;
		if (issue.state === 'closed') {
			stats.done += 1;
			stats.donePoints += issue.points ?? 0;
		} else {
			stats.open += 1;
			stats.openPoints += issue.points ?? 0;
		}
	}
	return result;
}

function MemberCard({ member, stats }: { member: ProjectMember; stats?: MemberStats }) {
	const userName = member.user_name || member.team_github_login || '';
	const login = userName.replace(/^@+/, '');
	const avatar = githubAvatar(login);

	return (
		<div className="w-full rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-100 to-80% p-4 text-left">
			<div className="flex items-center justify-between">
				<div className="flex min-w-0 items-center gap-4">
					{avatar ? (
						<Image src={avatar} alt={`Avatar de ${login}`} width={64} height={64} unoptimized className="h-12 w-12 shrink-0 rounded-xl object-cover" />
					) : (
						<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">{(login.slice(0, 1) || '?').toUpperCase()}</span>
					)}
					<div className="flex min-w-0 flex-col gap-1 leading-tight text-sm text-stone-700">
						<Transition first={member.name} second={userName ? (userName.startsWith('@') ? userName : `@${userName}`) : ''} />
						{member.team_role ? <p title="Cargo que este mebro possui" className="text-stone-500">{member.team_role}</p> : null}
						<p title="Equipe que este membro faz parte" className="font-mono text-xs text-stone-400">{member.team_name}</p>
					</div>
				</div>
			</div>

			{stats ? (
				<div className="mt-4">
					<div className="mb-2 flex justify-between text-[11px] text-stone-500">
						<span>
							{stats.open} abertas · {stats.done} concluídas
						</span>
						<span>{stats.assigned} issues</span>
					</div>

					<div className="flex flex-wrap items-center gap-0.5">
						{Array.from({ length: Math.max(stats.assigned, 0) }).map((_, index) => {
							const isDone = index < stats.done;

							return (
								<span
									key={index}
									className={`h-5 w-1 shrink-0 rounded-full transition-colors ${
										isDone ? 'bg-green-500/85' : 'bg-green-500/15'
									}`}
									title={isDone ? 'Tarefa concluída' : 'Tarefa em aberto'}
								/>
							);
						})}
					</div>

					<div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
						<span>{stats.donePoints} pontos entregues</span>
						{stats.lastActivity ? <span>última atividade {formatDay(stats.lastActivity)}</span> : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

export default function EquipeTabPage() {
	const { project } = useProject();
	if (!project) return null;

	const members = project.team_members ?? [];
	const stats = buildMemberStats(
		members.map((member) => normalizeLogin(member.team_github_login)),
		project.issues ?? [],
	);

	return (
		<section className="space-y-4">
			<div className="flex flex-col mb-5">
				<h2 className="font-medium text-stone-900">Equipe do projeto</h2>
				<p className="mt-1 text-sm text-stone-500">Pessoas, volume de issues e pontos por pessoa. Veja a visão completa na página da equipe.</p>
			</div>
			<div className="grid grid-cols-2 gap-3">
				{members.length ? (
					members.map((member) => <MemberCard key={`${member.team_name}-${member.team_github_login}`} member={member} stats={stats[normalizeLogin(member.team_github_login)]} />)
				) : (
					<EmptyState>Anexe uma equipe para acompanhar as pessoas do projeto.</EmptyState>
				)}
			</div>
			{members.length ? (
				<p className="pt-2 text-sm text-stone-500">
					Quer ver projetos, repositórios e o histórico de cada pessoa?{' '}
					<Link href={routeHref('/dashboard/equipes')} className="font-medium text-brand hover:underline">
						Acesse a página de equipes
					</Link>
					.
				</p>
			) : null}
		</section>
	);
}
