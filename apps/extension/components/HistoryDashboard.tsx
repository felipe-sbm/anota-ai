import React, { useState, useEffect, useMemo } from "react"
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
  onRecordsLoaded?: (count: number) => void
}

export default function HistoryDashboard({ onViewDetail, onRecordsLoaded }: Props) {
  const [records, setRecords] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

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
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Erro ao carregar gravações")
      const data = await response.json()
      const recordList = data.records || []
      setRecords(recordList)
      onRecordsLoaded?.(recordList.length)
    } catch (err: any) {
      console.error("Dashboard load error:", err)
      setError("Erro ao carregar histórico de gravações.")
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesFilename = r.original_filename?.toLowerCase().includes(q)
        const matchesSummary = r.summary?.toLowerCase().includes(q)
        const matchesTranscript = r.transcript?.toLowerCase().includes(q)
        const matchesRepo = r.repo_full_name?.toLowerCase().includes(q)
        if (!matchesFilename && !matchesSummary && !matchesTranscript && !matchesRepo) return false
      }
      return true
    })
  }, [records, statusFilter, searchQuery])

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    } catch { return iso }
  }

  const formatDateRelative = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
      if (diffMin < 1) return "Agora mesmo"
      if (diffMin < 60) return `Há ${diffMin} min`
      const diffHour = Math.floor(diffMin / 60)
      if (diffHour < 24) return `Há ${diffHour}h`
      const diffDay = Math.floor(diffHour / 24)
      if (diffDay < 7) return `Há ${diffDay}d`
      return formatDate(iso)
    } catch { return iso }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      uploaded: "Enviado", processing: "Processando...", processed: "Processado", error: "Erro",
    }
    return map[status] || status
  }

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      uploaded: "status-uploaded", processing: "status-processing", processed: "status-processed", error: "status-error",
    }
    return map[status] || ""
  }

  const stats = useMemo(() => {
    const total = records.length
    const processed = records.filter((r) => r.status === "processed").length
    const withTasks = records.filter((r) => r.tasks && r.tasks.length > 0).length
    const errors = records.filter((r) => r.status === "error").length
    return { total, processed, withTasks, errors }
  }, [records])

  if (loading) {
    return (
      <div className="history-loading">
        <div className="loading-spinner" />
        <p>Carregando gravações...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="history-error">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
        <button className="btn-retry" onClick={loadRecords}>Tentar novamente</button>
      </div>
    )
  }

  const hasRecords = records.length > 0
  const hasFilteredRecords = filteredRecords.length > 0

  return (
    <div className="history-dashboard">
      {hasRecords && (
        <div className="history-stats">
          <div className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Total</span></div>
          <div className="stat-card stat-processed"><span className="stat-value">{stats.processed}</span><span className="stat-label">Processados</span></div>
          <div className="stat-card stat-tasks"><span className="stat-value">{stats.withTasks}</span><span className="stat-label">Com tarefas</span></div>
          <div className="stat-card stat-errors"><span className="stat-value">{stats.errors}</span><span className="stat-label">Erros</span></div>
        </div>
      )}

      {!hasRecords ? (
        <div className="history-empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          </svg>
          <h3>Nenhuma gravação ainda</h3>
          <p>Grave e envie seu primeiro áudio para começar a ver o histórico aqui.</p>
        </div>
      ) : (
        <>
          <div className="history-toolbar">
            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Buscar gravações..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
            </div>
            <div className="filter-tabs">
              {["all", "processed", "processing", "uploaded", "error"].map((f) => (
                <button key={f} className={`filter-tab ${statusFilter === f ? "active" : ""}`} onClick={() => setStatusFilter(f)}>
                  {f === "all" ? "Todas" : getStatusLabel(f)}
                </button>
              ))}
            </div>
          </div>

          {!hasFilteredRecords ? (
            <div className="history-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>Nenhuma gravação encontrada para esta busca.</p>
            </div>
          ) : (
            <div className="history-list">
              {filteredRecords.map((record) => (
                <button key={record.id} className="history-item" onClick={() => onViewDetail(record)}>
                  <div className="history-item-left">
                    <div className={`history-item-icon ${getStatusClass(record.status)}`}>
                      {record.status === "processed" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      ) : record.status === "error" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                        </svg>
                      )}
                    </div>
                    <div className="history-item-content">
                      <div className="history-item-header">
                        <span className="history-item-title">{record.original_filename || record.filename}</span>
                        <span className={`history-status-badge ${getStatusClass(record.status)}`}>{getStatusLabel(record.status)}</span>
                      </div>
                      <div className="history-item-meta">
                        <span className="history-item-date" title={formatDate(record.created_at)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          {formatDateRelative(record.created_at)}
                        </span>
                        {record.tasks && record.tasks.length > 0 && (
                          <span className="history-item-tasks">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            {record.tasks.length} {record.tasks.length === 1 ? "tarefa" : "tarefas"}
                          </span>
                        )}
                        {record.repo_full_name && (
                          <span className="history-item-repo">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                            </svg>
                            {record.repo_full_name}
                          </span>
                        )}
                      </div>
                      {record.summary && (
                        <p className="history-item-summary">
                          {record.summary.length > 100 ? record.summary.slice(0, 100) + "..." : record.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="history-item-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}