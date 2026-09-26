"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CircleDot, GitBranch, Link2, Plus } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  fetchRepositories,
  removeRepository,
  type Repository,
} from "@/lib/api";
import { Transition } from "@/components/transition";
import { RepositoriesModal } from "@/components/dashboard/modals/repositories";
import { CreateIssueModal } from "@/components/dashboard/modals/issues";

export default function RepositoriesPage() {
  const router = useRouter();
  const { token, loading } = useAuth();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newIssueFor, setNewIssueFor] = useState<string | null>(null);

  async function reload(authToken: string) {
    const data = await fetchRepositories(authToken);
    setRepos(data);
  }

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadRepos() {
      try {
        await reload(authToken);
      } catch (error) {
        console.error(error);
        setError("Não foi possível carregar os repositórios neste momento.");
      } finally {
        setLoadingRepos(false);
      }
    }

    loadRepos();
  }, [loading, router, token]);

  async function handleRemove(fullName: string) {
    if (!token) return;

    if (!window.confirm(`Arquivar "${fullName}" do Anota Aí?`)) return;

    setError(null);
    try {
      await removeRepository(token, fullName);
      setRepos((current) =>
        current.filter((repo) => repo.full_name !== fullName),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o repositório.",
      );
    }
  }

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Repositórios
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Escolha quais repositórios o Anota Aí deve usar no seu workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Adicionar novo repositório
        </button>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loadingRepos ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
          Carregando repositórios…
        </div>
      ) : repos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
          <p className="text-sm text-stone-500">
            Nenhum repositório adicionado ainda.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {repos.map((repo) => (
            <article
              key={repo.full_name}
              className="rounded-3xl border border-stone-200 bg-gradient-to-t from-stone-100 to-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <a
                    href={repo.html_url ? repo.html_url : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 bg-stone-100 text-stone-500"
                  >
                    <GitBranch className="h-4 w-4" />
                  </a>
                  <div className="min-w-0 truncate text-sm font-medium text-stone-800 cursor-context-menu">
                    <Transition first={repo.name} second={repo.full_name} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-700 ring-1 ring-stone-200">
                    {repo.private ? "Privado" : "Público"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewIssueFor(repo.full_name)}
                    title={`Crear issue instantánea em ${repo.full_name}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-brand-light hover:text-brand cursor-pointer"
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    Criar nova issue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(repo.full_name)}
                    aria-label={`Arquivar o ${repo.full_name}`}
                    title={`Arquivar o repositório "${repo.full_name}" do Anota Aí?`}
                    className="rounded-full p-1.5 text-stone-400 transition hover:bg-brand-light hover:text-brand cursor-pointer"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm text-stone-600">
                {repo.description || "Sem descrição disponível."}
              </p>
            </article>
          ))}
        </div>
      )}

      {addOpen ? (
        <RepositoriesModal
          token={token}
          addedFullNames={repos.map((repo) => repo.full_name)}
          onClose={() => setAddOpen(false)}
          onAdded={() => reload(token)}
        />
      ) : null}

      {newIssueFor ? (
        <CreateIssueModal
          token={token}
          repoFullName={newIssueFor}
          onClose={() => setNewIssueFor(null)}
          onCreate={() => reload(token)}
        />
      ) : null}
    </>
  );
}
