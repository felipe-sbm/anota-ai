"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import {
  addRepositories,
  fetchGithubRepos,
  type GithubRepo,
} from "@/lib/api";

type RepositoriesModalProps = {
  token: string;
  /** nomes completos dos repositórios já adicionados ao sistema */
  addedFullNames: string[];
  onClose: () => void;
  /** chamado após adicionar, para recarregar a lista */
  onAdded: () => void | Promise<void>;
};

export function RepositoriesModal({
  token,
  addedFullNames,
  onClose,
  onAdded,
}: RepositoriesModalProps) {
  // null quer dizer que ainda está carregando os repositórios do github
  const [available, setAvailable] = useState<GithubRepo[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const added = useMemo(() => new Set(addedFullNames), [addedFullNames]);

  useEffect(() => {
    let active = true;

    async function loadAvailable() {
      try {
        const githubRepos = await fetchGithubRepos(token);
        if (!active) return;
        setAvailable(
          githubRepos.filter((repo) => !added.has(repo.full_name)),
        );
      } catch (fetchError) {
        console.error(fetchError);
        if (!active) return;
        setAvailable([]);
        setError(
          "Não foi possível buscar seus repositórios no GitHub. Tente novamente.",
        );
      }
    }

    loadAvailable();

    return () => {
      active = false;
    };
  }, [token, added]);

  function toggleRepo(fullName: string) {
    setSelected((current) => ({
      ...current,
      [fullName]: !current[fullName],
    }));
  }

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  async function handleAdd() {
    const fullNames = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([fullName]) => fullName);

    if (fullNames.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const result = await addRepositories(token, fullNames);
      if (result.errors.length) {
        setError(result.errors[0].error);
        return;
      }
      onAdded();
      onClose();
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Não foi possível adicionar os repositórios.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        className="absolute inset-0 bg-stone-700/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-stone-900">
              Adicionar repositórios
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Escolha quais repositórios o Anota Aí deve usar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="mx-5 mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex-1 space-y-2 items-center justify-center overflow-y-auto p-5">
          {available === null ? (
            <p className="py-8 text-center text-sm text-stone-500 cursor-wait">
              Buscando seus repositórios no GitHub…
            </p>
          ) : available.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Todos os seus repositórios já foram adicionados.
            </p>
          ) : (
            available.map((repo) => {
              const isSelected = Boolean(selected[repo.full_name]);
              return (
                <button
                  key={repo.full_name}
                  type="button"
                  onClick={() => toggleRepo(repo.full_name)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                    isSelected
                      ? "border-brand bg-brand-light/50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {repo.full_name}
                      </p>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                        {repo.private ? "Privado" : "Público"}
                      </span>
                    </div>
                    {repo.description ? (
                      <p className="mt-1 truncate text-xs text-stone-500">
                        {repo.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-stone-400">
                        Sem descrição informada!
                      </p>
                    )}
                  </div>

                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-start rounded-full border transition ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-stone-300 bg-white text-transparent"
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4">
          <button
            type="button"
            onClick={handleAdd}
            disabled={selectedCount === 0 || saving}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}