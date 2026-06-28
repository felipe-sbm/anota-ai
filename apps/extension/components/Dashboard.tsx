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
  onViewDetail: (record: Recording) => void
}

export default function Dashboard({ onViewDetail }: Props) {
  const [records, setRecords] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    setError("")

    try {
      const chromeAny = (window as any).chrome
      const tokenResp = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
      const token = tokenResp?.[AUTH_TOKEN_KEY] as string | undefined

      if (!token) {
        setError("Sessão expirada. Faça login novamente.")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE}/api/audio/records`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Erro ao carregar gravações")
      }

      const data = await response.json()
      setRecords(data.records || [])
    } catch (err: any) {
      console.error("Dashboard load error:", err)
      setError("Erro ao carregar histórico de gravações.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      uploaded: "Enviado",
      processing: "Processando...",
      processed: "Processado",
      error: "Erro",
    }
    return map[status] || status
  }

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      uploaded: "status-uploaded",
      processing: "status-processing",
      processed: "status-processed",
      error: "status-error",
    }
    return map[status] || ""
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">Carregando gravações...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <p>{error}</p>
          <button className="btn-retry" onClick={loadRecords}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          </svg>
          <p>Nenhuma gravação encontrada.</p>
          <p className="dashboard-empty-hint">Grave e envie um áudio para começar!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-list">
        {records.map((record) => (
          <button
            key={record.id}
            className="dashboard-item"
            onClick={() => onViewDetail(record)}
          >
            <div className="dashboard-item-header">
              <span className={`dashboard-status ${getStatusClass(record.status)}`}>
                {getStatusLabel(record.status)}
              </span>
              <span className="dashboard-date">{formatDate(record.created_at)}</span>
            </div>
            <div className="dashboard-item-body">
              <div className="dashboard-item-info">
                <span className="dashboard-filename" title={record.original_filename}>
                  {record.original_filename || record.filename}
                </span>
                {record.summary && (
                  <p className="dashboard-summary-preview">
                    {record.summary.length > 120
                      ? record.summary.slice(0, 120) + "..."
                      : record.summary}
                  </p>
                )}
                {record.tasks && record.tasks.length > 0 && (
                  <span className="dashboard-task-count">
                    {record.tasks.length} {record.tasks.length === 1 ? "tarefa" : "tarefas"} extraídas
                  </span>
                )}
                {record.repo_full_name && (
                  <span className="dashboard-repo">📦 {record.repo_full_name}</span>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}