"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, UserRoundPlus } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  fetchTeams,
  type TeamResponse,
  fetchTeamMembers,
  type TeamMember,
  createTeam,
  updateTeam,
  addTeamMembers,
  removeTeamMember,
} from "@/lib/api";

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

export default function TeamsPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<
    Record<string, TeamMember[]>
  >({});
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reloadTeams(authToken: string) {
    const data = await fetchTeams(authToken);
    setTeams(data);
    const result: Record<string, TeamMember[]> = {};
    await Promise.all(
      data.map(async (team) => {
        result[team.id] = await fetchTeamMembers(authToken, team.id);
      }),
    );
    setMembersByTeam(result);
  }

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadTeams() {
      try {
        await reloadTeams(authToken);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
  }, [loading, router, token]);

  async function handleCreateTeam() {
    if (!token || !newTeamName.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      await createTeam(token, newTeamName.trim());
      setNewTeamName("");
      await reloadTeams(token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a equipe.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameTeam(teamId: string) {
    if (!token || !editingTeamName.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateTeam(token, teamId, editingTeamName.trim());
      setEditingTeamId(null);
      await reloadTeams(token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a equipe.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(teamId: string) {
    if (!token) return;
    const login = memberInputs[teamId]?.trim();
    if (!login) return;
    setSaving(true);
    setActionError(null);
    try {
      await addTeamMembers(token, teamId, [login]);
      setMemberInputs((current) => ({ ...current, [teamId]: "" }));
      await reloadTeams(token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o membro.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(teamId: string, githubLogin: string) {
    if (!token) return;
    setSaving(true);
    setActionError(null);
    try {
      await removeTeamMember(token, teamId, githubLogin);
      await reloadTeams(token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o membro.",
      );
    } finally {
      setSaving(false);
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
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Equipes
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Grupos e membros cadastrados para o seu workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewTeamName((value) => value || "Nova equipe")}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          Nova equipe
        </button>
      </div>

      {newTeamName ? (
        <form
          className="mb-5 flex flex-col gap-2 rounded-2xl border border-brand/20 bg-brand-light/30 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateTeam();
          }}
        >
          <input
            autoFocus
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
            placeholder="Nome da equipe"
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Criar
          </button>
          <button
            type="button"
            onClick={() => setNewTeamName("")}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600"
          >
            Cancelar
          </button>
        </form>
      ) : null}

      {actionError ? (
        <p className="mb-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {loadingTeams ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
          Carregando equipes…
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
          Nenhuma equipe cadastrada ainda.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {teams.map((team) => (
            <article
              key={team.id}
              className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Equipe
                  </p>
                  <h2 className="mt-1 text-xl font-medium text-stone-900">
                    {editingTeamId === team.id ? (
                      <input
                        value={editingTeamName}
                        onChange={(event) =>
                          setEditingTeamName(event.target.value)
                        }
                        className="w-full rounded-lg border border-stone-200 px-2 py-1 text-base outline-none focus:border-brand"
                      />
                    ) : (
                      team.name
                    )}
                  </h2>
                  <div className="mt-2 flex gap-2">
                    {editingTeamId === team.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRenameTeam(team.id)}
                          disabled={saving}
                          className="text-xs font-medium text-brand"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="text-xs text-stone-500"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeamId(team.id);
                          setEditingTeamName(team.name);
                        }}
                        className="text-xs font-medium text-brand"
                      >
                        Editar nome
                      </button>
                    )}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                  <Users className="h-3.5 w-3.5" />
                  {team.member_count}
                </div>
              </div>

              <p className="mt-3 text-xs text-stone-500">
                Criada em {formatDate(team.created_at)}
              </p>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700">
                  <UserRoundPlus className="h-4 w-4" />
                  Membros
                </div>

                {membersByTeam[team.id]?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {membersByTeam[team.id].map((member) => (
                      <span
                        key={`${team.id}-${member.github_login}`}
                        className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700"
                      >
                        @{member.github_login}
                        <button
                          type="button"
                          aria-label={`Remover @${member.github_login}`}
                          onClick={() =>
                            handleRemoveMember(team.id, member.github_login)
                          }
                          className="ml-1 text-stone-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    Nenhum membro adicionado a esta equipe.
                  </p>
                )}
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAddMember(team.id);
                  }}
                >
                  <input
                    value={memberInputs[team.id] ?? ""}
                    onChange={(event) =>
                      setMemberInputs((current) => ({
                        ...current,
                        [team.id]: event.target.value,
                      }))
                    }
                    placeholder="login do GitHub"
                    className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
