'use client';

import Image from 'next/image';

import { useProject } from '@/components/dashboard/project/context';
import { Transition } from '@/components/transition';

import { type ProjectMember } from '@/lib/api';

function EmptyState({ children }: { children: React.ReactNode }) {
	return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">{children}</p>;
}

function githubAvatar(login: string | null | undefined) {
	const handle = (login ?? '').replace(/^@+/, '');
	return handle ? `https://github.com/${encodeURIComponent(handle)}.png?size=80` : null;
}

function MemberCard({ member }: { member: ProjectMember }) {
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
						<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
							{(login.slice(0, 1) || '?').toUpperCase()}
						</span>
					)}
					<div className="flex min-w-0 flex-col gap-1 leading-tight text-sm text-stone-700">
						<Transition first={member.name} second={userName ? (userName.startsWith('@') ? userName : `@${userName}`) : ''} />
						{member.team_role ? <p className="text-stone-500">{member.team_role}</p> : null}
					</div>
				</div>
				<span className="shrink-0 text-xs text-brand">{member.assigned_issues} issues</span>
			</div>
		</div>
	);
}

export default function EquipeTabPage() {
	const { project } = useProject();
	if (!project) return null;

	const members = project.team_members ?? [];

	return (
		<section className="space-y-4">
			<div className="flex flex-col mb-5">
				<h2 className="font-medium text-stone-900">Equipe do projeto</h2>
				<p className="mt-1 text-sm text-stone-500">Pessoas e volume de issues atribuídas.</p>
			</div>
			<div className="flex flex-col gap-3">
				{members.length ? (
					members.map((member) => (
						<MemberCard key={`${member.team_name}-${member.team_github_login}`} member={member} />
					))
				) : (
					<EmptyState>Anexe uma equipe para acompanhar as pessoas do projeto.</EmptyState>
				)}
			</div>
		</section>
	);
}
