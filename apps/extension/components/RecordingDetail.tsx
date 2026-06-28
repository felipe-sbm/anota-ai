import React, { useState, useEffect } from "react"
import { AUTH_TOKEN_KEY, API_BASE } from "../config"

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

type Props = {
  record: Recording
  onBack: () => void
}

export default function RecordingDetail({ record, onBack }: Props) {
  const [detail, setDetail] = useState<Recording>(record)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (record.status === "uploaded" || record.status === "processing") {
      pollRecord()
    }
  }, [record.id])

  const pollRecord = async () => {
    setLoading(true)
    try {
      const chromeAny = (window as any).chrome
      const tokenResp = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
      const token = tokenResp?.[AUTH_TOKEN_KEY] as string | undefined
      if (!token) return

      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000))

        const response = await fetch(`${API_BASE}/api/audio/records/${record.file_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) continue

        const data = await response.json()
        setDetail(data.record)

        if (data.record.status === "processed" || data.record.status === "error") {
          break
        }
      }
    } catch (err) {
      console.error("Poll error:", err)
    } finally {
      setLoading(false)
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
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      uploaded: { label: "Aguardando processamento", className: "badge-uploaded" },
      processing: { label: "Processando...", className: "badge-processing" },
      processed: { label: "Processado", className: "badge-processed" },
      error: { label: "Erro", className: "badge-error" },
    }
    return map[status] || { label: status, className: "" }
  }

  const statusInfo = getStatusBadge(detail.status)

  return (
    <div className="detail-container">
      <button className="detail-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </button>

      <div className="detail-header">
        <h2 className="detail-title">
          {detail.original_filename || detail.filename}
        </h2>
        <div className="detail-meta">
          <span className={"detail-status-badge " + statusInfo.className}>
            {statusInfo.label}
          </span>
          <span className="detail-date">{formatDate(detail.created_at)}</span>
          {detail.repo_full_name && (
            <span className="detail-repo">📦 {detail.repo_full_name}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="detail-loading">
          Aguardando processamento da IA...
        </div>
      )}

      {detail.status === "error" && (
        <div className="detail-error-box">
          <strong>Erro:</strong> {detail.error_message || "Erro desconhecido durante o processamento."}
        </div>
      )}

      {detail.status === "processed" && (
        <div className="detail-content">
          {detail.transcript && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          <span key={a} className="task-assignee-tag">@{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {detail.created_issues && detail.created_issues.length > 0 && (
            <section className="detail-section">
              <h3 className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    className="issue-link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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