import React from "react"
const logoImg = new URL("../assets/logo.png", import.meta.url).toString()
const iconImg = new URL("../assets/icon.png", import.meta.url).toString()

type SidebarTab = "recorder" | "history"

type Props = {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  userName?: string
  recordingCount?: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  onLogout?: () => void
}

export default function Sidebar({
  activeTab,
  onTabChange,
  userName,
  recordingCount,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}: Props) {
  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            src={isCollapsed ? iconImg : logoImg}
            alt="Anota AI"
            className="sidebar-logo-img"
          />
        </div>
        <button className="sidebar-toggle" onClick={onToggleCollapse} title={isCollapsed ? "Expandir" : "Recolher"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <>
                <polyline points="9 18 15 12 9 6" />
              </>
            ) : (
              <>
                <polyline points="15 18 9 12 15 6" />
              </>
            )}
          </svg>
        </button>
      </div>

      {!isCollapsed && userName && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{userName}</span>
            {recordingCount !== undefined && (
              <span className="sidebar-user-records">
                {recordingCount} {recordingCount === 1 ? "gravação" : "gravações"}
              </span>
            )}
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activeTab === "recorder" ? "active" : ""}`}
          onClick={() => onTabChange("recorder")}
          title="Gravador"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          </svg>
          {!isCollapsed && <span>Gravador</span>}
        </button>

        <button
          className={`sidebar-nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => onTabChange("history")}
          title="Histórico"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {!isCollapsed && <span>Histórico</span>}
          {!isCollapsed && recordingCount !== undefined && recordingCount > 0 && (
            <span className="sidebar-badge">{recordingCount}</span>
          )}
        </button>
      </nav>

      {!isCollapsed && onLogout && (
        <div className="sidebar-footer">
          <button className="sidebar-nav-item sidebar-logout" onClick={onLogout} title="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sair</span>
          </button>
        </div>
      )}
    </aside>
  )
}
