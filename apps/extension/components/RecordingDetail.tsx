import { ChevronLeft } from "lucide-react"
import React, { useEffect, useState } from "react"
import Select from "react-select"

import { API_BASE, AUTH_TOKEN_KEY } from "../config"

type Recording = {
  id: string
  file_id: string
  filename: string
  original_filename: string
  created_at: string
  status: string
  transcript: string | null
  summary: string | null
  tasks: { title: string; body: string; assignees: string[] }[] | null
  created_issues: { number: number; html_url: string }[] | null
  repo_full_name: string | null
  error_message: string | null
}

type Repo = {
  full_name: string
  name: string
  owner: string
  private: boolean
  description: string
  html_url: string
}

type TeamMember = {
  github_login: string
  added_at: string
}

type TaskConfig = {
  title: string
  body: string
  repo_full_name: string
  assignee: string
}

type Props = {
  record: Recording
  onBack: () => void
}

function getToken(): Promise<string | undefined> {
  const chromeAny = (window as any).chrome
  return chromeAny?.storage?.local
    ?.get(AUTH_TOKEN_KEY)
    .then((resp: any) => resp?.[AUTH_TOKEN_KEY] as string | undefined)
}

export default function RecordingDetail({ record, onBack }: Props) {
  const [detail, setDetail] = useState<Recording>(record)
  const [loading, setLoading] = useState(false)

  // Issue creation state
  const [repos, setRepos] = useState<Repo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [taskConfigs, setTaskConfigs] = useState<TaskConfig[]>([])
  const [sendingIssues, setSendingIssues] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: number
    errors: { title: string; error: string }[]
  } | null>(null)

  useEffect(() => {
    if (record.status === "uploaded" || record.status === "processing") {
      pollRecord()
    }
  }, [record.id])

  useEffect(() => {
    if (detail.tasks && detail.tasks.length > 0) {
      // Initialize task configs from tasks
      setTaskConfigs(
        detail.tasks.map((t) => ({
          title: t.title,
          body: t.body,
          repo_full_name: detail.repo_full_name || "",
          assignee: t.assignees?.[0] || ""
        }))
      )
      loadRepos()
      loadTeams()
    }
  }, [detail.tasks])

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamMembers(selectedTeamId)
    } else {
      setTeamMembers([])
    }
  }, [selectedTeamId])

  const pollRecord = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000))

        const response = await fetch(
          `${API_BASE}/api/audio/records/${record.file_id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (!response.ok) continue

        const data = await response.json()
        setDetail(data.record)

        if (
          data.record.status === "processed" ||
          data.record.status === "error"
        ) {
          break
        }
      }
    } catch (err) {
      console.error("Poll error:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadRepos = async () => {
    setReposLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error("Failed to load repos")
      const data = await response.json()
      setRepos(data.repos || [])
    } catch (err) {
      console.error("Failed to load repos:", err)
    } finally {
      setReposLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error("Failed to load teams")
      const data = await response.json()
      setTeams(data.teams || [])
    } catch (err) {
      console.error("Failed to load teams:", err)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error("Failed to load members")
      const data = await response.json()
      setTeamMembers(data.members || [])
    } catch (err) {
      console.error("Failed to load members:", err)
      setTeamMembers([])
    }
  }

  const updateTaskConfig = (
    index: number,
    field: keyof TaskConfig,
    value: string
  ) => {
    setTaskConfigs((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const sendIssues = async () => {
    setSendingIssues(true)
    setSendResult(null)

    try {
      const token = await getToken()
      if (!token) {
        setSendResult({
          success: 0,
          errors: [
            { title: "Geral", error: "Sessão expirada. Faça login novamente." }
          ]
        })
        return
      }

      const payload = {
        file_id: detail.file_id,
        tasks: taskConfigs.map((t) => ({
          title: t.title,
          body: t.body,
          repo_full_name: t.repo_full_name,
          assignee: t.assignee || null
        }))
      }

      const response = await fetch(`${API_BASE}/api/issues/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        const detail = errData?.detail || "Falha ao criar issues"
        // Check for 403 - authorization error
        if (response.status === 403) {
          throw new Error(
            "Permissão negada pelo GitHub (403). " +
            "O app 'Anota Aí' precisa ser instalado na sua conta/organização para criar issues. " +
            "Acesse: https://github.com/apps/anota-ai/installations/new e instale o app " +
            "na conta que possui o repositório selecionado."
          )
        }
        throw new Error(detail)
      }

      const result = await response.json()
      setSendResult({
        success: result.created_issues?.length || 0,
        errors: result.errors || []
      })

      // Reload record to get updated issues
      if (result.created_issues?.length > 0) {
        const recordResp = await fetch(
          `${API_BASE}/api/audio/records/${detail.file_id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
        if (recordResp.ok) {
          const data = await recordResp.json()
          setDetail(data.record)
        }
      }
    } catch (err: any) {
      setSendResult({
        success: 0,
        errors: [{ title: "Geral", error: err.message || "Erro desconhecido" }]
      })
    } finally {
      setSendingIssues(false)
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return iso
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      uploaded: {
        label: "Aguardando processamento",
        className: "badge-uploaded"
      },
      processing: { label: "Processando...", className: "badge-processing" },
      processed: { label: "Processado", className: "badge-processed" },
      error: { label: "Erro", className: "badge-error" }
    }
    return map[status] || { label: status, className: "" }
  }

  const statusInfo = getStatusBadge(detail.status)

  const hasIssuesToSend =
    taskConfigs.length > 0 && taskConfigs.every((t) => t.repo_full_name)
  const alreadyHasIssues =
    detail.created_issues && detail.created_issues.length > 0

  return (
    <div className="detail-container">
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>
          <ChevronLeft size={16} />
          Voltar
        </button>
        <div className="detail-text">
          <div className="detail-subheader">
            <h2 className="detail-title">
              {detail.original_filename || detail.filename}
            </h2>
            <span className={"detail-status-badge " + statusInfo.className}>
              {statusInfo.label}
            </span>
          </div>
          <div className="detail-meta">
            <span className="detail-date">{formatDate(detail.created_at)}</span>
            {detail.repo_full_name && (
              <span className="detail-repo">📦 {detail.repo_full_name}</span>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="detail-loading">Aguardando processamento da IA...</div>
      )}

      {detail.status === "error" && (
        <div className="detail-error-box">
          <strong>Erro:</strong>{" "}
          {detail.error_message || "Erro desconhecido durante o processamento."}
        </div>
      )}

      {detail.status === "processed" && (
        <div className="detail-content">
          {detail.transcript && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                </svg>
                Transcrição
              </h3>
              <p className="detail-text">{detail.transcript}</p>
            </section>
          )}

          {detail.summary && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Resumo
              </h3>
              <p className="detail-text">{detail.summary}</p>
            </section>
          )}

          {detail.tasks && detail.tasks.length > 0 && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Tarefas Extraídas ({detail.tasks.length})
              </h3>
              <div className="detail-tasks">
                {detail.tasks.map((task, index) => (
                  <div key={index} className="task-card">
                    <h4 className="task-title">
                      <span className="task-number">#{index + 1}</span>
                      {task.title}
                    </h4>
                    {task.body && <p className="task-body">{task.body}</p>}
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="task-assignees">
                        {task.assignees.map((a) => (
                          <span key={a} className="task-assignee-tag">
                            @{a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Issue creation section - only show if tasks exist and no issues created yet */}
          {detail.tasks && detail.tasks.length > 0 && !alreadyHasIssues && (
            <section className="detail-section detail-issue-config">
              <h3 className="section-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                Enviar Issues para o GitHub
              </h3>

              {/* Team selector for quick member selection */}
              {teams.length > 0 && (
                <div className="issue-config-team">
                  <label className="issue-config-label">
                    Selecionar equipe para preencher responsáveis:
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="issue-config-select">
                    <option value="">-- Nenhuma equipe --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="issue-config-tasks">
                {taskConfigs.map((config, index) => (
                  <div key={index} className="issue-config-task">
                    <div className="issue-config-task-header">
                      <span className="task-number">#{index + 1}</span>
                      <span className="issue-config-task-title">
                        {config.title}
                      </span>
                    </div>

                    <div className="issue-config-fields">
                      <div className="issue-config-field">
                        <label className="issue-config-label">
                          Repositório *
                        </label>
                        <Select
                          value={
                            config.repo_full_name
                              ? { label: config.repo_full_name, value: config.repo_full_name }
                              : null
                          }
                          onChange={(option) =>
                            updateTaskConfig(
                              index,
                              "repo_full_name",
                              option ? option.value : ""
                            )
                          }
                          options={repos.map((repo) => ({
                            label: repo.full_name,
                            value: repo.full_name
                          }))}
                          isMulti={false}
                          isClearable={true}
                          placeholder="Selecione um repositório"
                          noOptionsMessage={() => "Nenhum repositório encontrado"}
                          loadingMessage={() => "Carregando repositórios..."}
                          isLoading={reposLoading}
                        />
                      </div>

                      <div className="issue-config-field">
                        <label className="issue-config-label">
                          Responsável
                        </label>
                        <select
                          value={config.assignee}
                          onChange={(e) =>
                            updateTaskConfig(index, "assignee", e.target.value)
                          }
                          className="issue-config-select">
                          <option value="">-- Sem responsável --</option>
                          {teamMembers.map((m) => (
                            <option key={m.github_login} value={m.github_login}>
                              @{m.github_login}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {sendResult && (
                <div className="issue-config-result">
                  {sendResult.success > 0 && (
                    <div className="issue-config-success">
                      ✅ {sendResult.success}{" "}
                      {sendResult.success === 1
                        ? "issue criada"
                        : "issues criadas"}{" "}
                      com sucesso!
                    </div>
                  )}
                  {sendResult.errors.length > 0 && (
                    <div className="issue-config-errors">
                      <strong>Erros:</strong>
                      <ul>
                        {sendResult.errors.map((e, i) => (
                          <li key={i}>
                            <strong>{e.title}</strong> ({e.error})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={sendIssues}
                disabled={!hasIssuesToSend || sendingIssues}
                className="issue-config-send-btn">
                {sendingIssues ? "Enviando..." : "Enviar Issues para o GitHub"}
              </button>
            </section>
          )}

          {detail.created_issues && detail.created_issues.length > 0 && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                Issues Criadas no GitHub
              </h3>
              <div className="detail-issues">
                {detail.created_issues.map((issue) => (
                  <a
                    key={issue.number}
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="issue-link">
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
                    #{issue.number} — Abrir no GitHub
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
