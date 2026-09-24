"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  GitBranch,
  Link2,
  MessageSquareText,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { fetchAudioRecords, type AudioRecord } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function extractIssuePeople(issue: Record<string, unknown> | null | undefined) {
  const candidates = [
    issue?.assignees,
    issue?.assignee,
    issue?.assigned_to,
    issue?.people,
    issue?.participants,
  ];

  const values: string[] = [];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string") values.push(item);
        else if (item && typeof item === "object") {
          const login = (item as Record<string, unknown>).github_login ?? (item as Record<string, unknown>).login ?? (item as Record<string, unknown>).name;
          if (typeof login === "string") values.push(login);
        }
      }
    } else if (typeof candidate === "string") {
      values.push(candidate);
    } else if (candidate && typeof candidate === "object") {
      const login = (candidate as Record<string, unknown>).github_login ?? (candidate as Record<string, unknown>).login ?? (candidate as Record<string, unknown>).name;
      if (typeof login === "string") values.push(login);
    }
  }

  return Array.from(new Set(values)).filter(Boolean);
}

export default function RecordingDetailPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const recordId = segments[segments.length - 1] ?? "";
  const { token, loading } = useAuth();
  const [record, setRecord] = useState<AudioRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null || recordId === "") return;

    const authToken = token;

    async function loadRecord() {
      try {
        const data = await fetchAudioRecords(authToken, 200);
        const found = data.find((item) => (item.id ?? "") === recordId) ?? null;
        setRecord(found);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRecord(false);
      }
    }

    loadRecord();
  }, [loading, recordId, router, token]);

  const issueGroups = useMemo(() => {
    if (!record) return [];

    return Array.isArray(record.created_issues)
      ? record.created_issues.map((issue, index) => ({
          key: `${record.id}-issue-${index}`,
          title:
            typeof issue?.title === "string" && issue.title
              ? issue.title
              : `Issue ${index + 1}`,
          html_url: typeof issue?.html_url === "string" ? issue.html_url : undefined,
          repo_full_name:
            typeof issue?.repo_full_name === "string" ? issue.repo_full_name : record.repo_full_name ?? undefined,
          people: extractIssuePeople(issue),
        }))
      : [];
  }, [record]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  if (loadingRecord) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
        Carregando detalhes da gravação…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/dashboard/gravacoes")}
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para gravações
        </button>

        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
          Gravação não encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/gravacoes")}
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 transition hover:bg-stone-100"
            aria-label="Voltar para gravações"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
              Detalhes da gravação
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-stone-900">
              {record.original_filename || record.filename}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(record.created_at)}
          </span>
          {record.repo_full_name ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              {record.repo_full_name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-900">
              <FileText className="h-4 w-4 text-brand" />
              Resumo
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {record.summary || "Nenhum resumo foi gerado para esta gravação."}
            </p>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-900">
              <MessageSquareText className="h-4 w-4 text-brand" />
              Transcrição completa
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">
                {record.transcript || "Nenhuma transcrição está disponível para esta gravação."}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-900">
              <GitBranch className="h-4 w-4 text-brand" />
              Issues criadas
            </div>

            <div className="space-y-3">
              {issueGroups.length === 0 ? (
                <p className="text-sm text-stone-500">Nenhuma issue foi criada a partir desta gravação.</p>
              ) : (
                issueGroups.map((issue) => (
                  <div key={issue.key} className="rounded-2xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-stone-900">{issue.title}</p>
                      {issue.html_url ? (
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:text-brand-hover"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          GitHub
                        </a>
                      ) : null}
                    </div>

                    {issue.repo_full_name ? (
                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-stone-400">
                        {issue.repo_full_name}
                      </p>
                    ) : null}

                    {issue.people.length > 0 ? (
                      <div className="mt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
                          <Users className="h-3 w-3" />
                          Pessoas
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {issue.people.map((person) => (
                            <span
                              key={`${issue.key}-${person}`}
                              className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-700 ring-1 ring-stone-200"
                            >
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-900">
              <Users className="h-4 w-4 text-brand" />
              Pessoas da gravação
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set(
                  issueGroups.flatMap((issue) => issue.people),
                ),
              ).map((person) => (
                <span
                  key={person}
                  className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700 ring-1 ring-stone-200"
                >
                  {person}
                </span>
              ))}
            </div>

            {issueGroups.flatMap((issue) => issue.people).length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                Nenhuma pessoa foi associada a esta gravação.
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
