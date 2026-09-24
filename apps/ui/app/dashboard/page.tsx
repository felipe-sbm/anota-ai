"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  AudioLines,
  ClipboardList,
  Clock3,
  FolderKanban,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import type { AudioRecord, DashboardSummary, TeamResponse } from "@/lib/api";
import { fetchDashboardSummary } from "@/lib/api";

function DashboardStat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-100 p-6">
      <div className="mb-4 flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{label}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRecordStatusLabel(status: string) {
  const labels: Record<string, string> = {
    uploaded: "Enviada",
    processing: "Processando",
    pending_review: "Revisão",
    reviewed: "Revisada",
    error: "Erro",
  };

  return labels[status] ?? status;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    const currentToken = token;
    if (!currentToken) return;

    async function loadSummary() {
      try {
        setError(null);
        setRefreshing(true);
        const data = await fetchDashboardSummary(currentToken as string);
        setSummary(data);
      } catch (err) {
        console.error(err);
        setError(
          "Não foi possível carregar os dados da dashboard neste momento.",
        );
      } finally {
        setRefreshing(false);
      }
    }

    loadSummary();
  }, [loading, router, token]);

  const stats = useMemo(() => {
    if (!summary) {
      return [
        { label: "Gravações", value: "—", Icon: AudioLines },
        { label: "Tarefas criadas", value: "—", Icon: FolderKanban },
        { label: "Equipes", value: "—", Icon: Users },
        { label: "Tarefas pendentes", value: "—", Icon: ClipboardList },
      ];
    }

    return [
      {
        label: "Gravações",
        value: String(summary.totalRecords),
        Icon: AudioLines,
      },
      {
        label: "Tarefas criadas",
        value: String(summary.totalIssues),
        Icon: FolderKanban,
      },
      { label: "Equipes", value: String(summary.totalTeams), Icon: Users },
      {
        label: "Tarefas pendentes",
        value: String(summary.pendingTasks),
        Icon: ClipboardList,
      },
    ];
  }, [summary]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Área de Trabalho
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Resumo das suas gravações, tarefas e membros da sua equipe.
          </p>
        </div>
        {refreshing ? (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500">
            Atualizando…
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <DashboardStat key={label} label={label} value={value} Icon={Icon} />
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-stone-900">
              Últimas Gravações
            </h2>
            <span className="text-xs font-medium text-stone-500">
              {summary?.recentRecords.length ?? 0} itens
            </span>
          </div>

          {summary?.recentRecords.length ? (
            <div className="space-y-3">
              {summary.recentRecords.map((record: AudioRecord) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/gravacoes/${record.id}`)}
                  className="flex w-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between transition hover:border-stone-300 hover:bg-stone-50 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {record.summary ? <>{record.summary.slice(0, 60)}...</> : null}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      <p className="mt-0.5 text-xs font-mono tracking-tighter text-stone-500">
                        {formatDate(record.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-700">
                      {getRecordStatusLabel(record.status)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {Array.isArray(record.tasks) ? record.tasks.length : 0}
                      {record.tasks?.length && record.tasks?.length > 1
                        ? " tarefas"
                        : " tarefa"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
              Ainda não há gravações registradas para este usuário.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-stone-900">Suas Equipes</h2>
            <span className="text-xs font-medium text-stone-500">
              {summary?.totalTeams ?? 0} no total
            </span>
          </div>

          {summary?.teams.length ? (
            <div className="space-y-3">
              {summary.teams.map((team: TeamResponse) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-stone-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-stone-900">{team.name}</p>
                    <span className="rounded-full bg-brand-light px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-brand">
                      {team.member_count} membros
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    Criada em {formatDate(team.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
              Nenhuma equipe cadastrada ainda.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
