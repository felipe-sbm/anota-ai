'use client';

import { useParams } from 'next/navigation';

import { RecordDetail } from '@/components/dashboard/record-detail';

export default function ProjectRecordDetailPage() {
	const params = useParams<{ id: string; recordId: string }>();

	return <RecordDetail recordId={params?.recordId} />;
}
