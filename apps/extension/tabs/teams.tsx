import React, { useEffect, useMemo, useState } from "react"
import { API_BASE, AUTH_TOKEN_KEY } from "../config"

type Team = { id: string; name: string; member_count: number; created_at: string }

type Member = { github_login: string; added_at: string }

type ApiError = { detail?: string }

function getToken(): Promise<string | undefined> {
  const chromeAny = (window as any).chrome
  return chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY).then((resp: any) => resp?.[AUTH_TOKEN_KEY] as string | undefined)
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
        headers: { Authorization: `Bearer ${token}` },
      })
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
        headers: { Authorization: `Bearer ${token}` },
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
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

      const resp = await fetch(`${API_BASE}/api/teams/${selectedTeamId}/members/${githubLogin}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ team_id: selectedTeamId, github_logins: membersList }),
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
      <div style={{ padding: 16 }}>
        <p>Carregando equipes...</p>
      </div>
    )
  }

  return (
    <div className="teams-page" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Equipes</h2>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", padding: 12, marginBottom: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* Left panel - Team list */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Suas equipes</strong>
            <span style={{ color: "#6b7280" }}>{teams.length}</span>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid " + (t.id === selectedTeamId ? "#3b82f6" : "#e5e7eb"),
                  background: t.id === selectedTeamId ? "#eff6ff" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {t.member_count} {t.member_count === 1 ? "membro" : "membros"}
                </div>
              </button>
            ))}

            {teams.length === 0 && <p style={{ color: "#6b7280" }}>Nenhuma equipe criada.</p>}
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <strong>Criar equipe</strong>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nome da equipe"
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
              <button
                onClick={createTeam}
                disabled={!newTeamName.trim()}
                style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#3b82f6", color: "white", cursor: "pointer" }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>

        {/* Right panel - Members */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <strong>{selectedTeam ? `Membros - ${selectedTeam.name}` : "Selecione uma equipe"}</strong>

          {selectedTeam && (
            <>
              {/* Member list */}
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                {membersLoading ? (
                  <p style={{ color: "#6b7280" }}>Carregando membros...</p>
                ) : members.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>Nenhum membro nesta equipe ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map((m) => (
                      <div
                        key={m.github_login}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "white",
                        }}
                      >
                        <img
                          src={`https://github.com/${m.github_login}.png`}
                          alt={m.github_login}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1px solid #e5e7eb",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{m.github_login}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            Adicionado em {new Date(m.added_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <a
                            href={`https://github.com/${m.github_login}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#6b7280", textDecoration: "none", fontSize: 12 }}
                            title="Ver no GitHub"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                          <button
                            onClick={() => removeMember(m.github_login)}
                            title="Remover membro"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              padding: 2,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {/* Add members */}
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
                  Adicione membros informando os <code>github_logins</code> separados por vírgula.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={newMembersCsv}
                    onChange={(e) => setNewMembersCsv(e.target.value)}
                    placeholder="ex: felipe-sbm, felipepotigol"
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                  <button
                    onClick={addMembersToTeam}
                    disabled={newMembersCsv.split(",").filter((s) => s.trim()).length === 0}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#10b981", color: "white", cursor: "pointer" }}
                  >
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