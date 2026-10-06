'use client';

import Link from 'next/link';
import { useState } from 'react';

import { IssuesTable } from '@/components/dashboard/table';
import { useProject } from '@/components/dashboard/context/project';
import { routeHref } from '@/lib/demo';

export default function RascunhosTabPage() {
	const { project, confirmIssue, removeIssue, updateIssuePoints, updateIssuePriority } = useProject();
	const [actionError, setActionError] = useState<string | null>(null);
	if (!project) return null;

	const drafts = project.issues?.filter((issue) => issue.source === 'draft' && !issue.github_issue_id) ?? [];

	async function runAction(action: () => Promise<void>) {
		setActionError(null);
		try {
			await action();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a issue.');
		}
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-col mb-5">
				<h2 className="font-medium text-stone-900">Rascunhos do projeto</h2>
				<p className="mt-1 text-sm text-stone-500">Rascunhos vinculados exclusivamente a este projeto.</p>
			</div>
			{actionError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}
			<IssuesTable
				issues={drafts}
				onConfirm={(issue) => runAction(() => confirmIssue(issue))}
				onDelete={(issue) => runAction(() => removeIssue(issue))}
				onUpdatePoints={(issue, points) => runAction(() => updateIssuePoints(issue, points))}
				onUpdatePriority={(issue, priority) => runAction(() => updateIssuePriority(issue, priority))}
			/>
		</section>
	);
}
