"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDot,
  CircleDotDashed,
  ExternalLink,
  GitBranch,
  Search,
  Trash2,
} from "lucide-react";

import { type Issue, type IssuePriority } from "@/lib/api";
import { Transition } from "@/components/transition";

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const PRIORITY_DOT: Record<IssuePriority, string> = {
  high: "bg-red-600",
  medium: "bg-yellow-400",
  low: "bg-green-600",
};

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

function truncateTitle(title: string, maxLength = 50) {
  return title.length > maxLength ? `${title.slice(0, maxLength)}…` : title;
}

type IssuesTableProps = {
  issues: Issue[];
  onConfirm: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
  onUpdatePoints: (issue: Issue, points: number) => void;
  onUpdatePriority: (issue: Issue, priority: IssuePriority) => void;
};

export function IssuesTable({
  issues,
  onConfirm,
  onDelete,
  onUpdatePoints,
  onUpdatePriority,
}: IssuesTableProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
        <Search className="mx-auto h-8 w-8 text-stone-300" />
        <p className="mt-3 text-sm text-stone-500">
          Nenhuna issue coincide com os filtros atuais.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="min-w-full divide-y divide-stone-200 text-sm">
        <thead className="bg-stone-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Título
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Repositório
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Prioridade
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Pontos
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Criada em
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onConfirm={() => onConfirm(issue)}
              onDelete={() => onDelete(issue)}
              onUpdatePoints={(points) => onUpdatePoints(issue, points)}
              onUpdatePriority={(priority) => onUpdatePriority(issue, priority)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueRow({
  issue,
  onConfirm,
  onDelete,
  onUpdatePoints,
  onUpdatePriority,
}: {
  issue: Issue;
  onConfirm: () => void;
  onDelete: () => void;
  onUpdatePoints: (points: number) => void;
  onUpdatePriority: (priority: IssuePriority) => void;
}) {
  const isDraftPending =
    issue.source === "draft" && issue.github_issue_id == null;
  const displayTitle = truncateTitle(issue.title);
  const [editing, setEditing] = useState<"points" | "priority" | null>(null);

  return (
    <tr className="hover:bg-stone-50">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            {issue.html_url ? (
              <a
                href={issue.html_url}
                target="_blank"
                rel="noreferrer"
                title={`Clique para visualizar a tarefa completa no GitHub: ${issue.title}`}
                aria-label="Visualizar tarefa completa no GitHub"
                className="flex items-center truncate text-sm font-medium text-stone-900 cursor-pointer gap-1"
              >
                {issue.source === "anota_ai" ? (
                  <Image
                    src="/icons/theme/icon.webp"
                    alt="Ícone do Anota Aí!"
                    title="Tarefa criada por meio do Anota Aí. Obrigado por nos usar! 😊"
                    loading="lazy"
                    width={40}
                    height={40}
                    className="h-4 w-auto"
                  />
                ) : null}
                {displayTitle}
              </a>
            ) : (
              <p
                title="Rascunho local, sem issue no GitHub"
                aria-label="Rascunho local, sem issue no GitHub"
                className="truncate text-sm font-medium text-stone-900 cursor-help"
              >
                {displayTitle}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-stone-500">
              {issue.number ? `#${issue.number}` : "—"}
              {issue.assignee ? ` · @${issue.assignee}` : null}
              {issue.state === "open" ? (
                <p
                  className="inline-flex items-center gap-1 cursor-default hover:text-green-700 transition"
                  title="Esta issue ainda está aberta e precisa ser trabalhada."
                >
                  {" "}
                  &nbsp; &middot; <CircleDot className="h-2.5 w-2.5" /> em
                  aberto
                </p>
              ) : (
                <p
                  className="inline-flex items-center gap-1 cursor-default hover:text-purple-700 transition"
                  title="Esta issue foi fechada, o progesso foi concluído ou cancelado."
                >
                  &nbsp; &middot; <CircleCheck className="h-2.5 w-2.5" />{" "}
                  fechada
                </p>
              )}
              {issue.state === "draft" ? (
                <p
                  className="inline-flex items-center gap-1 cursor-default"
                  title="Esta issue é um rascunho local, ainda não foi enviada ao GitHub."
                >
                  &nbsp; &middot; <CircleDotDashed className="h-2.5 w-2.5" />{" "}
                  rascunho
                </p>
              ) : null}
            </p>
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
        <a
          href={
            issue.repo_full_name
              ? `https://github.com/${issue.repo_full_name}`
              : ""
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-stone-500 hover:text-brand hover:underline decoration-dotted transition"
        >
          <GitBranch className="h-3.5 w-3.5" />
          {issue.repo_full_name || "Sem repo"}
        </a>
      </td>

      <td
        onClick={
          editing === "priority" ? undefined : () => setEditing("priority")
        }
        title="Deseja alterar a prioridade desta tarefa?"
        className="group cursor-pointer px-4 py-3"
      >
        {editing === "priority" ? (
          <PriorityInlineSelect
            value={issue.priority}
            onChange={(priority) => {
              setEditing(null);
              onUpdatePriority(priority);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing("priority")}
            aria-label={`Editar prioridade: ${displayTitle}`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full min-w-[4rem] text-[11px] font-medium text-stone-600 group-hover:text-brand transition"
          >
            <span
              className={`h-2 w-2 rounded-full ${PRIORITY_DOT[issue.priority]} group-hover:bg-brand`}
            />
            <Transition
              first={PRIORITY_LABELS[issue.priority]}
              second="Editar?"
              ownGroup={false}
            />
          </button>
        )}
      </td>

      <td
        onClick={editing === "points" ? undefined : () => setEditing("points")}
        title="Deseja alterar a quantidade de pontos desta tarefa?"
        className="group whitespace-nowrap cursor-pointer px-4 py-3 text-right"
      >
        {editing === "points" ? (
          <PointsInlineInput
            value={issue.points}
            onSave={(points) => {
              setEditing(null);
              onUpdatePoints(points);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing("points")}
            aria-label={`Editar pontos: ${displayTitle}`}
            className="block w-full cursor-pointer text-right font-mono text-xs font-medium text-stone-700 transition group-hover:text-brand"
          >
            <span className="block text-right">
              <Transition
                first={`${issue.points} pts`}
                second="Editar?"
                ownGroup={false}
              />
            </span>
          </button>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
        <span className="inline-flex items-center">
          {formatDate(issue.created_at)}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {issue.html_url ? (
            <button
              type="button"
              onClick={() => window.open(issue.html_url ?? "", "_blank")}
              title="Ir para o GitHub"
              aria-label="Ir para o GitHub"
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : null}

          {isDraftPending ? (
            <button
              type="button"
              onClick={onConfirm}
              title="Confirmar e enviar ao GitHub"
              aria-label="Confirmar e enviar ao GitHub"
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer"
            >
              <Check className="h-4 w-4" />
            </button>
          ) : null}

          {issue.source === "draft" ? (
            <button
              type="button"
              onClick={onDelete}
              title="Eliminar rascunho"
              aria-label="Eliminar rascunho"
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function PointsInlineInput({
  value,
  onSave,
  onCancel,
}: {
  value: number;
  onSave: (points: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(false);

  function commit() {
    if (committed) return;
    setCommitted(true);
    onSave(Math.min(100, Math.max(0, draft || 0)));
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      max={100}
      value={draft}
      onChange={(event) => setDraft(Number(event.target.value) || 0)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          onCancel();
        }
      }}
      onBlur={commit}
      aria-label="Editar pontos da issue"
      className="w-20 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-right font-mono text-xs text-stone-700 focus:border-brand focus:outline-none"
    />
  );
}

function PriorityInlineSelect({
  value,
  onChange,
  onCancel,
}: {
  value: IssuePriority;
  onChange: (priority: IssuePriority) => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative">
      <select
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value as IssuePriority)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        aria-label="Editar prioridade da issue"
        className="appearance-none rounded-full border border-stone-200 bg-white px-2 py-0.5 pr-6 text-[11px] font-medium text-stone-800 focus:border-brand focus:outline-none"
      >
        <option value="low">Baixa</option>
        <option value="medium">Média</option>
        <option value="high">Alta</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
    </div>
  );
}
