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

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadTeams() {
      try {
        const data = await fetchTeams(authToken);
        setTeams(data);

        const result: Record<string, TeamMember[]> = {};
        for (const team of data) {
          result[team.id] = await fetchTeamMembers(authToken, team.id);
        }
        setMembersByTeam(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
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
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          Nova equipe
        </button>
      </div>

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
                    {team.name}
                  </h2>
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
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    Nenhum membro adicionado a esta equipe.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
