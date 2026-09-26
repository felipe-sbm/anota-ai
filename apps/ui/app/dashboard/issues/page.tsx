"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, TriangleAlert } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  confirmIssues,
  deleteIssue,
  fetchIssues,
  updateIssue,
  type Issue,
  type IssuePriority,
  type IssueSource,
} from "@/lib/api";
import { IssueFilters } from "@/components/dashboard/filters";
import { IssuesTable } from "@/components/dashboard/table";

function rankPriority(priority: IssuePriority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

export default function IssuesPage() {
  const router = useRouter();
  const { token, loading } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncResult] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | IssueSource>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | IssuePriority>(
    "all",
  );
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "closed">(
    "open",
  );
  const [sort, setSort] = useState("newest");

  async function reload(authToken: string) {
    const data = await fetchIssues(authToken);
    setIssues(data);
  }

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadIssues() {
      try {
        await reload(authToken);
      } catch (loadError) {
        console.error(loadError);
        setError("Não foi possível carregar as issues neste momento.");
      } finally {
        setLoadingIssues(false);
      }
    }

    loadIssues();
  }, [loading, router, token]);

  async function handleQuickConfirm(issue: Issue) {
    if (!token) return;

    if (!window.confirm(`Enviar "${issue.title}" ao GitHub?`)) return;

    setError(null);
    try {
      const result = await confirmIssues(token, [issue.id]);
      const item = result.results?.[0];
      if (!item?.ok) {
        setError(item?.error ?? "Não foi possível confirmar a issue.");
        return;
      }
      await reload(token);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Não foi possível confirmar a issue.",
      );
    }
  }

  async function handleDelete(issue: Issue) {
    if (!token) return;

    if (!window.confirm(`Descartar o rascunho "${issue.title}"?`)) return;

    setError(null);
    try {
      await deleteIssue(token, issue.id);
      setIssues((current) => current.filter((item) => item.id !== issue.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível apagar o rascunho :(",
      );
    }
  }

  async function handleUpdatePoints(issue: Issue, points: number) {
    if (!token) return;
    if (points === issue.points) return;

    setError(null);
    try {
      await updateIssue(token, issue.id, { points });
      await reload(token);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar os pontos :(",
      );
    }
  }

  async function handleUpdatePriority(issue: Issue, priority: IssuePriority) {
    if (!token) return;
    if (priority === issue.priority) return;

    setError(null);
    try {
      await updateIssue(token, issue.id, { priority });
      await reload(token);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar a prioridade :(",
      );
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = issues.filter((issue) => {
      if (sourceFilter !== "all" && issue.source !== sourceFilter) return false;
      if (priorityFilter !== "all" && issue.priority !== priorityFilter) {
        return false;
      }
      if (stateFilter !== "all" && issue.state !== stateFilter) return false;
      if (query) {
        const haystack =
          `${issue.title} ${issue.body ?? ""} ${issue.repo_full_name} ${issue.number ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const bySort = (a: Issue, b: Issue) => {
      switch (sort) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "points_desc":
          return b.points - a.points;
        case "points_asc":
          return a.points - b.points;
        case "priority_high":
          return rankPriority(b.priority) - rankPriority(a.priority);
        case "priority_low":
          return rankPriority(a.priority) - rankPriority(b.priority);
        case "newest":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    };

    // as issues fechadas ficam sempre ao final quando se visualiza o lote misto (todos).
    const open = list.filter((issue) => issue.state === "open");
    const closed = list.filter((issue) => issue.state !== "open");

    open.sort(bySort);
    closed.sort(bySort);

    return [...open, ...closed];
  }, [issues, search, sourceFilter, priorityFilter, stateFilter, sort]);

  const pendingDrafts = useMemo(
    () =>
      issues.filter(
        (issue) => issue.source === "draft" && issue.github_issue_id == null,
      ),
    [issues],
  );

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Issues
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Tarefas dos repositórios, rascunhos das reuniões e issues criadas
            pelo sistema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingDrafts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <TriangleAlert className="h-3.5 w-3.5" />
              {pendingDrafts.length}{" "}
              {pendingDrafts.length === 1
                ? "rascunho pendente"
                : "rascunhos pendentes"}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {syncResult ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {syncResult}
        </p>
      ) : null}

      {loadingIssues ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
          Carregando issues…
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-3 text-base font-medium text-stone-800">
            Ainda não há issues por aqui...
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Adicione repositórios (as issues do GitHub serão puxadas
            automaticamente), grave uma reunião para crear rascunhos ou use o
            botão <i>&quot;Criar nova Issue&quot;</i> na página de repositórios.
          </p>
        </div>
      ) : (
        <>
          <IssueFilters
            search={search}
            onSearchChange={setSearch}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            stateFilter={stateFilter}
            onStateFilterChange={setStateFilter}
            sort={sort}
            onSortChange={setSort}
          />

          <IssuesTable
            issues={filtered}
            onConfirm={handleQuickConfirm}
            onDelete={handleDelete}
            onUpdatePoints={handleUpdatePoints}
            onUpdatePriority={handleUpdatePriority}
          />
        </>
      )}
    </>
  );
}
