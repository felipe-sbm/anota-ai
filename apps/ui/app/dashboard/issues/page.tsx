"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  FolderKanban,
  GitBranch,
  GitCommitHorizontal,
  Link2,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { fetchGithubRepos, type GithubRepo } from "@/lib/api";

export default function IssuesPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadRepos() {
      try {
        const data = await fetchGithubRepos(authToken);
        setRepos(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRepos(false);
      }
    }

    loadRepos();
  }, [loading, router, token]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-stone-900">
          Tarefas e repositórios
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Repositórios do GitHub disponíveis para criação de tarefas (issues).
        </p>
      </div>

      {loadingRepos ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
          Carregando repositórios…
        </div>
      ) : repos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
          Nenhum repositório foi encontrado para sua conta.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {repos.map((repo) => (
            <article
              key={repo.id}
              className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand ring-1 ring-stone-200">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-stone-900">
                      {repo.name}
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      {repo.full_name}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-700 ring-1 ring-stone-200">
                  {repo.private ? "Privado" : "Público"}
                </div>
              </div>

              <p className="mt-4 text-sm text-stone-600">
                {repo.description ||
                  "Sem descrição disponível para este repositório."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-stone-400">
                    <GitBranch className="h-3.5 w-3.5" />
                    Branch
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-900">
                    {repo.default_branch || "main"}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-stone-400">
                    <FolderKanban className="h-3.5 w-3.5" />
                    Issues
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-900">
                    Prontas
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-stone-400">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />
                    Status
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-900">
                    {repo.private ? "Acesso restrito" : "Disponível"}
                  </p>
                </div>
              </div>

              {repo.html_url ? (
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
                >
                  <Link2 className="h-4 w-4" />
                  Abrir no GitHub
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
