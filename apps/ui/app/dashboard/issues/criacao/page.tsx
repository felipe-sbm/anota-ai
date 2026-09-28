"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDot,
  LoaderCircle,
  Plus,
  Tag,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MarkdownEditor } from "@/components/dashboard/text_editor";
import { useAuth } from "@/lib/auth";
import {
  createInstantIssue,
  fetchRepoMeta,
  fetchRepositories,
  type IssuePriority,
  type RepoMeta,
  type Repository,
} from "@/lib/api";
import { PRIORITY_LABELS, PRIORITY_DOT } from "@/components/dashboard/table";

export default function CreateIssuesPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoFullName, setRepoFullName] = useState("");
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [milestone, setMilestone] = useState("");
  const [project, setProject] = useState("");
  const [points, setPoints] = useState(0);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }
    if (!token) return;
    fetchRepositories(token)
      .then((items) => {
        setRepositories(items);
        const requestedRepo = new URLSearchParams(window.location.search).get(
          "repo",
        );
        const selectedRepo =
          items.find((item) => item.full_name === requestedRepo) ?? items[0];
        if (selectedRepo) setRepoFullName(selectedRepo.full_name);
      })
      .catch(() => setError("Não foi possível carregar seus repositórios."));
  }, [loading, router, token]);

  useEffect(() => {
    if (!token || !repoFullName) return;
    fetchRepoMeta(token, repoFullName)
      .then((nextMeta) => {
        setMeta(nextMeta);
        setLabels([]);
        setAssignee("");
        setMilestone("");
        setProject("");
      })
      .catch(() =>
        setError("Não foi possível carregar as opções deste repositório."),
      );
  }, [repoFullName, token]);

  function toggleLabel(label: string) {
    setLabels((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !repoFullName || !title.trim()) {
      setError("Escolha um repositório e informe o título da issue.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createInstantIssue(token, {
        repo_full_name: repoFullName,
        title: title.trim(),
        body,
        assignee: assignee || null,
        labels,
        milestone: milestone ? Number(milestone) : null,
        project: project ? Number(project) : null,
        points,
        priority,
      });
      if (result.issue.html_url) window.location.assign(result.issue.html_url);
      else router.push("/dashboard/issues");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível criar a issue.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !token) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-stone-400">
        Carregando…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl">
      {error ? (
        <p className="mb-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-5">
          <div>
            <label
              htmlFor="issue-title"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Título
            </label>
            <input
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              required
              maxLength={256}
              placeholder="Título da issue"
              className="w-full rounded-full border border-stone-300 px-3 py-1.5 text-base text-sm text-stone-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div>
            <label
              htmlFor="issue-body"
              className="mb-2 text-sm font-medium text-stone-700"
            >
              Descrição
            </label>
            <MarkdownEditor
              id="issue-body"
              value={body}
              onChange={setBody}
              minRows={16}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !repoFullName}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition cursor-pointer hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CircleDot className="h-4 w-4" />
            )}
            {saving ? "Criando…" : "Criar issue"}
          </button>
        </section>

        <aside className="space-y-5 rounded-2xl border border-stone-200 bg-stone-100 p-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Repositório
            </label>
            <div className="relative">
              <select
                value={repoFullName}
                onChange={(event) => setRepoFullName(event.target.value)}
                disabled={!repositories.length}
                className="w-full appearance-none rounded-full border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition hover:border-stone-400 focus:border-brand disabled:bg-stone-100 cursor-pointer"
              >
                {!repositories.length ? (
                  <option value="">Nenhum repositório adicionado</option>
                ) : (
                  repositories.map((repo) => (
                    <option key={repo.full_name} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))
                )}
              </select>
              <div className="bg-gradient-to-l from-white from-75% to-transparent w-7 h-5 rounded-l-full pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown className="h-4 w-4 mt-0.5 ml-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Responsável
            </label>
            <div className="relative">
              <select
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                disabled={!meta}
                className="w-full appearance-none rounded-full border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition hover:border-stone-400 focus:border-brand disabled:bg-stone-100 cursor-pointer"
              >
                <option value="">Sem responsável</option>
                {meta?.assignees.map((item) => (
                  <option key={item.login} value={item.login}>
                    {item.login}
                  </option>
                ))}
              </select>

              <div className="bg-gradient-to-l from-white from-75% to-transparent w-7 h-5 rounded-l-full pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown className="h-4 w-4 mt-0.5 ml-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {meta?.labels.map((label) => (
                <button
                  type="button"
                  key={label.name}
                  onClick={() => toggleLabel(label.name)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition duration-300 cursor-pointer ${labels.includes(label.name) ? "text-stone-950 ring-stone-200" : "bg-white text-stone-600 ring-stone-200 hover:ring-stone-400 hover:bg-stone-100"}`}
                  style={
                    labels.includes(label.name)
                      ? { backgroundColor: `#${label.color}` }
                      : undefined
                  }
                >
                  {labels.includes(label.name) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {label.name}
                </button>
              ))}
              {meta && !meta.labels.length ? (
                <span className="text-xs text-stone-400">
                  Nenhuma <i>label</i> disponível
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Milestone
            </label>
            <div className="relative">
              <select
                value={milestone}
                onChange={(event) => setMilestone(event.target.value)}
                className="w-full appearance-none rounded-full border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition hover:border-stone-400 focus:border-brand disabled:bg-stone-100 cursor-pointer"
              >
                <option value="">Sem milestone</option>
                {meta?.milestones.map((item) => (
                  <option key={item.number} value={item.number ?? ""}>
                    {item.title}
                  </option>
                ))}
              </select>
              <div className="bg-gradient-to-l from-white from-75% to-transparent w-7 h-5 rounded-l-full pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown className="h-4 w-4 mt-0.5 ml-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Projeto
            </label>
            <div className="relative">
              <select
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="w-full appearance-none rounded-full border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition hover:border-stone-400 focus:border-brand disabled:bg-stone-100 cursor-pointer"
              >
                <option value="">Sem projeto</option>
                {meta?.projects.map((item) => (
                  <option
                    key={item.number ?? item.id}
                    value={item.number ?? item.id ?? ""}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="bg-gradient-to-l from-white from-75% to-transparent w-7 h-5 rounded-l-full pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown className="h-4 w-4 mt-0.5 ml-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Prioridade
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-stone-200/70 p-1">
              {PRIORITY_LABELS &&
                Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setPriority(key as IssuePriority)}
                    className={`flex rounded-full px-1 py-1.5 text-xs font-medium transition justify-center items-center cursor-pointer ${priority === key ? "bg-white text-stone-800" : "text-stone-500 hover:text-stone-800"}`}
                  >
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${priority === key ? PRIORITY_DOT[key as IssuePriority] : "bg-stone-500"}`}
                    />
                    {value}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-600">
              Pontos
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={points}
              onChange={(event) =>
                setPoints(Math.max(0, Number(event.target.value) || 0))
              }
              className="w-full appearance-none rounded-full border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition hover:border-stone-400 focus:border-brand disabled:bg-stone-100 cursor-pointer"
            />
          </div>
        </aside>
      </div>
    </form>
  );
}
