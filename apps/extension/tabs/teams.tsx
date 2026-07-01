import React, { useEffect, useMemo, useState } from "react"

import { API_BASE, AUTH_TOKEN_KEY } from "../config"

type Team = {
  id: string
  name: string
  member_count: number
  created_at: string
}

type Member = { github_login: string; added_at: string }

type ApiError = { detail?: string }

function getToken(): Promise<string | undefined> {
  const chromeAny = (window as any).chrome
  return chromeAny?.storage?.local
    ?.get(AUTH_TOKEN_KEY)
    .then((resp: any) => resp?.[AUTH_TOKEN_KEY] as string | undefined)
}

function clearTokenAndReload() {
  const chromeAny = (window as any).chrome
  if (chromeAny?.storage?.local) {
    chromeAny.storage.local.remove(AUTH_TOKEN_KEY).then(() => {
      window.location.reload()
    })
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  } catch {
    return iso
  }
}

export default function TeamsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")

  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const [newTeamName, setNewTeamName] = useState("")
  const [newMembersCsv, setNewMembersCsv] = useState("")

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  )

  useEffect(() => {
    loadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      loadMembers(selectedTeamId)
    } else {
      setMembers([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId])

  const loadTeams = async () => {
    setLoading(true)
    setError("")

    try {
      const token = await getToken()
      if (!token) {
        setError("Sessão expirada. Faça login novamente.")
        return
      }

      const response = await fetch(`${API_BASE}/api/teams`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.status === 401) {
        clearTokenAndReload()
        return
      }
      if (!response.ok) throw new Error("Erro ao carregar equipes")
      const data = await response.json()

      const list = (data?.teams || []) as Team[]
      setTeams(list)

      if (!selectedTeamId && list.length > 0) setSelectedTeamId(list[0].id)
    } catch (e: any) {
      const msg = (e?.message as string) || "Erro ao carregar equipes."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (teamId: string) => {
    setMembersLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/teams/${teamId}/members`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error("Erro ao carregar membros")
      const data = await response.json()
      setMembers(data?.members || [])
    } catch (e: any) {
      console.warn("Falha ao carregar membros:", e?.message)
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return

    setError("")
    try {
      const token = await getToken()
      if (!token) throw new Error("Sessão expirada. Faça login novamente.")

      const resp = await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newTeamName.trim() })
      })
      if (!resp.ok) {
        const errData = (await resp.json().catch(() => null)) as ApiError | null
        throw new Error(errData?.detail || "Falha ao criar equipe")
      }

      setNewTeamName("")
      await loadTeams()
    } catch (e: any) {
      setError(e?.message || "Falha ao criar equipe")
    }
  }

  const removeMember = async (githubLogin: string) => {
    if (!selectedTeamId) return
    if (!confirm(`Remover ${githubLogin} da equipe?`)) return

    try {
      const token = await getToken()
      if (!token) throw new Error("Sessão expirada. Faça login novamente.")

      const resp = await fetch(
        `${API_BASE}/api/teams/${selectedTeamId}/members/${githubLogin}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (!resp.ok) {
        const errData = (await resp.json().catch(() => null)) as ApiError | null
        throw new Error(errData?.detail || "Falha ao remover membro")
      }

      setMembers((prev) => prev.filter((m) => m.github_login !== githubLogin))
    } catch (e: any) {
      setError(e?.message || "Falha ao remover membro")
    }
  }

  const addMembersToTeam = async () => {
    if (!selectedTeamId) return

    const membersList = newMembersCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((m) => m.replace(/^@/, ""))

    if (membersList.length === 0) return

    setError("")
    try {
      const token = await getToken()
      if (!token) throw new Error("Sessão expirada. Faça login novamente.")

      const resp = await fetch(`${API_BASE}/api/teams/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          team_id: selectedTeamId,
          github_logins: membersList
        })
      })

      if (!resp.ok) {
        const errData = (await resp.json().catch(() => null)) as ApiError | null
        throw new Error(errData?.detail || "Falha ao adicionar membros")
      }

      setNewMembersCsv("")
      await loadMembers(selectedTeamId)
    } catch (e: any) {
      setError(e?.message || "Falha ao adicionar membros")
    }
  }

  if (loading) {
    return (
      <div className="teams-page teams-page-loading">
        <div className="card">
          <p className="teams-loading-text">Carregando equipes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="teams-page">
      <div className="teams-header">
        <div>
          <h2 className="teams-title">Equipes</h2>
          <p className="teams-description">
            Organize membros, mantenha responsáveis visíveis e prepare o envio
            de issues.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card teams-list-card">
        <strong>Criar equipe</strong>
        <p className="teams-card-subtitle">
          Use nomes curtos e consistentes com o repositório ou área.
        </p>
        <div className="teams-form-row">
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Nome da equipe"
            className="input"
          />
          <button
            onClick={createTeam}
            disabled={!newTeamName.trim()}
            className="btn-add btn-add-success">
            Criar
          </button>
        </div>
      </div>

      <div className="teams-grid">
        <div className="card teams-list-card">
          <div className="teams-card-header">
            <div>
              <strong>Suas equipes</strong>
              <p className="teams-card-subtitle">
                Selecione uma equipe para ver e editar os membros.
              </p>
            </div>
            <span className="pill">{teams.length}</span>
          </div>

          <div className="teams-list">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`team-item ${t.id === selectedTeamId ? "active" : ""}`}>
                <div className="team-item-main">
                  <div className="team-item-name">{t.name}</div>
                  <div className="team-item-meta">
                    {t.member_count}{" "}
                    {t.member_count === 1 ? "membro" : "membros"}
                  </div>
                </div>
              </button>
            ))}

            {teams.length === 0 && (
              <p className="teams-empty-text">Nenhuma equipe criada.</p>
            )}
          </div>
        </div>

        <div className="card teams-members-card">
          <div className="teams-card-header teams-card-header-spaced">
            <div>
              <strong>
                {selectedTeam ? selectedTeam.name : "Selecione uma equipe"}
              </strong>
              <p className="teams-card-subtitle">
                {selectedTeam
                  ? "Membros associados e ações de manutenção."
                  : "Escolha uma equipe para abrir os membros."}
              </p>
            </div>
            {selectedTeam && (
              <span className="pill">
                {selectedTeam.member_count} membros
              </span>
            )}
          </div>

          {selectedTeam && (
            <>
              <div className="members-list">
                {membersLoading ? (
                  <p className="teams-empty-text">Carregando membros...</p>
                ) : members.length === 0 ? (
                  <p className="teams-empty-text">
                    Nenhum membro nesta equipe ainda.
                  </p>
                ) : (
                  <div className="members-list-items">
                    {members.map((m) => (
                      <div key={m.github_login} className="member-row">
                        <img
                          src={`https://github.com/${m.github_login}.png`}
                          alt={m.github_login}
                          className="member-avatar"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                              "none"
                          }}
                        />
                        <div className="member-info">
                          <div className="member-name">{m.github_login}</div>
                          <div className="member-meta">
                            Adicionado em {formatDate(m.added_at)}
                          </div>
                        </div>
                        <div className="member-actions">
                          <a
                            href={`https://github.com/${m.github_login}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="member-link"
                            title="Ver no GitHub">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                          <button
                            onClick={() => removeMember(m.github_login)}
                            title="Remover membro"
                            className="member-remove">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="teams-form-block teams-form-block-divider">
                <div className="teams-help">
                  Adicione membros informando os <code>github_logins</code>{" "}
                  separados por vírgula.
                </div>
                <div className="teams-form-row">
                  <input
                    value={newMembersCsv}
                    onChange={(e) => setNewMembersCsv(e.target.value)}
                    placeholder="ex: felipe-sbm, felipepotigol"
                    className="input"
                  />
                  <button
                    onClick={addMembersToTeam}
                    disabled={
                      newMembersCsv.split(",").filter((s) => s.trim())
                        .length === 0
                    }
                    className="btn-add btn-add-success">
                    Adicionar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
