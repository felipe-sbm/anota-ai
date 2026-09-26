"use client";

import { useState } from "react";
import { ChevronDown, CircleDot, X } from "lucide-react";

import { createInstantIssue, type IssuePriority } from "@/lib/api";

const PRIORITY_OPTIONS: Array<{ value: IssuePriority; label: string }> = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

// cria uma issue instantânea (botão nova issue no repositório)

type CreateIssueModalProps = {
  token: string;
  repoFullName: string;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
};

export function CreateIssueModal({
  token,
  repoFullName,
  onClose,
  onCreate,
}: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [points, setPoints] = useState(0);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createInstantIssue(token, {
        repo_full_name: repoFullName,
        title: title.trim(),
        body: body.trim(),
        assignee: assignee.trim() || null,
        points,
        priority,
      });
      onCreate();
      onClose();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Não foi possível criar a issue.",
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

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-3xl bg-white ring-1 ring-stone-200">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-stone-900">
              Criar nova issue
            </h2>
            <p className="text-sm text-stone-500">
              Aviso do dev: este modal é temporário, vou fazer uma página melhor
              depois!
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

        <div className="space-y-4 p-5">
          <div>
            <label
              htmlFor="issue-title"
              className="block text-sm font-medium text-stone-700"
            >
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="O que precisa ser feito?"
              className="w-full rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="issue-description"
              className="block text-sm font-medium text-stone-700"
            >
              Descrição
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="Detalles da issue (opcional)"
              className="w-full resize-y rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="issue-assignee"
              className="block text-sm font-medium text-stone-700"
            >
              Responsável pela tarefa
            </label>
            <input
              id="issue-assignee"
              type="text"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              placeholder="Ex.: felipe-sbm"
              className="w-full rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="issue-points"
                className="block text-sm font-medium text-stone-700"
              >
                Pontos
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={points}
                onChange={(event) => setPoints(Number(event.target.value) || 0)}
                className="w-full [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="issue-priority"
                className="block text-sm font-medium text-stone-700"
              >
                Prioridade
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as IssuePriority)
                  }
                  className="w-full appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-800 focus:border-brand focus:outline-none"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <CircleDot className="h-4 w-4" />
            {saving ? "Criando..." : "Criar tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}
