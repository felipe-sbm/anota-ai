"use client";

import { ChevronDown, Search } from "lucide-react";

import { type IssuePriority, type IssueSource } from "@/lib/api";

const SORT_OPTIONS = [
  { value: "newest", label: "Mais recente" },
  { value: "oldest", label: "Mais antiga" },
  { value: "points_desc", label: "Maior pontuação" },
  { value: "points_asc", label: "Menor pontuação" },
  { value: "priority_high", label: "Alta prioridade" },
  { value: "priority_low", label: "Baixa prioridade" },
];

type SourceFilter = "all" | IssueSource;
type PriorityFilter = "all" | IssuePriority;
type StateFilter = "all" | "open" | "closed";

type IssueFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (value: SourceFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  stateFilter: StateFilter;
  onStateFilterChange: (value: StateFilter) => void;
  sort: string;
  onSortChange: (value: string) => void;
};

export function IssueFilters({
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  stateFilter,
  onStateFilterChange,
  sort,
  onSortChange,
}: IssueFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por: título, repositório, id, etc."
          className="w-full rounded-full border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 focus:border-brand focus:outline-none"
        />
      </div>

      <div className="relative">
        <select
          value={sourceFilter}
          onChange={(event) =>
            onSourceFilterChange(event.target.value as SourceFilter)
          }
          className="appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 focus:border-brand focus:outline-none"
        >
          <option value="all">Origem: todas</option>
          <option value="external">Externa</option>
          <option value="draft">Rascunho</option>
          <option value="anota_ai">Anota Aí!</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>

      <div className="relative">
        <select
          value={priorityFilter}
          onChange={(event) =>
            onPriorityFilterChange(event.target.value as PriorityFilter)
          }
          className="appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 focus:border-brand focus:outline-none"
        >
          <option value="all">Prioridade: todas</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>

      <div className="relative">
        <select
          value={stateFilter}
          onChange={(event) =>
            onStateFilterChange(event.target.value as StateFilter)
          }
          className="appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 focus:border-brand focus:outline-none"
        >
          <option value="open">Estado: Abertas</option>
          <option value="closed">Fechadas</option>
          <option value="all">Todas</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>

      <div className="relative">
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          className="appearance-none rounded-full border border-stone-200 bg-white px-3 py-2 pr-9 text-sm text-stone-700 focus:border-brand focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      </div>
    </div>
  );
}
